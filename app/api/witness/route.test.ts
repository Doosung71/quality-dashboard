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

  it('PRACTITIONER는 403', async () => {
    mockRequireActiveSession.mockResolvedValue(practitionerSession)
    const { PATCH } = await import('./[id]/route')
    const res = await PATCH(makeIdReq('PATCH', { status: 'COMPLETED' }), params)
    expect(res.status).toBe(403)
  })

  it('유효하지 않은 status는 400', async () => {
    mockRequireActiveSession.mockResolvedValue(teamLeadSession)
    const { PATCH } = await import('./[id]/route')
    const res = await PATCH(makeIdReq('PATCH', { status: 'INVALID_STATUS' }), params)
    expect(res.status).toBe(400)
  })

  it('유효하지 않은 result는 400', async () => {
    mockRequireActiveSession.mockResolvedValue(teamLeadSession)
    const { PATCH } = await import('./[id]/route')
    const res = await PATCH(makeIdReq('PATCH', { result: 'UNKNOWN' }), params)
    expect(res.status).toBe(400)
  })

  it('TEAM_LEAD + 유효 status → 200', async () => {
    mockRequireActiveSession.mockResolvedValue(teamLeadSession)
    mockUpdate.mockResolvedValue({ id: 'wi-1', status: 'COMPLETED' })
    const { PATCH } = await import('./[id]/route')
    const res = await PATCH(makeIdReq('PATCH', { status: 'COMPLETED' }), params)
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
