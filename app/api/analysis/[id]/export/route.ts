import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"
import * as XLSX from "xlsx"

function escapeMdCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ").replace(/\r/g, "")
}

const complyLabel: Record<string, string> = {
  COMPLY: "부합",
  NON_COMPLY: "불부합",
  TBD: "검토중",
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const { id: analysisId } = await params
  const format = req.nextUrl.searchParams.get("format") ?? "md"

  if (format !== "xlsx" && format !== "md") {
    return NextResponse.json({ error: "format은 xlsx 또는 md여야 합니다." }, { status: 400 })
  }

  const analysis = await prisma.analysis.findFirst({
    where: {
      id: analysisId,
      ...(session.user.role === "PRACTITIONER"
        ? { tender: { createdById: session.user.id } }
        : {}),
    },
    include: {
      tender: { select: { title: true } },
      requirements: {
        orderBy: { category: "asc" },
        include: { standards: { select: { id: true } } },
      },
    },
  })

  if (!analysis) return NextResponse.json({ error: "분석을 찾을 수 없습니다." }, { status: 404 })

  const sysChars = [
    { label: "전압", value: analysis.voltage },
    { label: "BIL/SIL", value: analysis.bilSil },
    { label: "단락용량", value: analysis.shortCircuit },
    { label: "포설 조건", value: analysis.installCond },
    { label: "접지 구성", value: analysis.groundConfig },
    { label: "요구 용량", value: analysis.requiredCapacity },
  ]

  if (format === "xlsx") {
    const wb = XLSX.utils.book_new()

    const sysRows = sysChars.map((s) => ({ 항목: s.label, 내용: s.value ?? "" }))
    const ws1 = XLSX.utils.json_to_sheet(sysRows)
    XLSX.utils.book_append_sheet(wb, ws1, "시스템특성")

    const reqRows = analysis.requirements.map((r) => ({
      카테고리: r.category,
      내용: r.content,
      페이지: r.sourcePage ?? "",
      "부합 여부": r.comply ? (complyLabel[r.comply] ?? r.comply) : "",
      비고: r.remark ?? "",
      RISK: r.isRisk ? "Y" : "",
      VE: r.isVE ? "Y" : "",
      관련규격: r.standards.map((s) => s.id).join(", "),
      "Deviation 유형": r.deviationType ?? "",
      "Deviation 메모": r.deviationText ?? "",
    }))
    const ws2 = XLSX.utils.json_to_sheet(reqRows)
    XLSX.utils.book_append_sheet(wb, ws2, "기술요구사항")

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
    const filename = encodeURIComponent(`${analysis.tender.title}_검토결과.xlsx`)

    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
      },
    })
  }

  const lines: string[] = []
  lines.push(`# ${analysis.tender.title} — 검토 결과`)
  lines.push("")
  lines.push("## 시스템 특성")
  lines.push("")
  for (const s of sysChars) {
    lines.push(`- **${s.label}**: ${s.value ?? "—"}`)
  }
  lines.push("")
  lines.push("## 기술 요구사항")
  lines.push("")
  lines.push("| 카테고리 | 내용 | 페이지 | 부합 여부 | 비고 | RISK | VE | 관련 규격 | Deviation 유형 | Deviation 메모 |")
  lines.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |")
  for (const r of analysis.requirements) {
    const cols = [
      escapeMdCell(r.category),
      escapeMdCell(r.content),
      r.sourcePage?.toString() ?? "",
      r.comply ? escapeMdCell(complyLabel[r.comply] ?? r.comply) : "",
      escapeMdCell(r.remark ?? ""),
      r.isRisk ? "Y" : "",
      r.isVE ? "Y" : "",
      escapeMdCell(r.standards.map((s) => s.id).join(", ")),
      escapeMdCell(r.deviationType ?? ""),
      escapeMdCell(r.deviationText ?? ""),
    ]
    lines.push(`| ${cols.join(" | ")} |`)
  }
  lines.push("")

  const md = lines.join("\n")
  const filename = encodeURIComponent(`${analysis.tender.title}_검토결과.md`)

  return new NextResponse(md, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
    },
  })
}
