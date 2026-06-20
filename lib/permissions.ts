/**
 * 역할별 섹션 쓰기 권한 정의
 * - 쓰기 권한 없음 = 편집 버튼·드래그 등 모든 변경 액션 비활성화 (읽기는 가능)
 */

const WRITE_PERMISSIONS: Record<string, string[]> = {
  DIRECTOR: ["*"],
  ADMIN:    ["*"],
  TEAM_LEAD: [
    "/",
    "/claims",    // 본인 팀 클레임
    "/ncr",       // 본인 팀 NCR
    "/qcost",
    "/vendors",   // 본인 담당 협력사
    "/facilities",// 본인 담당 시험장·설비
    "/hr",        // 자기 팀원 인사·면담
    "/knowledge", // 전체 쓰기
    "/intelligence",// 전체 쓰기
    "/dashboard", // 본인 입찰 건
  ],
  PRACTITIONER: [
    "/ncr",       // 본인 NCR
    "/claims",    // 본인 클레임
    "/vendors",   // 본인 담당 협력사
    "/facilities",// 본인 담당 시험장·설비
    "/knowledge", // 전체 쓰기
    "/intelligence",// 전체 쓰기
    "/dashboard", // 본인 입찰 건
    // "/qcost"  → 재무비용 대시보드는 조회만
    // "/hr"     → 메뉴 없음
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

// 수선 이력 등록·수정은 PRACTITIONER를 제외한 TEAM_LEAD 이상만 허용.
// canWrite("/facilities")는 PRACTITIONER도 통과하므로 별도 함수로 분리한다.
const REPAIR_WRITE_ROLES = ["DIRECTOR", "ADMIN", "TEAM_LEAD"] as const;

export function canWriteRepair(role: string | null | undefined): boolean {
  if (!role) return false;
  return (REPAIR_WRITE_ROLES as readonly string[]).includes(role);
}

// verified_lesson(가중치 1.5, 최상위 신뢰 지식)은 감독 행위로 확정한다.
// 산출물 쓰기 권한(canWrite)은 PRACTITIONER까지 통과하므로 별도 게이트로 TEAM_LEAD 이상만 허용.
const VERIFY_LESSON_ROLES = ["DIRECTOR", "ADMIN", "TEAM_LEAD"] as const;

export function canVerifyLesson(role: string | null | undefined): boolean {
  if (!role) return false;
  return (VERIFY_LESSON_ROLES as readonly string[]).includes(role);
}
