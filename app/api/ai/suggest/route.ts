import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { requireActiveSession } from "@/lib/session-guard"
import { searchKnowledge, type KnowledgeChunk } from "@/lib/knowledge"
import { checkRateLimit } from "@/lib/rate-limit"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPTS: Record<string, string> = {
  claim: `당신은 LS전선 QMS 시스템의 품질 전문가입니다.
고객 클레임 정보와 과거 유사 사례를 바탕으로 실무자가 즉시 활용할 수 있는 초기 대책 초안을 작성하세요.

반드시 아래 마크다운 규칙을 따르세요:
- 섹션 제목은 ## 헤딩 사용
- 목록 항목은 반드시 "- " (하이픈+공백)으로 시작, 한 항목당 한 줄
- • 기호 사용 금지
- 각 섹션 사이 빈 줄 하나`,
  ncr: `당신은 LS전선 QMS 시스템의 품질 전문가입니다.
부적합(NCR) 정보와 과거 유사 사례를 바탕으로 실무자가 즉시 활용할 수 있는 시정조치 초안을 작성하세요.

반드시 아래 마크다운 규칙을 따르세요:
- 섹션 제목은 ## 헤딩 사용
- 목록 항목은 반드시 "- " (하이픈+공백)으로 시작, 한 항목당 한 줄
- • 기호 사용 금지
- 각 섹션 사이 빈 줄 하나`,
}

function buildPrompt(
  type: string,
  title: string,
  description: string | undefined,
  chunks: KnowledgeChunk[]
): string {
  const typeLabel = type === "claim" ? "고객 클레임" : "부적합(NCR)"
  const chunkText =
    chunks.length === 0
      ? "유사 사례 없음"
      : chunks
          .map((c, i) => `[유사사례 ${i + 1}] ${c.title ?? c.source_path}\n${c.content.slice(0, 500)}`)
          .join("\n\n")

  return `[${typeLabel} 정보]
제목: ${title}
${description ? `설명: ${description}` : ""}

[과거 유사 사례 (RAG 검색 결과)]
${chunkText}

위 정보를 바탕으로 아래 형식으로 초안을 작성해 주세요:

## 즉시 조치 사항
- (1~3개)

## 원인 추정
- (1~2개)

## 재발 방지 방향
- (1~2개)`
}

export async function POST(req: NextRequest) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const rl = await checkRateLimit(req)
  if (rl) return rl

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "올바른 JSON이 아닙니다." }, { status: 400 })
  }

  const b = body as Record<string, unknown>
  const title = typeof b.title === "string" && b.title.trim() ? b.title.trim() : null
  const description = typeof b.description === "string" ? b.description.trim() : undefined
  const type = b.type === "ncr" ? "ncr" : "claim"

  if (!title) {
    return NextResponse.json({ error: "title이 필요합니다." }, { status: 400 })
  }

  // 1. RAG 유사 사례 검색
  let chunks: KnowledgeChunk[] = []
  try {
    chunks = await searchKnowledge(title, { limit: 3 })
  } catch (e) {
    console.warn("[ai/suggest] RAG 검색 실패, 빈 결과로 진행:", e)
  }

  // 2. Claude 대책 초안 생성
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ chunks, draft: null, error: "ANTHROPIC_API_KEY 미설정" }, { status: 503 })
  }

  let draft: string | null = null
  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: SYSTEM_PROMPTS[type],
      messages: [{ role: "user", content: buildPrompt(type, title, description, chunks) }],
    })
    draft = response.content
      .filter((c) => c.type === "text")
      .map((c) => (c as Anthropic.TextBlock).text)
      .join("")
  } catch (e) {
    const msg = e instanceof Error ? e.message : "알 수 없는 오류"
    console.error("[ai/suggest] Claude 호출 실패:", msg)
  }

  return NextResponse.json({ chunks, draft })
}
