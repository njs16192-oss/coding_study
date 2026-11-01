import { notes, problemById } from '../data'
import { useChecks } from '../lib/store'
import { href } from '../lib/router'
import type { ListItem } from '../lib/types'
import { Card, Icon, cx } from '../components/ui'

export default function MistakesPage() {
  const [checks, setChecks] = useChecks()
  const items = notes.mistakes?.items ?? []

  // 문제에 연결된 것은 문제별로, 나머지는 "공통"
  const groups: { key: string; title: string; problemId: string | null; items: ListItem[] }[] = []
  const common: ListItem[] = []
  for (const it of items) {
    if (!it.problemId) {
      common.push(it)
      continue
    }
    let g = groups.find((x) => x.problemId === it.problemId)
    if (!g) {
      g = { key: it.problemId, title: problemById.get(it.problemId)?.title ?? it.problemTag ?? '', problemId: it.problemId, items: [] }
      groups.push(g)
    }
    g.items.push(it)
  }
  const all = [...(common.length ? [{ key: 'common', title: '공통 (문제 태그 없음)', problemId: null, items: common }] : []), ...groups]
  const checkedCount = items.filter((i) => checks[i.id]).length

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold">{notes.mistakes?.title.replace(/^\d+\.\s*/, '') ?? '틀렸던 포인트'}</h2>
          <p className="text-sm text-slate-500">
            {items.length}개 · 확인 {checkedCount}개
          </p>
        </div>
        {checkedCount > 0 && (
          <button onClick={() => setChecks(() => ({}))} className="text-sm text-indigo-600 underline dark:text-indigo-300">
            체크 모두 지우기
          </button>
        )}
      </div>
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
        항목 끝에 <code className="font-mono">(문제명)</code> 을 붙이면 그 문제 카드에 자동으로 연결돼요. 예: <code className="font-mono">- 시작칸도 방문 처리하기 (게임 맵 최단거리)</code>
      </p>

      <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
        {all.map((g) => (
          <a key={g.key} href={`#mistakes`} onClick={(e) => { e.preventDefault(); document.getElementById('g-' + g.key)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }} className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm whitespace-nowrap dark:border-slate-700 dark:bg-slate-900">
            {g.problemId ? g.title : '공통'} <span className="opacity-60">{g.items.length}</span>
          </a>
        ))}
      </div>

      {all.map((g) => (
        <section key={g.key} id={'g-' + g.key} className="scroll-mt-20">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold">{g.title}</h3>
            {g.problemId && (
              <a href={href('/problems/' + g.problemId)} className="flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-300">
                문제 보기 <Icon name="arrow" className="size-3.5" />
              </a>
            )}
          </div>
          <Card className="divide-y divide-slate-100 dark:divide-slate-800">
            {g.items.map((it) => (
              <label key={it.id} className="flex cursor-pointer gap-3 px-4 py-3">
                <input
                  type="checkbox"
                  checked={!!checks[it.id]}
                  onChange={() => setChecks((prev) => ({ ...prev, [it.id]: !prev[it.id] }))}
                  className="mt-1.5 size-4 shrink-0 accent-indigo-600"
                />
                <div className={cx('min-w-0', checks[it.id] && 'opacity-50')}>
                  <p className="text-[15px] leading-7">{it.text}</p>
                  {it.detail.length > 0 && (
                    <pre className="mt-0.5 overflow-x-auto font-mono text-[13px] leading-6 whitespace-pre-wrap text-slate-600 dark:text-slate-300">{it.detail.map((d) => d.trim()).join('\n')}</pre>
                  )}
                </div>
              </label>
            ))}
          </Card>
        </section>
      ))}
    </div>
  )
}
