export type TestStatus = '준비중' | '시험중' | '완료' | '지연'
export type SampleType = 'cable' | 'accessory'
export type TestCategory = 'Type' | 'EQ' | 'PQ' | '양산' | '개발'

export interface TestLog {
  date: string
  note: string
  progress: number
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
