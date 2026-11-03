// 정리 파일 내용으로 객관식 퀴즈 만들기. 파일이 바뀌면 문제도 같이 바뀐다.
import type { ListItem, NotesData, Problem } from './types'
import { TAG_ORDER } from './tags'
import type { QuizStats } from './store'

export type QuizKind = 'method-desc' | 'desc-method' | 'problem-core' | 'problem-tag' | 'mistake-fix' | 'mistake-result' | 'custom'

export interface QuizItem {
  id: string
  kind: QuizKind
  prompt: string
  /** 문제에 같이 보여 줄 코드나 문장 */
  subject?: string
  subjectIsCode?: boolean
  answer: string
  /** 정답 외 보기 후보 (여기서 3개를 고른다) */
  pool: string[]
  optionsAreCode?: boolean
  /** 직접 쓴 오답을 그대로 쓴다 (무작위로 섞어 고르지 않음) */
  fixedOptions?: boolean
  problemId: string | null
  /** 풀고 나서 보여 줄 설명 */
  note?: string
  /** 같은 문제·유형에서 그럴듯한 오답이 3개가 안 되면: 보기 없이 떠올려 보고 정답 확인 */
  recall?: boolean
  /** 풀기 전에 펼쳐 볼 수 있는 용어 힌트 (그 문제 정리에서) */
  terms?: string[]
  source: 'cheat' | 'problem' | 'mistake' | 'custom'
}

export const KIND_LABEL: Record<QuizKind, string> = {
  'method-desc': '메소드 → 뜻',
  'desc-method': '뜻 → 메소드',
  'problem-core': '문제 → 핵심 풀이',
  'problem-tag': '문제 → 유형',
  'mistake-fix': '실수 → 고치는 법',
  'mistake-result': '실수 → 결과',
  custom: '직접 만든 문제',
}

const uniq = (xs: string[]) => [...new Set(xs)]
/** 보기에서 눈에 띄는 표시(★)는 빼서 정답이 티 나지 않게 */
const clean = (s: string) => s.replace(/[★☆]/g, '').trim()
/** "위와 같은 동작"처럼 앞 줄을 봐야 뜻이 통하는 설명은 퀴즈에서 뺀다 */
const CONTEXTUAL = /^(위|앞|이전)(와|의|에서|\s)/

/** 결과(증상)를 말하는 조각: 이런 건 "고치는 법" 보기로 쓰지 않는다 */
const RESULT = /(초과|에러|오류|Exception|깨짐|깨진|불가|못 넣음|없음|안 됨|틀림|폭발|오버플로우|날아감|느려짐|잘못 셈|의미 없는)/

/** 괄호 밖에 있는 " -> ", " => ", ". " 에서만 자른다 (람다 x -> x 같은 코드 속 화살표는 그대로) */
function splitOutside(s: string): string[] {
  const out: string[] = []
  let depth = 0
  let buf = ''
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if ('({['.includes(c)) depth++
    else if (')}]'.includes(c)) depth = Math.max(0, depth - 1)
    if (depth === 0) {
      const two = s.slice(i, i + 4)
      if (/^\s(->|=>)\s$/.test(two)) {
        out.push(buf)
        buf = ''
        i += 3
        continue
      }
      if (c === '.' && s[i + 1] === ' ' && /[가-힣]/.test(s[i - 1] ?? '')) {
        out.push(buf)
        buf = ''
        i++
        continue
      }
    }
    buf += c
  }
  out.push(buf)
  return out.map((x) => x.trim()).filter(Boolean)
}

/** 끝에 붙은 띄어 쓴 괄호 덩어리 "  ( (a + b) % m == ... )" 를 떼어 해설로. 코드 호출 "add(...)" 는 건드리지 않음 */
function splitTrailingParen(s: string): [string, string | null] {
  const t = s.trimEnd()
  if (!t.endsWith(')')) return [t, null]
  let depth = 0
  for (let i = t.length - 1; i >= 0; i--) {
    if (t[i] === ')') depth++
    else if (t[i] === '(' && --depth === 0) {
      const head = t.slice(0, i)
      if (!/\s$/.test(head) || head.replace(/\s/g, '').length < 4) return [t, null]
      return [head.trim(), t.slice(i).trim()]
    }
  }
  return [t, null]
}

/** 메모 "실수 -> 결과 => 고치는 법" 을 조각내기. 화살표 순서·종류가 섞여 있어도 결과와 고치는 법을 가른다 */
export function splitMemo(m: Pick<ListItem, 'text' | 'detail' | 'problemTag'>) {
  const tag = m.problemTag ? new RegExp(`\\s*\\(${m.problemTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^)]*\\)`) : null
  const untag = (x: string) => (tag ? x.replace(tag, '').trim() : x)
  const [issue, ...rest] = splitOutside(m.text).map(untag)
  for (const d of m.detail) if (/^\s*(->|=>)/.test(d)) rest.push(...splitOutside(d.trim().replace(/^(->|=>)\s*/, '')).map(untag))
  const extra: string[] = []
  const result = rest.filter((x) => RESULT.test(x))
  const fixes = rest
    .filter((x) => !RESULT.test(x))
    .map((x) => {
      const [head, paren] = splitTrailingParen(x)
      if (paren) extra.push(paren)
      return head
    })
  return { issue, result, fix: fixes.length ? fixes[fixes.length - 1] : null, extra }
}

