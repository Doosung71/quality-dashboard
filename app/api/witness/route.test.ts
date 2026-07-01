import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ── session-guard mock ─────────────────────────────────────────
const mockRequireActiveSession = vi.hoisted(() => vi.fn())
vi.mock('@/lib/session-guard', () => ({
  requireActiveSession: mockRequireActiveSession,
}))

// ── prisma mock ────────────────────────────────────────────────
const mockFindFirst  = vi.hoisted(() => vi.fn())
const mockFindMany   = vi.hoisted(() => vi.fn())
const mockCreate     = vi.hoisted(() => vi.fn())
const mockFindUnique = vi.hoisted(() => vi.fn())
const mockUpdate     = vi.hoisted(() => vi.fn())
const mockDelete     = vi.hoisted(() => vi.fn())

vi.mock('@/lib/prisma', () => ({
  prisma: {
    witnessInspection: {
      findFirst:  mockFindFirst,
      findMany:   mockFindMany,
      findUnique: mockFindUnique,
      create:     mockCreate,
      update:     mockUpdate,
      delete:     mockDelete,
    },
    witnessVoC: {
      findMany: vi.fn().mockResolvedValue([]),
      create:   vi.fn(),
      update:   vi.fn(),
      delete:   vi.fn(),
    },
  },
}))

// ── 세션 헬퍼 ──────────────────────────────────────────────────
const practitionerSession = { user: { id: 'u1', role: 'PRACTITIONER', email: 'p@test.com' } }
const teamLeadSession     = { user: { id: 'u2', role: 'TEAM_LEAD',    email: 't@test.com' } }
const directorSession     = { user: { id: 'u3', role: 'DIRECTOR',     email: 'd@test.com' } }

