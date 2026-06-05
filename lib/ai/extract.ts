import Anthropic from "@anthropic-ai/sdk"
import { z } from "zod"
import { ExtractionResultSchema, type ExtractionResult, ContractGapResultSchema, type ContractGapResult } from "@/lib/schemas"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const TOOL_NAME = "extract_tender_spec"

export type ExtractResult = {
  data: ExtractionResult
  aiUsed: "Claude" | "OpenAI" | "Gemini"
}

export async function extractTenderSpec(
  pdfText: string,
  knowledgeContext?: string,
  webContext?: string
): Promise<ExtractResult> {
  try {
    console.log("[extractTenderSpec] Claude 분석 시작...")
    const data = await extractTenderSpecClaude(pdfText, knowledgeContext, webContext)
    return { data, aiUsed: "Claude" }
  } catch (claudeError: unknown) {
    const claudeMsg = claudeError instanceof Error ? claudeError.message : String(claudeError)
    console.warn(`[extractTenderSpec] Claude 오류 → OpenAI fallback: ${claudeMsg}`)

    try {
      const data = await extractTenderSpecOpenAI(pdfText, knowledgeContext, webContext)
      return { data, aiUsed: "OpenAI" }
    } catch (openaiError: unknown) {
      const openaiMsg = openaiError instanceof Error ? openaiError.message : String(openaiError)
      console.warn(`[extractTenderSpec] OpenAI 오류 → Gemini fallback: ${openaiMsg}`)

      try {
        const data = await extractTenderSpecGemini(pdfText, knowledgeContext, webContext)
        return { data, aiUsed: "Gemini" }
      } catch (geminiError: unknown) {
        const geminiMsg = geminiError instanceof Error ? geminiError.message : String(geminiError)
        console.error(`[extractTenderSpec] 모든 AI 분석 실패. Claude: ${claudeMsg} / OpenAI: ${openaiMsg} / Gemini: ${geminiMsg}`)
        throw new Error(
          `AI 분석에 실패했습니다. (Claude: ${claudeMsg} / OpenAI: ${openaiMsg} / Gemini: ${geminiMsg})`
        )
      }
    }
  }
}

function buildContextSection(knowledgeContext?: string, webContext?: string): string {
  let section = ""
  if (knowledgeContext) {
    section += `<knowledge_context>
<instruction>이 시방서와 관련된 내부 규격 원문 발췌다. 분석 시 각 청크의 규격 번호와 요구사항 일치·불일치를 content에 반영하라.</instruction>
${knowledgeContext}
</knowledge_context>

`
  }
  if (webContext) {
    section += `<web_context>
<instruction>외부 웹 검색으로 수집한 관련 규격·표준 참고 정보다. 내부 RAG 결과를 보완하는 참고 자료로 활용하라.</instruction>
${webContext}
</web_context>

`
  }
  return section
}

async function extractTenderSpecClaude(
  pdfText: string,
  knowledgeContext?: string,
  webContext?: string
): Promise<ExtractionResult> {
  const inputSchema = z.toJSONSchema(ExtractionResultSchema) as Anthropic.Tool["input_schema"]
  const contextSection = buildContextSection(knowledgeContext, webContext)

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    tools: [
      {
        name: TOOL_NAME,
        description:
          "Tender Spec PDF 텍스트에서 기검요청서 작성에 필요한 항목을 구조화하여 추출한다.",
        input_schema: inputSchema,
      },
    ],
    tool_choice: { type: "tool", name: TOOL_NAME },
    messages: [
      {
        role: "user",
        content: `${contextSection}아래는 HVAC 해저·지중 케이블 입찰 사양서(Tender Spec) 텍스트다.
기검요청서 작성에 필요한 항목을 추출하라.

추출 규칙:
- 명시된 수치·사양만 추출한다. 추측하지 않는다.
- 찾을 수 없는 항목은 null로 반환한다.
- sourceText는 원문 그대로 최대 50자까지만 발췌한다.
- 페이지 번호가 텍스트에 표시된 경우에만 sourcePage를 기록한다.
- 참고 규격 원문이 제공된 경우, 규격 번호와 요구사항의 일치·불일치를 content에 반영하라.

---
${pdfText}`,
      },
    ],
  })

  const toolUse = response.content.find((c) => c.type === "tool_use")
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude API가 tool_use 응답을 반환하지 않았습니다.")
  }

  return ExtractionResultSchema.parse(toolUse.input)
}

