import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { checkRateLimit } from "@/lib/rate-limit"
import { prisma } from "@/lib/prisma"
import { searchKnowledge } from "@/lib/knowledge"
import { parseRagThreshold, buildKnowledgeChunksXml } from "@/lib/rag"
import Anthropic from "@anthropic-ai/sdk"
import { naverSearchText } from "@/lib/naver-search"
import { readBlobBuffer } from "@/lib/storage"
import { extractTextFromPdf } from "@/lib/pdf"

const TENDER_TEXT_MAX = 40_000

async function searchWebForRequirement(query: string): Promise<string> {
  return naverSearchText(query, 5)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session
  const rl = await checkRateLimit(req)
  if (rl) return rl

  const { id: analysisId } = await params

  const analysis = await prisma.analysis.findFirst({
    where: { id: analysisId, tender: { createdById: session.user.id } },
    include: {
      tender: { select: { title: true } },
      document: { select: { storagePath: true } },
      requirements: { select: { category: true, content: true }, orderBy: { category: "asc" } },
    },
  })
  if (!analysis) return NextResponse.json({ error: "분석을 찾을 수 없습니다." }, { status: 404 })

  // Tender 원문 텍스트 추출 (fail-open: 실패해도 기존 동작 유지)
  let tenderTextContext: string | undefined
  if (analysis.document?.storagePath) {
    try {
      const buf = await readBlobBuffer(analysis.document.storagePath)
      if (buf) {
        const { text } = await extractTextFromPdf(buf)
        const snippet = text.slice(0, TENDER_TEXT_MAX)
        if (snippet.trim()) tenderTextContext = snippet
      }
    } catch (e) { console.warn("[suggest] Tender PDF 추출 실패:", (e as Error).message) }
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 })
  }
  const { category, hint, searchWeb } = body as Record<string, unknown>
  if (!category || typeof category !== "string") {
    return NextResponse.json({ error: "category가 필요합니다." }, { status: 400 })
  }

  // RAG 지식 검색
  const RAG_THRESHOLD = parseRagThreshold(process.env.RAG_THRESHOLD)
  let knowledgeContext: string | undefined
  try {
    const ragQuery = `${category} ${hint ?? ""} 기술 규격 요구사항 케이블`
    const chunks = (await searchKnowledge(ragQuery, { limit: 4 })).filter((c) => c.similarity >= RAG_THRESHOLD)
    if (chunks.length > 0) knowledgeContext = buildKnowledgeChunksXml(chunks)
  } catch (e) { console.warn("[suggest] RAG 실패:", (e as Error).message) }

  // 외부 웹 검색
  let webContext: string | undefined
  let webContextApplied = false
  if (searchWeb === true) {
    try {
      const webResults = await searchWebForRequirement(
        `${category} ${hint ?? ""} IEC cable specification requirement standard`
      )
      if (webResults) { webContext = webResults; webContextApplied = true }
    } catch (e) { console.warn("[suggest] 웹 검색 실패:", (e as Error).message) }
  }

  // AI 요구사항 내용 제안 (Claude)
  let suggestedContent: string
  let aiUsed = "Claude"

  const existingReqsContext = analysis.requirements.length > 0
    ? `\n<existing_requirements>\n${analysis.requirements.map((r) => `[${r.category}] ${r.content}`).join("\n")}\n</existing_requirements>`
    : ""

  const contextSection = [
    tenderTextContext ? `\n<tender_document excerpt="${TENDER_TEXT_MAX}chars">\n${tenderTextContext}\n</tender_document>` : "",
    existingReqsContext,
    knowledgeContext ? `\n<knowledge_base>\n${knowledgeContext}\n</knowledge_base>` : "",
    webContext ? `\n<web_search_results>\n${webContext}\n</web_search_results>` : "",
  ].join("")

  const prompt = `당신은 고압 케이블 입찰 기술 검토 전문가입니다.
입찰 프로젝트: ${analysis.tender.title}
요구사항 분류: ${category}
${hint ? `참고 내용/키워드: ${hint}` : ""}
${contextSection}

위 정보를 바탕으로, "${category}" 분류에 해당하는 기술 요구사항을 한국어로 작성하세요.
tender_document가 제공된 경우 해당 Tender의 실제 요구사항을 우선 참조하고, existing_requirements에 이미 있는 항목은 중복 제안하지 마세요.

[출력 규칙 — 반드시 준수]
- 마크다운 문법을 절대 사용하지 마세요. 표(|), 헤더(#), 굵게(**), 기울기(_), 구분선(---) 금지.
- 번호 목록이 필요하면 "1. 2. 3." 형식만 허용합니다.
- 요구사항 본문만 출력하세요. 제목, 설명, 서두, 결론 문구 없이 바로 내용만 씁니다.
- IEC, KS, CIGRE 등 관련 규격 번호가 있으면 본문에 자연스럽게 포함하세요.
- 수치 기준이 있으면 구체적으로 명시하세요.
- 전체 길이는 200자 이내로 간결하게 작성하세요.`

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    })
    suggestedContent = (msg.content[0] as { type: string; text: string }).text.trim()
  } catch (claudeErr) {
    console.warn("[suggest] Claude 실패:", (claudeErr as Error).message)
    try {
      const openaiKey = process.env.OPENAI_API_KEY
      if (!openaiKey) throw new Error("OPENAI_API_KEY 누락")
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({ model: "gpt-4o-mini", max_tokens: 400, messages: [{ role: "user", content: prompt }] }),
      })
      if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`)
      const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> }
      suggestedContent = data.choices?.[0]?.message?.content?.trim() ?? ""
      aiUsed = "OpenAI"
    } catch {
      return NextResponse.json({ error: "AI 제안 생성에 실패했습니다." }, { status: 500 })
    }
  }

  return NextResponse.json({ content: suggestedContent, aiUsed, webContextApplied })
}
