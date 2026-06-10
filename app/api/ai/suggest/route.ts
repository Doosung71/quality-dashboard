import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { requireActiveSession } from "@/lib/session-guard"
import { searchKnowledge, type KnowledgeChunk } from "@/lib/knowledge"
import { checkRateLimit } from "@/lib/rate-limit"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const VALID_TYPES = ["claim", "ncr", "incoming_inspection", "source_inspection", "supplier_audit"] as const
type SuggestType = typeof VALID_TYPES[number]

const TYPE_LABELS: Record<SuggestType, string> = {
  claim: "고객 클레임",
  ncr: "부적합(NCR)",
  incoming_inspection: "수입검사",
  source_inspection: "출장검사",
  supplier_audit: "협력업체 감사",
}

const SYSTEM_PROMPTS: Record<SuggestType, string> = {
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
  incoming_inspection: `당신은 LS전선 QMS 시스템의 품질 전문가입니다.
수입검사 정보와 과거 유사 사례를 바탕으로 검사 담당자가 즉시 활용할 수 있는 검사 포인트와 판정 근거 초안을 작성하세요.

반드시 아래 마크다운 규칙을 따르세요:
- 섹션 제목은 ## 헤딩 사용
- 목록 항목은 반드시 "- " (하이픈+공백)으로 시작, 한 항목당 한 줄
- • 기호 사용 금지
- 각 섹션 사이 빈 줄 하나`,
  source_inspection: `당신은 LS전선 QMS 시스템의 품질 전문가입니다.
출장검사(소스 인스펙션) 정보와 과거 유사 사례를 바탕으로 검사원이 즉시 활용할 수 있는 현장 확인 포인트와 판정 근거 초안을 작성하세요.

반드시 아래 마크다운 규칙을 따르세요:
- 섹션 제목은 ## 헤딩 사용
- 목록 항목은 반드시 "- " (하이픈+공백)으로 시작, 한 항목당 한 줄
- • 기호 사용 금지
- 각 섹션 사이 빈 줄 하나`,
  supplier_audit: `당신은 LS전선 QMS 시스템의 품질 전문가입니다.
협력업체 감사 정보와 과거 유사 사례를 바탕으로 감사팀이 즉시 활용할 수 있는 주요 확인 항목과 개선 권고 초안을 작성하세요.

반드시 아래 마크다운 규칙을 따르세요:
- 섹션 제목은 ## 헤딩 사용
- 목록 항목은 반드시 "- " (하이픈+공백)으로 시작, 한 항목당 한 줄
- • 기호 사용 금지
- 각 섹션 사이 빈 줄 하나`,
}

const PROMPT_TEMPLATES: Record<SuggestType, string> = {
  claim: `## 즉시 조치 사항
- (1~3개)

## 원인 추정
- (1~2개)

## 재발 방지 방향
- (1~2개)`,
  ncr: `## 즉시 조치 사항
- (1~3개)

## 원인 추정
- (1~2개)

## 재발 방지 방향
- (1~2개)`,
  incoming_inspection: `## 핵심 검사 포인트
- (2~3개)

## 유사 사례 참고 사항
- (1~2개)

## 판정 시 주의사항
- (1~2개)`,
  source_inspection: `## 현장 확인 체크포인트
- (2~3개)

## 유사 사례 참고 사항
- (1~2개)

## 판정 시 주의사항
- (1~2개)`,
  supplier_audit: `## 주요 확인 항목
- (2~3개)

## 유사 감사 사례 참고
- (1~2개)

## 개선 권고 방향
- (1~2개)`,
}

function buildPrompt(
  type: SuggestType,
  title: string,
  description: string | undefined,
  chunks: KnowledgeChunk[]
): string {
  const typeLabel = TYPE_LABELS[type]
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

${PROMPT_TEMPLATES[type]}`
}

export async function POST(req: NextRequest) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const rl = await checkRateLimit(req, session.user.id)
  if (rl) return rl

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "올바른 JSON이 아닙니다." }, { status: 400 })
  }

  const b = body as Record<string, unknown>
  const rawTitle = typeof b.title === "string" ? b.title.trim() : ""
  const rawDescription = typeof b.description === "string" ? b.description.trim() : ""
  const rawType = b.type

  if (!rawTitle) {
    return NextResponse.json({ error: "title이 필요합니다." }, { status: 400 })
  }
  if (rawTitle.length > 200) {
    return NextResponse.json({ error: "title은 200자 이하로 입력해 주세요." }, { status: 400 })
  }
  if (rawDescription.length > 2000) {
    return NextResponse.json({ error: "description은 2000자 이하로 입력해 주세요." }, { status: 400 })
  }
  if (!VALID_TYPES.includes(rawType as SuggestType)) {
    return NextResponse.json(
      { error: `type은 ${VALID_TYPES.map((t) => `'${t}'`).join(", ")} 중 하나여야 합니다.` },
      { status: 400 }
    )
  }

  const title = rawTitle
  const description = rawDescription || undefined
  const type = rawType as SuggestType

  // 1. RAG 유사 사례 검색
  let chunks: KnowledgeChunk[] = []
  try {
    chunks = await searchKnowledge(title, { limit: 3 })
  } catch (e) {
    console.warn("[ai/suggest] RAG 검색 실패, 빈 결과로 진행:", e)
  }

  // 2. Claude 초안 생성
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ chunks, draft: null, error: "ANTHROPIC_API_KEY 미설정" }, { status: 503 })
  }

  let draft: string | null = null
  let draftError: string | null = null
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
    draftError = "AI 초안 생성 중 오류가 발생했습니다."
  }

  return NextResponse.json({ chunks, draft, draftError })
}