// OpenAI TPM 한도 대응: 텍스트를 ~20,000 토큰(약 80,000자)으로 제한
const OPENAI_MAX_CHARS = 80_000

async function extractTenderSpecOpenAI(
  pdfText: string,
  knowledgeContext?: string,
  webContext?: string
): Promise<ExtractionResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error("OPENAI_API_KEY 환경변수가 누락되었습니다.")

  console.log("[extractTenderSpec] OpenAI GPT-4o 백업 분석 시작...")
  const truncatedText = pdfText.length > OPENAI_MAX_CHARS ? pdfText.slice(0, OPENAI_MAX_CHARS) : pdfText
  const contextSection = buildContextSection(knowledgeContext, webContext)

  const systemPrompt = `당신은 HVAC 해저·지중 케이블 입찰 사양서(Tender Spec) 분석 전문가입니다.
주어진 PDF 텍스트에서 기검요청서 작성에 필요한 항목을 추출하여 반드시 아래 JSON 스키마 형식으로만 응답하십시오.

JSON 스키마:
{
  "systemCharacteristics": {
    "voltage": "전압 등급 문자열 또는 null",
    "bilSil": "BIL/SIL 절연 레벨 문자열 또는 null",
    "shortCircuit": "단락용량 문자열 또는 null",
    "installCond": "포설 조건 문자열 또는 null",
    "groundConfig": "접지 구성 문자열 또는 null",
    "requiredCapacity": "요구 용량 문자열 또는 null"
  },
  "requirements": [
    {
      "category": "요구사항 분류",
      "content": "요구사항 내용",
      "sourcePage": 페이지번호_정수_또는_null,
      "sourceText": "원문 발췌 50자 이내 또는 null",
      "isRisk": true/false,
      "isVE": true/false
    }
  ]
}

추출 규칙:
- 명시된 수치·사양만 추출한다. 추측하지 않는다.
- 찾을 수 없는 항목은 null로 반환한다.
- sourceText는 원문 그대로 최대 50자까지만 발췌한다.
- 페이지 번호가 텍스트에 표시된 경우에만 sourcePage를 기록한다.`

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      max_tokens: 4096,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `${contextSection}아래는 HVAC 해저·지중 케이블 입찰 사양서(Tender Spec) 텍스트다. 기검요청서 항목을 추출하라.

---
${truncatedText}`,
        },
      ],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI API HTTP 에러: ${res.status} - ${err}`)
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const text = data.choices?.[0]?.message?.content
  if (!text) throw new Error("OpenAI API가 유효한 응답을 반환하지 않았습니다.")

  return ExtractionResultSchema.parse(JSON.parse(text))
}

async function extractTenderSpecGemini(
  pdfText: string,
  knowledgeContext?: string,
  webContext?: string
): Promise<ExtractionResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY 환경변수가 누락되었습니다.")
  }

  console.log("[extractTenderSpec] Gemini 2.5 Pro 백업 분석 시작...")
  const contextSection = buildContextSection(knowledgeContext, webContext)

  const prompt = `${contextSection}아래는 HVAC 해저·지중 케이블 입찰 사양서(Tender Spec) 텍스트다.
기검요청서 작성에 필요한 항목을 추출하라.

추출 규칙:
- 명시된 수치·사양만 추출한다. 추측하지 않는다.
- 찾을 수 없는 항목은 null로 반환한다.
- sourceText는 원문 그대로 최대 50자까지만 발췌한다.
- 페이지 번호가 텍스트에 표시된 경우에만 sourcePage를 기록한다.
- 참고 규격 원문이 제공된 경우, 규격 번호와 요구사항의 일치·불일치를 content에 반영하라.

