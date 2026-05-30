import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session
  if (session.user.role !== "DIRECTOR") {
    return NextResponse.json({ error: "부문장만 초안을 생성할 수 있습니다." }, { status: 403 })
  }

  const { id } = await params

  const analysis = await prisma.analysis.findFirst({
    where: { id },
    include: {
      tender: { select: { title: true } },
      requirements: { orderBy: { category: "asc" } },
      history: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { name: true } } },
      },
    },
  })
  if (!analysis) return NextResponse.json({ error: "분석을 찾을 수 없습니다." }, { status: 404 })

  const riskItems = analysis.requirements.filter((r) => r.isRisk)
  const veItems = analysis.requirements.filter((r) => r.isVE)
  const byCategory: Record<string, typeof analysis.requirements> = {}
  for (const r of analysis.requirements) {
    ;(byCategory[r.category] ??= []).push(r)
  }

  const reviewHistory = analysis.history
    .filter((h) => h.reason)
    .map((h) => `[${h.action}] ${h.user.name}: ${h.reason}`)
    .join("\n")

  const sysChars = [
    analysis.voltage && `전압: ${analysis.voltage}`,
    analysis.bilSil && `BIL/SIL: ${analysis.bilSil}`,
    analysis.shortCircuit && `단락용량: ${analysis.shortCircuit}`,
    analysis.installCond && `포설 조건: ${analysis.installCond}`,
    analysis.groundConfig && `접지 구성: ${analysis.groundConfig}`,
    analysis.requiredCapacity && `요구 용량: ${analysis.requiredCapacity}`,
  ]
    .filter(Boolean)
    .join("\n")

  const prompt = `HVAC 해저·지중 케이블 입찰심의회용 QA 검토의견을 **A4 1장 이내**로 작성하세요.
불릿 포인트 중심, 산문 금지, 각 섹션 3줄 이내.

■ 입찰명: ${analysis.tender.title}
■ 시스템 특성: ${sysChars || "정보 없음"}

■ 주요 리스크 (${riskItems.length}건)
${riskItems.slice(0, 5).map((r) => `• [${r.category}] ${r.content}`).join("\n") || "• 없음"}${riskItems.length > 5 ? `\n• 외 ${riskItems.length - 5}건` : ""}

■ VE 포인트 (${veItems.length}건)
${veItems.slice(0, 3).map((r) => `• [${r.category}] ${r.content}`).join("\n") || "• 없음"}

■ 검토 이력 요약
${reviewHistory ? reviewHistory.split("\n").slice(0, 3).join("\n") : "없음"}

■ 부문장 메모
${analysis.directorMemo || "(없음)"}

위 정보를 바탕으로 아래 형식으로만 작성하세요:

【종합 검토 의견】
(3~5줄 이내)

【주요 확인 요청 사항】
• (최대 3개)

【결론】
QA 부문 검토 의견: 참여 권고 / 조건부 참여 / 재검토 필요 중 하나 선택 + 한 줄 사유`

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "API 키가 설정되지 않았습니다." }, { status: 503 })
  }

  let response
  try {
    response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류"
    return NextResponse.json({ error: `Claude API 오류: ${message}` }, { status: 502 })
  }

  if (response.stop_reason === "max_tokens") {
    return NextResponse.json({ error: "초안이 너무 길어 잘렸습니다." }, { status: 422 })
  }

  const text = response.content
    .filter((c) => c.type === "text")
    .map((c) => (c as { type: "text"; text: string }).text)
    .join("")

  return NextResponse.json({ draft: text })
}
