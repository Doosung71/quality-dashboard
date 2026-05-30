import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { searchKnowledge } from "@/lib/knowledge"

export async function POST(req: NextRequest) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "요청 본문이 올바른 JSON이 아닙니다." }, { status: 400 })
  }

  const bodyParsed = body as Record<string, unknown> | null | undefined
  const queryRaw = bodyParsed?.query
  if (typeof queryRaw !== "string" || !queryRaw.trim()) {
    return NextResponse.json({ error: "query 문자열이 필요합니다." }, { status: 400 })
  }

  const query: string = queryRaw.trim()
  const limit: number = typeof bodyParsed?.limit === "number" ? bodyParsed.limit : 5
  const filter = bodyParsed?.filter ?? undefined

  try {
    const chunks = await searchKnowledge(query, { limit, filter })
    return NextResponse.json({ chunks })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[knowledge/search]", message)
    return NextResponse.json({ error: "지식 검색 중 오류가 발생했습니다." }, { status: 500 })
  }
}
