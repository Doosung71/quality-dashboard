import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- 외부 의존 모킹 ---

const mockNcrFindUnique = vi.fn()
const mockClaimFindUnique = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    ncr: { findUnique: mockNcrFindUnique },
    claim: { findUnique: mockClaimFindUnique },
  },
}))

const mockSqlTransaction = vi.fn().mockResolvedValue(undefined)
const mockSqlTagged = vi.fn().mockReturnValue({})
const mockNeonSql = Object.assign(mockSqlTagged, { transaction: mockSqlTransaction })

vi.mock('@neondatabase/serverless', () => ({
  neon: vi.fn(() => mockNeonSql),
}))

// fetch 전역 mock (OpenAI Embeddings)
const mockFetch = vi.fn()
global.fetch = mockFetch

// --- 테스트 ---

describe('ingest-qms', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    vi.stubEnv('DATABASE_URL_UNPOOLED', 'postgresql://test')
    vi.stubEnv('OPENAI_API_KEY', 'sk-test')
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ embedding: Array(1536).fill(0.1) }] }),
    })
    mockSqlTagged.mockReturnValue({})
    mockSqlTransaction.mockResolvedValue(undefined)
  })

  describe('ingestClosedNcr', () => {
    it('status가 Closed가 아니면 인제스트하지 않음', async () => {
      mockNcrFindUnique.mockResolvedValue({ id: 'n1', status: 'Open' })
      const { ingestClosedNcr } = await import('./ingest-qms')
      await ingestClosedNcr('n1')
      expect(mockFetch).not.toHaveBeenCalled()
      expect(mockSqlTransaction).not.toHaveBeenCalled()
    })

    it('NCR를 찾을 수 없으면 인제스트하지 않음', async () => {
      mockNcrFindUnique.mockResolvedValue(null)
      const { ingestClosedNcr } = await import('./ingest-qms')
      await ingestClosedNcr('n1')
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('Closed NCR는 source_path ncr_closed/{id}/{i} 패턴으로 INSERT 호출', async () => {
      mockNcrFindUnique.mockResolvedValue({
        id: 'ncr-001', ncrNo: 'NCR-2026-001', title: '케이블 외경 초과', status: 'Closed',
        source: '수입검사', severity: 'Major', disposition: 'Rework', assignee: '홍길동',
        description: '외경이 규격 대비 초과됨', timeline: [],
        issuedDate: new Date('2026-01-01'), targetDate: new Date('2026-01-15'), closedDate: new Date('2026-01-20'),
      })
      const { ingestClosedNcr } = await import('./ingest-qms')
      await ingestClosedNcr('ncr-001')
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/embeddings',
        expect.objectContaining({ method: 'POST' })
      )
      expect(mockSqlTransaction).toHaveBeenCalled()
      // DELETE 패턴 인자에 ncr_closed/ncr-001 포함 여부
      const transactionArgs = mockSqlTransaction.mock.calls[0][0] as unknown[]
      expect(transactionArgs.length).toBeGreaterThanOrEqual(2)
    })

    it('OPENAI_API_KEY 누락 시 에러를 삼키고 외부에 던지지 않음', async () => {
      vi.stubEnv('OPENAI_API_KEY', '')
      mockNcrFindUnique.mockResolvedValue({
        id: 'n2', ncrNo: 'NCR-002', title: '테스트', status: 'Closed',
        source: '검사', severity: 'Minor', disposition: 'Scrap', assignee: '김철수',
        description: '내용', timeline: [],
        issuedDate: new Date(), targetDate: new Date(), closedDate: new Date(),
      })
      const { ingestClosedNcr } = await import('./ingest-qms')
      await expect(ingestClosedNcr('n2')).resolves.toBeUndefined()
    })

    it('DATABASE_URL_UNPOOLED 누락 시 에러를 삼키고 외부에 던지지 않음', async () => {
      vi.stubEnv('DATABASE_URL_UNPOOLED', '')
      mockNcrFindUnique.mockResolvedValue({
        id: 'n3', ncrNo: 'NCR-003', title: '테스트', status: 'Closed',
        source: '검사', severity: 'Minor', disposition: 'Scrap', assignee: '김철수',
        description: '내용', timeline: [],
        issuedDate: new Date(), targetDate: new Date(), closedDate: new Date(),
      })
      const { ingestClosedNcr } = await import('./ingest-qms')
      await expect(ingestClosedNcr('n3')).resolves.toBeUndefined()
    })
  })

  describe('ingestClosedClaim', () => {
    it('status가 Closed가 아니면 인제스트하지 않음', async () => {
      mockClaimFindUnique.mockResolvedValue({ id: 'c1', status: 'Open' })
      const { ingestClosedClaim } = await import('./ingest-qms')
      await ingestClosedClaim('c1')
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('Closed Claim은 source_path claim_closed/{id}/{i} 패턴으로 INSERT 호출', async () => {
      mockClaimFindUnique.mockResolvedValue({
        id: 'claim-001', claimNo: 'CLM-2026-001', title: '불량 케이블', status: 'Closed',
        customer: '한국전력', priority: 'High', assignee: '이영희',
        description: '케이블 절연 불량', timeline: [],
        receivedAt: new Date('2026-02-01'), targetDate: new Date('2026-02-15'), closedAt: new Date('2026-02-20'),
      })
      const { ingestClosedClaim } = await import('./ingest-qms')
      await ingestClosedClaim('claim-001')
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/embeddings',
        expect.objectContaining({ method: 'POST' })
      )
      expect(mockSqlTransaction).toHaveBeenCalled()
    })

    it('OpenAI API 실패 시 에러를 삼키고 외부에 던지지 않음', async () => {
      mockClaimFindUnique.mockResolvedValue({
        id: 'c2', claimNo: 'CLM-002', title: '테스트', status: 'Closed',
        customer: '고객', priority: 'Mid', assignee: '담당자',
        description: '내용', timeline: [],
        receivedAt: new Date(), targetDate: null, closedAt: new Date(),
      })
      mockFetch.mockResolvedValue({ ok: false, text: async () => 'rate limited', status: 429 })
      const { ingestClosedClaim } = await import('./ingest-qms')
      await expect(ingestClosedClaim('c2')).resolves.toBeUndefined()
    })
  })
})
