import { useState, type ReactNode } from 'react'
import { ddayLabel } from '../lib/review'

export function cx(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(' ')
}

const TAG_COLORS = [
  'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-200',
  'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200',
  'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200',
  'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200',
  'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-500/20 dark:text-fuchsia-200',
  'bg-teal-100 text-teal-800 dark:bg-teal-500/20 dark:text-teal-200',
]

function hash(s: string) {
  let h = 0
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0
  return Math.abs(h)
}

export function Tag({ tag, auto }: { tag: string; auto?: boolean }) {
  return (
    <span
      className={cx('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium', TAG_COLORS[hash(tag) % TAG_COLORS.length])}
      title={auto ? '파일에 @tags 가 없어서 자동으로 추론한 유형' : undefined}
    >
      {tag}
      {auto && <span className="opacity-60">·자동</span>}
    </span>
  )
}

export function HintBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-orange-100 px-1.5 py-0.5 text-xs font-medium text-orange-800 dark:bg-orange-500/20 dark:text-orange-200">
      <Icon name="bulb" className="size-3" />
      힌트 봄
    </span>
  )
}

export function ReviewBadge({ dday }: { dday: number }) {
  const cls =
    dday < 0
      ? 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200'
      : dday === 0
        ? 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200'
        : 'bg-slate-200 text-slate-700 dark:bg-slate-700/60 dark:text-slate-200'
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium', cls)}>
      <Icon name="calendar" className="size-3" />
      {ddayLabel(dday)}
    </span>
  )
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx('rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900', className)}>{children}</div>
  )
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">{children}</h3>
      {right}
    </div>
  )
}

export function CodeBlock({ html, code }: { html?: string; code: string }) {
  const [copied, setCopied] = useState(false)
  const [wrap, setWrap] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* 복사 권한 없음 */
    }
  }
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-[#0d1117]">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-1.5 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <span className="font-mono">java</span>
        <div className="flex gap-1">
          <button onClick={() => setWrap(!wrap)} className="rounded px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-800">
            {wrap ? '한 줄로' : '줄바꿈'}
          </button>
          <button onClick={copy} className="rounded px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-800">
            {copied ? '복사됨' : '복사'}
          </button>
        </div>
      </div>
      {html ? (
        <div className={cx('code-block', wrap && 'wrap')} dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <div className={cx('code-block', wrap && 'wrap')}>
          <pre>{code}</pre>
        </div>
      )}
    </div>
  )
}

const PATHS: Record<string, ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  list: (
    <>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <circle cx="3.5" cy="6" r="1" />
      <circle cx="3.5" cy="12" r="1" />
      <circle cx="3.5" cy="18" r="1" />
    </>
  ),
  quiz: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3 2 20h20z" />
      <path d="M12 10v4M12 17h.01" />
    </>
  ),
  book: (
    <>
      <path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z" />
      <path d="M20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  bulb: <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.8V16h5v-.3c0-.7.4-1.4 1-1.8A6 6 0 0 0 12 3z" />,
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  back: <path d="M15 5 8 12l7 7" />,
  check: <path d="m5 12 5 5 9-10" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  filter: <path d="M3 5h18l-7 8v6l-4 2v-8z" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
}

export function Icon({ name, className }: { name: keyof typeof PATHS | string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={cx('shrink-0', className ?? 'size-5')} aria-hidden>
      {PATHS[name]}
    </svg>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">{children}</div>
}
