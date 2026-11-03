import { useEffect, useMemo, useState } from 'react'
import { allTags, notes, problemById, quizzes } from '../data'
import { HISTORY_LIMIT, useQuizHistory, useQuizRun, useQuizStats, useReviewLog, type QuizAnswerRecord } from '../lib/store'
import { reviewState, today } from '../lib/review'
import { KIND_LABEL, pickQuestions, toQuestion, type QuizItem, type QuizQuestion } from '../lib/quiz'
import { go, href } from '../lib/router'
import { Card, Empty, Icon, cx } from '../components/ui'
import QuizHistory, { fmtDate } from './QuizHistory'

const COUNT = 10

interface Scope {
  key: string
  label: string
  desc: string
  filter: (q: QuizItem) => boolean
}

function useScopes(): Scope[] {
  const [log] = useReviewLog()
  const [stats] = useQuizStats()
  const due = new Set(
    notes.problems
      .filter((p) => {
        const d = reviewState(p, log).dday
        return d !== null && d <= 0
      })
      .map((p) => p.id),
  )
  return [
    { key: 'all', label: '전체', desc: '모든 유형 섞어서', filter: () => true },
    { key: 'cheat', label: '메소드', desc: '치트시트 메소드 ↔ 뜻', filter: (q) => q.source === 'cheat' },
    { key: 'problem', label: '문제 풀이', desc: '문제별 핵심 풀이·유형', filter: (q) => q.source === 'problem' },
    { key: 'mistake', label: '틀렸던 포인트', desc: '실수 → 고치는 법', filter: (q) => q.source === 'mistake' },
    { key: 'due', label: '오늘 복습', desc: `복습할 ${due.size}문제 관련`, filter: (q) => !!q.problemId && due.has(q.problemId) },
    { key: 'weak', label: '자주 틀린 문제', desc: '맞힌 것보다 틀린 게 많은 문제', filter: (q) => !!stats[q.id] && stats[q.id].wrong > stats[q.id].right },
    ...(notes.customQuizzes.length ? [{ key: 'custom', label: '직접 만든 문제', desc: '@quiz 로 적은 문제', filter: (q: QuizItem) => q.source === 'custom' }] : []),
    ...allTags.map(({ tag }) => ({
      key: 'tag:' + tag,
      label: tag,
      desc: '유형별',
      filter: (q: QuizItem) => !!q.problemId && !!problemById.get(q.problemId)?.tags.includes(tag),
    })),
  ]
}


export default function QuizPage({ sub, query }: { sub: string | null; query: URLSearchParams }) {
  if (sub === 'history') return <QuizHistory />
  return <QuizPlay query={query} />
}

