import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"

// POST /api/awarded-projects/[id]/documents — 계약 문서 등록
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const { id: projectId } = await params
  const { filename, storagePath } = await req.json() as { filename?: string; storagePath?: string }

  if (!filename || !storagePath) {
    return NextResponse.json({ error: "filename, storagePath 필요" }, { status: 400 })
  }

  const project = await prisma.awardedProject.findUnique({ where: { id: projectId } })
  if (!project) return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 })

  const doc = await prisma.contractDocument.create({
    data: { projectId, filename, storagePath },
  })

  return NextResponse.json({ id: doc.id }, { status: 201 })
}
