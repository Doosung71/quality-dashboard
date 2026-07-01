import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── prisma mock ────────────────────────────────────────────────
const mockNcrFindMany   = vi.hoisted(() => vi.fn())
const mockClaimFindMany = vi.hoisted(() => vi.fn())
const mockQueryRaw      = vi.hoisted(() => vi.fn())
vi.mock('@/lib/prisma', () => ({
  prisma: {
    ncr: { findMany: mockNcrFindMany },
    claim: { findMany: mockClaimFindMany },
    $queryRaw: mockQueryRaw,
  },
}))

import { loadProjectHistory } from './project-history'

describe('loadProjectHistory — 고리④ surface', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNcrFindMany.mockResolvedValue([])
    mockClaimFindMany.mockResolvedValue([])
    mockQueryRaw.mockResolvedValue([])
  })

  // 키 없음/무효 → null (surface 안 함, 쿼리도 안 함)
  it('projectKey가 없으면 null 반환 + 쿼리 없음', async () => {
    expect(await loadProjectHistory(null)).toBeNull()
    expect(await loadProjectHistory('')).toBeNull()
    expect(mockNcrFindMany).not.toHaveBeenCalled()
  })

  it('무효한 kebab 키는 null 반환 + 쿼리 없음', async () => {
    expect(await loadProjectHistory('INVALID KEY')).toBeNull()
    expect(mockNcrFindMany).not.toHaveBeenCalled()
  })

  // 상태 전환 필터 — status: 'Closed'만 조회 (진행중 제외)
  it("종결(Closed) 상태만 조회한다", async () => {
    await loadProjectHistory('qat-gtc-3003')
    expect(mockNcrFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { projectKey: 'qat-gtc-3003', status: 'Closed' } }),
    )
    expect(mockClaimFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { projectKey: 'qat-gtc-3003', status: 'Closed' } }),
    )
  })

  // Happy path — 이력 매핑 + total 집계
  it('NCR·클레임·확정교훈을 매핑하고 total을 집계한다', async () => {
    mockNcrFindMany.mockResolvedValue([
      { id: 'n1', ncrNo: 'NCR-2026-001', title: '단선', severity: 'Major', disposition: 'Rework', closedDate: new Date('2026-06-01') },
    ])
    mockClaimFindMany.mockResolvedValue([
      { id: 'c1', claimNo: 'CLM-2026-001', title: '누수', customer: '고객A', priority: 'High', closedAt: new Date('2026-06-02') },
    ])
    mockQueryRaw.mockResolvedValue([
      { source_path: 'verified_lesson/ncr/n1', title: '단선 교훈', content: '## 근본원인\n...', checklist: '체결 토크 확인', ref_no: 'NCR-2026-001', ref_type: 'ncr' },
    ])

    const h = await loadProjectHistory('qat-gtc-3003')
    expect(h).not.toBeNull()
    expect(h!.total).toBe(3)
    expect(h!.ncrs[0].ncrNo).toBe('NCR-2026-001')
    expect(h!.claims[0].customer).toBe('고객A')
    expect(h!.lessons[0].checklist).toBe('체결 토크 확인')
    expect(h!.lessons[0].refType).toBe('ncr')
  })

  // fail-open — DB 오류 시 빈 이력 반환 (입찰 페이지를 막지 않음)
  it('조회 실패 시 fail-open으로 빈 이력 반환', async () => {
    mockNcrFindMany.mockRejectedValue(new Error('DB down'))
    const h = await loadProjectHistory('qat-gtc-3003')
    expect(h).not.toBeNull()
    expect(h!.total).toBe(0)
    expect(h!.lessons).toEqual([])
  })
})
