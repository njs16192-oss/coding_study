// 코테_누적정리.txt (Java 주석 스타일) -> NotesData
// 파일 형식을 바꾸지 않아도 읽히도록, 지금 파일의 규칙을 그대로 따른다.
//
//   // ====            섹션 제목 블록 (위아래 구분선 사이)
//   // N. 제목
//   // ====
//   // ---------- 문제명 -> 핵심 ----------   문제 (8번 같은 섹션)
//   // ---------- ArrayList ----------         치트시트 소제목
//   // @key: value                            선택 메타데이터 (tags, hint, review, solved, level, quiz)
//   // - 항목                                 실수 / 틀렸던 포인트 목록

import type {
  CheatGroup,
  CheatSection,
  ExplainLine,
  ListItem,
  ListSection,
  NotesData,
  PrioritySection,
  Problem,
  Quiz,
  Term,
} from './types'
import { inferTags } from './tags'

const RULE = /^\s*\/\/\s*={5,}\s*$/
const DASH_HEADER = /^\s*\/\/\s*-{3,}\s*(.+?)\s*-{3,}\s*$/
const META = /^\s*\/\/\s*@([a-zA-Z]+)\s*:\s*(.*)$/
const COMMENT = /^\s*\/\/(.*)$/
const DATE = /^\d{4}-\d{2}-\d{2}$/
const KNOWN_META = new Set(['tags', 'hint', 'review', 'solved', 'level', 'quiz', 'why', 'terms'])

interface RawSection {
  titleLines: string[]
  body: { text: string; line: number }[]
}

/** "//" 를 떼고, 그 뒤 첫 공백 하나까지 뗀 나머지 (들여쓰기는 유지) */
function stripComment(line: string): string {
  const m = COMMENT.exec(line)
  if (!m) return line
  return m[1].startsWith(' ') ? m[1].slice(1) : m[1]
}

function leadingSpaces(s: string): number {
  return s.length - s.trimStart().length
}

