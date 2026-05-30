import { z } from "zod"

// 기검요청서 시스템 특성 항목 (Analysis 필드와 1:1 대응)
export const SystemCharacteristicsSchema = z.object({
  voltage: z.string().nullable().describe("전압 등급 (예: 154kV, 345kV)"),
  bilSil: z.string().nullable().describe("BIL/SIL 절연 레벨"),
  shortCircuit: z.string().nullable().describe("단락용량 (예: 40kA, 3s)"),
  installCond: z.string().nullable().describe("포설 조건 (직매, 관로, 수중 등)"),
  groundConfig: z.string().nullable().describe("접지 구성 (단말 접지, 양단 접지 등)"),
  requiredCapacity: z.string().nullable().describe("요구 용량 (MW, MVA, A 등)"),
})

// 개별 요구사항 항목
export const SpecRequirementSchema = z.object({
  category: z.string().describe("요구사항 분류 (예: 케이블, 접속재, QA, 시공)"),
  content: z.string().describe("요구사항 내용"),
  sourcePage: z.number().int().nullable().describe("출처 페이지 번호"),
  sourceText: z.string().nullable().describe("원문 발췌 (50자 이내)"),
  isRisk: z.boolean().describe("RISK 항목 여부"),
  isVE: z.boolean().describe("Value Engineering 항목 여부"),
})

// Claude API 추출 결과 전체 스키마
export const ExtractionResultSchema = z.object({
  systemCharacteristics: SystemCharacteristicsSchema,
  requirements: z.array(SpecRequirementSchema).default([]).describe("추출된 기술 요구사항 목록"),
})

export type ExtractionResult = z.infer<typeof ExtractionResultSchema>
