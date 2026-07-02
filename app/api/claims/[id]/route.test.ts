import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── session-guard mock ─────────────────────────────────────────
const mockRequireActiveSession = vi.hoisted(() => vi.fn())
vi.mock('@/lib/session-guard', () => ({
  requireActiveSession: mockRequireActiveSession,
}))

// ── prisma mock ────────────────────────────────────────────────
const mockFindUnique = vi.hoisted(() => vi.fn())
const mockUpdate     = vi.hoisted(() => vi.fn())
vi.mock('@/lib/prisma', () => ({
  prisma: { claim: { findUnique: mockFindUnique, update: mockUpdate } },
}))

// ── ingest-qms mock (재인제스트 호출 캡처) ──────────────────────
const mockIngestClosedClaim = vi.hoisted(() => vi.fn())
vi.mock('@/lib/ingest-qms', () => ({ ingestClosedClaim: mockIngestClosedClaim }))

// ── next/server: after()만 교체해 콜백 즉시 실행 ────────────────
const mockAfter = vi.hoisted(() => vi.fn((cb: () => unknown) => cb()))
vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>()
  return { ...actual, after: mockAfter }
})

const session = { user: { id: 'u1', role: 'TEAM_LEAD', email: 't@test.com', name: '검수자' } }
const ctx = { params: Promise.resolve({ id: 'claim-1' }) }
function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/claims/claim-1', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('PUT /api/claims/[id] — projectKey 재인제스트 (Q1-03)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireActiveSession.mockResolvedValue(session)
    mockUpdate.mockResolvedValue({ id: 'claim-1', projectKey: 'proj-x' })
  })

  it('Closed Claim projectKey 변경 시 ingestClosedClaim 호출', async () => {
    mockFindUnique.mockResolvedValue({ status: 'Closed' })
    const { PUT } = await import('./route')
    await PUT(makeReq({ projectKey: 'proj-x' }), ctx)
    expect(mockIngestClosedClaim).toHaveBeenCalledWith('claim-1')
  })

  it('Closed Claim projectKey null clear 시에도 ingestClosedClaim 호출 (metadata 제거 반영)', async () => {
    mockFindUnique.mockResolvedValue({ status: 'Closed' })
    const { PUT } = await import('./route')
    await PUT(makeReq({ projectKey: null }), ctx)
    expect(mockIngestClosedClaim).toHaveBeenCalledWith('claim-1')
  })

  it('Open(Received) Claim projectKey 변경은 인제스트 호출 안 함', async () => {
    mockFindUnique.mockResolvedValue({ status: 'Received' })
    const { PUT } = await import('./route')
    await PUT(makeReq({ projectKey: 'proj-x' }), ctx)
    expect(mockIngestClosedClaim).not.toHaveBeenCalled()
  })

  it('잘못된 projectKey 형식은 400 + 인제스트 없음', async () => {
    mockFindUnique.mockResolvedValue({ status: 'Closed' })
    const { PUT } = await import('./route')
    const res = await PUT(makeReq({ projectKey: 'INVALID KEY' }), ctx)
    expect(res.status).toBe(400)
    expect(mockIngestClosedClaim).not.toHaveBeenCalled()
  })
})

describe('PUT /api/claims/[id] — timeline 재인제스트 (#63)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireActiveSession.mockResolvedValue(session)
    mockUpdate.mockResolvedValue({ id: 'claim-1' })
  })

  const tl = [{ date: '2026-07-02', action: '클레임 접수' }]

  it('Closed Claim timeline 변경 시 ingestClosedClaim 호출 (확정 지식 재동기화)', async () => {
    mockFindUnique.mockResolvedValue({ status: 'Closed' })
    const { PUT } = await import('./route')
    await PUT(makeReq({ timeline: tl }), ctx)
    expect(mockIngestClosedClaim).toHaveBeenCalledWith('claim-1')
  })

  it('Open(Received) Claim timeline 변경은 인제스트 호출 안 함', async () => {
    mockFindUnique.mockResolvedValue({ status: 'Received' })
    const { PUT } = await import('./route')
    await PUT(makeReq({ timeline: tl }), ctx)
    expect(mockIngestClosedClaim).not.toHaveBeenCalled()
  })
})
