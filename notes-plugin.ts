// 빌드할 때 content/코테_누적정리.txt 를 읽어서 파싱 + 코드 하이라이팅 후
// `import notes from 'virtual:notes'` 로 화면에 넘겨 준다.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'
import { createHighlighter } from 'shiki'
import { parseNotes, summarize } from './src/lib/parser'

const VIRTUAL = 'virtual:notes'
const RESOLVED = '\0' + VIRTUAL

export function notesPlugin(file = 'content/코테_누적정리.txt'): Plugin {
  const path = resolve(file)
  return {
    name: 'coding-notes',
    resolveId(id) {
      if (id === VIRTUAL) return RESOLVED
    },
    async load(id) {
      if (id !== RESOLVED) return
      this.addWatchFile(path)
      const data = parseNotes(readFileSync(path, 'utf8'))
      console.log(`\n[notes] ${file}\n${summarize(data)}\n`)

      const hl = await createHighlighter({ themes: ['github-light', 'github-dark'], langs: ['java'] })
      const render = (code: string) =>
        hl.codeToHtml(code, {
          lang: 'java',
          themes: { light: 'github-light', dark: 'github-dark' },
          defaultColor: false,
        })
      for (const p of data.problems) if (p.code) p.codeHtml = render(p.code)
      for (const s of data.cheats) for (const g of s.groups) for (const r of g.rows) r.html = render(r.code)
      hl.dispose()
      return `export default ${JSON.stringify(data)}`
    },
    handleHotUpdate(ctx) {
      if (resolve(ctx.file) === path) {
        const mod = ctx.server.moduleGraph.getModuleById(RESOLVED)
        if (mod) {
          ctx.server.moduleGraph.invalidateModule(mod)
          ctx.server.ws.send({ type: 'full-reload' })
        }
        return []
      }
    },
  }
}
