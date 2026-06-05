import type { Equipment } from "@/types/asset";

export type ComputedStatus = "new" | "normal" | "aging" | "planned";

export const CURRENT_YEAR = 2026;

export function computeStatus(eq: Equipment): ComputedStatus {
  if (eq.status === "planned") return "planned";
  const age = CURRENT_YEAR - eq.yearIntroduced;
  if (age > 20) return "aging";
  if (age > 10) return "normal";
  return "new";
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
