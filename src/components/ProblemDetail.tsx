import type { Problem } from '../lib/types'
import { mistakesByProblem } from '../data'
import { useReviewLog } from '../lib/store'
import { reviewState, shortDate, today } from '../lib/review'
import { href } from '../lib/router'
import { CodeBlock, HintBadge, Icon, ReviewBadge, SectionTitle, Tag, cx, Empty } from './ui'

export function Explain({ lines }: { lines: Problem['explain'] }) {
  // "내 풀이" 줄들은 따로 상자로 묶는다
  const blocks: { mine: boolean; lines: Problem['explain'] }[] = []
  for (const l of lines) {
    const last = blocks[blocks.length - 1]
    if (last && last.mine === l.mine) last.lines.push(l)
    else blocks.push({ mine: l.mine, lines: [l] })
  }
  return (
    <div className="space-y-3">
      {blocks.map((b, i) => (
        <div
          key={i}
          className={cx(
            'space-y-1 text-[15px] leading-7',
            b.mine && 'rounded-xl border-l-4 border-indigo-400 bg-indigo-50 px-4 py-3 dark:bg-indigo-500/10',
          )}
        >
          {b.lines.map((l, j) => (
            <p key={j} style={{ paddingLeft: `${Math.min(l.indent, 8) * 0.45}em` }} className={cx(l.indent > 0 && 'text-slate-600 dark:text-slate-300')}>
              {l.indent === 0 && !b.mine && <span className="mr-2 text-indigo-400">•</span>}
              {l.text.replace(/<->/g, '↔').replace(/->/g, '→')}
            </p>
          ))}
        </div>
      ))}
    </div>
  )
}

export default function ProblemDetail({ problem: p, onBack }: { problem: Problem; onBack?: () => void }) {
  const [log, setLog] = useReviewLog()
  const rs = reviewState(p, log)
  const mistakes = mistakesByProblem.get(p.id) ?? []
  const markDone = () =>
    setLog((prev) => ({ ...prev, [p.id]: [...new Set([...(prev[p.id] ?? []), today()])] }))
  const undo = () => setLog((prev) => ({ ...prev, [p.id]: (prev[p.id] ?? []).filter((d) => d !== today()) }))
  const doneToday = (log[p.id] ?? []).includes(today())

  return (
    <article className="space-y-6">
      <header className="space-y-3">
        {onBack && (
          <button onClick={onBack} className="-ml-1 flex items-center gap-1 text-sm text-slate-500 lg:hidden">
            <Icon name="back" className="size-4" /> 목록
          </button>
        )}
        <h2 className="text-2xl font-bold tracking-tight">{p.title}</h2>
        <p className="flex items-start gap-2 text-[15px] font-medium text-indigo-700 dark:text-indigo-300">
          <Icon name="arrow" className="mt-1 size-4" />
          {p.core}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          {p.tags.map((t) => (
            <Tag key={t} tag={t} auto={p.tagsAuto} />
          ))}
          {p.hint && <HintBadge />}
          {rs.dday !== null && <ReviewBadge dday={rs.dday} />}
          {p.level && <span className="text-xs text-slate-500">Lv.{p.level}</span>}
          {p.solved && <span className="text-xs text-slate-500">{shortDate(p.solved)} 풀이</span>}
        </div>
        {(rs.due || doneToday) && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm dark:bg-slate-800/60">
            {doneToday ? (
              <>
                <Icon name="check" className="size-4 text-emerald-600" />
                <span className="flex-1">오늘 복습했어요{rs.due && ` · 다음 복습 ${shortDate(rs.due)}`}</span>
                <button onClick={undo} className="text-slate-500 underline">
                  취소
                </button>
              </>
            ) : rs.dday !== null && rs.dday <= 0 ? (
              <>
                <span className="flex-1">복습할 차례예요 ({shortDate(rs.due!)})</span>
                <button onClick={markDone} className="rounded-lg bg-indigo-600 px-3 py-1.5 font-semibold text-white">
                  오늘 복습 완료
                </button>
              </>
            ) : (
              <span className="flex-1 text-slate-600 dark:text-slate-300">다음 복습 {shortDate(rs.due!)}</span>
            )}
          </div>
        )}
      </header>

      {p.explain.length > 0 && (
        <section>
          <SectionTitle>핵심 개념</SectionTitle>
          <Explain lines={p.explain} />
        </section>
      )}

      {mistakes.length > 0 && (
        <section>
          <SectionTitle>내가 틀린 부분 {mistakes.length}</SectionTitle>
          <ul className="space-y-2">
            {mistakes.map((m) => (
              <li key={m.id} className="rounded-xl border border-red-200 bg-red-50/60 px-4 py-3 dark:border-red-500/30 dark:bg-red-500/10">
                <p className="text-[15px] font-medium">{m.text}</p>
                {m.detail.length > 0 && (
                  <pre className="mt-1 font-mono text-[13px] leading-6 whitespace-pre-wrap text-slate-600 dark:text-slate-300">{m.detail.map((d) => d.trim()).join('\n')}</pre>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <SectionTitle>코드</SectionTitle>
        {p.code ? <CodeBlock html={p.codeHtml} code={p.code} /> : <Empty>이 문제는 코드 없이 개념만 정리돼 있어요.</Empty>}
      </section>

      <a
        href={href('/quiz', { problem: p.id })}
        className="flex items-center justify-center gap-2 rounded-xl border border-indigo-200 py-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 dark:border-indigo-500/40 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
      >
        <Icon name="quiz" className="size-4" /> 이 문제로 퀴즈 풀기
      </a>
    </article>
  )
}
