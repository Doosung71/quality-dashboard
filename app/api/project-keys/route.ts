import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireActiveSession } from "@/lib/session-guard"

// Q1 autocomplete: NCR·Claim에 이미 부여된 project_key 목록(DISTINCT)을 반환.
// 표기 흔들림(같은 프로젝트 다른 키) 방지를 위해 기존 키 재사용을 유도한다.
// fail-open: 조회 실패 시 빈 목록 → 폼 입력은 계속 가능.
export async function GET(req: NextRequest) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  try {
    const [ncrKeys, claimKeys] = await Promise.all([
      prisma.ncr.findMany({
        where: { projectKey: { not: null } },
        select: { projectKey: true },
        distinct: ["projectKey"],
      }),
      prisma.claim.findMany({
        where: { projectKey: { not: null } },
        select: { projectKey: true },
        distinct: ["projectKey"],
      }),
    ])

    const q = (new URL(req.url).searchParams.get("q") ?? "").trim().toLowerCase()
    let keys = Array.from(
      new Set(
        [...ncrKeys, ...claimKeys]
          .map((r) => r.projectKey)
          .filter((k): k is string => !!k),
      ),
    ).sort()
    if (q) keys = keys.filter((k) => k.includes(q))

    return NextResponse.json(keys.slice(0, 50))
  } catch (e) {
    console.error("[project-keys] 조회 실패 (fail-open):", e)
    return NextResponse.json([])
  }
}
