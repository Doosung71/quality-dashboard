import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"

type IssueOption = { id: string; no: string; label: string }

export async function GET(req: NextRequest) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const type = req.nextUrl.searchParams.get("type") ?? ""

  switch (type) {
    case "NCR": {
      const items = await prisma.ncr.findMany({
        orderBy: { issuedDate: "desc" },
        select: { id: true, ncrNo: true, title: true },
        take: 100,
      })
      return NextResponse.json<IssueOption[]>(items.map(i => ({ id: i.id, no: i.ncrNo, label: i.title })))
    }
    case "CLAIM": {
      const items = await prisma.claim.findMany({
        orderBy: { receivedAt: "desc" },
        select: { id: true, claimNo: true, title: true },
        take: 100,
      })
      return NextResponse.json<IssueOption[]>(items.map(i => ({ id: i.id, no: i.claimNo, label: i.title })))
    }
    case "INCOMING_INSPECTION": {
      const items = await prisma.incomingInspection.findMany({
        orderBy: { inspectionDate: "desc" },
        select: { id: true, vendorName: true, poNumber: true, itemName: true },
        take: 100,
      })
      return NextResponse.json<IssueOption[]>(items.map(i => ({
        id: i.id,
        no: i.poNumber ?? i.id.slice(0, 8),
        label: `${i.vendorName} — ${i.itemName}`,
      })))
    }
    case "SOURCE_INSPECTION": {
      const items = await prisma.sourceInspection.findMany({
        orderBy: { inspectionDate: "desc" },
        select: { id: true, vendorName: true, itemName: true },
        take: 100,
      })
      return NextResponse.json<IssueOption[]>(items.map(i => ({
        id: i.id,
        no: i.id.slice(0, 8),
        label: `${i.vendorName} — ${i.itemName}`,
      })))
    }
    case "SUPPLIER_AUDIT": {
      const items = await prisma.supplierAudit.findMany({
        orderBy: { auditDate: "desc" },
        select: { id: true, vendorName: true, auditDate: true },
        take: 100,
      })
      return NextResponse.json<IssueOption[]>(items.map(i => ({
        id: i.id,
        no: i.id.slice(0, 8),
        label: `${i.vendorName} (${i.auditDate.toISOString().slice(0, 10)})`,
      })))
    }
    case "TEST_PLAN": {
      const items = await prisma.testPlan.findMany({
        orderBy: { plannedStart: "desc" },
        select: { id: true, projectName: true },
        take: 100,
      })
      return NextResponse.json<IssueOption[]>(items.map(i => ({
        id: i.id,
        no: i.id.slice(0, 8),
        label: i.projectName,
      })))
    }
    case "QPA": {
      const items = await prisma.qpaAudit.findMany({
        orderBy: { auditDate: "desc" },
        select: { id: true, qpaNo: true, vendorName: true },
        take: 100,
      })
      return NextResponse.json<IssueOption[]>(items.map(i => ({ id: i.id, no: i.qpaNo, label: i.vendorName })))
    }
    default:
      return NextResponse.json<IssueOption[]>([])
  }
}
