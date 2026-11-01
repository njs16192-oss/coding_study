import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseNotes } from './parser'
import { buildQuizzes } from './quiz'

const sample = `// ============================================================
//  자바 정리
// ============================================================

// ============================================================
// 1. 문자열
// ============================================================

s.length()                  // 문자열 길이
s.trim()                    // 앞뒤 공백 제거
StringBuilder sb = new StringBuilder();

// ---------- HashMap ----------
map.getOrDefault(k, 0);     // 키가 없으면 기본값
map.keySet();               // 키 모음

// ============================================================
// 7. 틀렸던 포인트
// ============================================================

// - 시작칸도 방문 처리하기 (게임 맵)
//       -> visited[0][0] = true
// - 공통 실수 -> 이렇게 고치기

// ============================================================
// 8. 문제 유형별 패턴
// ============================================================

// ---------- 게임 맵 -> BFS ----------
// @hint: yes
// @review: 2026-11-08, 2026-11-03
// @quiz: BFS 에 쓰는 자료구조는? | Queue | Stack | PriorityQueue
// 가까운 칸부터
//   한 겹씩
// 내 풀이 : 큐 사용
//           dist 배열
Queue<int[]> q = new LinkedList<>();
// return -1;

// ---------- [1차] 캐시 -> LRU ----------
// @tags: 구현, 해시
// 개념만
`

describe('parseNotes', () => {
  const d = parseNotes(sample)

  it('제목과 치트시트', () => {
    expect(d.title).toBe('자바 정리')
    expect(d.cheats).toHaveLength(1)
    const [plain, hash] = d.cheats[0].groups
    expect(plain.rows[0]).toEqual({ code: 's.length()', desc: '문자열 길이' })
    expect(plain.rows[2]).toEqual({ code: 'StringBuilder sb = new StringBuilder();', desc: '' })
    expect(hash.title).toBe('HashMap')
  })

  it('문제 헤더, 메타, 설명, 코드', () => {
    const [p, cache] = d.problems
    expect(p.title).toBe('게임 맵')
    expect(p.core).toBe('BFS')
    expect(p.hint).toBe(true)
    expect(p.review).toEqual(['2026-11-03', '2026-11-08'])
    expect(p.tags).toEqual(['BFS', '큐'])
    expect(p.tagsAuto).toBe(true)
    expect(p.explain.map((e) => [e.indent, e.mine])).toEqual([
      [0, false],
      [2, false],
      [0, true],
      [10, true],
    ])
    expect(p.code).toBe('Queue<int[]> q = new LinkedList<>();\n// return -1;')
    expect(cache.tags).toEqual(['구현', '해시'])
    expect(cache.tagsAuto).toBe(false)
    expect(cache.code).toBe('')
  })

  it('틀렸던 포인트를 (문제명) 으로 연결하고 고치는 법을 뽑는다', () => {
    const [a, b] = d.mistakes!.items
    expect(a.problemId).toBe(d.problems[0].id)
    expect(a.fix).toBe('visited[0][0] = true')
    expect(b.problemId).toBeNull()
    expect(b.fix).toBe('이렇게 고치기')
  })

  it('@quiz 를 읽는다', () => {
    expect(d.customQuizzes).toHaveLength(1)
    expect(d.customQuizzes[0]).toMatchObject({ answer: 'Queue', wrong: ['Stack', 'PriorityQueue'], problemId: d.problems[0].id })
  })

  it('잘못된 메타는 경고', () => {
    const w = parseNotes(sample.replace('@hint: yes', '@hint: maybe').replace('@review: 2026-11-08, 2026-11-03', '@review: 11/8')).warnings
    expect(w.some((x) => x.includes('@hint'))).toBe(true)
    expect(w.some((x) => x.includes('@review'))).toBe(true)
  })
})

describe('실제 정리 파일', () => {
  const d = parseNotes(readFileSync('content/코테_누적정리.txt', 'utf8'))
  it('경고 없이 읽힌다', () => {
    expect(d.warnings).toEqual([])
    expect(d.problems.length).toBeGreaterThan(0)
    expect(d.cheats.length).toBeGreaterThan(0)
  })
  it('퀴즈는 정답이 보기 후보에 섞이지 않는다', () => {
    for (const q of buildQuizzes(d)) expect(q.pool).not.toContain(q.answer)
  })
})
