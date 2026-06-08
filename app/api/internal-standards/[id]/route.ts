import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireActiveSession } from "@/lib/session-guard"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const { id } = await params
  const body = await req.json()
  const { title, code, internalCat, description, publisher, publishYear, fileUrl, fileName, fileSize, keywords } = body

  if (!title?.trim()) return NextResponse.json({ error: "제목은 필수입니다." }, { status: 400 })

  try {
    const std = await prisma.internalStandard.update({
      where: { id },
      data: {
        title: title.trim(),
        code: code?.trim() || null,
        internalCat: internalCat || "재료규격",
        description: description?.trim() || "",
        publisher: publisher?.trim() || "내부",
        publishYear: publishYear?.trim() || "",
        ...(fileUrl !== undefined ? { fileUrl: fileUrl || null, fileName: fileName || null, fileSize: fileSize ? Number(fileSize) : null } : {}),
        keywords: Array.isArray(keywords) ? keywords : [],
      },
    })
    return NextResponse.json({ standard: std })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const { id } = await params
  try {
    await prisma.internalStandard.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
