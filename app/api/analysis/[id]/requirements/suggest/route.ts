import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"
import { searchKnowledge } from "@/lib/knowledge"
import { parseRagThreshold, buildKnowledgeChunksXml } from "@/lib/rag"
import Anthropic from "@anthropic-ai/sdk"

const DDG_TIMEOUT_MS = 5000

async function searchWebForRequirement(query: string): Promise<string> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), DDG_TIMEOUT_MS)
    let res: Response
    try {
      res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timer)
    }
    if (!res.ok) return ""
    const html = await res.text()
    const snippetRegex = /<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g
    const titleRegex = /<a class="result__title"[^>]*>([\s\S]*?)<\/a>/g
    const titles: string[] = []
    const snippets: string[] = []
    let match: RegExpExecArray | null
    while ((match = titleRegex.exec(html)) !== null && titles.length < 3)
      titles.push(match[1].replace(/<[^>]*>/g, "").trim())
    while ((match = snippetRegex.exec(html)) !== null && snippets.length < 3)
      snippets.push(match[1].replace(/<[^>]*>/g, "").trim())
    return titles.map((t, i) => `[웹${i + 1}] ${t}: ${snippets[i] ?? ""}`).filter((s) => s.trim().length > 10).join("\n")
  } catch { return "" }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const { id: analysisId } = await params

  const analysis = await prisma.analysis.findFirst({
    where: { id: analysisId, tender: { createdById: session.user.id } },
    include: { tender: { select: { title: true } } },
  })
  if (!analysis) return NextResponse.json({ error: "분석을 찾을 수 없습니다." }, { status: 404 })

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

  const contextSection = [
    knowledgeContext ? `\n<knowledge_base>\n${knowledgeContext}\n</knowledge_base>` : "",
    webContext ? `\n<web_search_results>\n${webContext}\n</web_search_results>` : "",
  ].join("")

  const prompt = `당신은 고압 케이블 입찰 기술 검토 전문가입니다.
입찰 프로젝트: ${analysis.tender.title}
요구사항 분류: ${category}
${hint ? `참고 내용/키워드: ${hint}` : ""}
${contextSection}

위 정보를 바탕으로, "${category}" 분류에 해당하는 기술 요구사항을 한국어로 1~3문장으로 작성하세요.
- IEC, KS, CIGRE 등 관련 규격 번호가 있으면 포함하세요
- 수치 기준이 있으면 구체적으로 명시하세요
- 입찰자가 준수해야 할 기술 조건을 명확하게 서술하세요
- 요구사항 내용만 출력하고, 설명이나 제목은 붙이지 마세요`

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
