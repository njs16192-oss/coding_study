// GitHub Pages 에서도 새로고침이 되도록 해시 라우팅: #/problems/의상?tag=해시
import { useEffect, useState } from 'react'

export interface Route {
  path: string[]
  query: URLSearchParams
}

function parse(): Route {
  const hash = decodeURIComponent(location.hash.replace(/^#/, '')) || '/today'
  const [p, q = ''] = hash.split('?')
  return { path: p.split('/').filter(Boolean), query: new URLSearchParams(q) }
}

export function useRoute(): Route {
  const [route, setRoute] = useState(parse)
  useEffect(() => {
    const on = () => setRoute(parse())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}

export function href(path: string, query?: Record<string, string | null | undefined> | URLSearchParams): string {
  let q = ''
  if (query) {
    const params = query instanceof URLSearchParams ? new URLSearchParams(query) : new URLSearchParams()
    if (!(query instanceof URLSearchParams))
      for (const [k, v] of Object.entries(query)) if (v) params.set(k, v)
    q = params.toString()
  }
  return '#' + path.split('/').map(encodeURIComponent).join('/') + (q ? '?' + q : '')
}

export function go(path: string, query?: Record<string, string | null | undefined> | URLSearchParams) {
  location.hash = href(path, query).slice(1)
}
