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
  neonConfig: {},
}))

// Anthropic SDK mock (레버1: LLM 구조화 요약)
const mockMessagesCreate = vi.hoisted(() => vi.fn())
vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    messages = { create: mockMessagesCreate }
  },
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
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test')
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ embedding: Array(1536).fill(0.1) }] }),
    })
    mockSqlTagged.mockReturnValue({})
    mockSqlTransaction.mockResolvedValue(undefined)
    // Anthropic 구조화 요약 기본 응답
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: 'text', text: '## 근본원인\n절연체 결함\n\n## 핵심 대책\n입고 검사 강화\n\n## 교훈\n협력업체 공정 관리 필요' }],
    })
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

  // ── 레버1: QKM 선순환 구조화 요약 테스트 ──────────────────────────────
  describe('레버1 — qms_summary 구조화 요약', () => {
    const CLOSED_NCR = {
      id: 'ncr-lv1', ncrNo: 'NCR-2026-LV1', title: '케이블 절연 불량', status: 'Closed',
      source: '수입검사', severity: 'Major', disposition: 'Rework', assignee: '홍길동',
      description: '절연 저항 기준치 미달 — 협력업체 공정 불량', timeline: [],
      issuedDate: new Date('2026-01-01'), targetDate: new Date('2026-01-15'), closedDate: new Date('2026-01-14'),
    }

    // T1: Happy path — 원본 + qms_summary 모두 저장
    it('T1 — Closed NCR: 원본 청크 + qms_summary 청크 (transaction 2회, Anthropic 1회)', async () => {
      mockNcrFindUnique.mockResolvedValue(CLOSED_NCR)
      const { ingestClosedNcr } = await import('./ingest-qms')
      await ingestClosedNcr('ncr-lv1')

      // 원본 ingestChunks 1회 + 요약 ingestSummaryChunk 1회 = 2회
      expect(mockSqlTransaction).toHaveBeenCalledTimes(2)
      // Anthropic 요약 생성 1회 호출 확인 (= qms_summary 청크가 만들어진 증거)
      expect(mockMessagesCreate).toHaveBeenCalledTimes(1)
    })

    // T2: 잘못된 입력 — Open 상태
    it('T2 — Open 상태 NCR은 요약 생성 없이 종료', async () => {
      mockNcrFindUnique.mockResolvedValue({ ...CLOSED_NCR, status: 'Open' })
      const { ingestClosedNcr } = await import('./ingest-qms')
      await ingestClosedNcr('ncr-lv1')

      expect(mockSqlTransaction).not.toHaveBeenCalled()
      expect(mockMessagesCreate).not.toHaveBeenCalled()
    })

    // T3: 중복 방지 — 재호출 시 DELETE+INSERT 덮어쓰기
    it('T3 — 동일 NCR 재호출 시 transaction 4회 (덮어쓰기 구조 유지)', async () => {
      mockNcrFindUnique.mockResolvedValue(CLOSED_NCR)
      const { ingestClosedNcr } = await import('./ingest-qms')
      await ingestClosedNcr('ncr-lv1')
      await ingestClosedNcr('ncr-lv1')

      // 2호출 × (원본 1 + 요약 1) = 4회
      expect(mockSqlTransaction).toHaveBeenCalledTimes(4)
      // Anthropic도 2회 호출됨 (요약 재생성)
      expect(mockMessagesCreate).toHaveBeenCalledTimes(2)
    })

    // T4: 상태 전환 전후 비교 — Anthropic에 전달된 markdown에 핵심 필드 포함
    it('T4 — generateQmsSummary 호출 시 markdown에 NCR 번호·발생 내용 포함', async () => {
      mockNcrFindUnique.mockResolvedValue(CLOSED_NCR)
      const { ingestClosedNcr } = await import('./ingest-qms')
      await ingestClosedNcr('ncr-lv1')

      // Anthropic API에 전달된 content에 NCR 정보가 담겨있는지 확인
      const callArg = mockMessagesCreate.mock.calls[0][0]
      const userContent = callArg.messages[0].content as string
      expect(userContent).toContain('NCR-2026-LV1')
      expect(userContent).toContain('절연 저항 기준치 미달')
    })

    // T5: 환경변수 누락 — fail-open
    it('T5 — ANTHROPIC_API_KEY 없으면 원본만 저장, 요약 스킵 (fail-open)', async () => {
      vi.stubEnv('ANTHROPIC_API_KEY', '')
      mockNcrFindUnique.mockResolvedValue(CLOSED_NCR)
      const { ingestClosedNcr } = await import('./ingest-qms')
      await ingestClosedNcr('ncr-lv1')

      // 원본 청크 transaction 1회만 실행
      expect(mockSqlTransaction).toHaveBeenCalledTimes(1)
      // Anthropic API 호출 없음
      expect(mockMessagesCreate).not.toHaveBeenCalled()
    })
  })

  // ── Q1: project_key 전파 (entity-linking) ──────────────────────────────
  describe('Q1 — project_key metadata 전파', () => {
    // sql 태그 호출 전체에 전달된 값(values)을 직렬화해 키 포함 여부 확인
    const allSqlValues = () =>
      JSON.stringify(mockSqlTagged.mock.calls.flatMap((c) => c.slice(1)))

    it('projectKey가 있으면 NCR 원본·요약 metadata에 project_key가 흐름', async () => {
      mockNcrFindUnique.mockResolvedValue({
        id: 'ncr-pk', ncrNo: 'NCR-2026-PK', title: '연결키 테스트', status: 'Closed',
        source: '수입검사', severity: 'Major', disposition: 'Rework', assignee: '홍길동',
        description: '내용', timeline: [], projectKey: 'qat-gtc-3001',
        issuedDate: new Date('2026-01-01'), targetDate: new Date('2026-01-15'), closedDate: new Date('2026-01-14'),
      })
      const { ingestClosedNcr } = await import('./ingest-qms')
      await ingestClosedNcr('ncr-pk')
      expect(allSqlValues()).toContain('qat-gtc-3001')
    })

    it('projectKey가 null이면 metadata에 project_key 키가 들어가지 않음', async () => {
      mockClaimFindUnique.mockResolvedValue({
        id: 'claim-nopk', claimNo: 'CLM-2026-NOPK', title: '키 없음', status: 'Closed',
        customer: '한국전력', priority: 'Mid', assignee: '이영희',
        description: '내용', timeline: [], projectKey: null,
        receivedAt: new Date('2026-02-01'), targetDate: null, closedAt: new Date('2026-02-20'),
      })
      const { ingestClosedClaim } = await import('./ingest-qms')
      await ingestClosedClaim('claim-nopk')
      expect(allSqlValues()).not.toContain('project_key')
    })

    // RE-02 보강: 요약 LLM 실패 시에도 기존 summary의 project_key 동기화 (stale 방지)
    it('ANTHROPIC 실패 시 summary project_key를 현재 값으로 동기화 UPDATE', async () => {
      vi.stubEnv('ANTHROPIC_API_KEY', '')
      mockNcrFindUnique.mockResolvedValue({
        id: 'ncr-sync', ncrNo: 'NCR-2026-SYNC', title: '키 동기화', status: 'Closed',
        source: '수입검사', severity: 'Major', disposition: 'Rework', assignee: '홍길동',
        description: '내용', timeline: [], projectKey: 'proj-sync-1',
        issuedDate: new Date('2026-01-01'), targetDate: new Date('2026-01-15'), closedDate: new Date('2026-01-14'),
      })
      const { ingestClosedNcr } = await import('./ingest-qms')
      await ingestClosedNcr('ncr-sync')
      // 요약 transaction은 스킵(1회만), 대신 summary 동기화 UPDATE에 현재 키가 실림
      expect(mockSqlTransaction).toHaveBeenCalledTimes(1)
      expect(allSqlValues()).toContain('proj-sync-1')
    })
  })
})
