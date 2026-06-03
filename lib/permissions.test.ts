import { describe, it, expect } from 'vitest'
import { canWrite, canAccess } from './permissions'

describe('canWrite', () => {
  it('DIRECTOR는 모든 섹션에 쓰기 가능', () => {
    expect(canWrite('DIRECTOR', '/hr')).toBe(true)
    expect(canWrite('DIRECTOR', '/intelligence')).toBe(true)
    expect(canWrite('DIRECTOR', '/knowledge')).toBe(true)
  })

  it('ADMIN는 DIRECTOR와 동일한 전체 권한', () => {
    expect(canWrite('ADMIN', '/hr')).toBe(true)
    expect(canWrite('ADMIN', '/claims')).toBe(true)
  })

  it('TEAM_LEAD는 허용 섹션만 쓰기 가능', () => {
    expect(canWrite('TEAM_LEAD', '/knowledge')).toBe(true)
    expect(canWrite('TEAM_LEAD', '/hr')).toBe(true)
    expect(canWrite('TEAM_LEAD', '/intelligence')).toBe(false)
    expect(canWrite('TEAM_LEAD', '/facilities')).toBe(false)
  })

  it('PRACTITIONER는 NCR·지식·대시보드만 쓰기 가능', () => {
    expect(canWrite('PRACTITIONER', '/ncr')).toBe(true)
    expect(canWrite('PRACTITIONER', '/knowledge')).toBe(true)
    expect(canWrite('PRACTITIONER', '/dashboard')).toBe(true)
    expect(canWrite('PRACTITIONER', '/claims')).toBe(false)
    expect(canWrite('PRACTITIONER', '/hr')).toBe(false)
    expect(canWrite('PRACTITIONER', '/qcost')).toBe(false)
  })

  it('알 수 없는 역할은 false', () => {
    expect(canWrite('UNKNOWN', '/knowledge')).toBe(false)
  })

  it('role이 null/undefined이면 false', () => {
    expect(canWrite(null, '/knowledge')).toBe(false)
    expect(canWrite(undefined, '/knowledge')).toBe(false)
  })
})

describe('canAccess', () => {
  // 현재 모든 접근 허용 구현 — 역할 기반 URL 가드가 없음을 문서화하는 테스트
  it('현재 모든 역할·섹션 조합에 true 반환 (사이드바 필터가 주 접근 제어)', () => {
    expect(canAccess('PRACTITIONER', '/hr')).toBe(true)
    expect(canAccess('PRACTITIONER', '/intelligence')).toBe(true)
    expect(canAccess(null, '/admin')).toBe(true)
  })
})