function makeReq(method: string, body?: unknown) {
  return new NextRequest('http://localhost/api/witness', {
    method,
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
}
function makeIdReq(method: string, body?: unknown) {
  return new NextRequest('http://localhost/api/witness/wi-1', {
    method,
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
}

// ── /api/witness (GET·POST) ────────────────────────────────────
describe('GET /api/witness', () => {
  beforeEach(() => vi.clearAllMocks())

  it('인증 없으면 세션 오류 반환', async () => {
    mockRequireActiveSession.mockResolvedValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    const { GET } = await import('./route')
    const res = await GET(makeReq('GET'))
    expect(res.status).toBe(401)
  })

  it('인증 성공 시 목록 반환', async () => {
    mockRequireActiveSession.mockResolvedValue(practitionerSession)
    mockFindMany.mockResolvedValue([{ id: 'wi-1', customer: '한국전력' }])
    const { GET } = await import('./route')
    const res = await GET(makeReq('GET'))
    expect(res.status).toBe(200)
    const body = await res.json() as unknown[]
    expect(body).toHaveLength(1)
  })

  it('year·month 지정 시 이 달과 겹치는 검사 조회 (③-3 월 경계)', async () => {
    mockRequireActiveSession.mockResolvedValue(practitionerSession)
    mockFindMany.mockResolvedValue([])
    const { GET } = await import('./route')
    await GET(new NextRequest('http://localhost/api/witness?year=2026&month=7', { method: 'GET' }))
    const where = mockFindMany.mock.calls[0][0].where as {
      AND: [
        { inspectionDate: { lt: Date } },
        { OR: [{ endDate: { gte: Date } }, { endDate: null; inspectionDate: { gte: Date } }] },
      ]
    }
    // 시작일 < 다음 달(8월) AND (종료일>=7월 시작 OR (종료일 없고 시작일>=7월 시작))
    const monthStart = new Date(2026, 6, 1)  // 7월 1일
    const nextMonth  = new Date(2026, 7, 1)  // 8월 1일
    expect(where.AND[0].inspectionDate.lt).toEqual(nextMonth)
    expect(where.AND[1].OR).toHaveLength(2)
    expect(where.AND[1].OR[0].endDate.gte).toEqual(monthStart)              // 다일: 종료일이 이 달 이후
    expect(where.AND[1].OR[1].endDate).toBeNull()                           // 단일: 종료일 없음
    expect(where.AND[1].OR[1].inspectionDate.gte).toEqual(monthStart)      // 단일: 시작일이 이 달 이후
  })
})

describe('POST /api/witness', () => {
  const validBody = {
    customer: '한국전력', projectName: '765kV 케이블',
    inspectionDate: '2026-07-01', assigneeName: '홍길동',
    assigneeId: 'u1',
  }

  beforeEach(() => vi.clearAllMocks())

  it('필수 항목 누락 시 400', async () => {
    mockRequireActiveSession.mockResolvedValue(practitionerSession)
    const { POST } = await import('./route')
    const res = await POST(makeReq('POST', { customer: '한국전력' }))
    expect(res.status).toBe(400)
  })

  it('PRACTITIONER도 등록 가능', async () => {
    mockRequireActiveSession.mockResolvedValue(practitionerSession)
    mockFindFirst.mockResolvedValue(null)
    mockCreate.mockResolvedValue({ id: 'wi-new', inspNo: 'WI-2026-001' })
    const { POST } = await import('./route')
    const res = await POST(makeReq('POST', validBody))
    expect(res.status).toBe(201)
  })

  it('채번 — 기존 없으면 WI-YYYY-001', async () => {
    mockRequireActiveSession.mockResolvedValue(practitionerSession)
    mockFindFirst.mockResolvedValue(null)
    mockCreate.mockResolvedValue({ id: 'wi-new', inspNo: 'WI-2026-001' })
    const { POST } = await import('./route')
    await POST(makeReq('POST', validBody))
    const createCall = mockCreate.mock.calls[0][0] as { data: { inspNo: string } }
    expect(createCall.data.inspNo).toMatch(/^WI-\d{4}-001$/)
  })

  it('채번 — 기존 WI-2026-003이면 WI-2026-004', async () => {
    mockRequireActiveSession.mockResolvedValue(practitionerSession)
    mockFindFirst.mockResolvedValue({ inspNo: 'WI-2026-003' })
    mockCreate.mockResolvedValue({ id: 'wi-new', inspNo: 'WI-2026-004' })
    const { POST } = await import('./route')
    await POST(makeReq('POST', validBody))
    const createCall = mockCreate.mock.calls[0][0] as { data: { inspNo: string } }
    expect(createCall.data.inspNo).toBe('WI-2026-004')
  })
})

// ── /api/witness/[id] (PATCH·DELETE) ──────────────────────────
describe('PATCH /api/witness/[id]', () => {
  const params = { params: Promise.resolve({ id: 'wi-1' }) }
  beforeEach(() => vi.clearAllMocks())

  it('PRACTITIONER가 타인 등록 건 수정 시도 → 403', async () => {
    mockRequireActiveSession.mockResolvedValue(practitionerSession) // id: u1
    mockFindUnique.mockResolvedValue({ createdById: 'u-other' })
    const { PATCH } = await import('./[id]/route')
    const res = await PATCH(makeIdReq('PATCH', { status: 'COMPLETED' }), params)
    expect(res.status).toBe(403)
  })

  it('PRACTITIONER가 본인 등록 건 상태 변경 → 200 (③-1 핵심)', async () => {
    mockRequireActiveSession.mockResolvedValue(practitionerSession) // id: u1
    mockFindUnique.mockResolvedValue({ createdById: 'u1' })
    mockUpdate.mockResolvedValue({ id: 'wi-1', status: 'COMPLETED' })
    const { PATCH } = await import('./[id]/route')
    const res = await PATCH(makeIdReq('PATCH', { status: 'COMPLETED' }), params)
    expect(res.status).toBe(200)
  })

  it('존재하지 않는 건 → 404', async () => {
    mockRequireActiveSession.mockResolvedValue(practitionerSession)
    mockFindUnique.mockResolvedValue(null)
    const { PATCH } = await import('./[id]/route')
    const res = await PATCH(makeIdReq('PATCH', { status: 'COMPLETED' }), params)
    expect(res.status).toBe(404)
  })

  it('유효하지 않은 status는 400', async () => {
    mockRequireActiveSession.mockResolvedValue(teamLeadSession)
    mockFindUnique.mockResolvedValue({ createdById: 'u-other' })
    const { PATCH } = await import('./[id]/route')
    const res = await PATCH(makeIdReq('PATCH', { status: 'INVALID_STATUS' }), params)
    expect(res.status).toBe(400)
  })

  it('유효하지 않은 result는 400', async () => {
    mockRequireActiveSession.mockResolvedValue(teamLeadSession)
    mockFindUnique.mockResolvedValue({ createdById: 'u-other' })
    const { PATCH } = await import('./[id]/route')
    const res = await PATCH(makeIdReq('PATCH', { result: 'UNKNOWN' }), params)
    expect(res.status).toBe(400)
  })

  it('TEAM_LEAD가 타인 등록 건 + 유효 status → 200 (팀장 전권)', async () => {
    mockRequireActiveSession.mockResolvedValue(teamLeadSession) // id: u2
    mockFindUnique.mockResolvedValue({ createdById: 'u-other' })
    mockUpdate.mockResolvedValue({ id: 'wi-1', status: 'COMPLETED' })
    const { PATCH } = await import('./[id]/route')
    const res = await PATCH(makeIdReq('PATCH', { status: 'COMPLETED' }), params)
    expect(res.status).toBe(200)
  })

  it('result·region이 null이어도 200 (결과 미입력 검사 상태변경 — ③-1 실 버그)', async () => {
    mockRequireActiveSession.mockResolvedValue(practitionerSession) // id: u1
    mockFindUnique.mockResolvedValue({ createdById: 'u1' })
    mockUpdate.mockResolvedValue({ id: 'wi-1', status: 'COMPLETED' })
    const { PATCH } = await import('./[id]/route')
    // 폼이 전체 필드를 보내며 result·region은 null (결과 미입력 예정 검사)
    const res = await PATCH(makeIdReq('PATCH', { status: 'COMPLETED', result: null, region: null }), params)
    expect(res.status).toBe(200)
  })
})

describe('DELETE /api/witness/[id]', () => {
  const params = { params: Promise.resolve({ id: 'wi-1' }) }
  beforeEach(() => vi.clearAllMocks())

  it('PRACTITIONER는 403', async () => {
    mockRequireActiveSession.mockResolvedValue(practitionerSession)
    const { DELETE } = await import('./[id]/route')
    const res = await DELETE(makeIdReq('DELETE'), params)
    expect(res.status).toBe(403)
  })

  it('TEAM_LEAD가 타인 등록 건 삭제 시도 → 403', async () => {
    mockRequireActiveSession.mockResolvedValue(teamLeadSession) // id: u2
    mockFindUnique.mockResolvedValue({ createdById: 'u-other' })
    const { DELETE } = await import('./[id]/route')
    const res = await DELETE(makeIdReq('DELETE'), params)
    expect(res.status).toBe(403)
  })

  it('TEAM_LEAD가 본인 등록 건 삭제 → 200', async () => {
    mockRequireActiveSession.mockResolvedValue(teamLeadSession) // id: u2
    mockFindUnique.mockResolvedValue({ createdById: 'u2' })
    mockDelete.mockResolvedValue({})
    const { DELETE } = await import('./[id]/route')
    const res = await DELETE(makeIdReq('DELETE'), params)
    expect(res.status).toBe(200)
  })

  it('DIRECTOR는 타인 등록 건도 삭제 가능', async () => {
    mockRequireActiveSession.mockResolvedValue(directorSession) // id: u3
    mockFindUnique.mockResolvedValue({ createdById: 'u-other' })
    mockDelete.mockResolvedValue({})
    const { DELETE } = await import('./[id]/route')
    const res = await DELETE(makeIdReq('DELETE'), params)
    expect(res.status).toBe(200)
  })
})
