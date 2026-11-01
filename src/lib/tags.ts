// @tags 가 없는 문제의 유형을 키워드로 추론
import type { Problem } from './types'

const RULES: [string, RegExp][] = [
  ['BFS', /BFS|너비\s*우선|최단\s*거리/],
  ['DFS/백트래킹', /DFS|깊이\s*우선|백트래킹|재귀|되돌리기/],
  ['완전탐색', /완전\s*탐색|순열|조합|브루트/],
  ['스택', /\bStack\b|스택|괄호/],
  ['힙', /PriorityQueue|힙|우선순위\s*큐/],
  ['큐', /\bQueue\b|\bDeque\b|(?<!우선순위\s)큐/],
  ['해시', /HashMap|HashSet|해시|getOrDefault|\bmap\.(put|get|values|keySet|entrySet)\b/],
  ['정렬', /정렬|\.sort\(|Arrays\.sort|내림차순|오름차순/],
  ['DP', /\bDP\b|동적\s*계획|피보나치|메모이제이션/],
  ['그리디', /그리디|탐욕/],
  ['이분탐색', /이분\s*탐색|이진\s*탐색|binarySearch/],
  ['투포인터', /투\s*포인터|two\s*pointer|슬라이딩/i],
  ['문자열', /StringBuilder|문자열\s*(처리|변환)/],
  ['수학', /bitCount|행렬|약수|소수|최대공약수|gcd|lcm|진법|경우의\s*수/],
  ['구현', /LRU|시뮬레이션|구현/],
]

export const TAG_ORDER = RULES.map(([t]) => t)

function match(text: string): string[] {
  return RULES.filter(([, re]) => re.test(text)).map(([t]) => t)
}

export function inferTags(p: Pick<Problem, 'title' | 'core' | 'code'>): string[] {
  const fromHeader = match(`${p.title} ${p.core}`)
  const fromCode = match(p.code)
  const tags = [...new Set([...fromHeader, ...fromCode])].slice(0, 3)
  return tags.length ? tags : ['구현']
}
