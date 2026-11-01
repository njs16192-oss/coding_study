// 복습일 계산. 파일의 @review 날짜 + 기기에 저장한 "복습 완료" 기록
import type { Problem } from './types'
import type { ReviewLog } from './store'

export function today(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function dayNumber(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return Math.round(Date.UTC(y, m - 1, d) / 86400000)
}

export interface ReviewState {
  /** 아직 안 끝낸 가장 이른 복습일 */
  due: string | null
  /** due - 오늘 (음수면 지남) */
  dday: number | null
  /** 마지막으로 복습 완료한 날 */
  lastDone: string | null
}

export function reviewState(p: Problem, log: ReviewLog, now = today()): ReviewState {
  const done = (log[p.id] ?? []).slice().sort()
  const lastDone = done.length ? done[done.length - 1] : null
  const due = p.review.find((d) => !lastDone || lastDone < d) ?? null
  return { due, dday: due ? dayNumber(due) - dayNumber(now) : null, lastDone }
}

export function ddayLabel(dday: number): string {
  if (dday === 0) return '오늘 복습'
  if (dday < 0) return `${-dday}일 지남`
  return `D-${dday}`
}

export function shortDate(date: string): string {
  const [, m, d] = date.split('-')
  return `${Number(m)}/${Number(d)}`
}
