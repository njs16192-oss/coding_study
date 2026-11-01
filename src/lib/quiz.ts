// 정리 파일 내용으로 객관식 퀴즈 만들기. 파일이 바뀌면 문제도 같이 바뀐다.
import type { NotesData } from './types'
import { TAG_ORDER } from './tags'
import type { QuizStats } from './store'

export type QuizKind = 'method-desc' | 'desc-method' | 'problem-core' | 'problem-tag' | 'mistake-fix' | 'custom'

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
  problemId: string | null
  /** 풀고 나서 보여 줄 설명 */
  note?: string
  source: 'cheat' | 'problem' | 'mistake' | 'custom'
}

export const KIND_LABEL: Record<QuizKind, string> = {
  'method-desc': '메소드 → 뜻',
  'desc-method': '뜻 → 메소드',
  'problem-core': '문제 → 핵심 풀이',
  'problem-tag': '문제 → 유형',
  'mistake-fix': '실수 → 고치는 법',
  custom: '직접 만든 문제',
}

const uniq = (xs: string[]) => [...new Set(xs)]
/** 보기에서 눈에 띄는 표시(★)는 빼서 정답이 티 나지 않게 */
const clean = (s: string) => s.replace(/[★☆]/g, '').trim()

export function buildQuizzes(d: NotesData): QuizItem[] {
  const out: QuizItem[] = []

  // 1, 2. 치트시트
  const seen = new Set<string>()
  for (const s of d.cheats) {
    const rows = s.groups
      .flatMap((g) => g.rows.map((r) => ({ ...r, desc: clean(r.desc), group: g.title })))
      .filter((r) => r.desc && r.code.length <= 90)
    for (const r of rows) {
      if (seen.has(r.code)) continue
      seen.add(r.code)
      const sameSecDescs = rows.filter((o) => o.desc !== r.desc).map((o) => o.desc)
      const allDescs = d.cheats.flatMap((c) => c.groups.flatMap((g) => g.rows)).map((o) => clean(o.desc)).filter((d) => d && d !== r.desc)
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

  // 5. 틀렸던 포인트 / 팁 -> 고치는 법
  const lists = [...(d.mistakes?.items ?? []), ...(d.tips?.items ?? [])]
  const fixes = uniq(lists.map((m) => m.fix).filter((f): f is string => !!f))
  for (const m of lists) {
    if (!m.fix) continue
    const issue = m.text.includes(' -> ' + m.fix) ? m.text.slice(0, m.text.lastIndexOf(' -> ')).trim() : m.text
    out.push({
      id: `mf:${m.id}`,
      kind: 'mistake-fix',
      prompt: '이 실수, 어떻게 고칠까?',
      subject: issue,
      answer: m.fix,
      pool: fixes.filter((f) => f !== m.fix),
      problemId: m.problemId,
      note: m.detail.filter((x) => !x.trim().startsWith('->')).map((x) => x.trim()).join('\n') || undefined,
      source: 'mistake',
    })
  }

  // 6. 직접 만든 @quiz
  for (const q of d.customQuizzes) {
    const others = d.customQuizzes.filter((o) => o !== q).flatMap((o) => [o.answer, ...o.wrong])
    out.push({
      id: `cq:${q.id}`,
      kind: 'custom',
      prompt: q.question,
      answer: q.answer,
      pool: q.wrong.length >= 3 ? q.wrong : uniq([...q.wrong, ...others.filter((o) => o !== q.answer)]),
      problemId: q.problemId,
      source: 'custom',
    })
  }

  return out.filter((q) => q.pool.length >= 1)
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
  const wrong = q.kind === 'custom' ? q.pool.slice(0, 3) : shuffle(q.pool).slice(0, 3)
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