function QuizPlay({ query }: { query: URLSearchParams }) {
  const scopes = useScopes()
  const [stats, setStats] = useQuizStats()
  const [log, setLog] = useQuizHistory()
  const [run, setRun] = useQuizRun<QuizQuestion>()
  const scopeParam = query.get('scope') ?? 'all'
  const problemId = query.get('problem') ?? (scopeParam.startsWith('problem:') ? scopeParam.slice(8) : null)
  const scope: Scope = problemId
    ? { key: 'problem:' + problemId, label: problemById.get(problemId)?.title ?? '문제', desc: '', filter: (q) => q.problemId === problemId }
    : (scopes.find((s) => s.key === scopeParam) ?? scopes[0])
  const pool = useMemo(() => quizzes.filter(scope.filter), [scope.key, stats])

  const begin = (questions: QuizQuestion[], key = scope.key, label = scope.label) => {
    const now = new Date()
    setRun(() => ({ id: String(now.getTime()), at: now.toISOString(), scopeKey: key, scopeLabel: label, questions, idx: 0, picked: null, picks: [], results: [] }))
  }
  const start = () => begin(pickQuestions(pool, stats, COUNT))

  // 링크로 들어오면 (?start=1 또는 ?problem=) 시작. 같은 범위를 풀던 중이면 이어서.
  // 주소에서 start 를 지워 두어, 다른 화면에 갔다가 "뒤로" 와도 새로 시작되지 않게 한다.
  useEffect(() => {
    const trigger = query.get('start') === '1' || !!query.get('problem')
    if (!trigger) return
    const unfinished = run && run.idx < run.questions.length
    if (!(unfinished && run.scopeKey === scope.key) && pool.length) start()
    window.history.replaceState(null, '', href('/quiz', { scope: scope.key }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  if (!run) {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <div>
          <h2 className="text-xl font-bold">복습 퀴즈</h2>
          <p className="text-sm text-slate-500">정리 파일에서 자동으로 만든 4지선다 {quizzes.length}문제. 틀린 문제는 다음에 더 자주 나와요.</p>
        </div>
        <a href={href('/quiz/history')} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900">
          <Icon name="clock" className="size-5 text-indigo-500" />
          <span className="flex-1">
            <span className="font-semibold">푼 퀴즈 기록</span>
            <span className="ml-2 text-slate-500">{log.length ? `${log.length}판 · 최근 ${fmtDate(log[0].at)}` : '아직 없음'}</span>
          </span>
          <Icon name="arrow" className="size-4 text-slate-400" />
        </a>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {scopes
            .filter((s) => !s.key.startsWith('tag:'))
            .map((s) => {
              const n = quizzes.filter(s.filter).length
              return (
                <button
                  key={s.key}
                  disabled={!n}
                  onClick={() => go('/quiz', { scope: s.key })}
                  className={cx(
                    'rounded-xl border p-3 text-left disabled:opacity-40',
                    scope.key === s.key ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500 dark:bg-indigo-500/10' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900',
                  )}
                >
                  <p className="font-semibold">{s.label}</p>
                  <p className="text-xs text-slate-500">
                    {s.desc} · {n}
                  </p>
                </button>
              )
            })}
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold text-slate-500">유형별</p>
          <div className="flex flex-wrap gap-1.5">
            {scopes
              .filter((s) => s.key.startsWith('tag:'))
              .map((s) => (
                <button
                  key={s.key}
                  onClick={() => go('/quiz', { scope: s.key })}
                  className={cx(
                    'rounded-full border px-3 py-1 text-sm',
                    scope.key === s.key ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900',
                  )}
                >
                  {s.label} <span className="opacity-60">{quizzes.filter(s.filter).length}</span>
                </button>
              ))}
          </div>
        </div>
        <button
          disabled={!pool.length}
          onClick={start}
          className="w-full rounded-xl bg-indigo-600 py-3.5 font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
        >
          {scope.label} {Math.min(COUNT, pool.length)}문제 시작
        </button>
      </div>
    )
  }

  const { questions, idx, picked, results } = run
  const label = run.scopeLabel
  if (!questions.length) return <Empty>이 범위에는 퀴즈가 없어요.</Empty>

  const quit = () => setRun(() => null)
  const changeScope = () => {
    const key = run.scopeKey
    setRun(() => null)
    go('/quiz', { scope: key.startsWith('problem:') ? 'all' : key })
  }
  const again = () => {
    const key = run.scopeKey
    const sc = key.startsWith('problem:') ? { filter: (q: QuizItem) => q.problemId === key.slice(8) } : (scopes.find((s) => s.key === key) ?? scopes[0])
    begin(pickQuestions(quizzes.filter(sc.filter), stats, COUNT), key, label)
  }
  const retryWrong = () => begin(questions.filter((_, i) => !results[i]).map((q) => toQuestion(q)), run.scopeKey, label + ' · 틀린 문제')

  // 결과 화면
  if (idx >= questions.length) {
    const right = results.filter(Boolean).length
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <Card className="p-6 text-center">
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-1 text-4xl font-bold">
            {right} / {questions.length}
          </p>
          <p className="mt-1 text-sm text-slate-500">{right === questions.length ? '전부 맞혔어요!' : '틀린 문제는 다음 퀴즈에 더 자주 나와요.'}</p>
        </Card>
        <ul className="space-y-2">
          {questions.map((q, i) => (
            <li key={i} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900">
              <Icon name={results[i] ? 'check' : 'x'} className={cx('mt-0.5 size-4', results[i] ? 'text-emerald-600' : 'text-red-500')} />
              <div className="min-w-0 flex-1">
                <p className={cx(q.subjectIsCode && 'font-mono text-[13px]', 'break-words whitespace-pre-line')}>{q.subject ?? q.prompt}</p>
                <p className={cx('text-slate-500', q.optionsAreCode && 'font-mono text-[13px]')}>→ {q.answer}</p>
                {!results[i] && <p className={cx('text-red-500', q.optionsAreCode && 'font-mono text-[13px]')}>내 답: {run.picks[i]}</p>}
              </div>
              {q.problemId && (
                <a href={href('/problems/' + q.problemId)} className="shrink-0 text-indigo-600 dark:text-indigo-300">
                  문제
                </a>
              )}
            </li>
          ))}
        </ul>
        <div className="grid grid-cols-2 gap-2">
          {right < questions.length ? (
            <button onClick={retryWrong} className="rounded-xl bg-indigo-600 py-3 font-semibold text-white">
              틀린 {questions.length - right}문제 다시
            </button>
          ) : (
            <button onClick={again} className="rounded-xl bg-indigo-600 py-3 font-semibold text-white">
              한 번 더
            </button>
          )}
          <button onClick={changeScope} className="rounded-xl border border-slate-200 py-3 font-semibold dark:border-slate-700">
            범위 바꾸기
          </button>
        </div>
        <a href={href('/quiz/history')} className="block text-center text-sm text-indigo-600 dark:text-indigo-300">
          지금까지 푼 기록 보기
        </a>
      </div>
    )
  }

  const q = questions[idx]
  const answered = picked !== null
  const choose = (opt: string, recalled?: boolean) => {
    if (answered) return
    const ok = recalled ?? opt === q.answer
    setRun((r) => (r ? { ...r, picked: opt, picks: [...r.picks, opt], results: [...r.results, ok] } : r))
    setStats((prev) => {
      const s = prev[q.id] ?? { right: 0, wrong: 0, last: '' }
      return { ...prev, [q.id]: { right: s.right + (ok ? 1 : 0), wrong: s.wrong + (ok ? 0 : 1), last: today() } }
    })
    const rec: QuizAnswerRecord = {
      qid: q.id,
      kind: q.kind,
      prompt: q.prompt,
      subject: q.subject,
      subjectIsCode: q.subjectIsCode,
      options: q.options,
      optionsAreCode: q.optionsAreCode,
      answer: q.answer,
      picked: opt,
      ok,
      problemId: q.problemId,
      note: q.note,
    }
    // 한 문제 풀 때마다 기록에 바로 반영 (중간에 그만둬도 남음)
    setLog((prev) => {
      const cur = prev.find((h) => h.id === run.id)
      const next = cur
        ? { ...cur, answers: [...cur.answers, rec] }
        : { id: run.id, at: run.at, scopeKey: run.scopeKey, scopeLabel: label, total: questions.length, answers: [rec] }
      return [next, ...prev.filter((h) => h.id !== run.id)].slice(0, HISTORY_LIMIT)
    })
  }
  const ctxProblem = q.problemId && q.source !== 'problem' ? problemById.get(q.problemId) : undefined
  const ctx = ctxProblem ? { title: ctxProblem.title, core: ctxProblem.core } : null
  const next = () => setRun((r) => (r ? { ...r, picked: null, idx: r.idx + 1 } : r))

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={quit} className="rounded-lg p-1 text-slate-500" aria-label="그만하기">
          <Icon name="x" />
        </button>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${((idx + (answered ? 1 : 0)) / questions.length) * 100}%` }} />
        </div>
        <span className="text-sm text-slate-500 tabular-nums">
          {idx + 1}/{questions.length}
        </span>
      </div>

      <Card className="space-y-3 p-5">
        <p className="text-xs font-medium text-indigo-600 dark:text-indigo-300">{KIND_LABEL[q.kind]}</p>
        {ctx && (
          <div className="rounded-lg border border-indigo-200 bg-indigo-50/60 px-3 py-2 text-sm dark:border-indigo-500/30 dark:bg-indigo-500/10">
            <p className="font-semibold text-indigo-700 dark:text-indigo-200">{ctx.title}</p>
            <p className="text-slate-600 dark:text-slate-300">{ctx.core}</p>
          </div>
        )}
        <p className="text-lg font-semibold">{q.prompt}</p>
        {q.subject && (
          <div className={cx('rounded-lg bg-slate-100 px-3 py-2.5 dark:bg-slate-800', q.subjectIsCode ? 'font-mono text-sm break-all' : 'text-[15px] leading-7 whitespace-pre-line')}>{q.subject}</div>
        )}
        {q.terms && <TermsHint key={run.id + ':' + idx} terms={q.terms} />}
      </Card>

      {q.recall ? (
        <RecallBox key={run.id + ':' + idx} answer={q.answer} answered={answered} picked={picked} onPick={(ok) => choose(ok ? RECALL_YES : RECALL_NO, ok)} />
      ) : (
      <div className="space-y-2">
        {q.options.map((opt, i) => {
          const isAnswer = opt === q.answer
          const isPicked = opt === picked
          return (
            <button
              key={i}
              onClick={() => choose(opt)}
              className={cx(
                'flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition',
                !answered && 'border-slate-200 bg-white hover:border-indigo-300 active:scale-[0.99] dark:border-slate-800 dark:bg-slate-900',
                answered && isAnswer && 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10',
                answered && isPicked && !isAnswer && 'border-red-400 bg-red-50 dark:bg-red-500/10',
                answered && !isAnswer && !isPicked && 'border-slate-200 bg-white opacity-50 dark:border-slate-800 dark:bg-slate-900',
              )}
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-current text-xs opacity-60">{i + 1}</span>
              <span className={cx('min-w-0 flex-1 break-words', q.optionsAreCode ? 'font-mono text-[13px] leading-6' : 'text-[15px] leading-6')}>{opt}</span>
              {answered && isAnswer && <Icon name="check" className="size-5 text-emerald-600" />}
              {answered && isPicked && !isAnswer && <Icon name="x" className="size-5 text-red-500" />}
            </button>
          )
        })}
      </div>
      )}

      {answered && (
        <div className="space-y-3">
          {(q.note || q.problemId) && (
            <Card className="space-y-2 p-4 text-sm">
              {q.note && (
                <>
                  <p className="text-xs font-semibold text-slate-500">해설</p>
                  <pre className="font-sans whitespace-pre-wrap text-slate-600 dark:text-slate-300">{q.note}</pre>
                </>
              )}
              {q.problemId && (
                <a href={href('/problems/' + q.problemId)} className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-300">
                  {problemById.get(q.problemId)?.title} 정리 보기 <Icon name="arrow" className="size-3.5" />
                </a>
              )}
            </Card>
          )}
          <button onClick={next} className="w-full rounded-xl bg-slate-900 py-3.5 font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
            {idx + 1 < questions.length ? '다음' : '결과 보기'}
          </button>
        </div>
      )}
    </div>
  )
}

const RECALL_YES = '기억났어요'
const RECALL_NO = '몰랐어요'

/** 풀기 전에 눌러서 펼치는 용어 힌트 (그 문제 정리에 적어 둔 용어 설명) */
function TermsHint({ terms }: { terms: string[] }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="text-sm">
      <button onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-1 font-medium text-indigo-600 dark:text-indigo-300">
        {open ? '용어 힌트 접기' : '용어 힌트 보기'}
      </button>
      {open && (
        <ul className="mt-2 space-y-1 rounded-lg bg-amber-50 px-3 py-2 text-slate-700 dark:bg-amber-500/10 dark:text-slate-200">
          {terms.map((t, i) => (
            <li key={i} className="break-words">
              {t}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** 그럴듯한 오답이 모자란 문제: 떠올려 본 뒤 정답을 보고 스스로 채점 */
function RecallBox({ answer, answered, picked, onPick }: { answer: string; answered: boolean; picked: string | null; onPick: (ok: boolean) => void }) {
  const [shown, setShown] = useState(answered)
  if (!shown)
    return (
      <div className="space-y-2">
        <p className="text-center text-sm text-slate-500">보기 없이 먼저 떠올려 보세요</p>
        <button onClick={() => setShown(true)} className="w-full rounded-xl border border-indigo-300 bg-white py-3.5 font-semibold text-indigo-700 dark:border-indigo-500/40 dark:bg-slate-900 dark:text-indigo-200">
          정답 보기
        </button>
      </div>
    )
  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-emerald-500 bg-emerald-50 px-4 py-3 text-[15px] leading-6 break-words dark:bg-emerald-500/10">{answer}</div>
      {answered ? (
        <p className="text-center text-sm text-slate-500">{picked === RECALL_YES ? '기억난 걸로 기록했어요' : '다음에 더 자주 나와요'}</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => onPick(false)} className="rounded-xl border border-red-300 py-3 font-semibold text-red-600 dark:border-red-500/40 dark:text-red-300">
            {RECALL_NO}
          </button>
          <button onClick={() => onPick(true)} className="rounded-xl bg-emerald-600 py-3 font-semibold text-white">
            {RECALL_YES}
          </button>
        </div>
      )}
    </div>
  )
}
