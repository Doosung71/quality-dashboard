import type { NCRTimelineItem } from "@/types/ncr";

/** 단계 이동 시스템 로그의 action 접두사. 레거시 폴백 판별에도 사용. */
export const STAGE_MOVE_PREFIX = "단계 이동:";

/**
 * 시스템 자동 기록(단계 이동 등) 여부.
 * kind가 없는 레거시 항목은 action 접두사로 폴백 판별한다.
 */
export function isSystemTimelineEntry(
  item: Pick<NCRTimelineItem, "kind" | "action">,
): boolean {
  // 명시적 kind가 폴백보다 우선 — 사용자가 직접 쓴 항목은 접두사가 같아도 시스템 아님
  if (item.kind === "system") return true;
  if (item.kind === "user") return false;
  return item.action.startsWith(STAGE_MOVE_PREFIX); // 레거시(kind 없음) 폴백
}

/** "단계 이동: {from} → {to}" 형식 action 문자열 생성. */
export function stageMoveAction(fromLabel: string, toLabel: string): string {
  return `${STAGE_MOVE_PREFIX} ${fromLabel} → ${toLabel}`;
}

/**
 * 단계 이동 시 새 타임라인을 만든다 (#63 되돌리기 dedup).
 *
 * 직전 항목이 지금 이동의 **정확한 역방향** 시스템 로그면 그 항목을 제거해
 * 실수 왕복(다음→이전→다음)이 쓰레기 로그로 쌓이는 것을 막는다.
 * 그 외에는 시스템 로그 1건을 추가한다.
 *
 * 순수 함수 — 부수효과 없음. UI/저장은 호출부에서 처리.
 */
export function buildStageMoveTimeline(
  prev: NCRTimelineItem[],
  fromLabel: string,
  toLabel: string,
  user: string,
  date: string,
): NCRTimelineItem[] {
  const last = prev[prev.length - 1];
  const reverse = stageMoveAction(toLabel, fromLabel);
  if (last && isSystemTimelineEntry(last) && last.action === reverse) {
    // 정확한 역방향 → 직전 왕복 로그 제거 (net-zero)
    return prev.slice(0, -1);
  }
  return [
    ...prev,
    { date, action: stageMoveAction(fromLabel, toLabel), user, kind: "system" },
  ];
}
