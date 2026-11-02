import { useEffect, useRef, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useRoute, go, href } from './lib/router'
import { notes } from './data'
import { Icon, cx } from './components/ui'
import TodayPage from './pages/Today'
import ProblemsPage from './pages/Problems'
import MistakesPage from './pages/Mistakes'
import CheatPage from './pages/Cheat'
import QuizPage from './pages/Quiz'
import SearchPage from './pages/Search'

const TABS = [
  { path: 'today', label: '오늘', icon: 'home' },
  { path: 'problems', label: '문제', icon: 'list' },
  { path: 'quiz', label: '퀴즈', icon: 'quiz' },
  { path: 'mistakes', label: '포인트', longLabel: '틀린 포인트', icon: 'alert' },
  { path: 'cheat', label: '치트', longLabel: '치트시트', icon: 'book' },
] as const

function SearchBox({ initial, autoFocus }: { initial: string; autoFocus?: boolean }) {
  const [q, setQ] = useState(initial)
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => setQ(initial), [initial])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(t.tagName)) {
        e.preventDefault()
        ref.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return (
    <form
      className="relative w-full"
      onSubmit={(e) => {
        e.preventDefault()
        go('/search', { q })
      }}
    >
      <Icon name="search" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
      <input
        ref={ref}
        autoFocus={autoFocus}
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          go('/search', { q: e.target.value })
        }}
        placeholder="문제·개념·코드 검색"
        className="w-full rounded-lg border border-slate-200 bg-white py-2 pr-10 pl-9 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-indigo-500/30"
      />
      <kbd className="absolute top-1/2 right-3 hidden -translate-y-1/2 rounded border border-slate-200 px-1.5 text-xs text-slate-400 lg:block dark:border-slate-700">/</kbd>
    </form>
  )
}

function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()
  if (!needRefresh) return null
  return (
    <div className="fixed inset-x-4 bottom-20 z-50 mx-auto flex max-w-md items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-lg lg:bottom-6 dark:bg-slate-100 dark:text-slate-900">
      <span className="flex-1">정리 파일이 업데이트됐어요.</span>
      <button onClick={() => setNeedRefresh(false)} className="opacity-70">
        나중에
      </button>
      <button onClick={() => updateServiceWorker(true)} className="rounded-lg bg-indigo-500 px-3 py-1.5 font-semibold text-white">
        새로고침
      </button>
    </div>
  )
}

export default function App() {
  const route = useRoute()
  const [page = 'today'] = route.path
  const active = page === 'search' ? null : page
  const q = route.query.get('q') ?? ''

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [page])

  let content
  switch (page) {
    case 'problems':
      content = <ProblemsPage id={route.path[1] ?? null} query={route.query} />
      break
    case 'quiz':
      content = <QuizPage sub={route.path[1] ?? null} query={route.query} />
      break
    case 'mistakes':
      content = <MistakesPage />
      break
    case 'cheat':
      content = <CheatPage />
      break
    case 'search':
      content = <SearchPage q={q} />
      break
    default:
      content = <TodayPage />
  }

  return (
    <div className="min-h-dvh">
      {/* 상단: PC 는 탭 + 검색, 모바일은 제목 + 검색 버튼 */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85">
        <div className="mx-auto flex h-14 max-w-screen-2xl items-center gap-4 px-4">
          <a href={href('/today')} className="flex items-center gap-2 font-bold whitespace-nowrap">
            <img src="./icon.svg" alt="" className="size-7" />
            <span>{notes.title.includes('코딩테스트') ? '코테 노트' : notes.title}</span>
          </a>
          <nav className="hidden items-center gap-1 lg:flex">
            {TABS.map((t) => (
              <a
                key={t.path}
                href={href('/' + t.path)}
                className={cx(
                  'rounded-lg px-3 py-1.5 text-sm font-medium',
                  active === t.path ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
                )}
              >
                {'longLabel' in t ? t.longLabel : t.label}
              </a>
            ))}
          </nav>
          <div className="ml-auto w-full max-w-sm">{page === 'search' || <div className="hidden lg:block"><SearchBox initial="" /></div>}</div>
          {page !== 'search' && (
            <a href={href('/search')} className="-mr-2 rounded-lg p-2 text-slate-600 lg:hidden dark:text-slate-300" aria-label="검색">
              <Icon name="search" />
            </a>
          )}
        </div>
        {page === 'search' && (
          <div className="mx-auto max-w-3xl px-4 pb-3">
            <SearchBox initial={q} autoFocus />
          </div>
        )}
      </header>

      <main className="mx-auto max-w-screen-2xl px-4 pt-4 pb-28 lg:pb-10">{content}</main>

      {/* 모바일 하단 탭 */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {TABS.map((t) => (
            <a
              key={t.path}
              href={href('/' + t.path)}
              className={cx('flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium', active === t.path ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400')}
            >
              <Icon name={t.icon} className="size-6" />
              {t.label}
            </a>
          ))}
        </div>
      </nav>
      <UpdatePrompt />
    </div>
  )
}
