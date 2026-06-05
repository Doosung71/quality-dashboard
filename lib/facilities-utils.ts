import type { Equipment } from "@/types/asset";
import type { TestLog } from "@/types/test";

export type ComputedStatus = "new" | "normal" | "aging" | "planned";

export const CURRENT_YEAR = 2026;

export function computeStatus(eq: Equipment): ComputedStatus {
  if (eq.status === "planned") return "planned";
  const age = CURRENT_YEAR - eq.yearIntroduced;
  if (age > 20) return "aging";
  if (age > 10) return "normal";
  return "new";
}

// 설비 점유 상태 공통 상수 (서버·클라이언트 공유)
// POST/PATCH/DELETE API + UI 충돌 판정 모두 이 상수를 사용한다.
export const OCCUPIED_TEST_STATUSES = ["준비중", "시험중", "지연"] as const;
export type OccupiedTestStatus = (typeof OCCUPIED_TEST_STATUSES)[number];

// 날짜 형식·순서 + round-trip 검증
// round-trip: new Date("2026-02-31")은 JS에서 롤오버되므로 역직렬화 불일치로 실제 불가 날짜 차단
const DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
export function validateDateRange(
  start: unknown,
  end: unknown
): { valid: true } | { valid: false; error: string } {
  if (typeof start !== "string" || !DATE_RE.test(start)) {
    return { valid: false, error: "plannedStart 형식이 잘못됐습니다 (YYYY-MM-DD 필요)." };
  }
  if (typeof end !== "string" || !DATE_RE.test(end)) {
    return { valid: false, error: "plannedEnd 형식이 잘못됐습니다 (YYYY-MM-DD 필요)." };
  }
  // round-trip: 실제 달력에 없는 날짜 차단 (예: 2026-02-31 → 롤오버 감지)
  const startParsed = new Date(start);
  if (isNaN(startParsed.getTime()) || startParsed.toISOString().slice(0, 10) !== start) {
    return { valid: false, error: "plannedStart가 실제 존재하지 않는 날짜입니다." };
  }
  const endParsed = new Date(end);
  if (isNaN(endParsed.getTime()) || endParsed.toISOString().slice(0, 10) !== end) {
    return { valid: false, error: "plannedEnd가 실제 존재하지 않는 날짜입니다." };
  }
  if (start > end) {
    return { valid: false, error: "plannedStart가 plannedEnd보다 이후일 수 없습니다." };
  }
  return { valid: true };
}

// Prisma Json 컬럼 타입 가드 (Medium-C: as 캐스팅 방어)
export function parseSpec(raw: unknown): Record<string, string> {
  if (raw !== null && typeof raw === "object" && !Array.isArray(raw)) {
    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof v === "string") result[k] = v;
    }
    return result;
  }
  return {};
}

export function parseLogs(raw: unknown): TestLog[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is TestLog =>
      item !== null &&
      typeof item === "object" &&
      typeof (item as TestLog).date === "string" &&
      typeof (item as TestLog).note === "string" &&
      typeof (item as TestLog).progress === "number"
  );
}

// toISOString()은 UTC 기준이므로 한국 시간 오전에 전날 날짜를 반환한다.
// 로컬 날짜를 YYYY-MM-DD 형식으로 반환한다.
export function getTodayLocalStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
