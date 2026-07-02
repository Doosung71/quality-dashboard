import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"
import { deleteBlob } from "@/lib/storage"
import { parseProjectKeyInput } from "@/lib/project-key"

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const { id } = await params

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 })
  }

  // title·projectKey·spg·marketRegion 각각 선택적 부분 수정 지원.
  const data: { title?: string; projectKey?: string | null; spg?: string | null; marketRegion?: string | null } = {}

  if (body.title !== undefined) {
    if (typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json({ error: "입찰명을 입력해주세요." }, { status: 400 })
    }
    data.title = body.title.trim()
  }

  // SPG·시장 권역 — 자유입력 선택 필드(fail-open), 비우면 null로 저장
  if (body.spg !== undefined) {
    data.spg = typeof body.spg === "string" && body.spg.trim() ? body.spg.trim() : null
  }
  if (body.marketRegion !== undefined) {
    data.marketRegion = typeof body.marketRegion === "string" && body.marketRegion.trim() ? body.marketRegion.trim() : null
  }

  // Q1 project_key — 고리④ 과거이력 surface 매칭 키. 선택 필드(fail-open), 형식 오류는 400.
  if (body.projectKey !== undefined) {
    const pk = parseProjectKeyInput(body.projectKey)
    if (pk.invalid) {
      return NextResponse.json(
        { error: "프로젝트 키 형식이 올바르지 않습니다 (소문자·숫자·하이픈)." },
        { status: 400 },
      )
    }
    data.projectKey = pk.value
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "수정할 항목이 없습니다." }, { status: 400 })
  }

  const tender = await prisma.tender.findFirst({
    where: { id, createdById: session.user.id },
  })
  if (!tender) return NextResponse.json({ error: "입찰을 찾을 수 없습니다." }, { status: 404 })

  await prisma.tender.update({ where: { id }, data })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const { id } = await params

  const tender = await prisma.tender.findFirst({
    where: { id, createdById: session.user.id },
    include: {
      analyses: { select: { id: true, status: true } },
      documents: { select: { storagePath: true } },
    },
  })
  if (!tender) return NextResponse.json({ error: "입찰을 찾을 수 없습니다." }, { status: 404 })

  const blocked = tender.analyses.some(
    (a) => a.status === "REVIEWED" || a.status === "APPROVED"
  )
  if (blocked) {
    return NextResponse.json(
      { error: "팀장 승인 이후에는 삭제할 수 없습니다." },
      { status: 403 }
    )
  }

  const analysisIds = tender.analyses.map((a) => a.id)

  await prisma.$transaction(async (tx) => {
    if (analysisIds.length > 0) {
      await tx.comment.deleteMany({ where: { analysisId: { in: analysisIds } } })
      await tx.reviewHistory.deleteMany({ where: { analysisId: { in: analysisIds } } })
      await tx.specRequirement.deleteMany({ where: { analysisId: { in: analysisIds } } })
      await tx.analysis.deleteMany({ where: { tenderId: id } })
    }
    await tx.tenderDocument.deleteMany({ where: { tenderId: id } })
    await tx.tender.delete({ where: { id } })
  })

  for (const doc of tender.documents) {
    await deleteBlob(doc.storagePath)
  }

  return NextResponse.json({ ok: true })
}
