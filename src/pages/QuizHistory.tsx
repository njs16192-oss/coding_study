// 지금까지 푼 퀴즈 기록: 판별 점수, 문제마다 내가 고른 답 / 정답 / 해설
import { useMemo, useState } from 'react'
import { problemById, quizzes } from '../data'
import { toQuestion, KIND_LABEL, type QuizKind, type QuizQuestion } from '../lib/quiz'
import { useQuizHistory, useQuizRun, type QuizAnswerRecord, type QuizSession } from '../lib/store'
import { go, href } from '../lib/router'
import { Card, Empty, Icon, cx } from '../components/ui'

export const fmtDate = (iso: string) => {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function AnswerRow({ a }: { a: QuizAnswerRecord }) {
  const [open, setOpen] = useState(false)
  return (
    <li className="rounded-xl border border-slate-200 bg-white text-sm dark:border-slate-800 dark:bg-slate-900">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-start gap-3 px-4 py-3 text-left">
        <Icon name={a.ok ? 'check' : 'x'} className={cx('mt-0.5 size-4 shrink-0', a.ok ? 'text-emerald-600' : 'text-red-500')} />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-slate-400">{KIND_LABEL[a.kind as QuizKind] ?? ''}</p>
          <p className={cx('break-words whitespace-pre-line', a.subjectIsCode && 'font-mono text-[13px]')}>{a.subject ?? a.prompt}</p>
          <p className={cx('text-slate-500', a.optionsAreCode && 'font-mono text-[13px]')}>→ {a.answer}</p>
          {!a.ok && <p className={cx('text-red-500', a.optionsAreCode && 'font-mono text-[13px]')}>내 답: {a.picked}</p>}
        </div>
        <Icon name="back" className={cx('mt-0.5 size-4 shrink-0 text-slate-400 transition', open ? 'rotate-90' : '-rotate-90')} />
      </button>
      {open && (
        <div className="space-y-2 border-t border-slate-100 px-4 py-3 dark:border-slate-800">
          {a.subject && <p className="font-medium">{a.prompt}</p>}
          <ul className="space-y-1">
            {a.options.map((o, i) => (
              <li
                key={i}
                className={cx(
                  'rounded-lg px-3 py-1.5 break-words',
                  a.optionsAreCode && 'font-mono text-[13px]',
                  o === a.answer ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200' : o === a.picked ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-200' : 'text-slate-500',
                )}
              >
                {i + 1}. {o}
                {o === a.picked && <span className="ml-1 text-xs opacity-70">(내 선택)</span>}
              </li>
            ))}
          </ul>
          {a.note && (
            <>
              <p className="pt-1 text-xs font-semibold text-slate-500">해설</p>
              <pre className="font-sans whitespace-pre-wrap text-slate-600 dark:text-slate-300">{a.note}</pre>
            </>
          )}
          {a.problemId && problemById.get(a.problemId) && (
            <a href={href('/problems/' + a.problemId)} className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-300">
              {problemById.get(a.problemId)!.title} 정리 보기 <Icon name="arrow" className="size-3.5" />
            </a>
          )}
        </div>
      )}
    </li>
  )
}

export default function QuizHistory() {
  const [log, setLog] = useQuizHistory()
  const [run, setRun] = useQuizRun<QuizQuestion>()
  const [wrongOnly, setWrongOnly] = useState(false)
  const [openId, setOpenId] = useState<string | null>(log[0]?.id ?? null)
  const byId = useMemo(() => new Map(quizzes.map((q) => [q.id, q])), [])

  const total = log.reduce((n, s) => n + s.answers.length, 0)
  const right = log.reduce((n, s) => n + s.answers.filter((a) => a.ok).length, 0)

  // 기록의 틀린 문제로 새 판 시작 (정리 파일이 바뀌어 없어진 문제는 빼고)
  const retry = (sessions: QuizSession[], label: string) => {
    const ids = [...new Set(sessions.flatMap((s) => s.answers.filter((a) => !a.ok).map((a) => a.qid)))]
    const qs = ids.map((id) => byId.get(id)).filter((q) => !!q).slice(0, 20).map((q) => toQuestion(q!))
    if (!qs.length) return
    const now = new Date()
    setRun(() => ({ id: String(now.getTime()), at: now.toISOString(), scopeKey: 'history', scopeLabel: label, questions: qs, idx: 0, picked: null, picks: [], results: [] }))
    go('/quiz')
  }
  const wrongCount = new Set(log.flatMap((s) => s.answers.filter((a) => !a.ok).map((a) => a.qid))).size

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center gap-2">
        <a href={href('/quiz')} className="-ml-2 rounded-lg p-1 text-slate-500" aria-label="퀴즈로">
          <Icon name="back" />
        </a>
        <h2 className="text-xl font-bold">푼 퀴즈 기록</h2>
      </div>

      {!log.length ? (
        <Empty>아직 푼 퀴즈가 없어요. 한 문제만 풀어도 여기 남아요.</Empty>
      ) : (
        <>
          <Card className="grid grid-cols-3 divide-x divide-slate-200 p-4 text-center dark:divide-slate-800">
            <div>
              <p className="text-2xl font-bold">{log.length}</p>
              <p className="text-xs text-slate-500">판</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{total}</p>
              <p className="text-xs text-slate-500">푼 문제</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{total ? Math.round((right / total) * 100) : 0}%</p>
              <p className="text-xs text-slate-500">정답률</p>
            </div>
          </Card>

          <div className="flex flex-wrap items-center gap-2">
            {wrongCount > 0 && (
              <button onClick={() => retry(log, '기록 · 틀린 문제')} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">
                틀렸던 {Math.min(wrongCount, 20)}문제 다시 풀기
              </button>
            )}
            <label className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={wrongOnly} onChange={(e) => setWrongOnly(e.target.checked)} />
              틀린 것만 보기
            </label>
            <button
              onClick={() => confirm('푼 퀴즈 기록을 모두 지울까요? (맞힌/틀린 횟수 통계는 남아요)') && setLog(() => [])}
              className="ml-auto text-sm text-slate-400 hover:text-red-500"
            >
              기록 지우기
            </button>
          </div>

          <ul className="space-y-3">
            {log.map((s) => {
              const ok = s.answers.filter((a) => a.ok).length
              const shown = wrongOnly ? s.answers.filter((a) => !a.ok) : s.answers
              if (wrongOnly && !shown.length) return null
              const open = openId === s.id
              return (
                <li key={s.id}>
                  <button
                    onClick={() => setOpenId(open ? null : s.id)}
                    className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{s.scopeLabel}</p>
                      <p className="text-xs text-slate-500">
                        {fmtDate(s.at)}
                        {s.answers.length < s.total &&
                          (run?.id === s.id ? ` · 풀고 있음 (${s.answers.length}/${s.total})` : ` · ${s.total}문제 중 ${s.answers.length}문제에서 멈춤`)}
                      </p>
                    </div>
                    <span className={cx('text-sm font-semibold tabular-nums', ok === s.answers.length ? 'text-emerald-600' : 'text-slate-700 dark:text-slate-200')}>
                      {ok} / {s.answers.length}
                    </span>
                    <Icon name="back" className={cx('size-4 text-slate-400 transition', open ? 'rotate-90' : '-rotate-90')} />
                  </button>
                  {open && (
                    <div className="mt-2 space-y-2 pl-2">
                      <ul className="space-y-2">
                        {shown.map((a, i) => (
                          <AnswerRow key={i} a={a} />
                        ))}
                      </ul>
                      {run?.id === s.id && run.idx < run.questions.length && (
                        <a href={href('/quiz')} className="mr-4 text-sm font-semibold text-indigo-600 dark:text-indigo-300">
                          이어서 풀기
                        </a>
                      )}
                      {ok < s.answers.length && (
                        <button onClick={() => retry([s], s.scopeLabel + ' · 틀린 문제')} className="text-sm text-indigo-600 dark:text-indigo-300">
                          이 판에서 틀린 문제 다시 풀기
                        </button>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
