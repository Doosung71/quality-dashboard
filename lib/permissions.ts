/**
 * 역할별 섹션 쓰기 권한 정의
 * - 쓰기 권한 없음 = 편집 버튼·드래그 등 모든 변경 액션 비활성화 (읽기는 가능)
 */

const WRITE_PERMISSIONS: Record<string, string[]> = {
  DIRECTOR: ["*"],   // 모든 섹션 전체 권한
  ADMIN:    ["*"],   // 관리자 = 임원 동일
  TEAM_LEAD: [
    "/", "/claims", "/ncr", "/qcost", "/vendors", "/hr",
    "/knowledge", "/dashboard",
    // "/facilities" → 조회만 (시험 현황은 임원 도메인)
    // "/intelligence" → 조회만 (외부정보는 임원 도메인)
  ],
  PRACTITIONER: [
    "/ncr",           // 부적합보고서 — 실무자 주도
    "/knowledge",     // 지식 검색
    "/dashboard",     // 입찰 검토 AI — 본인 분석 건
    // "/claims" → 조회만 (클레임 처리는 팀장 도메인)
    // "/facilities" → 조회만
    // "/qcost" → 조회만
    // "/vendors" → 조회만
    // "/hr" → 조회만
  ],
}

/**
 * 주어진 역할이 특정 섹션에서 쓰기(작성·편집·삭제) 권한이 있는지 반환.
 * section: URL pathname (예: "/claims", "/ncr")
 */
export function canWrite(role: string | null | undefined, section: string): boolean {
  if (!role) return false
  const allowed = WRITE_PERMISSIONS[role]
  if (!allowed) return false
  if (allowed.includes("*")) return true
  return allowed.includes(section)
}

/**
 * 특정 역할이 섹션에 아무 접근도 하지 못하는지 반환 (조회도 불가).
 * 현재 구현에서는 사이드바 필터가 주 접근 제어이므로, 여기서는 모두 true.
 */
export function canAccess(_role: string | null | undefined, _section: string): boolean {
  return true
}
