import { useMemo } from 'react'
import { searchIndex, problemById, type SearchDoc } from '../data'
import { href } from '../lib/router'
import { Card, Empty, Tag } from '../components/ui'

const LABEL: Record<SearchDoc['kind'], string> = { problem: '문제', mistake: '틀린 포인트 · 팁', cheat: '치트시트' }

export default function SearchPage({ q }: { q: string }) {
  const results = useMemo(() => (q.trim().length >= 1 ? searchIndex.search(q.trim(), { limit: 60 }).map((r) => r.item) : []), [q])
  const grouped = (['problem', 'mistake', 'cheat'] as const).map((k) => ({ kind: k, items: results.filter((r) => r.kind === k) })).filter((g) => g.items.length)

  if (!q.trim()) return <Empty>문제 이름, 개념(예: 백트래킹, getOrDefault), 코드 일부로 찾을 수 있어요.</Empty>
  if (!results.length) return <Empty>"{q}" 에 맞는 결과가 없어요.</Empty>

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {grouped.map((g) => (
        <section key={g.kind}>
          <h3 className="mb-2 text-sm font-semibold text-slate-500">
            {LABEL[g.kind]} {g.items.length}
          </h3>
          <Card className="divide-y divide-slate-100 dark:divide-slate-800">
            {g.items.map((r) => (
              <Result key={r.kind + r.id} r={r} />
            ))}
          </Card>
        </section>
      ))}
    </div>
  )
}

function Result({ r }: { r: SearchDoc }) {
  const cls = 'block px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50'
  if (r.kind === 'problem')
    return (
      <a href={href('/problems/' + r.id)} className={cls}>
        <p className="font-semibold">{r.title}</p>
        <p className="text-sm text-slate-600 dark:text-slate-400">{r.problem.core}</p>
        <div className="mt-1.5 flex gap-1">
          {r.problem.tags.map((t) => (
            <Tag key={t} tag={t} />
          ))}
        </div>
      </a>
    )
  if (r.kind === 'mistake')
    return (
      <a href={r.item.problemId ? href('/problems/' + r.item.problemId) : href('/mistakes')} className={cls}>
        <p className="text-[15px]">{r.title}</p>
        <p className="mt-0.5 text-xs text-slate-500">{r.item.problemId ? problemById.get(r.item.problemId)?.title : r.section}</p>
      </a>
    )
  return (
    <a href={href('/cheat')} className={cls}>
      <p className="font-mono text-[13px]">{r.title}</p>
      <p className="text-sm text-slate-600 dark:text-slate-400">{r.body}</p>
      <p className="mt-0.5 text-xs text-slate-500">
        {r.section}
        {r.group && ` · ${r.group}`}
      </p>
    </a>
  )
}
