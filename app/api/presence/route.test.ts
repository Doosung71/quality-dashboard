import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAuth = vi.fn()

vi.mock('@/auth', () => ({
  auth: () => mockAuth(),
}))

async function makeGet() {
  const { GET } = await import('./route')
  return GET()
}

describe('GET /api/presence 관리자 가드 (isAdmin email+role 통일)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Redis 미설정 경로로 유도 — 가드 통과 시 빈 배열 반환
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
  })

  it('세션 없음 → 403', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await makeGet()
    expect(res.status).toBe(403)
  })

  it('일반 사용자(PRACTITIONER) → 403', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'user@example.com', role: 'PRACTITIONER' } })
    const res = await makeGet()
    expect(res.status).toBe(403)
  })

  it('DIRECTOR(allowlist 아님) → 403 — 임원은 관리자 아님', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'director@example.com', role: 'DIRECTOR' } })
    const res = await makeGet()
    expect(res.status).toBe(403)
  })

  it('ADMIN 역할(allowlist 아닌 이메일) → 200 — 역할 기반 관리자 인정', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'admin2@example.com', role: 'ADMIN' } })
    const res = await makeGet()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  it('allowlist 이메일(역할 무관) → 200', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'doosung71@gmail.com', role: 'PRACTITIONER' } })
    const res = await makeGet()
    expect(res.status).toBe(200)
  })
})
