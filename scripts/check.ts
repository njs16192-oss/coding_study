// 새 파일을 올리기 전에 파서가 잘 읽는지 확인: npm run check [파일경로]
import { readFileSync } from 'node:fs'
import { parseNotes, summarize } from '../src/lib/parser'

const file = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'content/코테_누적정리.txt'
const data = parseNotes(readFileSync(file, 'utf8'))
console.log(`[${file}]`)
console.log(summarize(data))
if (process.argv.includes('--verbose')) {
  for (const p of data.problems) {
    console.log(`- ${p.title} | ${p.core} | tags=${p.tags.join(',')}${p.tagsAuto ? '(자동)' : ''} hint=${p.hint} review=${p.review.join(',')} code=${p.code.split('\n').length}줄 explain=${p.explain.length}줄`)
  }
  for (const m of data.mistakes?.items ?? []) if (m.problemId) console.log(`  * ${m.problemTag} <- ${m.text.slice(0, 40)}`)
}
