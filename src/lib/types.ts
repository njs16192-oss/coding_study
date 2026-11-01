// 파서가 만들어 내는 데이터 형태. 빌드 때 txt -> 이 구조 -> 화면

export interface CheatRow {
  code: string
  desc: string
  /** 빌드 때 Shiki 로 칠한 HTML (없으면 code 를 그대로 표시) */
  html?: string
}

export interface CheatGroup {
  title: string | null
  rows: CheatRow[]
  notes: string[]
}

export interface CheatSection {
  kind: 'cheat'
  id: string
  title: string
  groups: CheatGroup[]
}

export interface ListItem {
  id: string
  /** 첫 줄 ("// - " 뒤) */
  text: string
  /** 들여쓴 이어지는 줄들 */
  detail: string[]
  /** "-> 고치는 법" 줄 (퀴즈에 사용) */
  fix: string | null
  /** 괄호 태그로 연결된 문제 id, 예: (의상) */
  problemId: string | null
  /** 괄호 안 원래 태그 텍스트 */
  problemTag: string | null
}

export interface ListSection {
  kind: 'tips' | 'mistakes'
  id: string
  title: string
  items: ListItem[]
}

export interface PrioritySection {
  kind: 'priority'
  id: string
  title: string
  items: string[]
}

export interface ExplainLine {
  /** 앞쪽 들여쓰기 칸 수 */
  indent: number
  text: string
  /** "내 풀이 :" 블록에 속하는 줄 */
  mine: boolean
}

export interface Problem {
  id: string
  title: string
  core: string
  tags: string[]
  tagsAuto: boolean
  hint: boolean | null
  review: string[]
  solved: string | null
  level: string | null
  explain: ExplainLine[]
  code: string
  codeHtml?: string
  /** 원본 파일에서 헤더가 있던 줄 번호 (1부터) */
  line: number
}

export interface Quiz {
  id: string
  question: string
  answer: string
  wrong: string[]
  problemId: string | null
}

export interface NotesData {
  title: string
  intro: string[]
  cheats: CheatSection[]
  tips: ListSection | null
  mistakes: ListSection | null
  priority: PrioritySection | null
  problems: Problem[]
  customQuizzes: Quiz[]
  warnings: string[]
  sectionOrder: { id: string; title: string; kind: string }[]
}
