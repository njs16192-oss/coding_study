import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseNotes } from './parser'
import { buildQuizzes, splitMemo, toQuestion } from './quiz'

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

describe('틀렸던 포인트 퀴즈', () => {
  it('메모를 실수 / 결과 / 고치는 법으로 나눈다', () => {
    expect(splitMemo({ text: '"최단거리"를 DFS 로 다 가보면 경로 수가 폭발 -> 효율성 시간 초과 => BFS', detail: [], problemTag: null })).toMatchObject({
      issue: '"최단거리"를 DFS 로 다 가보면 경로 수가 폭발',
      result: ['효율성 시간 초과'],
      fix: 'BFS',
    })
    // 끝의 띄어 쓴 괄호(공식)는 해설로, 코드 속 람다 화살표는 자르지 않음
    expect(splitMemo({ text: '마지막에만 % 하면 오버플로우', detail: ['    -> 계산할 때마다 %   ( (a + b) % m )'], problemTag: null })).toMatchObject({ fix: '계산할 때마다 %', extra: ['( (a + b) % m )'] })
    expect(splitMemo({ text: 'Object 스트림 (프로세스)', detail: ['-> queue.stream().anyMatch(x -> x > cur)'], problemTag: '프로세스' })).toMatchObject({
      issue: 'Object 스트림',
      fix: 'queue.stream().anyMatch(x -> x > cur)',
    })
    // 고치는 법 없이 결과만 있으면 fix 없음 -> "실수 → 결과" 문제
    expect(splitMemo({ text: '다시 훑기는 O(n^2) -> 시간 초과', detail: [], problemTag: null })).toMatchObject({ fix: null, result: ['시간 초과'] })
  })

  it('항목 아래 @quiz / @why 가 자동 문제를 대신한다', () => {
    const d = parseNotes(`// ============================================================
// 7. 틀렸던 포인트
// ============================================================

// - 마지막에만 % 하면 오버플로우
//       -> 계산할 때마다 %
//       @quiz: 나머지 문제, 어떻게? | 매번 % | 마지막에 % | double | abs
//       @why: 중간에 나눠도 답이 같음
// - 시작칸 방문 처리 -> visited[0][0] = true
`)
    expect(d.warnings.filter((w) => w.includes('@'))).toEqual([])
    expect(d.mistakes!.items[0].detail).toEqual(['      -> 계산할 때마다 %'])
    expect(d.customQuizzes[0]).toMatchObject({ mistakeId: d.mistakes!.items[0].id, why: '중간에 나눠도 답이 같음' })
    const qs = buildQuizzes(d).filter((q) => q.source === 'mistake')
    expect(qs.map((q) => q.prompt)).toEqual(['나머지 문제, 어떻게?', '이 실수, 어떻게 고칠까?'])
    expect(qs[0].note).toContain('중간에 나눠도 답이 같음')
    expect(d.customQuizzes.filter((q) => !q.mistakeId)).toHaveLength(0)
  })

  it('문제 맥락: 용어 힌트, 같은 문제/유형 오답, 모자라면 떠올리기 카드', () => {
    const d = parseNotes(`// ============================================================
// 7. 틀렸던 포인트
// ============================================================

// - hit/miss 와 크기 조건을 섞어 분기 -> 빠지는 경우가 생김 (캐시)
//       -> contains 로 hit/miss 를 먼저 나누기
// - 크기 0 을 처리 안 함 (캐시)
//       -> 맨 앞에서 return 하기
// - 격자를 대각선까지 돎 (게임 맵)
//       -> 4방향 배열 쓰기
// - 도착점을 맵 밖으로 씀 (게임 맵)
//       -> n-1, m-1 쓰기

// ============================================================
// 8. 문제 유형별 패턴
// ============================================================

// ---------- [1차] 캐시 -> LRU ----------
// @tags: 시뮬레이션
// @terms: LRU = 가장 오래 안 쓴 것부터 버리기
// hit (이미 있음)  : +1, 맨 뒤로
// miss (없음)      : +5, 꽉 찼으면 맨 앞 버리기
// cacheSize == 0 이면 전부 miss

// ---------- 게임 맵 -> BFS ----------
// @tags: BFS
// BFS : 가까운 칸부터
`)
    expect(d.warnings).toEqual([])
    const cache = d.problems[0]
    expect(cache.terms.map((t) => [t.term, t.manual])).toEqual([
      ['LRU', true],
      ['hit', false],
      ['miss', false],
    ])
    const q = buildQuizzes(d).find((x) => x.subject?.startsWith('hit/miss'))!
    // 직접 쓴 @terms 는 항상, 자동 용어는 카드에 그 말이 나올 때만
    expect(q.terms).toEqual(['LRU : 가장 오래 안 쓴 것부터 버리기', 'hit (이미 있음) : +1, 맨 뒤로', 'miss (없음) : +5, 꽉 찼으면 맨 앞 버리기'])
    // 다른 유형(게임 맵) 메모는 오답으로 안 섞이고, 모자라니 떠올리기 카드
    expect(q.pool).toEqual(['맨 앞에서 return 하기'])
    expect(q.recall).toBe(true)
    expect(toQuestion(q).options).toEqual([])
  })
})
