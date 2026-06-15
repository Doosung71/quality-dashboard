import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"

const SITE_LABELS: Record<string, string> = {
  gumi: "구미", donghae: "동해", indon: "인동", external: "기타(사외)",
}

export async function GET(_: NextRequest) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const rooms = await prisma.inspectionRoom.findMany({
    orderBy: [{ siteId: "asc" }, { name: "asc" }],
  })
  return NextResponse.json(rooms)
}

export async function POST(req: NextRequest) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const body = await req.json() as { name?: string; siteId?: string; type?: string; notes?: string }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "장소 이름은 필수입니다." }, { status: 400 })
  }
  const validSites = Object.keys(SITE_LABELS)
  if (body.siteId && !validSites.includes(body.siteId)) {
    return NextResponse.json({ error: "유효하지 않은 사업장입니다." }, { status: 400 })
  }
  const validTypes = ["DC", "AC", "복합", "기타"]
  if (body.type && !validTypes.includes(body.type)) {
    return NextResponse.json({ error: "유효하지 않은 시험장 유형입니다." }, { status: 400 })
  }

  const id = `custom-${Date.now()}`
  const room = await prisma.inspectionRoom.create({
    data: {
      id,
      name:   body.name.trim(),
      siteId: body.siteId ?? "gumi",
      type:   body.type   ?? "AC",
      notes:  body.notes?.trim() ?? "",
    },
  })
  return NextResponse.json(room, { status: 201 })
}
