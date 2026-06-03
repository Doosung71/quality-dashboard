import { describe, it, expect } from 'vitest'
import { isAdmin } from './admin'

describe('isAdmin', () => {
  it('등록된 이메일은 true', () => {
    expect(isAdmin('doosung71@gmail.com')).toBe(true)
  })

  it('미등록 이메일은 false', () => {
    expect(isAdmin('unknown@example.com')).toBe(false)
  })

  it('role=ADMIN이면 이메일 무관 true', () => {
    expect(isAdmin('anyone@example.com', 'ADMIN')).toBe(true)
  })

  it('role=ADMIN + 이메일 없음도 true', () => {
    expect(isAdmin(null, 'ADMIN')).toBe(true)
    expect(isAdmin(undefined, 'ADMIN')).toBe(true)
  })

  it('role=TEAM_LEAD이면 false', () => {
    expect(isAdmin('someone@example.com', 'TEAM_LEAD')).toBe(false)
  })

  it('인수 없음은 false', () => {
    expect(isAdmin()).toBe(false)
  })
})
