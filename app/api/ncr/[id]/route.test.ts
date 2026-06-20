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
  prisma: { ncr: { findUnique: mockFindUnique, update: mockUpdate } },
}))

// ── ingest-qms mock (재인제스트 호출 캡처) ──────────────────────
const mockIngestClosedNcr = vi.hoisted(() => vi.fn())
vi.mock('@/lib/ingest-qms', () => ({ ingestClosedNcr: mockIngestClosedNcr }))

// ── next/server: after()만 교체해 콜백 즉시 실행 ────────────────
const mockAfter = vi.hoisted(() => vi.fn((cb: () => unknown) => cb()))
vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>()
  return { ...actual, after: mockAfter }
})

const session = { user: { id: 'u1', role: 'TEAM_LEAD', email: 't@test.com', name: '검수자' } }
const ctx = { params: Promise.resolve({ id: 'ncr-1' }) }
function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/ncr/ncr-1', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('PUT /api/ncr/[id] — projectKey 재인제스트 (Q1-03)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireActiveSession.mockResolvedValue(session)
    mockUpdate.mockResolvedValue({ id: 'ncr-1', projectKey: 'proj-x' })
  })

  it('Closed NCR projectKey 변경 시 ingestClosedNcr 호출', async () => {
    mockFindUnique.mockResolvedValue({ status: 'Closed' })
    const { PUT } = await import('./route')
    await PUT(makeReq({ projectKey: 'proj-x' }), ctx)
    expect(mockIngestClosedNcr).toHaveBeenCalledWith('ncr-1')
  })

  it('Closed NCR projectKey null clear 시에도 ingestClosedNcr 호출 (metadata 제거 반영)', async () => {
    mockFindUnique.mockResolvedValue({ status: 'Closed' })
    const { PUT } = await import('./route')
    await PUT(makeReq({ projectKey: null }), ctx)
    expect(mockIngestClosedNcr).toHaveBeenCalledWith('ncr-1')
  })

  it('Open(Issued) NCR projectKey 변경은 인제스트 호출 안 함', async () => {
    mockFindUnique.mockResolvedValue({ status: 'Issued' })
    const { PUT } = await import('./route')
    await PUT(makeReq({ projectKey: 'proj-x' }), ctx)
    expect(mockIngestClosedNcr).not.toHaveBeenCalled()
  })

  it('잘못된 projectKey 형식은 400 + 인제스트 없음', async () => {
    mockFindUnique.mockResolvedValue({ status: 'Closed' })
    const { PUT } = await import('./route')
    const res = await PUT(makeReq({ projectKey: 'INVALID KEY' }), ctx)
    expect(res.status).toBe(400)
    expect(mockIngestClosedNcr).not.toHaveBeenCalled()
  })
})
