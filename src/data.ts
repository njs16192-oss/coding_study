import raw from 'virtual:notes'
import Fuse from 'fuse.js'
import type { ListItem, NotesData, Problem } from './lib/types'
import { buildQuizzes } from './lib/quiz'
import { TAG_ORDER } from './lib/tags'

export const notes = raw as NotesData

export const problemById = new Map<string, Problem>(notes.problems.map((p) => [p.id, p]))

export const mistakesByProblem = new Map<string, ListItem[]>()
for (const m of notes.mistakes?.items ?? []) {
  if (!m.problemId) continue
  const list = mistakesByProblem.get(m.problemId) ?? []
  list.push(m)
  mistakesByProblem.set(m.problemId, list)
}

/** 화면에 보여 줄 태그 순서: 많이 나온 순, 같으면 사전 순서 */
export const allTags: { tag: string; count: number }[] = (() => {
  const counts = new Map<string, number>()
  for (const p of notes.problems) for (const t of p.tags) counts.set(t, (counts.get(t) ?? 0) + 1)
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || TAG_ORDER.indexOf(a.tag) - TAG_ORDER.indexOf(b.tag))
})()

export const quizzes = buildQuizzes(notes)

// 검색 색인
export type SearchDoc =
  | { kind: 'problem'; id: string; title: string; body: string; problem: Problem }
  | { kind: 'mistake'; id: string; title: string; body: string; item: ListItem; section: string }
  | { kind: 'cheat'; id: string; title: string; body: string; section: string; group: string | null }

const docs: SearchDoc[] = [
  ...notes.problems.map((p) => ({
    kind: 'problem' as const,
    id: p.id,
    title: p.title,
    body: [p.core, p.tags.join(' '), ...p.explain.map((e) => e.text), p.code].join('\n'),
    problem: p,
  })),
  ...[...(notes.mistakes?.items ?? []), ...(notes.tips?.items ?? [])].map((m) => ({
    kind: 'mistake' as const,
    id: m.id,
    title: m.text,
    body: m.detail.join('\n'),
    item: m,
    section: notes.mistakes?.items.includes(m) ? notes.mistakes.title : (notes.tips?.title ?? ''),
  })),
  ...notes.cheats.flatMap((s) =>
    s.groups.flatMap((g) =>
      g.rows.map((r, i) => ({
        kind: 'cheat' as const,
        id: `${s.id}-${g.title ?? ''}-${i}`,
        title: r.code,
        body: r.desc,
        section: s.title,
        group: g.title,
      })),
    ),
  ),
]

export const searchIndex = new Fuse(docs, {
  keys: [
    { name: 'title', weight: 2 },
    { name: 'body', weight: 1 },
  ],
  threshold: 0.3,
  ignoreLocation: true,
  minMatchCharLength: 2,
})
