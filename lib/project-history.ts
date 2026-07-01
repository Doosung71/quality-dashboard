// 고리④ surface — 입찰의 project_key로 같은 프로젝트의 과거 이력을 모은다.
// 종결(Closed) NCR·클레임 + 사람이 확정한 교훈(verified_lesson)을 반환.
// 순수 DB 읽기(외부 API 전송 0). 실패 시 fail-open으로 빈 이력을 돌려 입찰 페이지를 막지 않는다.

import { prisma } from "@/lib/prisma"
import { isValidProjectKey } from "@/lib/project-key"

export interface ProjectHistoryLesson {
  sourcePath: string
  title: string
  content: string
  checklist: string | null // 입찰 검토 체크포인트 (metadata에서 파생)
  refNo: string | null
  refType: string | null // "ncr" | "claim"
}

export interface ProjectHistoryNcr {
  id: string
  ncrNo: string
  title: string
  severity: string
  disposition: string
  closedDate: string | null
}

export interface ProjectHistoryClaim {
  id: string
  claimNo: string
  title: string
  customer: string
  priority: string
  closedAt: string | null
}

export interface ProjectHistory {
  projectKey: string
  lessons: ProjectHistoryLesson[]
  ncrs: ProjectHistoryNcr[]
  claims: ProjectHistoryClaim[]
  total: number
}

type VerifiedLessonRow = {
  source_path: string
  title: string
  content: string
  checklist: string | null
  ref_no: string | null
  ref_type: string | null
}

// projectKey가 없거나(선택 필드) 형식이 무효면 null (surface 안 함).
// exact 매칭만 수행한다 (PoC — 유사/접두 매칭은 본구현 백로그).
export async function loadProjectHistory(
  projectKey: string | null | undefined,
): Promise<ProjectHistory | null> {
  if (!projectKey || !isValidProjectKey(projectKey)) return null

  try {
    const [ncrRows, claimRows, lessonRows] = await Promise.all([
      prisma.ncr.findMany({
        where: { projectKey, status: "Closed" },
        select: {
          id: true,
          ncrNo: true,
          title: true,
          severity: true,
          disposition: true,
          closedDate: true,
        },
        orderBy: { closedDate: "desc" },
      }),
      prisma.claim.findMany({
        where: { projectKey, status: "Closed" },
        select: {
          id: true,
          claimNo: true,
          title: true,
          customer: true,
          priority: true,
          closedAt: true,
        },
        orderBy: { closedAt: "desc" },
      }),
      // verified_lesson은 source_path당 단일 행. metadata->>'project_key' exact 매칭.
      prisma.$queryRaw<VerifiedLessonRow[]>`
        SELECT source_path,
               title,
               content,
               metadata->>'tender_checklist_item' AS checklist,
               metadata->>'ref_no'                AS ref_no,
               metadata->>'ref_type'              AS ref_type
        FROM knowledge_chunks
        WHERE source_type = 'verified_lesson'
          AND metadata->>'project_key' = ${projectKey}
        ORDER BY metadata->>'verified_at' DESC
      `,
    ])

    const lessons: ProjectHistoryLesson[] = lessonRows.map((r) => ({
      sourcePath: r.source_path,
      title: r.title,
      content: r.content,
      checklist: r.checklist,
      refNo: r.ref_no,
      refType: r.ref_type,
    }))

    const ncrs: ProjectHistoryNcr[] = ncrRows.map((n) => ({
      id: n.id,
      ncrNo: n.ncrNo,
      title: n.title,
      severity: n.severity,
      disposition: n.disposition,
      closedDate: n.closedDate ? n.closedDate.toISOString() : null,
    }))

    const claims: ProjectHistoryClaim[] = claimRows.map((c) => ({
      id: c.id,
      claimNo: c.claimNo,
      title: c.title,
      customer: c.customer,
      priority: c.priority,
      closedAt: c.closedAt ? c.closedAt.toISOString() : null,
    }))

    return {
      projectKey,
      lessons,
      ncrs,
      claims,
      total: lessons.length + ncrs.length + claims.length,
    }
  } catch (e) {
    // fail-open — surface 조회 실패가 입찰 페이지 전체를 막지 않도록 빈 이력 반환.
    console.error(`[project-history] 조회 실패 (fail-open) — project_key=${projectKey}:`, e)
    return { projectKey, lessons: [], ncrs: [], claims: [], total: 0 }
  }
}