export function buildQuizzes(d: NotesData): QuizItem[] {
  const out: QuizItem[] = []

  // 1, 2. 치트시트
  const seen = new Set<string>()
  for (const s of d.cheats) {
    const rows = s.groups
      .flatMap((g) => g.rows.map((r) => ({ ...r, desc: clean(r.desc), group: g.title })))
      .filter((r) => r.desc && !CONTEXTUAL.test(r.desc) && r.code.length <= 90)
    for (const r of rows) {
      if (seen.has(r.code)) continue
      seen.add(r.code)
      const sameSecDescs = rows.filter((o) => o.desc !== r.desc).map((o) => o.desc)
      const allDescs = d.cheats.flatMap((c) => c.groups.flatMap((g) => g.rows)).map((o) => clean(o.desc)).filter((d) => d && d !== r.desc && !CONTEXTUAL.test(d))
      const descPool = uniq(sameSecDescs.length >= 3 ? sameSecDescs : [...sameSecDescs, ...allDescs])
      out.push({
        id: `md:${r.code}`,
        kind: 'method-desc',
        prompt: '이 코드는 무엇을 할까?',
        subject: r.code,
        subjectIsCode: true,
        answer: r.desc,
        pool: descPool,
        problemId: null,
        note: `출처: ${s.title}${r.group ? ' · ' + r.group : ''}`,
        source: 'cheat',
      })
      if (r.desc.replace(/\s/g, '').length >= 4) {
        const codePool = uniq(rows.filter((o) => o.desc !== r.desc && o.code !== r.code).map((o) => o.code))
        if (codePool.length >= 3)
          out.push({
            id: `dm:${r.code}`,
            kind: 'desc-method',
            prompt: '설명에 맞는 코드는?',
            subject: r.desc,
            answer: r.code,
            pool: codePool,
            optionsAreCode: true,
            problemId: null,
            note: `출처: ${s.title}${r.group ? ' · ' + r.group : ''}`,
            source: 'cheat',
          })
      }
    }
  }

  // 3, 4. 문제
  const cores = d.problems.map((p) => p.core)
  const tagUniverse = uniq([...d.problems.flatMap((p) => p.tags), ...TAG_ORDER])
  for (const p of d.problems) {
    out.push({
      id: `pc:${p.id}`,
      kind: 'problem-core',
      prompt: '이 문제의 핵심 풀이는?',
      subject: p.title,
      answer: p.core,
      pool: cores.filter((c) => c !== p.core),
      problemId: p.id,
      source: 'problem',
    })
    if (p.tags.length)
      out.push({
        id: `pt:${p.id}`,
        kind: 'problem-tag',
        prompt: '이 문제의 유형은?',
        subject: `${p.title} — ${p.core}`,
        answer: p.tags[0],
        pool: tagUniverse.filter((t) => !p.tags.includes(t)),
        problemId: p.id,
        note: p.tags.length > 1 ? `유형: ${p.tags.join(', ')}` : undefined,
        source: 'problem',
      })
  }

  // 5. 틀렸던 포인트 / 팁 -> "실수 → 고치는 법", 고치는 법이 없으면 "실수 → 결과"
  const lists = [...(d.mistakes?.items ?? []), ...(d.tips?.items ?? [])]
  const memos = lists.map((m, i) => ({ m, i, ...splitMemo(m) }))
  const byId = new Map(d.problems.map((p) => [p.id, p]))
  const ownQuiz = new Map(d.customQuizzes.filter((q) => q.mistakeId).map((q) => [q.mistakeId!, q]))
  for (const cur of memos) {
    const { m } = cur
    const memo = [m.text, ...m.detail.map((x) => x.trim())].join('\n')
    const own = ownQuiz.get(m.id)
    if (own) {
      out.push({
        id: `cq:${own.id}`,
        kind: 'mistake-fix',
        prompt: own.question,
        answer: own.answer,
        pool: own.wrong,
        fixedOptions: true,
        problemId: m.problemId,
        note: [own.why, '원래 메모\n' + memo].filter(Boolean).join('\n\n'),
        source: 'mistake',
      })
      continue
    }
    const near = (pick: (x: (typeof memos)[number]) => string | null) => {
      const answer = pick(cur)!
      const mine = m.problemId ? byId.get(m.problemId) : undefined
      // 문제에 연결된 메모: 같은 문제 -> 같은 유형 문제의 메모만 오답으로 (엉뚱한 문제 보기는 바로 티가 남)
      const related = (o: (typeof memos)[number]) => {
        if (!mine) return true
        if (o.m.problemId === mine.id) return true
        const other = o.m.problemId ? byId.get(o.m.problemId) : undefined
        return !!other && other.tags.some((t) => mine.tags.includes(t))
      }
      return uniq(
        memos
          .filter((o) => o !== cur && pick(o) && pick(o) !== answer && related(o))
          .map((o) => {
            const len = pick(o)!.length / answer.length
            // 같은 문제·가까운 줄(비슷한 주제)·비슷한 길이일수록 앞에
            const score = Math.abs(o.i - cur.i) - (m.problemId && o.m.problemId === m.problemId ? 1000 : 0) + (len > 2.5 || len < 0.4 ? 15 : 0)
            return { v: pick(o)!, score }
          })
          .sort((a, b) => a.score - b.score)
          .map((x) => x.v),
      ).slice(0, 6)
    }
    // 해설: 질문·정답에 이미 나온 줄(화살표 줄)은 빼고, 메모의 나머지 설명과 떼어 낸 괄호 공식만
    const explain = [...m.detail.filter((x) => !/^\s*(->|=>)/.test(x)).map((x) => x.trim()), ...cur.extra].filter(Boolean).join('\n') || undefined
    if (cur.fix) {
      const fixPool = near((x) => x.fix)
      out.push({
        id: `mf:${m.id}`,
        kind: 'mistake-fix',
        prompt: '이 실수, 어떻게 고칠까?',
        subject: cur.result.length ? `${cur.issue}\n→ ${cur.result.join(' → ')}` : cur.issue,
        answer: cur.fix,
        pool: fixPool,
        recall: fixPool.length < 3 && !!m.problemId,
        problemId: m.problemId,
        note: explain,
        source: 'mistake',
      })
    } else if (cur.result.length) {
      const resultPool = near((x) => (x.result.length ? x.result.join(' → ') : null))
      out.push({
        id: `mr:${m.id}`,
        kind: 'mistake-result',
        prompt: '이렇게 하면 어떻게 될까?',
        subject: cur.issue,
        answer: cur.result.join(' → '),
        pool: resultPool,
        recall: resultPool.length < 3 && !!m.problemId,
        problemId: m.problemId,
        note: explain,
        source: 'mistake',
      })
    }
  }

  // 6. 직접 만든 @quiz (틀렸던 포인트 아래에 적은 건 위에서 처리)
  const free = d.customQuizzes.filter((q) => !q.mistakeId)
  for (const q of free) {
    const others = free.filter((o) => o !== q).flatMap((o) => [o.answer, ...o.wrong])
    out.push({
      id: `cq:${q.id}`,
      kind: 'custom',
      prompt: q.question,
      answer: q.answer,
      pool: q.wrong.length >= 3 ? q.wrong : uniq([...q.wrong, ...others.filter((o) => o !== q.answer)]),
      fixedOptions: true,
      problemId: q.problemId,
      note: q.why ?? undefined,
      source: 'custom',
    })
  }

  for (const q of out) {
    const p = q.problemId ? byId.get(q.problemId) : undefined
    // 문제 풀이 퀴즈(문제 → 핵심)는 용어 설명이 곧 정답 힌트라서 빼기
    if (p && q.source !== 'problem') q.terms = termsFor(q, p)
  }
  return out.filter((q) => q.pool.length >= 1 || q.recall)
}

