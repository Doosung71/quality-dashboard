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

  it('TEAM_LEAD는 허용 섹션에 쓰기 가능', () => {
    expect(canWrite('TEAM_LEAD', '/knowledge')).toBe(true)
    expect(canWrite('TEAM_LEAD', '/hr')).toBe(true)
    expect(canWrite('TEAM_LEAD', '/intelligence')).toBe(true)   // 변경: 외부정보 전체 쓰기
    expect(canWrite('TEAM_LEAD', '/facilities')).toBe(true)     // 변경: 시험장 본인 담당
    expect(canWrite('TEAM_LEAD', '/claims')).toBe(true)
    expect(canWrite('TEAM_LEAD', '/vendors')).toBe(true)
  })

  it('PRACTITIONER는 클레임·공급망·시험장·지식·외부정보·입찰 쓰기 가능, HR·품질비용은 불가', () => {
    expect(canWrite('PRACTITIONER', '/ncr')).toBe(true)
    expect(canWrite('PRACTITIONER', '/claims')).toBe(true)      // 변경: 본인 클레임
    expect(canWrite('PRACTITIONER', '/vendors')).toBe(true)     // 변경: 본인 협력사
    expect(canWrite('PRACTITIONER', '/facilities')).toBe(true)  // 변경: 본인 시험장
    expect(canWrite('PRACTITIONER', '/knowledge')).toBe(true)
    expect(canWrite('PRACTITIONER', '/intelligence')).toBe(true)// 변경: 외부정보 전체 쓰기
    expect(canWrite('PRACTITIONER', '/dashboard')).toBe(true)
    expect(canWrite('PRACTITIONER', '/hr')).toBe(false)         // 메뉴 없음
    expect(canWrite('PRACTITIONER', '/qcost')).toBe(false)      // 재무 조회만
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
