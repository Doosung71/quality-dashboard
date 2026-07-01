import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { validateInspectionQuantities } from '@/lib/inspection-quantities'

// ── session-guard mock ─────────────────────────────────────────
const mockRequireActiveSession = vi.hoisted(() => vi.fn())
vi.mock('@/lib/session-guard', () => ({ requireActiveSession: mockRequireActiveSession }))

// ── prisma mock ────────────────────────────────────────────────
const mockCreate     = vi.hoisted(() => vi.fn())
const mockFindUnique = vi.hoisted(() => vi.fn())
const mockUpdate     = vi.hoisted(() => vi.fn())
vi.mock('@/lib/prisma', () => ({
  prisma: {
    sourceInspection: {
      create:     mockCreate,
      findUnique: mockFindUnique,
      update:     mockUpdate,
      findMany:   vi.fn(),
    },
  },
}))
// ingest 훅 무력화
vi.mock('@/lib/ingest-qms', () => ({ ingestSourceInspection: vi.fn() }))

const session = { user: { id: 'u1', role: 'PRACTITIONER', email: 'p@test.com' } }
function req(method: string, body?: unknown) {
  return new NextRequest('http://localhost/api/source-inspections', {
    method, headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
}
const validBody = {
  vendorId: 'v1', vendorName: '협력사', inspectionDate: '2026-07-01',
  itemName: '압력게이지', inspector: '홍길동',
  quantity: 100, sampleSize: 10, defectCount: 1,
}

// ── 순수 헬퍼 ──────────────────────────────────────────────────
describe('validateInspectionQuantities', () => {
  it('정상 조합 → null', () => {
    expect(validateInspectionQuantities(100, 10, 1)).toBeNull()
  })
  it('샘플·불량 없음(납품만) → null', () => {
    expect(validateInspectionQuantities(100, null, null)).toBeNull()
  })
  it('샘플 > 납품 → 에러', () => {
    expect(validateInspectionQuantities(10, 100, null)).toMatch(/샘플/)
  })
  it('불량 > 샘플 → 에러', () => {
    expect(validateInspectionQuantities(100, 10, 1000)).toMatch(/불량/)
  })
  it('샘플 없이 불량 > 납품 → 에러 (납품이 상한)', () => {
    expect(validateInspectionQuantities(10, null, 20)).toMatch(/불량/)
  })
  it('납품 0/음수 → 에러', () => {
    expect(validateInspectionQuantities(0, null, null)).toMatch(/납품/)
    expect(validateInspectionQuantities(-5, null, null)).toMatch(/납품/)
  })
  it('불량 음수 → 에러', () => {
    expect(validateInspectionQuantities(100, 10, -1)).toMatch(/불량/)
  })
  it('정수 아님(소수) → 에러', () => {
    expect(validateInspectionQuantities(10.5, null, null)).toMatch(/납품/)
  })
})

// ── POST ───────────────────────────────────────────────────────
describe('POST /api/source-inspections', () => {
  beforeEach(() => vi.clearAllMocks())

  it('정상 → 201', async () => {
    mockRequireActiveSession.mockResolvedValue(session)
    mockCreate.mockResolvedValue({ id: 'si-1' })
    const { POST } = await import('./route')
    const res = await POST(req('POST', validBody))
    expect(res.status).toBe(201)
  })
  it('샘플 > 납품 → 400 (서버 방어)', async () => {
    mockRequireActiveSession.mockResolvedValue(session)
    const { POST } = await import('./route')
    const res = await POST(req('POST', { ...validBody, quantity: 10, sampleSize: 100, defectCount: 1000 }))
    expect(res.status).toBe(400)
    expect(mockCreate).not.toHaveBeenCalled()
  })
  it('불량 > 샘플 → 400', async () => {
    mockRequireActiveSession.mockResolvedValue(session)
    const { POST } = await import('./route')
    const res = await POST(req('POST', { ...validBody, quantity: 100, sampleSize: 10, defectCount: 50 }))
    expect(res.status).toBe(400)
  })
  it('필수 항목 누락 → 400', async () => {
    mockRequireActiveSession.mockResolvedValue(session)
    const { POST } = await import('./route')
    const res = await POST(req('POST', { vendorId: 'v1' }))
    expect(res.status).toBe(400)
  })

  it('불량률은 클라이언트 값 무시하고 서버 재계산 (1/10 → 10%)', async () => {
    mockRequireActiveSession.mockResolvedValue(session)
    mockCreate.mockResolvedValue({ id: 'si-1' })
    const { POST } = await import('./route')
    await POST(req('POST', { ...validBody, quantity: 100, sampleSize: 10, defectCount: 1, defectRate: 999 }))
    const data = mockCreate.mock.calls[0][0].data as { defectRate: number }
    expect(data.defectRate).toBe(10) // 999 무시
  })
})

// ── PUT ────────────────────────────────────────────────────────
describe('PUT /api/source-inspections/[id]', () => {
  const params = { params: Promise.resolve({ id: 'si-1' }) }
  beforeEach(() => vi.clearAllMocks())

  it('부분수정 defectCount가 기존 sampleSize 초과 → 400 (병합 검증)', async () => {
    mockRequireActiveSession.mockResolvedValue(session)
    mockFindUnique.mockResolvedValue({ quantity: 100, sampleSize: 10, defectCount: 1 })
    const { PUT } = await import('./[id]/route')
    const res = await PUT(req('PUT', { defectCount: 50 }), params)
    expect(res.status).toBe(400)
    expect(mockUpdate).not.toHaveBeenCalled()
  })
  it('부분수정 정상 → 200', async () => {
    mockRequireActiveSession.mockResolvedValue(session)
    mockFindUnique.mockResolvedValue({ quantity: 100, sampleSize: 10, defectCount: 1 })
    mockUpdate.mockResolvedValue({ id: 'si-1' })
    const { PUT } = await import('./[id]/route')
    const res = await PUT(req('PUT', { defectCount: 5 }), params)
    expect(res.status).toBe(200)
  })
  it('수량 필드 없는 수정(첨부만) → 검증 스킵, 200', async () => {
    mockRequireActiveSession.mockResolvedValue(session)
    mockUpdate.mockResolvedValue({ id: 'si-1' })
    const { PUT } = await import('./[id]/route')
    const res = await PUT(req('PUT', { attachments: [] }), params)
    expect(res.status).toBe(200)
    expect(mockFindUnique).not.toHaveBeenCalled()
  })

  it('불량률 서버 재계산 — 부분수정 defectCount=5, 기존 sample=10 → 50%', async () => {
    mockRequireActiveSession.mockResolvedValue(session)
    mockFindUnique.mockResolvedValue({ quantity: 100, sampleSize: 10, defectCount: 1 })
    mockUpdate.mockResolvedValue({ id: 'si-1' })
    const { PUT } = await import('./[id]/route')
    await PUT(req('PUT', { defectCount: 5, defectRate: 999 }), params)
    const data = mockUpdate.mock.calls[0][0].data as { defectRate: number }
    expect(data.defectRate).toBe(50) // 999 무시, (5/10)*100
  })
  it('대상 없음 + 수량수정 → 404', async () => {
    mockRequireActiveSession.mockResolvedValue(session)
    mockFindUnique.mockResolvedValue(null)
    const { PUT } = await import('./[id]/route')
    const res = await PUT(req('PUT', { quantity: 50 }), params)
    expect(res.status).toBe(404)
  })
})
