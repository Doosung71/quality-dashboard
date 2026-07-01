import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

const WRITER_ROLES  = ["TEAM_LEAD", "DIRECTOR", "ADMIN"]
const VALID_STATUS  = ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]
const VALID_RESULT  = ["PASS", "FAIL", "CONDITIONAL_PASS"]
const VALID_REGIONS = ["DOMESTIC", "EUROPE", "ASIA", "MIDDLE_EAST", "OTHER"]

export async function GET(_: NextRequest, { params }: Params) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session
  const { id } = await params

  const inspection = await prisma.witnessInspection.findUnique({
    where: { id },
    include: {
      createdBy: { select: { name: true, nickname: true } },
      room:      { select: { id: true, name: true, siteId: true } },
      voCs:      { orderBy: { createdAt: "asc" } },
    },
  })
  if (!inspection) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(inspection)
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const { id } = await params

  // 본인이 등록한 검사 OR 팀장+ 만 수정 (DELETE 소유권 패턴과 통일)
  const existing = await prisma.witnessInspection.findUnique({
    where: { id },
    select: { createdById: true },
  })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const isOwner  = existing.createdById === session.user.id
  const isWriter = WRITER_ROLES.includes(session.user.role)
  if (!isOwner && !isWriter) {
    return NextResponse.json({ error: "본인이 등록한 입회검사만 수정할 수 있습니다." }, { status: 403 })
  }

  const body = await req.json() as {
    customer?: string; projectName?: string; projectNumber?: string
    productName?: string; inspectionDate?: string; endDate?: string
    location?: string; region?: string; roomId?: string | null
    assigneeId?: string; assigneeName?: string
    status?: string; result?: string
    description?: string; notes?: string; attachments?: unknown
  }

  if (body.status !== undefined && !VALID_STATUS.includes(body.status)) {
    return NextResponse.json({ error: `유효하지 않은 status: ${body.status}` }, { status: 400 })
  }
  // result·region은 nullable — null/""(비움)은 허용, 값이 있을 때만 화이트리스트 검증
  if (body.result != null && body.result !== "" && !VALID_RESULT.includes(body.result)) {
    return NextResponse.json({ error: `유효하지 않은 result: ${body.result}` }, { status: 400 })
  }
  if (body.region != null && body.region !== "" && !VALID_REGIONS.includes(body.region)) {
    return NextResponse.json({ error: `유효하지 않은 region: ${body.region}` }, { status: 400 })
  }

  const data: Record<string, unknown> = {}
  if (body.customer       !== undefined) data.customer       = body.customer
  if (body.projectName    !== undefined) data.projectName    = body.projectName
  if (body.projectNumber  !== undefined) data.projectNumber  = body.projectNumber
  if (body.productName    !== undefined) data.productName    = body.productName
  if (body.inspectionDate !== undefined) data.inspectionDate = new Date(body.inspectionDate)
  if (body.endDate        !== undefined) data.endDate        = body.endDate ? new Date(body.endDate) : null
  if (body.location       !== undefined) data.location       = body.location
  if (body.region         !== undefined) data.region         = body.region || null
  if (body.roomId         !== undefined) data.roomId         = body.roomId ?? null
  if (body.assigneeId     !== undefined) data.assigneeId     = body.assigneeId
  if (body.assigneeName   !== undefined) data.assigneeName   = body.assigneeName
  if (body.status         !== undefined) data.status         = body.status
  if (body.result         !== undefined) data.result         = body.result || null
  if (body.description    !== undefined) data.description    = body.description
  if (body.notes          !== undefined) data.notes          = body.notes
  if (body.attachments    !== undefined) data.attachments    = body.attachments

  const updated = await prisma.witnessInspection.update({ where: { id }, data })
  return NextResponse.json(updated)
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  if (!WRITER_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "팀장 이상만 삭제할 수 있습니다." }, { status: 403 })
  }

  const { id } = await params

  const inspection = await prisma.witnessInspection.findUnique({
    where: { id },
    select: { createdById: true },
  })
  if (!inspection) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const isOwner = inspection.createdById === session.user.id
  const isAdmin = ["DIRECTOR", "ADMIN"].includes(session.user.role)
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "본인이 등록한 입회검사만 삭제할 수 있습니다." }, { status: 403 })
  }

  await prisma.witnessInspection.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
