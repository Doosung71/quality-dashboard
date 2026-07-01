import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── 의존성 mock ────────────────────────────────────────────────
const mockRequireActiveSession = vi.hoisted(() => vi.fn())
vi.mock('@/lib/session-guard', () => ({ requireActiveSession: mockRequireActiveSession }))
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: vi.fn().mockResolvedValue(null) }))

const mockFindMany = vi.hoisted(() => vi.fn())
const mockCreate   = vi.hoisted(() => vi.fn())
vi.mock('@/lib/prisma', () => ({
  prisma: { tenderDocument: { findMany: mockFindMany }, analysis: { create: mockCreate } },
}))

vi.mock('@/lib/storage', () => ({ readBlobBuffer: vi.fn().mockResolvedValue(Buffer.from('pdf')) }))

// 실제 PdfRangeError·extractTextFromPdf mock. 범위는 extract에 전달되는지 검증용.
const mockExtract = vi.hoisted(() => vi.fn())
vi.mock('@/lib/pdf', () => ({
  extractTextFromPdf: mockExtract,
  PdfRangeError: class PdfRangeError extends Error {},
}))

const mockExtractSpec = vi.hoisted(() => vi.fn())
vi.mock('@/lib/ai/extract', () => ({ extractTenderSpec: mockExtractSpec }))
vi.mock('@/lib/knowledge', () => ({ searchKnowledge: vi.fn().mockResolvedValue([]) }))
vi.mock('@/lib/rag', () => ({ parseRagThreshold: () => 0.5, buildKnowledgeChunksXml: () => '' }))
vi.mock('@/lib/naver-search', () => ({ naverSearchText: vi.fn().mockResolvedValue('') }))

const session = { user: { id: 'u1', role: 'PRACTITIONER', name: '작성자' } }
const ctx = { params: Promise.resolve({ id: 'tender-1' }) }
function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/tenders/tender-1/analyze', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/tenders/[id]/analyze — ranges 서버 단독 fail-closed (H-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireActiveSession.mockResolvedValue(session)
    mockFindMany.mockResolvedValue([{ id: 'doc-a', filename: 'a.pdf', storagePath: 'blob://a' }])
    mockExtract.mockResolvedValue({ text: 'PDF TEXT', truncated: false })
    mockExtractSpec.mockResolvedValue({
      aiUsed: 'claude',
      data: {
        systemCharacteristics: { voltage: null, bilSil: null, shortCircuit: null, installCond: null, groundConfig: null, requiredCapacity: null },
        requirements: [],
      },
    })
    mockCreate.mockResolvedValue({ id: 'an-1' })
  })

  // H-01 핵심: documentId 없는 malformed range는 조용히 무시(전체추출)하지 않고 400
  it('documentId 없는 ranges 항목은 400 + 추출 안 함', async () => {
    const { POST } = await import('./route')
    const res = await POST(makeReq({ documentIds: ['doc-a'], ranges: [{ startPage: 3, endPage: 5 }] }), ctx)
    expect(res.status).toBe(400)
    expect(mockExtract).not.toHaveBeenCalled()
  })

  // H-01: 요청하지 않은(unknown) documentId의 range는 400
  it('unknown documentId의 ranges 항목은 400', async () => {
    const { POST } = await import('./route')
    const res = await POST(makeReq({ documentIds: ['doc-a'], ranges: [{ documentId: 'ghost', startPage: 1, endPage: 2 }] }), ctx)
    expect(res.status).toBe(400)
    expect(mockExtract).not.toHaveBeenCalled()
  })

  it('ranges가 배열이 아니면 400', async () => {
    const { POST } = await import('./route')
    const res = await POST(makeReq({ documentIds: ['doc-a'], ranges: 'nope' }), ctx)
    expect(res.status).toBe(400)
  })

  // 유효한 documentId+범위는 통과하고, 해당 문서에 범위가 전달된다
  it('유효한 range는 통과하고 extractTextFromPdf에 범위가 전달된다', async () => {
    const { POST } = await import('./route')
    const res = await POST(makeReq({ documentIds: ['doc-a'], ranges: [{ documentId: 'doc-a', startPage: 3, endPage: 5 }] }), ctx)
    expect(res.status).toBe(200)
    expect(mockExtract).toHaveBeenCalledWith(expect.anything(), { startPage: 3, endPage: 5 })
  })

  // range 미지정 문서는 허용(전체 추출) — ranges 자체를 안 보낸 경우
  it('ranges 미지정 시 전체 추출로 정상 진행 (200)', async () => {
    const { POST } = await import('./route')
    const res = await POST(makeReq({ documentIds: ['doc-a'] }), ctx)
    expect(res.status).toBe(200)
    expect(mockExtract).toHaveBeenCalledWith(expect.anything(), undefined)
  })
})