---
${pdfText}`

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              systemCharacteristics: {
                type: "OBJECT",
                properties: {
                  voltage: { type: "STRING", nullable: true },
                  bilSil: { type: "STRING", nullable: true },
                  shortCircuit: { type: "STRING", nullable: true },
                  installCond: { type: "STRING", nullable: true },
                  groundConfig: { type: "STRING", nullable: true },
                  requiredCapacity: { type: "STRING", nullable: true },
                },
                required: ["voltage", "bilSil", "shortCircuit", "installCond", "groundConfig", "requiredCapacity"],
              },
              requirements: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    category: { type: "STRING" },
                    content: { type: "STRING" },
                    sourcePage: { type: "INTEGER", nullable: true },
                    sourceText: { type: "STRING", nullable: true },
                    isRisk: { type: "BOOLEAN" },
                    isVE: { type: "BOOLEAN" },
                  },
                  required: ["category", "content", "isRisk", "isVE"],
                },
              },
            },
            required: ["systemCharacteristics", "requirements"],
          },
        },
      }),
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Gemini API HTTP 에러: ${response.status} - ${errorText}`)
  }

  const resJson = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string
        }>
      }
    }>
  }

  const textOutput = resJson.candidates?.[0]?.content?.parts?.[0]?.text
  if (!textOutput) {
    throw new Error("Gemini API가 유효한 텍스트 응답을 반환하지 않았습니다.")
  }

  const parsed = JSON.parse(textOutput) as unknown
  return ExtractionResultSchema.parse(parsed)
}

// ─── 수주 프로젝트: 계약 갭 분석 ─────────────────────────────────

const CONTRACT_GAP_TOOL = "analyze_contract_gaps"

export type ContractGapExtractResult = {
  data: ContractGapResult
  aiUsed: "Claude" | "OpenAI"
}

export async function extractContractGaps(
  contractText: string,
  tenderRequirements: { category: string; content: string }[]
): Promise<ContractGapExtractResult> {
  try {
    const data = await extractContractGapsClaude(contractText, tenderRequirements)
    return { data, aiUsed: "Claude" }
  } catch (err) {
    console.warn("[extractContractGaps] Claude 실패 → OpenAI fallback:", (err as Error).message)
    const data = await extractContractGapsOpenAI(contractText, tenderRequirements)
    return { data, aiUsed: "OpenAI" }
  }
}

function buildTenderSummary(reqs: { category: string; content: string }[]): string {
  if (reqs.length === 0) return "입찰 요구사항 정보 없음"
  return reqs.map((r, i) => `[${i + 1}] [${r.category}] ${r.content}`).join("\n")
}

async function extractContractGapsClaude(
  contractText: string,
  tenderRequirements: { category: string; content: string }[]
): Promise<ContractGapResult> {
  const inputSchema = z.toJSONSchema(ContractGapResultSchema) as Anthropic.Tool["input_schema"]
  const tenderSummary = buildTenderSummary(tenderRequirements)

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    tools: [
      {
        name: CONTRACT_GAP_TOOL,
        description: "계약서와 입찰 약속을 비교해 차이(갭)를 구조화하여 추출한다.",
        input_schema: inputSchema,
      },
    ],
    tool_choice: { type: "tool", name: CONTRACT_GAP_TOOL },
    messages: [
      {
        role: "user",
        content: `당신은 LS전선 품질부문 계약 검토 전문가입니다.
아래 [입찰 단계 요구사항]과 [계약서 텍스트]를 비교하여 갭 분석을 수행하세요.

분석 규칙:
- MATCH: 입찰 약속과 계약 요구사항이 실질적으로 일치
- GAP: 계약서가 입찰보다 더 엄격한 요구사항을 포함 (리스크)
- RELAXED: 계약서 요구사항이 입찰보다 완화됨 (기회)
- NEW: 입찰에 없던 새로운 계약 요구사항 (추가 범위)
- isRisk=true: 계약 이행에 실질적 위험이 되는 항목
- 명시된 내용만 추출하고, 추측하지 않는다.

[입찰 단계 요구사항]
${tenderSummary}

[계약서 텍스트]
${contractText}`,
      },
    ],
  })

  const toolUse = response.content.find((c) => c.type === "tool_use")
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude가 tool_use 응답을 반환하지 않았습니다.")
  }
  return ContractGapResultSchema.parse(toolUse.input)
}

