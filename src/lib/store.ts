// 기기에만 저장되는 기록 (복습 완료 날짜, 퀴즈 정답/오답, 체크 표시)
// 사생활 모드 등에서 localStorage 가 막혀도 화면은 그대로 동작하도록 try/catch
import { useCallback, useEffect, useState } from 'react'

const PREFIX = 'kote:'

function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(PREFIX + key)
    return v ? (JSON.parse(v) as T) : fallback
  } catch {
    return fallback
  }
}

function write<T>(key: string, value: T) {
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
