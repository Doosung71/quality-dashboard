import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// 세션 — 기본 TEAM_LEAD(/ncr·/claims 쓰기 권한 보유). 테스트별 role 오버라이드.
const mockRequireActiveSession = vi.hoisted(() => vi.fn())
vi.mock('@/lib/session-guard', () => ({
  requireActiveSession: mockRequireActiveSession,
}))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue(null),
}))

const mockGetOrDraftLesson = vi.hoisted(() => vi.fn())
const mockIngestVerifiedLesson = vi.hoisted(() => vi.fn())
// parseLessonSections는 실제 구현을 사용 (라우트의 섹션 검증을 그대로 검증)
vi.mock('@/lib/ingest-qms', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/ingest-qms')>()
  return {
    ...actual,
    getOrDraftLesson: mockGetOrDraftLesson,
    ingestVerifiedLesson: mockIngestVerifiedLesson,
  }
})

// 필수 3섹션을 갖춘 유효한 교훈 본문
const VALID_CONTENT = [
  '## 근본원인', '원인 텍스트', '',
  '## 시정·예방 조치', '조치 텍스트', '',
  '## 입찰 검토 체크포인트', '입찰 시 차폐 초기온도 확인',
].join('\n')

function session(role: string) {
  return { user: { id: 'u-1', name: '홍길동', email: 't@example.com', role } }
}

async function callGet(query: string) {
  const { GET } = await import('./route')
  return GET(new NextRequest(`http://localhost/api/ai/verified-lesson?${query}`))
}

async function callPost(body: unknown) {
  const { POST } = await import('./route')
  const req = new NextRequest('http://localhost/api/ai/verified-lesson', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '1.2.3.4' },
  })
  return POST(req)
}

describe('verified-lesson API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireActiveSession.mockResolvedValue(session('TEAM_LEAD'))
    mockGetOrDraftLesson.mockResolvedValue({
      existing: false,
      content: '## 근본원인\n원인 텍스트',
      checklistItem: '입찰 시 차폐 초기온도 사양 확인',
      refNo: 'NCR-2026-001',
      title: '[교훈] NCR-2026-001 시스 두께 미달',
    })
    mockIngestVerifiedLesson.mockResolvedValue(undefined)
  })

  describe('GET (초안 조회/생성)', () => {
    it('type/id 누락 시 400', async () => {
      const res = await callGet('type=ncr')
      expect(res.status).toBe(400)
    })

    it('허용되지 않은 type이면 400', async () => {
      const res = await callGet('type=meeting&id=x')
      expect(res.status).toBe(400)
    })

    it('종결 건이 아니면(getOrDraftLesson=null) 400', async () => {
      mockGetOrDraftLesson.mockResolvedValue(null)
      const res = await callGet('type=ncr&id=abc')
      expect(res.status).toBe(400)
      expect((await res.json()).error).toContain('종결')
    })

    it('정상 — 200 + 초안 content 반환', async () => {
      const res = await callGet('type=ncr&id=abc')
      expect(res.status).toBe(200)
      const b = await res.json()
      expect(b.content).toContain('근본원인')
      expect(b.checklistItem).toBeTruthy()
    })

    it('초안 생성 중 오류 시 500', async () => {
      mockGetOrDraftLesson.mockRejectedValue(new Error('ANTHROPIC_API_KEY 없음'))
      const res = await callGet('type=claim&id=abc')
      expect(res.status).toBe(500)
    })
  })

  describe('POST (확정 인제스트)', () => {
    it('잘못된 JSON은 400', async () => {
      const { POST } = await import('./route')
      const req = new NextRequest('http://localhost/api/ai/verified-lesson', {
        method: 'POST',
        body: 'not-json',
        headers: { 'content-type': 'application/json' },
      })
      expect((await POST(req)).status).toBe(400)
    })

    it('content 누락 시 400 (validation)', async () => {
      const res = await callPost({ type: 'ncr', id: 'abc' })
      expect(res.status).toBe(400)
      expect(mockIngestVerifiedLesson).not.toHaveBeenCalled()
    })

    it('content 5000자 초과 시 400', async () => {
      const res = await callPost({ type: 'ncr', id: 'abc', content: 'a'.repeat(5001) })
      expect(res.status).toBe(400)
    })

    it('필수 섹션 누락 시 400 (VL-03 구조 검증)', async () => {
      const res = await callPost({ type: 'ncr', id: 'abc', content: '## 근본원인\n원인만 있음' })
      expect(res.status).toBe(400)
      expect((await res.json()).error).toContain('세 섹션')
      expect(mockIngestVerifiedLesson).not.toHaveBeenCalled()
    })

    it('허용되지 않은 type이면 400', async () => {
      const res = await callPost({ type: 'meeting', id: 'abc', content: VALID_CONTENT })
      expect(res.status).toBe(400)
    })

    it('정상 확정 — 200 + ingestVerifiedLesson 호출(content·검증자 전달, 클라이언트 checklistItem 미신뢰)', async () => {
      const res = await callPost({
        type: 'ncr',
        id: 'abc',
        content: VALID_CONTENT,
        checklistItem: '위조된 체크포인트', // 서버는 이 값을 무시하고 content에서 재파싱
      })
      expect(res.status).toBe(200)
      expect((await res.json()).ok).toBe(true)
      const arg = mockIngestVerifiedLesson.mock.calls[0][0]
      expect(arg).toMatchObject({ type: 'ncr', id: 'abc', content: VALID_CONTENT, verifiedBy: '홍길동' })
      expect(arg).not.toHaveProperty('checklistItem')
    })

    it('재확정 — 동일 건 POST 재호출 시에도 ingest 호출(덮어쓰기 위임)', async () => {
      await callPost({ type: 'ncr', id: 'abc', content: VALID_CONTENT })
      await callPost({ type: 'ncr', id: 'abc', content: VALID_CONTENT })
      expect(mockIngestVerifiedLesson).toHaveBeenCalledTimes(2)
    })

    it('PRACTITIONER는 403 + ingest 미호출 (VL-02 — 본인 산출물 쓰기 권한 있어도 확정 불가)', async () => {
      mockRequireActiveSession.mockResolvedValue(session('PRACTITIONER'))
      const res = await callPost({ type: 'ncr', id: 'abc', content: VALID_CONTENT })
      expect(res.status).toBe(403)
      expect(mockIngestVerifiedLesson).not.toHaveBeenCalled()
    })

    it('권한 없는 역할(VIEWER)이면 403', async () => {
      mockRequireActiveSession.mockResolvedValue(session('VIEWER'))
      const res = await callPost({ type: 'ncr', id: 'abc', content: VALID_CONTENT })
      expect(res.status).toBe(403)
    })

    it('TEAM_LEAD는 확정 가능 (200)', async () => {
      mockRequireActiveSession.mockResolvedValue(session('TEAM_LEAD'))
      const res = await callPost({ type: 'claim', id: 'abc', content: VALID_CONTENT })
      expect(res.status).toBe(200)
    })

    it('인제스트 실패 시 500 (fail-closed)', async () => {
      mockIngestVerifiedLesson.mockRejectedValue(new Error('DB 오류'))
      const res = await callPost({ type: 'ncr', id: 'abc', content: VALID_CONTENT })
      expect(res.status).toBe(500)
      expect((await res.json()).error).toContain('오류')
    })
  })
})
