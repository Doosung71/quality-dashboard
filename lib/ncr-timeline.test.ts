import { describe, it, expect } from "vitest";
import type { NCRTimelineItem } from "@/types/ncr";
import {
  buildStageMoveTimeline,
  isSystemTimelineEntry,
  stageMoveAction,
} from "./ncr-timeline";

const DATE = "2026-07-01";
const USER = "홍길동";

function sys(action: string): NCRTimelineItem {
  return { date: DATE, action, user: USER, kind: "system" };
}
function usr(action: string): NCRTimelineItem {
  return { date: DATE, action, user: USER, kind: "user" };
}

describe("isSystemTimelineEntry", () => {
  it("kind=system → true", () => {
    expect(isSystemTimelineEntry({ kind: "system", action: "무엇이든" })).toBe(true);
  });
  it("kind=user → false", () => {
    expect(isSystemTimelineEntry({ kind: "user", action: "직접 메모" })).toBe(false);
  });
  it("레거시(kind 없음) + 단계이동 접두사 → true (폴백)", () => {
    expect(isSystemTimelineEntry({ action: "단계 이동: 발행 → 처리방안 수립" })).toBe(true);
  });
  it("레거시(kind 없음) + 일반 메모 → false", () => {
    expect(isSystemTimelineEntry({ action: "원인 분석 회의 완료" })).toBe(false);
  });
});

describe("buildStageMoveTimeline", () => {
  it("1) Happy: 빈 타임라인에 단계 이동 → 시스템 로그 1건 추가", () => {
    const out = buildStageMoveTimeline([], "발행", "처리방안 수립", USER, DATE);
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({
      date: DATE,
      action: stageMoveAction("발행", "처리방안 수립"),
      user: USER,
      kind: "system",
    });
  });

  it("2) Dedup: 직전이 정확한 역방향 → 항목 제거(길이 감소)", () => {
    // 발행 → 처리방안 수립 을 이미 기록한 상태에서, 처리방안 수립 → 발행 (되돌리기)
    const prev = [sys(stageMoveAction("발행", "처리방안 수립"))];
    const out = buildStageMoveTimeline(prev, "처리방안 수립", "발행", USER, DATE);
    expect(out).toHaveLength(0); // 왕복 흔적 제거
  });

  it("3) 비역방향 이동 → 정상 추가(오판 방지)", () => {
    const prev = [sys(stageMoveAction("발행", "처리방안 수립"))];
    // 처리방안 수립 → 시정조치 중 (전진, 역방향 아님)
    const out = buildStageMoveTimeline(prev, "처리방안 수립", "시정조치 중", USER, DATE);
    expect(out).toHaveLength(2);
    expect(out[1].action).toBe(stageMoveAction("처리방안 수립", "시정조치 중"));
  });

  it("4) 직전이 사용자 수동 메모(우연히 같은 텍스트) → dedup 안 함(가드)", () => {
    // 사용자가 손으로 "단계 이동: 처리방안 수립 → 발행" 을 메모했더라도 kind=user 이므로 보존
    const prev = [usr(stageMoveAction("처리방안 수립", "발행"))];
    const out = buildStageMoveTimeline(prev, "발행", "처리방안 수립", USER, DATE);
    expect(out).toHaveLength(2); // 제거되지 않음
  });

  it("5) 레거시 시스템 로그(kind 없음)도 역방향이면 dedup", () => {
    const legacy: NCRTimelineItem = {
      date: DATE,
      action: stageMoveAction("발행", "처리방안 수립"),
      user: USER,
      // kind 없음 (구버전 데이터)
    };
    const out = buildStageMoveTimeline([legacy], "처리방안 수립", "발행", USER, DATE);
    expect(out).toHaveLength(0);
  });

  it("6) 직전이 비역방향 시스템 로그면 dedup 안 하고 추가 — 여러 왕복 순차 정리", () => {
    // 발행→방안, 방안→시정 상태에서 시정→방안(되돌리기)만 정확히 정리
    const prev = [
      sys(stageMoveAction("발행", "처리방안 수립")),
      sys(stageMoveAction("처리방안 수립", "시정조치 중")),
    ];
    const out = buildStageMoveTimeline(prev, "시정조치 중", "처리방안 수립", USER, DATE);
    expect(out).toHaveLength(1);
    expect(out[0].action).toBe(stageMoveAction("발행", "처리방안 수립"));
  });

  it("원본 배열을 변형하지 않는다 (순수 함수)", () => {
    const prev = [sys(stageMoveAction("발행", "처리방안 수립"))];
    const snapshot = JSON.parse(JSON.stringify(prev));
    buildStageMoveTimeline(prev, "처리방안 수립", "시정조치 중", USER, DATE);
    expect(prev).toEqual(snapshot);
  });
});
