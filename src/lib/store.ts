// 기기에만 저장되는 기록 (복습 완료 날짜, 퀴즈 정답/오답, 체크 표시)
// 사생활 모드 등에서 localStorage 가 막혀도 화면은 그대로 동작하도록 try/catch
import { useCallback, useEffect, useState } from 'react'

const PREFIX = 'kote:'

/** 이번 실행 동안의 값. 저장소가 막히거나 꽉 차도 화면 이동 정도는 버티게 */
const mem = new Map<string, unknown>()

function read<T>(key: string, fallback: T): T {
  if (mem.has(key)) return mem.get(key) as T
  try {
    const v = localStorage.getItem(PREFIX + key)
    const parsed = v ? (JSON.parse(v) as T) : fallback
    mem.set(key, parsed)
    return parsed
  } catch {
    return fallback
  }
}

function write<T>(key: string, value: T) {
  mem.set(key, value)
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    /* 저장 못 해도 화면은 계속 */
  }
  window.dispatchEvent(new CustomEvent('kote-store', { detail: key }))
}

export function useStored<T>(key: string, fallback: T): [T, (update: (prev: T) => T) => void] {
  const [value, setValue] = useState<T>(() => read(key, fallback))
  useEffect(() => {
    const onChange = (e: Event) => {
      if ((e as CustomEvent).detail === key) setValue(read(key, fallback))
    }
    window.addEventListener('kote-store', onChange)
    return () => window.removeEventListener('kote-store', onChange)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  const update = useCallback(
    (fn: (prev: T) => T) => {
      const next = fn(read(key, fallback))
      write(key, next)
      setValue(next)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  )
  return [value, update]
}

/** 문제 id -> 복습 완료한 날짜들 */
export type ReviewLog = Record<string, string[]>
export const useReviewLog = () => useStored<ReviewLog>('reviews', {})

/** 퀴즈 id -> 맞힌/틀린 횟수 */
export type QuizStats = Record<string, { right: number; wrong: number; last: string }>
export const useQuizStats = () => useStored<QuizStats>('quiz', {})

/** 틀린 포인트 체크 표시 */
export const useChecks = () => useStored<Record<string, boolean>>('checks', {})

/** 퀴즈 한 판에서 푼 문제 하나 (기록 화면에서 그대로 다시 보여 줄 수 있게 보기까지 저장) */
export interface QuizAnswerRecord {
  qid: string
  kind: string
  prompt: string
  subject?: string
  subjectIsCode?: boolean
  options: string[]
  optionsAreCode?: boolean
  answer: string
  picked: string
  ok: boolean
  problemId: string | null
  note?: string
}

/** 퀴즈 한 판 기록. 그만두고 나가도 푼 데까지 남는다 */
export interface QuizSession {
  id: string
  /** 시작 시각 (ISO) */
  at: string
  scopeKey: string
  scopeLabel: string
  total: number
  answers: QuizAnswerRecord[]
}
export const useQuizHistory = () => useStored<QuizSession[]>('quiz-history', [])
export const HISTORY_LIMIT = 60

/** 지금 풀고 있는 퀴즈. 다른 화면에 갔다 와도 이어서 풀 수 있게 저장 */
export interface QuizRun<Q = unknown> {
  id: string
  at: string
  scopeKey: string
  scopeLabel: string
  questions: Q[]
  idx: number
  picked: string | null
  /** 문제별로 고른 보기 (results 와 같은 순서) */
  picks: string[]
  results: boolean[]
}
export const useQuizRun = <Q,>() => useStored<QuizRun<Q> | null>('quiz-run', null)
