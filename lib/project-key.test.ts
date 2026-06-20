import { describe, it, expect } from "vitest"
import {
  isValidProjectKey,
  normalizeProjectKey,
  parseProjectKeyInput,
  PROJECT_KEY_MAX_LENGTH,
} from "./project-key"

describe("project-key 유틸 (Q1 entity-linking)", () => {
  // 1) Happy path — 유효한 kebab-case 키
  describe("isValidProjectKey — happy path", () => {
    it("소문자·숫자·하이픈 kebab-case 키를 허용", () => {
      expect(isValidProjectKey("qat-gtc-3001-230kv")).toBe(true)
      expect(isValidProjectKey("a")).toBe(true)
      expect(isValidProjectKey("project1")).toBe(true)
      expect(isValidProjectKey("2026-tender-07")).toBe(true)
    })
  })

  // 2) 잘못된 입력 validation — 형식 위반 거부
  describe("isValidProjectKey — validation", () => {
    it("대문자·공백·특수문자·양끝·연속 하이픈을 거부", () => {
      expect(isValidProjectKey("QAT-GTC")).toBe(false)   // 대문자
      expect(isValidProjectKey("qat gtc")).toBe(false)   // 공백
      expect(isValidProjectKey("qat_gtc")).toBe(false)   // 언더스코어
      expect(isValidProjectKey("qat--gtc")).toBe(false)  // 연속 하이픈
      expect(isValidProjectKey("-qat")).toBe(false)      // 앞 하이픈
      expect(isValidProjectKey("qat-")).toBe(false)      // 뒤 하이픈
      expect(isValidProjectKey("프로젝트")).toBe(false)   // 비ASCII
    })

    it(`길이 ${PROJECT_KEY_MAX_LENGTH}자 초과를 거부`, () => {
      expect(isValidProjectKey("a".repeat(PROJECT_KEY_MAX_LENGTH))).toBe(true)
      expect(isValidProjectKey("a".repeat(PROJECT_KEY_MAX_LENGTH + 1))).toBe(false)
    })
  })

  // 3) 정규화 — 사람이 친 문자열을 kebab-case 후보로
  describe("normalizeProjectKey", () => {
    it("대문자·공백·특수문자를 kebab-case로 정규화", () => {
      expect(normalizeProjectKey("QAT GTC 3001")).toBe("qat-gtc-3001")
      expect(normalizeProjectKey("Project_Alpha #1")).toBe("project-alpha-1")
      expect(normalizeProjectKey("  --trim--  ")).toBe("trim")
    })

    it("정규화 결과는 항상 유효하거나 빈 문자열(멱등)", () => {
      const normalized = normalizeProjectKey("A!!!B   C")
      expect(normalized).toBe("a-b-c")
      expect(isValidProjectKey(normalized)).toBe(true)
      // 멱등성: 한 번 더 정규화해도 동일
      expect(normalizeProjectKey(normalized)).toBe(normalized)
    })
  })

  // 4) 빈 입력 fail-open + 5) 비정상 타입 방어
  describe("parseProjectKeyInput — fail-open / 방어", () => {
    it("빈 문자열·공백·null·undefined는 키 없음(fail-open, invalid 아님)", () => {
      expect(parseProjectKeyInput("")).toEqual({ value: null, invalid: false })
      expect(parseProjectKeyInput("   ")).toEqual({ value: null, invalid: false })
      expect(parseProjectKeyInput(null)).toEqual({ value: null, invalid: false })
      expect(parseProjectKeyInput(undefined)).toEqual({ value: null, invalid: false })
    })

    it("유효한 키는 트림 후 그대로 통과", () => {
      expect(parseProjectKeyInput("  qat-gtc-3001  ")).toEqual({ value: "qat-gtc-3001", invalid: false })
    })

    it("값이 있으나 형식이 틀리면 invalid=true (라우트 400 유도)", () => {
      expect(parseProjectKeyInput("QAT GTC")).toEqual({ value: null, invalid: true })
      expect(parseProjectKeyInput("qat_gtc")).toEqual({ value: null, invalid: true })
    })

    it("문자열이 아닌 타입은 invalid 처리", () => {
      expect(parseProjectKeyInput(123)).toEqual({ value: null, invalid: true })
      expect(parseProjectKeyInput({})).toEqual({ value: null, invalid: true })
    })
  })
})
