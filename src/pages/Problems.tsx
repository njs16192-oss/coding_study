import { useMemo } from 'react'
import { allTags, notes, problemById, mistakesByProblem } from '../data'
import { useReviewLog } from '../lib/store'
import { reviewState } from '../lib/review'
import { go, href } from '../lib/router'
import type { Problem } from '../lib/types'
import ProblemDetail from '../components/ProblemDetail'
import { Card, Empty, HintBadge, Icon, ReviewBadge, Tag, cx } from '../components/ui'

type Sort = 'file' | 'new' | 'review' | 'name'
const SORTS: { key: Sort; label: string }[] = [
  { key: 'new', label: '최근 추가순' },
  { key: 'file', label: '파일 순서' },
  { key: 'review', label: '복습일순' },
  { key: 'name', label: '이름순' },
]

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        'shrink-0 rounded-full border px-3 py-1 text-sm whitespace-nowrap',
        on
          ? 'border-indigo-600 bg-indigo-600 text-white dark:border-indigo-400 dark:bg-indigo-500'
          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
      )}
    >
      {children}
    </button>
  )
}

export default function ProblemsPage({ id, query }: { id: string | null; query: URLSearchParams }) {
  const [log] = useReviewLog()
  const tags = query.getAll('tag')
  const hint = query.get('hint') === '1'
  const due = query.get('due') === '1'
  const sort = (query.get('sort') as Sort) || 'new'

  const setQuery = (patch: (q: URLSearchParams) => void) => {
    const q = new URLSearchParams(query)
    patch(q)
    go('/problems' + (id ? '/' + id : ''), q)
  }
  const toggleTag = (t: string) =>
    setQuery((q) => {
      const cur = q.getAll('tag')
      q.delete('tag')
      for (const x of cur.includes(t) ? cur.filter((c) => c !== t) : [...cur, t]) q.append('tag', x)
    })
  const toggle = (key: string) => setQuery((q) => (q.get(key) === '1' ? q.delete(key) : q.set(key, '1')))

  const list = useMemo(() => {
    let ps = notes.problems.map((p, i) => ({ p, i, rs: reviewState(p, log) }))
    if (tags.length) ps = ps.filter(({ p }) => p.tags.some((t) => tags.includes(t)))
    if (hint) ps = ps.filter(({ p }) => p.hint)
    if (due) ps = ps.filter(({ rs }) => rs.dday !== null && rs.dday <= 0)
    if (sort === 'new') ps.reverse()
    if (sort === 'name') ps.sort((a, b) => a.p.title.localeCompare(b.p.title, 'ko'))
    if (sort === 'review') ps.sort((a, b) => (a.rs.dday ?? 9999) - (b.rs.dday ?? 9999))
    return ps
  }, [tags.join(','), hint, due, sort, log])

  const selected = id ? problemById.get(id) : undefined
  const listQuery = new URLSearchParams(query)
  const dueCount = notes.problems.filter((p) => {
    const d = reviewState(p, log).dday
    return d !== null && d <= 0
  }).length

  const filters = (vertical: boolean) => (
    <div className={cx(vertical ? 'space-y-5' : 'space-y-2')}>
      <div>
        {vertical && <p className="mb-2 text-xs font-semibold text-slate-500">유형</p>}
        <div className={cx('flex gap-1.5', vertical ? 'flex-wrap' : 'no-scrollbar -mx-4 overflow-x-auto px-4')}>
          {!vertical && (
            <>
              <Chip on={hint} onClick={() => toggle('hint')}>
                힌트 봄
              </Chip>
              <Chip on={due} onClick={() => toggle('due')}>
                복습 필요 {dueCount > 0 && dueCount}
              </Chip>
              <span className="mx-1 w-px shrink-0 bg-slate-200 dark:bg-slate-700" />
            </>
          )}
          {allTags.map(({ tag, count }) => (
            <Chip key={tag} on={tags.includes(tag)} onClick={() => toggleTag(tag)}>
              {tag} <span className="opacity-60">{count}</span>
            </Chip>
          ))}
        </div>
      </div>
      {vertical && (
        <div>
          <p className="mb-2 text-xs font-semibold text-slate-500">상태</p>
          <div className="flex flex-wrap gap-1.5">
            <Chip on={hint} onClick={() => toggle('hint')}>
              힌트 본 문제
            </Chip>
            <Chip on={due} onClick={() => toggle('due')}>
              복습 필요 {dueCount > 0 && dueCount}
            </Chip>
          </div>
        </div>
      )}
      <div className={cx('flex items-center gap-2', !vertical && 'justify-between')}>
        {!vertical && <span className="text-sm text-slate-500">{list.length}문제</span>}
        <select
          value={sort}
          onChange={(e) => setQuery((q) => q.set('sort', e.target.value))}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          {SORTS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      {vertical && (tags.length > 0 || hint || due) && (
        <button onClick={() => go('/problems' + (id ? '/' + id : ''), { sort: query.get('sort') })} className="text-sm text-indigo-600 underline dark:text-indigo-300">
          필터 초기화
        </button>
      )}
    </div>
  )

  return (
    <div className="lg:grid lg:grid-cols-[220px_minmax(300px,380px)_1fr] lg:gap-6">
      {/* 왼쪽 필터 (PC) */}
      <aside className="hidden lg:block">
        <div className="sticky top-20">{filters(true)}</div>
      </aside>

      {/* 목록: 모바일에서는 상세가 열리면 숨김 */}
      <section className={cx(selected && 'hidden lg:block')}>
        <div className="mb-3 lg:hidden">{filters(false)}</div>
        <p className="mb-2 hidden text-sm text-slate-500 lg:block">{list.length}문제</p>
        {list.length === 0 && <Empty>조건에 맞는 문제가 없어요.</Empty>}
        <ul className="space-y-2 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:pr-1">
          {list.map(({ p, rs }) => (
            <li key={p.id}>
              <ProblemCard p={p} dday={rs.dday} active={p.id === id} to={href('/problems/' + p.id, listQuery)} />
            </li>
          ))}
        </ul>
      </section>

      {/* 상세 */}
      <section className={cx(!selected && 'hidden lg:block')}>
        {selected ? (
          <div className="lg:max-w-3xl">
            <ProblemDetail problem={selected} onBack={() => go('/problems', listQuery)} />
          </div>
        ) : id ? (
          <Empty>문제를 찾을 수 없어요. 파일에서 이름이 바뀌었을 수 있어요.</Empty>
        ) : (
          <Card className="hidden p-8 text-center text-slate-500 lg:block">
            <Icon name="list" className="mx-auto mb-3 size-8 text-slate-300" />
            왼쪽 목록에서 문제를 고르세요.
            <p className="mt-2 text-sm">
              전체 {notes.problems.length}문제 · 힌트 본 문제 {notes.problems.filter((p) => p.hint).length} · 오늘 복습 {dueCount}
            </p>
          </Card>
        )}
      </section>
    </div>
  )
}

export function ProblemCard({ p, dday, active, to }: { p: Problem; dday: number | null; active?: boolean; to: string }) {
  const mistakeCount = mistakesByProblem.get(p.id)?.length ?? 0
  return (
    <a
      href={to}
      className={cx(
        'block rounded-xl border px-4 py-3 transition',
        active
          ? 'border-indigo-400 bg-indigo-50 ring-1 ring-indigo-400 dark:border-indigo-400 dark:bg-indigo-500/10'
          : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold">{p.title}</h3>
        {mistakeCount > 0 && <span className="shrink-0 text-xs text-red-600 dark:text-red-300">틀린 부분 {mistakeCount}</span>}
      </div>
      <p className="mt-0.5 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">{p.core}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {p.tags.map((t) => (
          <Tag key={t} tag={t} />
        ))}
        {p.hint && <HintBadge />}
        {dday !== null && <ReviewBadge dday={dday} />}
      </div>
    </a>
  )
}
