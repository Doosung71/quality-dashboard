import Anthropic from "@anthropic-ai/sdk"
import { z } from "zod"
import { ExtractionResultSchema, type ExtractionResult } from "@/lib/schemas"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const TOOL_NAME = "extract_tender_spec"

export async function extractTenderSpec(
  pdfText: string,
  knowledgeContext?: string
): Promise<ExtractionResult> {
  // Zod v4 내장 JSON Schema 변환
  const inputSchema = z.toJSONSchema(ExtractionResultSchema) as Anthropic.Tool["input_schema"]

  const knowledgeSection = knowledgeContext
    ? `<knowledge_context>
<instruction>이 시방서와 관련된 내부 규격 원문 발췌다. 분석 시 각 청크의 규격 번호와 요구사항 일치·불일치를 content에 반영하라.</instruction>
${knowledgeContext}
</knowledge_context>

`
    : ""

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
        content: `${knowledgeSection}아래는 HVAC 해저·지중 케이블 입찰 사양서(Tender Spec) 텍스트다.
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
