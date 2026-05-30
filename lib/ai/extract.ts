import Anthropic from "@anthropic-ai/sdk"
import { z } from "zod"
import { ExtractionResultSchema, type ExtractionResult } from "@/lib/schemas"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const TOOL_NAME = "extract_tender_spec"

export async function extractTenderSpec(
  pdfText: string,
  knowledgeContext?: string,
  webContext?: string
): Promise<ExtractionResult> {
  try {
    console.log("[extractTenderSpec] Claude 3.5 Sonnet 분석 시작...")
    return await extractTenderSpecClaude(pdfText, knowledgeContext, webContext)
  } catch (claudeError: unknown) {
    const claudeMsg = claudeError instanceof Error ? claudeError.message : String(claudeError)
    console.warn(`[extractTenderSpec] Claude 오류 → OpenAI fallback: ${claudeMsg}`)

    try {
      return await extractTenderSpecOpenAI(pdfText, knowledgeContext, webContext)
    } catch (openaiError: unknown) {
      const openaiMsg = openaiError instanceof Error ? openaiError.message : String(openaiError)
      console.warn(`[extractTenderSpec] OpenAI 오류 → Gemini fallback: ${openaiMsg}`)

      try {
        return await extractTenderSpecGemini(pdfText, knowledgeContext, webContext)
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
    model: "claude-3-5-sonnet-20241022",
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

async function extractTenderSpecOpenAI(
  pdfText: string,
  knowledgeContext?: string,
  webContext?: string
): Promise<ExtractionResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error("OPENAI_API_KEY 환경변수가 누락되었습니다.")

  console.log("[extractTenderSpec] OpenAI GPT-4o 백업 분석 시작...")
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
${pdfText}`,
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
