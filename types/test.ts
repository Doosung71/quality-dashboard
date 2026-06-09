export type TestStatus = '준비중' | '시험중' | '완료' | '지연'
export type SampleType = 'cable' | 'accessory'
export type TestCategory = 'Type' | 'EQ' | 'PQ' | '양산' | '개발'

export type TestLogType = "progress" | "change" | "issue" | "action"
export type IssueSeverity = "low" | "medium" | "high"

export interface TestLog {
  date: string
  note: string
  progress: number
  changedBy?: string
  changes?: string
  logType?: TestLogType
  issueId?: string        // issue 로그의 UUID, action 로그는 대응 issue의 UUID를 참조
  severity?: IssueSeverity
  issueDate?: string      // 이슈 실제 발생일 (사용자 입력)
  suspendedFrom?: string  // 시험 중단 시작일 (issue 로그에만)
  resumedFrom?: string    // 시험 재개일 (action 로그에만)
}

export interface Test {
  id: string
  equipmentId: string
  testCategory: TestCategory
  projectName: string
  sampleType: SampleType
  sampleDescription: string
  plannedStart: string
  plannedEnd: string
  actualStart: string | null
  actualEnd: string | null
  status: TestStatus
  progress: number
  logs: TestLog[]
  managingTeam: string | null
  ownerId: string | null
  ownerName: string | null
}

export interface TestsData {
  _meta: { version: string; lastUpdated: string; note: string }
  tests: Test[]
}
