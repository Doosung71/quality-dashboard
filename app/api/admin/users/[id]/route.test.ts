import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockSession = {
  user: { id: 'admin-1', email: 'doosung71@gmail.com', role: 'ADMIN', status: 'ACTIVE' },
}

vi.mock('@/lib/session-guard', () => ({
  requireActiveSession: vi.fn().mockResolvedValue(mockSession),
}))

vi.mock('@/lib/admin', () => ({
  isAdmin: vi.fn().mockReturnValue(true),
}))

const mockUserUpdate = vi.fn().mockResolvedValue({ id: 'other-1' })
const mockUserFindUnique = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      update: mockUserUpdate,
      findUnique: mockUserFindUnique,
    },
    $transaction: vi.fn(async (cb) => cb({ feedbackReply: { deleteMany: vi.fn() }, feedback: { deleteMany: vi.fn() }, comment: { deleteMany: vi.fn() }, reviewHistory: { deleteMany: vi.fn() }, tender: { findMany: vi.fn().mockResolvedValue([]) }, user: { delete: vi.fn() } })),
  },
}))

async function makePatch(targetId: string, body: Record<string, unknown>) {
  const { PATCH } = await import('./route')
  const req = new NextRequest('http://localhost/api/admin/users/' + targetId, {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
  return PATCH(req, { params: Promise.resolve({ id: targetId }) })
}

describe('Admin PATCH /api/admin/users/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // session-guard / admin 초기 mock은 vi.mock() 설정값 그대로 유지
    mockUserUpdate.mockResolvedValue({ id: 'other-1' })
  })

  it('자기 자신의 role 변경 시 403 반환', async () => {
    const res = await makePatch('admin-1', { role: 'TEAM_LEAD' })
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toContain('자기 자신')
    expect(mockUserUpdate).not.toHaveBeenCalled()
  })

  it('자기 자신의 status 변경 시 403 반환', async () => {
    const res = await makePatch('admin-1', { status: 'BANNED' })
    expect(res.status).toBe(403)
    expect(mockUserUpdate).not.toHaveBeenCalled()
  })

  it('자기 자신의 email 변경 시 403 반환', async () => {
    const res = await makePatch('admin-1', { email: 'new@example.com' })
    expect(res.status).toBe(403)
    expect(mockUserUpdate).not.toHaveBeenCalled()
  })

  it('다른 사용자의 role 변경은 허용', async () => {
    const res = await makePatch('other-1', { role: 'TEAM_LEAD' })
    expect(res.status).toBe(200)
    expect(mockUserUpdate).toHaveBeenCalled()
  })

  it('자기 자신의 name 변경은 허용 (보호 대상 아님)', async () => {
    mockUserUpdate.mockResolvedValue({ id: 'admin-1', name: '홍길동' })
    const res = await makePatch('admin-1', { name: '홍길동' })
    expect(res.status).toBe(200)
  })
})
