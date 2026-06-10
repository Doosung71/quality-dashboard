import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// vi.mock 호이스팅 전에 mock fn을 선언
const mockMessagesCreate = vi.hoisted(() => vi.fn())

vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    messages = { create: mockMessagesCreate }
  },
}))

vi.mock('@/lib/session-guard', () => ({
  requireActiveSession: vi.fn().mockResolvedValue({
    user: { id: 'user-1', email: 'test@example.com', role: 'MEMBER', status: 'ACTIVE' },
  }),
}))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue(null),
}))

const mockSearchKnowledge = vi.hoisted(() => vi.fn())

vi.mock('@/lib/knowledge', () => ({
  searchKnowledge: mockSearchKnowledge,
}))

async function callPost(body: unknown) {
  const { POST } = await import('./route')
  const req = new NextRequest('http://localhost/api/ai/suggest', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '1.2.3.4' },
  })
  return POST(req)
}

describe('POST /api/ai/suggest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-test')
    mockSearchKnowledge.mockResolvedValue([])
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: 'text', text: '## 즉시 조치\n- 테스트 조치' }],
    })
  })

  it('잘못된 JSON은 400', async () => {
    const { POST } = await import('./route')
    const req = new NextRequest('http://localhost/api/ai/suggest', {
      method: 'POST',
      body: 'not-json',
      headers: { 'content-type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('title 없으면 400', async () => {
    const res = await callPost({ type: 'claim', description: '설명' })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('title')
  })

  it('title 200자 초과 시 400', async () => {
    const res = await callPost({ title: 'a'.repeat(201), type: 'claim' })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('200자')
  })

  it('description 2000자 초과 시 400', async () => {
    const res = await callPost({ title: '제목', type: 'ncr', description: 'a'.repeat(2001) })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('2000자')
  })

  it('허용되지 않은 type 값이면 400', async () => {
    const res = await callPost({ title: '제목', type: 'invalid' })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('type')
  })

  it('ANTHROPIC_API_KEY 미설정 시 503', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '')
    const res = await callPost({ title: '제목', type: 'claim' })
    expect(res.status).toBe(503)
  })

  it('정상 요청은 200 + draft 포함', async () => {
    const res = await callPost({ title: '케이블 외경 초과', type: 'ncr' })
    expect(res.status).toBe(200)
    const b = await res.json()
    expect(b.draft).toBeTruthy()
    expect(b.chunks).toBeInstanceOf(Array)
  })

  it('RAG 실패해도 Claude 호출로 draft 반환', async () => {
    mockSearchKnowledge.mockRejectedValue(new Error('DB 오류'))
    const res = await callPost({ title: '불량 클레임', type: 'claim' })
    expect(res.status).toBe(200)
    const b = await res.json()
    expect(b.chunks).toHaveLength(0)
    expect(b.draft).toBeTruthy()
  })

  it('Claude 실패 시 draftError 반환 (200)', async () => {
    mockMessagesCreate.mockRejectedValue(new Error('API 오류'))
    const res = await callPost({ title: '테스트', type: 'claim' })
    expect(res.status).toBe(200)
    const b = await res.json()
    expect(b.draft).toBeNull()
    expect(b.draftError).toBeTruthy()
  })

  describe('검사 3종 신규 타입', () => {
    it('수입검사(incoming_inspection) 정상 요청 — 200 + draft + 검사 포인트 시스템 프롬프트', async () => {
      mockMessagesCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: '## 핵심 검사 포인트\n- 외경 측정 필수' }],
      })
      const res = await callPost({
        title: 'PVC 시스 두께 미달',
        type: 'incoming_inspection',
        description: '협력업체 A 납품분',
      })
      expect(res.status).toBe(200)
      const b = await res.json()
      expect(b.draft).toBeTruthy()
      expect(b.chunks).toBeInstanceOf(Array)
      expect(mockMessagesCreate).toHaveBeenCalledWith(
        expect.objectContaining({ system: expect.stringContaining('검사 포인트') })
      )
    })

    it('출장검사(source_inspection) 정상 요청 — 200 + draft + 현장 확인 시스템 프롬프트', async () => {
      mockMessagesCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: '## 현장 확인 체크포인트\n- 설비 교정 이력 확인' }],
      })
      const res = await callPost({ title: '절연 저항 측정 편차', type: 'source_inspection' })
      expect(res.status).toBe(200)
      const b = await res.json()
      expect(b.draft).toBeTruthy()
      expect(b.chunks).toBeInstanceOf(Array)
      expect(mockMessagesCreate).toHaveBeenCalledWith(
        expect.objectContaining({ system: expect.stringContaining('현장 확인') })
      )
    })

    it('협력업체 감사(supplier_audit) 정상 요청 — 200 + draft + 개선 권고 시스템 프롬프트', async () => {
      mockMessagesCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: '## 주요 확인 항목\n- QMS 문서 최신화 여부' }],
      })
      const res = await callPost({
        title: '협력사 B 정기 감사',
        type: 'supplier_audit',
        description: '2026년 1차 정기 심사',
      })
      expect(res.status).toBe(200)
      const b = await res.json()
      expect(b.draft).toBeTruthy()
      expect(b.chunks).toBeInstanceOf(Array)
      expect(mockMessagesCreate).toHaveBeenCalledWith(
        expect.objectContaining({ system: expect.stringContaining('개선 권고') })
      )
    })

    it('검사 타입에서 RAG 실패해도 Claude draft 반환', async () => {
      mockSearchKnowledge.mockRejectedValue(new Error('DB 오류'))
      const res = await callPost({ title: '불량 수입품', type: 'incoming_inspection' })
      expect(res.status).toBe(200)
      const b = await res.json()
      expect(b.chunks).toHaveLength(0)
      expect(b.draft).toBeTruthy()
    })

    it('RAG 유사 사례 있을 때 검사 타입 프롬프트에 반영', async () => {
      mockSearchKnowledge.mockResolvedValue([
        { title: '과거 외경 초과 불량', content: '외경 초과로 불합격 처리됨', source_path: 'kb/01', score: 0.9 },
      ])
      const res = await callPost({ title: '전선 외경 초과', type: 'source_inspection' })
      expect(res.status).toBe(200)
      const b = await res.json()
      expect(b.chunks).toHaveLength(1)
      expect(mockMessagesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ content: expect.stringContaining('유사사례') }),
          ]),
        })
      )
    })
  })
})
