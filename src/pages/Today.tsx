import { useMemo, useState } from 'react'
import { notes, problemById, quizzes } from '../data'
import { useQuizStats, useReviewLog } from '../lib/store'
import { reviewState, shortDate, today } from '../lib/review'
import { href } from '../lib/router'
import { ProblemCard } from './Problems'
import { Card, Empty, Icon, SectionTitle } from '../components/ui'

export default function TodayPage() {
  const [log] = useReviewLog()
  const [stats] = useQuizStats()
  const states = notes.problems.map((p) => ({ p, rs: reviewState(p, log) }))
  const due = states.filter(({ rs }) => rs.dday !== null && rs.dday <= 0).sort((a, b) => a.rs.dday! - b.rs.dday!)
  const upcoming = states.filter(({ rs }) => rs.dday !== null && rs.dday > 0 && rs.dday <= 7).sort((a, b) => a.rs.dday! - b.rs.dday!)
  const doneToday = states.filter(({ p }) => (log[p.id] ?? []).includes(today()))

  const mistakes = [...(notes.mistakes?.items ?? [])]
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9))
  const card = mistakes.length ? mistakes[seed % mistakes.length] : null

  const quizSummary = useMemo(() => {
    const vals = Object.values(stats)
    const right = vals.reduce((n, s) => n + s.right, 0)
    const wrong = vals.reduce((n, s) => n + s.wrong, 0)
    const weak = Object.entries(stats).filter(([, s]) => s.wrong > s.right).length
    return { right, wrong, weak }
  }, [stats])

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Stat label="오늘 복습" value={due.length} accent={due.length > 0} />
        <Stat label="전체 문제" value={notes.problems.length} />
        <Stat label="퀴즈 정답률" value={quizSummary.right + quizSummary.wrong ? `${Math.round((quizSummary.right / (quizSummary.right + quizSummary.wrong)) * 100)}%` : '-'} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section>
            <SectionTitle right={<span className="text-xs text-slate-400">{shortDate(today())}</span>}>복습할 문제</SectionTitle>
            {due.length === 0 ? (
              <Empty>
                {doneToday.length > 0 ? `오늘 ${doneToday.length}문제 복습 완료! ` : '오늘 복습할 문제가 없어요. '}
                {upcoming[0] && `다음 복습은 ${shortDate(upcoming[0].rs.due!)} ${upcoming[0].p.title}`}
              </Empty>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {due.map(({ p, rs }) => (
                  <li key={p.id}>
                    <ProblemCard p={p} dday={rs.dday} to={href('/problems/' + p.id)} />
                  </li>
                ))}
              </ul>
            )}
            {due.length > 0 && (
              <a href={href('/quiz', { scope: 'due', start: '1' })} className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700">
                <Icon name="quiz" className="size-4" /> 복습 문제로 퀴즈 풀기
              </a>
            )}
          </section>

          {upcoming.length > 0 && (
            <section>
              <SectionTitle>다가오는 복습 (7일)</SectionTitle>
              <Card className="divide-y divide-slate-100 dark:divide-slate-800">
                {upcoming.map(({ p, rs }) => (
                  <a key={p.id} href={href('/problems/' + p.id)} className="flex items-center justify-between px-4 py-3 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <span className="font-medium">{p.title}</span>
                    <span className="text-slate-500">
                      {shortDate(rs.due!)} · D-{rs.dday}
                    </span>
                  </a>
                ))}
              </Card>
            </section>
          )}
        </div>

        <div className="space-y-6">
          {card && (
            <section>
              <SectionTitle
                right={
                  <button onClick={() => setSeed((s) => s + 1 + Math.floor(Math.random() * 7))} className="text-xs text-indigo-600 dark:text-indigo-300">
                    다른 거 보기
                  </button>
                }
              >
                틀렸던 포인트 한 장
              </SectionTitle>
              <Card className="p-4">
                <p className="text-[15px] leading-7 font-medium">{card.text}</p>
                {card.detail.length > 0 && <pre className="mt-2 font-mono text-[13px] leading-6 whitespace-pre-wrap text-slate-600 dark:text-slate-300">{card.detail.map((d) => d.trim()).join('\n')}</pre>}
                {card.problemId && (
                  <a href={href('/problems/' + card.problemId)} className="mt-3 inline-flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-300">
                    {problemById.get(card.problemId)?.title} 보기 <Icon name="arrow" className="size-3.5" />
                  </a>
                )}
              </Card>
            </section>
          )}

          <section>
            <SectionTitle>퀴즈</SectionTitle>
            <Card className="space-y-3 p-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                정리 파일에서 만든 문제 {quizzes.length}개
                {quizSummary.weak > 0 && ` · 자주 틀린 문제 ${quizSummary.weak}개`}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <a href={href('/quiz', { scope: 'all', start: '1' })} className="rounded-lg bg-slate-900 py-2.5 text-center text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
                  10문제 풀기
                </a>
                <a href={href('/quiz', quizSummary.weak ? { scope: 'weak', start: '1' } : {})} className="rounded-lg border border-slate-200 py-2.5 text-center text-sm font-semibold dark:border-slate-700">
                  {quizSummary.weak ? '틀린 문제 다시' : '범위 고르기'}
                </a>
              </div>
            </Card>
          </section>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <Card className="px-3 py-3 sm:px-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={accent ? 'text-2xl font-bold text-rose-600 dark:text-rose-400' : 'text-2xl font-bold'}>{value}</p>
    </Card>
  )
}
