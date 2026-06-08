import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireActiveSession } from "@/lib/session-guard"

export async function GET() {
  try {
    const rows = await prisma.internalStandard.findMany({
      orderBy: { createdAt: "desc" },
      include: { uploadedBy: { select: { name: true, department: true } } },
    })
    return NextResponse.json({ standards: rows })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const body = await req.json()
  const { title, code, subCategory, internalCat, description, publisher, publishYear, fileUrl, fileName, fileSize, keywords } = body

  if (!title?.trim()) return NextResponse.json({ error: "제목은 필수입니다." }, { status: 400 })

  try {
    const std = await prisma.internalStandard.create({
      data: {
        title: title.trim(),
        code: code?.trim() || null,
        subCategory: subCategory || "사내규격",
        internalCat: internalCat || "재료규격",
        description: description?.trim() || "",
        publisher: publisher?.trim() || "내부",
        publishYear: publishYear?.trim() || String(new Date().getFullYear()),
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        fileSize: fileSize ? Number(fileSize) : null,
        keywords: Array.isArray(keywords) ? keywords : [],
        uploadedById: session.user.id,
      },
    })
    return NextResponse.json({ standard: std }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
