import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session
  const { id: tenderId } = await params

  // 역할에 관계없이 본인이 생성한 tender에만 문서 추가 가능
  const tender = await prisma.tender.findFirst({
    where: { id: tenderId, createdById: session.user.id },
  })
  if (!tender) return NextResponse.json({ error: "입찰을 찾을 수 없습니다." }, { status: 404 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 })
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 })
  }

  const { blobUrl, filename, isAnalysisSource } = body as Record<string, unknown>
  if (typeof blobUrl !== "string" || !blobUrl.startsWith("https://")) {
    return NextResponse.json({ error: "올바른 blobUrl이 필요합니다." }, { status: 400 })
  }
  if (typeof filename !== "string" || !filename) {
    return NextResponse.json({ error: "filename이 필요합니다." }, { status: 400 })
  }

  const doc = await prisma.tenderDocument.create({
    data: {
      tenderId,
      filename,
      storagePath: blobUrl,
      isAnalysisSource: isAnalysisSource === true,
    },
  })

  return NextResponse.json({ documentId: doc.id, filename })
}
