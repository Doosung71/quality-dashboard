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

  if (typeof (body as any)?.query !== "string" || !(body as any).query.trim()) {
    return NextResponse.json({ error: "query 문자열이 필요합니다." }, { status: 400 })
  }

  const query: string = (body as any).query.trim()
  const limit: number = typeof (body as any).limit === "number" ? (body as any).limit : 5
  const filter = (body as any).filter ?? undefined

  try {
    const chunks = await searchKnowledge(query, { limit, filter })
    return NextResponse.json({ chunks })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[knowledge/search]", message)
    return NextResponse.json({ error: "지식 검색 중 오류가 발생했습니다." }, { status: 500 })
  }
}
