/**
 * 처리이력(타임라인) 공용 헬퍼 — NCR·Claim 등 단계형 워크플로 공유 (2026-07-01 #63).
 *
 * NCR은 담당자 필드가 `user`, Claim은 `handler`로 이름이 달라, 새 시스템 로그를
 * 만드는 부분만 호출부가 넘기는 팩토리(makeSystemEntry)로 위임한다. 판별·dedup 로직은
 * `kind`/`action`만 보므로 두 모듈이 동일한 함수를 공유한다.
 */

/** 타임라인 항목 공통 최소 형태 (담당자 필드는 모듈마다 다르므로 제외). */
export interface StageTimelineItem {
  date: string;
  action: string;
  /**
   * 항목 출처 구분 (2026-07-01 #63).
   * - "system": 단계 이동 등 앱이 자동 기록한 감사 로그
   * - "user":   사용자가 직접 입력한 처리 메모
   * 레거시 데이터(필드 없음)는 action prefix로 폴백 판별한다.
   */
  kind?: "system" | "user";
}

/** 단계 이동 시스템 로그의 action 접두사. 레거시 폴백 판별에도 사용. */
export const STAGE_MOVE_PREFIX = "단계 이동:";

/**
 * 시스템 자동 기록(단계 이동 등) 여부.
 * kind가 없는 레거시 항목은 action 접두사로 폴백 판별한다.
 */
export function isSystemTimelineEntry(
  item: Pick<StageTimelineItem, "kind" | "action">,
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
 * 그 외에는 `makeSystemEntry`가 만든 시스템 로그 1건을 추가한다.
 *
 * `makeSystemEntry`는 담당자 필드명(user/handler)이 모듈마다 달라 호출부가 주입한다.
 * 순수 함수 — 부수효과 없음. UI/저장은 호출부에서 처리.
 */
export function buildStageMoveTimeline<T extends StageTimelineItem>(
  prev: T[],
  fromLabel: string,
  toLabel: string,
  makeSystemEntry: (action: string) => T,
): T[] {
  const last = prev[prev.length - 1];
  const reverse = stageMoveAction(toLabel, fromLabel);
  if (last && isSystemTimelineEntry(last) && last.action === reverse) {
    // 정확한 역방향 → 직전 왕복 로그 제거 (net-zero)
    return prev.slice(0, -1);
  }
  return [...prev, makeSystemEntry(stageMoveAction(fromLabel, toLabel))];
}
