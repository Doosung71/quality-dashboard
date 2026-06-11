import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"
import vendorsData from "@/data/vendors.json"

export async function GET() {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const jsonVendors = vendorsData.vendors.map(v => ({
    id:       v.id,
    name:     v.name,
    location: v.location ?? "",
  }))

  const dbVendors = await prisma.vendor.findMany({
    select: { id: true, name: true, location: true },
    orderBy: { createdAt: "asc" },
  }).catch(() => [] as { id: string; name: string; location: string }[])

  return NextResponse.json([...jsonVendors, ...dbVendors])
}

export async function POST(req: NextRequest) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const body = await req.json() as { name?: string; location?: string; mainItem?: string }
  const name = (body.name ?? "").trim()
  if (!name) return NextResponse.json({ error: "업체명은 필수입니다." }, { status: 400 })

  const vendor = await prisma.vendor.create({
    data: {
      name,
      location: (body.location ?? "").trim(),
      mainItem: (body.mainItem ?? "").trim(),
      createdById: session.user.id,
    },
    select: { id: true, name: true, location: true },
  })

  return NextResponse.json(vendor, { status: 201 })
}