export function slug(s: string): string {
  return s
    .trim()
    .replace(/[\s/]+/g, '-')
    .replace(/[^\p{L}\p{N}\-_^]/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/** 문제 이름 비교용: [1차] 같은 접두어, 공백 제거 */
function normName(s: string): string {
  return s.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, '').toLowerCase()
}

function splitSections(lines: string[]): RawSection[] {
  const out: RawSection[] = []
  let i = 0
  let current: RawSection | null = null
  while (i < lines.length) {
    if (RULE.test(lines[i])) {
      // 제목 블록: 다음 구분선까지 (최대 8줄)
      let j = i + 1
      while (j < lines.length && j - i <= 8 && !RULE.test(lines[j])) j++
      if (j < lines.length && RULE.test(lines[j])) {
        current = {
          titleLines: lines
            .slice(i + 1, j)
            .map((l) => stripComment(l).trim())
            .filter(Boolean),
          body: [],
        }
        out.push(current)
        i = j + 1
        continue
      }
    }
    if (current) current.body.push({ text: lines[i], line: i + 1 })
    i++
  }
  return out
}

type Kind = 'intro' | 'cheat' | 'tips' | 'mistakes' | 'problems' | 'priority'

function classify(sec: RawSection, index: number): Kind {
  const title = sec.titleLines[0] ?? ''
  const hasProblems = sec.body.some((b) => {
    const m = DASH_HEADER.exec(b.text)
    return m && m[1].includes('->')
  })
  if (hasProblems) return 'problems'
  if (/틀렸|틀린/.test(title)) return 'mistakes'
  if (/우선순위/.test(title)) return 'priority'
  if (/실수|팁/.test(title)) return 'tips'
  const nonEmpty = sec.body.filter((b) => b.text.trim())
  if (index === 0 && nonEmpty.length === 0 && !/^\d+\./.test(title)) return 'intro'
  const listLines = nonEmpty.filter((b) => /^\s*\/\/\s*-\s/.test(b.text)).length
  if (nonEmpty.length > 0 && listLines / nonEmpty.length > 0.5) return 'tips'
  return 'cheat'
}

function parseCheat(sec: RawSection, id: string): CheatSection {
  const groups: CheatGroup[] = []
  let g: CheatGroup = { title: null, rows: [], notes: [] }
  const push = () => {
    if (g.rows.length || g.notes.length) groups.push(g)
  }
  for (const { text } of sec.body) {
    if (!text.trim()) continue
    const h = DASH_HEADER.exec(text)
    if (h) {
      push()
      g = { title: h[1], rows: [], notes: [] }
      continue
    }
    if (COMMENT.test(text)) {
      g.notes.push(stripComment(text).trim())
      continue
    }
    const m = /^(.*?\S)\s{2,}\/\/\s?(.*)$/.exec(text) ?? /^(.*?\S)\s*\/\/\s?(.*)$/.exec(text)
    if (m) g.rows.push({ code: m[1].trim(), desc: m[2].trim() })
    else g.rows.push({ code: text.trim(), desc: '' })
  }
  push()
  return { kind: 'cheat', id, title: sec.titleLines[0] ?? '', groups }
}

function parseList(
  sec: RawSection,
  id: string,
  kind: 'tips' | 'mistakes',
  problemNames: Map<string, string>,
  quizzes: Quiz[],
  quizLines: Set<number>,
  warnings: string[],
): ListSection {
  const items: ListItem[] = []
  let cur: ListItem | null = null
  let lastQuiz: Quiz | null = null
  for (const { text, line } of sec.body) {
    if (!text.trim()) continue
    // 항목 아래에 적은 @quiz / @why 는 그 항목의 퀴즈 (자동 문제 대신 나감)
    const meta = META.exec(text)
    if (meta && cur && ['quiz', 'why'].includes(meta[1].toLowerCase())) {
      quizLines.add(line)
      if (meta[1].toLowerCase() === 'quiz') {
        lastQuiz = parseQuiz(meta[2], `${cur.id}-quiz`, cur.problemId, warnings)
        if (lastQuiz) {
          lastQuiz.mistakeId = cur.id
          quizzes.push(lastQuiz)
        }
      } else if (lastQuiz && lastQuiz.mistakeId === cur.id) lastQuiz.why = meta[2].trim()
      continue
    }
    const body = stripComment(text)
    const start = /^-\s+(.*)$/.exec(body)
    if (start) {
      cur = { id: `${id}-${items.length + 1}`, text: start[1].trim(), detail: [], fix: null, problemId: null, problemTag: null }
      items.push(cur)
      // 괄호 태그 -> 문제 연결. "(숫자의 표현 : ...)" 처럼 콜론 앞부분도 본다
      for (const m of cur.text.matchAll(/\(([^()]+)\)/g)) {
        const key = normName(m[1].split(':')[0])
        const pid = problemNames.get(key)
        if (pid) {
          cur.problemId = pid
          cur.problemTag = m[1].split(':')[0].trim()
          break
        }
      }
    } else if (cur) {
      cur.detail.push(body.replace(/\s+$/, ''))
    }
  }
  for (const it of items) {
    const arrow = it.detail.find((d) => d.trim().startsWith('->'))
    if (arrow) it.fix = arrow.trim().replace(/^->\s*/, '')
    else if (it.text.includes(' -> ')) it.fix = it.text.slice(it.text.lastIndexOf(' -> ') + 4).trim()
  }
  return { kind, id, title: sec.titleLines[0] ?? '', items }
}

function parsePriority(sec: RawSection, id: string): PrioritySection {
  const items = sec.body
    .map((b) => stripComment(b.text).trim())
    .filter(Boolean)
    .map((t) => t.replace(/^\d+\.\s*/, ''))
  return { kind: 'priority', id, title: sec.titleLines[0] ?? '', items }
}

function parseBool(v: string): boolean | null {
  const s = v.trim().toLowerCase()
  if (['yes', 'y', 'true', 'o', '1', '봄', '네'].includes(s)) return true
  if (['no', 'n', 'false', 'x', '0', '안봄', '아니오'].includes(s)) return false
  return null
}

function parseQuiz(value: string, id: string, problemId: string | null, warnings: string[]): Quiz | null {
  const parts = value.split('|').map((p) => p.trim()).filter(Boolean)
  if (parts.length < 3) {
    warnings.push(`@quiz 형식 오류 (질문 | 정답 | 오답... 최소 3칸): ${value}`)
    return null
  }
  const [question, answer, ...wrong] = parts
  return { id, question, answer, wrong, problemId, why: null, mistakeId: null }
}

function parseProblems(sec: RawSection, warnings: string[], quizzes: Quiz[], quizLines: Set<number>): Problem[] {
  const problems: Problem[] = []
  type Block = { header: string; line: number; lines: { text: string; line: number }[] }
  const blocks: Block[] = []
  for (const { text, line } of sec.body) {
    const h = DASH_HEADER.exec(text)
    if (h && h[1].includes('->')) {
      blocks.push({ header: h[1], line, lines: [] })
    } else if (blocks.length) {
      blocks[blocks.length - 1].lines.push({ text, line })
    }
  }
  const usedIds = new Set<string>()
  for (const b of blocks) {
    const arrow = b.header.indexOf('->')
    const title = b.header.slice(0, arrow).trim()
    const core = b.header.slice(arrow + 2).trim()
    let id = slug(title) || `problem-${problems.length + 1}`
    while (usedIds.has(id)) id += '-2'
    usedIds.add(id)

    const p: Problem = {
      id,
      title,
      core,
      tags: [],
      tagsAuto: true,
      hint: null,
      review: [],
      solved: null,
      level: null,
      explain: [],
      terms: [],
      code: '',
      line: b.line,
    }
    const codeLines: string[] = []
    let inCode = false
    let inMine = false
    for (const { text: raw, line: lineNo } of b.lines) {
      if (!inCode) {
        const meta = META.exec(raw)
        if (meta) {
          const key = meta[1].toLowerCase()
          const val = meta[2].trim()
          if (!KNOWN_META.has(key)) warnings.push(`${title}: 모르는 메타 @${meta[1]}`)
          if (key === 'tags') {
            p.tags = val.split(',').map((t) => t.trim()).filter(Boolean)
            p.tagsAuto = false
          } else if (key === 'hint') {
            p.hint = parseBool(val)
            if (p.hint === null) warnings.push(`${title}: @hint 값은 yes / no (${val})`)
          } else if (key === 'review') {
            p.review = val.split(',').map((d) => d.trim()).filter(Boolean)
            for (const d of p.review) if (!DATE.test(d)) warnings.push(`${title}: @review 날짜 형식은 YYYY-MM-DD (${d})`)
            p.review = p.review.filter((d) => DATE.test(d)).sort()
          } else if (key === 'solved') {
            if (DATE.test(val)) p.solved = val
            else warnings.push(`${title}: @solved 날짜 형식은 YYYY-MM-DD (${val})`)
          } else if (key === 'terms') {
            for (const part of val.split('|')) {
              const m = /^(.+?)\s*(?<![=!<>])[:=](?!=)\s*(.+)$/.exec(part.trim())
              if (m) p.terms.push({ term: m[1].trim(), text: `${m[1].trim()} : ${m[2].trim()}`, manual: true })
              else if (part.trim()) warnings.push(`${title}: @terms 는 "용어 = 뜻 | 용어 = 뜻" 형식 (${part.trim()})`)
            }
          } else if (key === 'level') {
            p.level = val
          } else if (key === 'quiz') {
            const q = parseQuiz(val, `${id}-quiz-${quizzes.length + 1}`, id, warnings)
            if (q) quizzes.push(q)
            quizLines.add(lineNo)
          } else if (key === 'why') {
            const last = quizzes[quizzes.length - 1]
            if (last && last.problemId === id) last.why = val
            else warnings.push(`${title}: @why 는 @quiz 바로 아래에 적어 주세요`)
            quizLines.add(lineNo)
          }
          continue
        }
        if (!raw.trim()) continue
        if (COMMENT.test(raw)) {
          const body = stripComment(raw)
          const indent = leadingSpaces(body)
          const text = body.trim()
          if (/^내\s*풀이\s*:/.test(text)) inMine = true
          else if (indent === 0) inMine = false
          p.explain.push({ indent, text, mine: inMine } satisfies ExplainLine)
          continue
        }
        inCode = true
      }
      codeLines.push(raw.replace(/\s+$/, ''))
    }
    while (codeLines.length && !codeLines[codeLines.length - 1].trim()) codeLines.pop()
    p.code = codeLines.join('\n')
    if (p.tagsAuto) p.tags = inferTags(p)
    p.terms.push(...autoTerms(p))
    problems.push(p)
  }
  return problems
}

/** 설명 줄 "hit (이미 있음) : +1, ..." / "캐시 = 순서가 있는 리스트" 처럼 짧은 이름 뒤에 : 나 = 가 오는 줄을 용어 설명으로 */
const TERM_LINE = /^([A-Za-z가-힣][A-Za-z0-9가-힣_ ]{0,15}?)\s*(\([^()]*\))?\s*(?<![=!<>])[:=](?!=)\s*\S/
function autoTerms(p: Problem): Term[] {
  const have = new Set(p.terms.map((t) => t.term.toLowerCase()))
  const out: Term[] = []
  for (const l of p.explain) {
    if (l.mine || l.indent > 2) continue
    const m = TERM_LINE.exec(l.text)
    if (!m) continue
    const term = m[1].trim()
    if (term.length < 2 || have.has(term.toLowerCase())) continue
    have.add(term.toLowerCase())
    out.push({ term, text: l.text.replace(/\s{2,}/g, ' '), manual: false })
  }
  return out
}

export function parseNotes(source: string): NotesData {
  const lines = source.replace(/\r\n?/g, '\n').split('\n')
  const raw = splitSections(lines)
  const warnings: string[] = []
  const data: NotesData = {
    title: '코테 노트',
    intro: [],
    cheats: [],
    tips: null,
    mistakes: null,
    priority: null,
    problems: [],
    customQuizzes: [],
    warnings,
    sectionOrder: [],
  }
  const kinds = raw.map((s, i) => classify(s, i))

  // 문제를 먼저 읽어야 실수 목록의 (문제명) 태그를 연결할 수 있다
  const quizLines = new Set<number>()
  raw.forEach((s, i) => {
    if (kinds[i] === 'problems') data.problems.push(...parseProblems(s, warnings, data.customQuizzes, quizLines))
  })
  const problemNames = new Map<string, string>()
  for (const p of data.problems) {
    problemNames.set(normName(p.title), p.id)
    for (const part of p.title.split('/')) problemNames.set(normName(part), p.id)
  }

  raw.forEach((s, i) => {
    const kind = kinds[i]
    const title = s.titleLines[0] ?? ''
    const id = `s${i}`
    if (kind === 'intro') {
      data.title = title || data.title
      data.intro = s.titleLines.slice(1)
      return
    }
    data.sectionOrder.push({ id, title, kind })
    if (kind === 'cheat') data.cheats.push(parseCheat(s, id))
    else if (kind === 'tips') {
      const sec = parseList(s, id, 'tips', problemNames, data.customQuizzes, quizLines, warnings)
      if (data.tips) data.tips.items.push(...sec.items)
      else data.tips = sec
    } else if (kind === 'mistakes') {
      const sec = parseList(s, id, 'mistakes', problemNames, data.customQuizzes, quizLines, warnings)
      if (data.mistakes) data.mistakes.items.push(...sec.items)
      else data.mistakes = sec
    } else if (kind === 'priority') data.priority = parsePriority(s, id)
  })

  // 문제 밖에 적은 @quiz 도 읽기
  lines.forEach((l, i) => {
    const m = META.exec(l)
    if (!m || m[1].toLowerCase() !== 'quiz' || quizLines.has(i + 1)) return
    const q = parseQuiz(m[2], `quiz-${i + 1}`, null, warnings)
    if (!q) return
    const why = META.exec(lines[i + 1] ?? '')
    if (why && why[1].toLowerCase() === 'why') q.why = why[2].trim()
    data.customQuizzes.push(q)
  })

  if (!data.problems.length) warnings.push('문제를 하나도 못 찾음: "// ---------- 문제명 -> 핵심 ----------" 헤더를 확인하세요')
  return data
}

export function summarize(d: NotesData): string {
  const linked = d.mistakes?.items.filter((m) => m.problemId).length ?? 0
  const total = d.mistakes?.items.length ?? 0
  const rows = d.cheats.reduce((n, c) => n + c.groups.reduce((m, g) => m + g.rows.length, 0), 0)
  return [
    `문제 ${d.problems.length}개 (힌트 봄 ${d.problems.filter((p) => p.hint).length}, 복습일 있음 ${d.problems.filter((p) => p.review.length).length}, 태그 직접 지정 ${d.problems.filter((p) => !p.tagsAuto).length})`,
    `치트시트 섹션 ${d.cheats.length}개 / 메소드 ${rows}줄`,
    `틀렸던 포인트 ${total}개 (문제에 연결 ${linked}), 팁 ${d.tips?.items.length ?? 0}개`,
    `직접 만든 퀴즈 ${d.customQuizzes.length}개`,
    d.warnings.length ? `경고 ${d.warnings.length}개:\n  - ${d.warnings.join('\n  - ')}` : '경고 없음',
  ].join('\n')
}