// 입찰 없는 수의계약: 계약서 자체 리스크/요구사항 추출
export async function extractContractRisks(contractText: string): Promise<ContractGapExtractResult> {
  try {
    const data = await extractContractRisksClaude(contractText)
    return { data, aiUsed: "Claude" }
  } catch (err) {
    console.warn("[extractContractRisks] Claude 실패 → OpenAI fallback:", (err as Error).message)
    const data = await extractContractRisksOpenAI(contractText)
    return { data, aiUsed: "OpenAI" }
  }
}

async function extractContractRisksClaude(contractText: string): Promise<ContractGapResult> {
  const inputSchema = z.toJSONSchema(ContractGapResultSchema) as Anthropic.Tool["input_schema"]

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    tools: [{ name: CONTRACT_GAP_TOOL, description: "계약서에서 리스크·요구사항을 구조화하여 추출한다.", input_schema: inputSchema }],
    tool_choice: { type: "tool", name: CONTRACT_GAP_TOOL },
    messages: [{
      role: "user",
      content: `당신은 LS전선 품질부문 계약 검토 전문가입니다.
아래 계약서를 분석하여 이행 리스크와 주요 요구사항을 추출하세요. (입찰 비교 없는 수의계약입니다)

규칙:
- gapType은 모두 "NEW"로 설정 (비교 대상 없음)
- isRisk=true: 이행 난이도 높거나 품질 위험이 있는 항목
- 명시된 내용만 추출, 추측 금지
- category: 케이블, 접속재, QA, 시험, 납기, 검사, 문서 등

[계약서]
${contractText}`,
    }],
  })

  const toolUse = response.content.find((c) => c.type === "tool_use")
  if (!toolUse || toolUse.type !== "tool_use") throw new Error("Claude tool_use 응답 없음")
  return ContractGapResultSchema.parse(toolUse.input)
}

async function extractContractRisksOpenAI(contractText: string): Promise<ContractGapResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error("OPENAI_API_KEY 없음")
  const schema = z.toJSONSchema(ContractGapResultSchema)
  const body = {
    model: "gpt-4o",
    response_format: { type: "json_schema", json_schema: { name: CONTRACT_GAP_TOOL, schema, strict: true } },
    messages: [
      { role: "system", content: "계약서에서 이행 리스크와 요구사항을 JSON으로 반환하세요. gapType은 모두 NEW." },
      { role: "user", content: contractText },
    ],
  }
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`OpenAI API 오류: ${res.status}`)
  const json = (await res.json()) as { choices: { message: { content: string } }[] }
  const content = json.choices?.[0]?.message?.content
  if (!content) throw new Error("OpenAI 빈 응답")
  return ContractGapResultSchema.parse(JSON.parse(content))
}

async function extractContractGapsOpenAI(
  contractText: string,
  tenderRequirements: { category: string; content: string }[]
): Promise<ContractGapResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error("OPENAI_API_KEY가 설정되지 않았습니다.")

  const tenderSummary = buildTenderSummary(tenderRequirements)
  const schema = z.toJSONSchema(ContractGapResultSchema)

  const body = {
    model: "gpt-4o",
    response_format: { type: "json_schema", json_schema: { name: CONTRACT_GAP_TOOL, schema, strict: true } },
    messages: [
      {
        role: "system",
        content: "당신은 케이블 프로젝트 계약 검토 전문가입니다. 입찰 약속과 계약 요구사항의 갭을 JSON으로 반환하세요.",
      },
      {
        role: "user",
        content: `[입찰 요구사항]\n${tenderSummary}\n\n[계약서]\n${contractText}`,
      },
    ],
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`OpenAI API 오류: ${res.status}`)
  const json = (await res.json()) as { choices: { message: { content: string } }[] }
  const content = json.choices?.[0]?.message?.content
  if (!content) throw new Error("OpenAI API가 빈 응답을 반환했습니다.")
  return ContractGapResultSchema.parse(JSON.parse(content))
}