/** 직접 쓴 @terms 는 항상, 자동으로 찾은 용어는 카드(질문·보기)에 그 말이 나올 때만 */
function termsFor(q: QuizItem, p: Problem): string[] | undefined {
  const text = [q.prompt, q.subject ?? '', q.answer].join('\n').toLowerCase()
  const words = (x: string) => x.toLowerCase().split(/[\s,.()"'·]+/).filter((w) => w.length >= 2)
  const ans = words(q.answer)
  // 용어 설명이 정답을 거의 그대로 담고 있으면 힌트가 아니라 정답 공개라서 뺀다
  const givesAway = (t: string) => {
    const tw = new Set(words(t))
    return ans.length > 0 && ans.filter((w) => tw.has(w)).length / ans.length >= 0.5
  }
  const picked = p.terms.filter((t) => t.manual || (text.includes(t.term.toLowerCase()) && !givesAway(t.text)))
  return picked.length ? picked.map((t) => t.text) : undefined
}

function shuffle<T>(xs: T[]): T[] {
  const a = xs.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export interface QuizQuestion extends QuizItem {
  options: string[]
}

/** 직접 쓴 오답은 우선, 모자라면 후보에서 무작위로 채워 4지선다 */
export function toQuestion(q: QuizItem): QuizQuestion {
  if (q.recall) return { ...q, options: [] }
  const wrong = q.fixedOptions ? q.pool.slice(0, 3) : shuffle(q.pool).slice(0, 3)
  return { ...q, options: shuffle([q.answer, ...wrong]) }
}

/** 틀린 적 있는 문제는 더 자주, 여러 번 맞힌 문제는 덜 나오도록 가중치 추첨 */
export function pickQuestions(items: QuizItem[], stats: QuizStats, count: number): QuizQuestion[] {
  const pool = items.map((q) => {
    const s = stats[q.id]
    const w = s ? Math.max(0.3, 1 + s.wrong * 2 - s.right * 0.5) : 1.2
    return { q, key: Math.random() ** (1 / w) }
  })
  pool.sort((a, b) => b.key - a.key)
  return pool.slice(0, count).map((p) => toQuestion(p.q))
}
