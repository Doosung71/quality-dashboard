import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── session-guard mock ─────────────────────────────────────────
const mockRequireActiveSession = vi.hoisted(() => vi.fn())
vi.mock('@/lib/session-guard', () => ({
  requireActiveSession: mockRequireActiveSession,
}))

// ── prisma mock ────────────────────────────────────────────────
const mockFindFirst = vi.hoisted(() => vi.fn())
const mockUpdate    = vi.hoisted(() => vi.fn())
vi.mock('@/lib/prisma', () => ({
  prisma: { tender: { findFirst: mockFindFirst, update: mockUpdate } },
}))

// ── storage mock (DELETE 경로에서 import) ──────────────────────
vi.mock('@/lib/storage', () => ({ deleteBlob: vi.fn() }))

const session = { user: { id: 'u1', role: 'PRACTITIONER', email: 't@test.com', name: '작성자' } }
const ctx = { params: Promise.resolve({ id: 'tender-1' }) }
function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/tenders/tender-1', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('PATCH /api/tenders/[id] — projectKey (고리④)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireActiveSession.mockResolvedValue(session)
    mockFindFirst.mockResolvedValue({ id: 'tender-1', title: '기존 입찰', createdById: 'u1' })
    mockUpdate.mockResolvedValue({ id: 'tender-1' })
  })

  // 1. Happy path — 유효한 projectKey 저장
  it('유효한 projectKey를 저장한다 (200)', async () => {
    const { PATCH } = await import('./route')
    const res = await PATCH(makeReq({ projectKey: 'qat-gtc-3003' }), ctx)
    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'tender-1' },
      data: { projectKey: 'qat-gtc-3003' },
    })
  })

  // 2. 잘못된 입력 validation — kebab 위반 시 400, update 없음
  it('잘못된 projectKey 형식은 400 + update 없음', async () => {
    const { PATCH } = await import('./route')
    const res = await PATCH(makeReq({ projectKey: 'INVALID KEY' }), ctx)
    expect(res.status).toBe(400)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  // 3. 빈 문자열 → null clear (fail-open, 선택 필드)
  it('빈 projectKey는 null로 저장 (키 없음)', async () => {
    const { PATCH } = await import('./route')
    const res = await PATCH(makeReq({ projectKey: '   ' }), ctx)
    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'tender-1' },
      data: { projectKey: null },
    })
  })

  // 4. title 부분 수정은 그대로 동작 (회귀 없음)
  it('title만 수정 시 projectKey는 건드리지 않는다', async () => {
    const { PATCH } = await import('./route')
    const res = await PATCH(makeReq({ title: '새 제목' }), ctx)
    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'tender-1' },
      data: { title: '새 제목' },
    })
  })

  // 5. 권한 — 소유자가 아니면(findFirst null) 404
  it('소유자가 아닌 입찰이면 404', async () => {
    mockFindFirst.mockResolvedValue(null)
    const { PATCH } = await import('./route')
    const res = await PATCH(makeReq({ projectKey: 'qat-gtc-3003' }), ctx)
    expect(res.status).toBe(404)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  // 6. 빈 title은 400 (기존 검증 유지)
  it('빈 title은 400', async () => {
    const { PATCH } = await import('./route')
    const res = await PATCH(makeReq({ title: '  ' }), ctx)
    expect(res.status).toBe(400)
  })
})
