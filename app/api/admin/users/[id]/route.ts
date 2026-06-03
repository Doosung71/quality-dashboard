import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session
  if (!isAdmin(session.user.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const body = await req.json()

  // status=RESTRICTED 일 때 restrictedUntil을 함께 처리
  const data: Record<string, unknown> = {}
  if (body.role) data.role = body.role
  if (body.status) {
    data.status = body.status
    if (body.status === "RESTRICTED" && body.restrictedUntil) {
      data.restrictedUntil = new Date(body.restrictedUntil)
    }
    // 정지 해제·복구 시 restrictedUntil 초기화
    if (body.status === "ACTIVE" || body.status === "BANNED") {
      data.restrictedUntil = null
    }
  }

  const user = await prisma.user.update({ where: { id }, data })
  return NextResponse.json(user)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session
  if (!isAdmin(session.user.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  // 관리자 계정 삭제 방지
  const target = await prisma.user.findUnique({ where: { id }, select: { email: true } })
  if (!target) return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 })
  if (isAdmin(target.email)) return NextResponse.json({ error: "관리자 계정은 삭제할 수 없습니다." }, { status: 403 })

  await prisma.user.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
