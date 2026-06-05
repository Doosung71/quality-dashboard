import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"
import { extractTextFromPdf } from "@/lib/pdf"
import { readBlobBuffer } from "@/lib/storage"
import { extractContractGaps } from "@/lib/ai/extract"

// POST /api/awarded-projects/[id]/analyze — AI 갭 분석 실행
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const { id: projectId } = await params
  const { documentId } = await req.json() as { documentId?: string }

  if (!documentId) return NextResponse.json({ error: "documentId 필요" }, { status: 400 })

  // 프로젝트 + 연결된 입찰의 APPROVED 분석 요구사항 조회
  const project = await prisma.awardedProject.findUnique({
    where: { id: projectId },
    include: {
      tender: {
        include: {
          analyses: {
            where: { status: "APPROVED" },
            orderBy: { updatedAt: "desc" },
            take: 1,
            include: {
              requirements: {
                select: { category: true, content: true },
                orderBy: { category: "asc" },
              },
            },
          },
        },
      },
    },
  })
  if (!project) return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 })

  const doc = await prisma.contractDocument.findFirst({
    where: { id: documentId, projectId },
  })
  if (!doc) return NextResponse.json({ error: "문서를 찾을 수 없습니다." }, { status: 404 })

  // 계약서 PDF 텍스트 추출
  const buffer = await readBlobBuffer(doc.storagePath)
  if (!buffer) return NextResponse.json({ error: "PDF를 읽을 수 없습니다." }, { status: 502 })
  const { text: contractText } = await extractTextFromPdf(buffer)

  // 입찰 요구사항 수집 (APPROVED 분석 기준)
  const tenderRequirements = project.tender.analyses[0]?.requirements ?? []

  // AI 갭 분석
  let extracted
  try {
    extracted = await extractContractGaps(contractText, tenderRequirements)
  } catch (e) {
    return NextResponse.json({ error: `AI 분석 실패: ${(e as Error).message}` }, { status: 500 })
  }

  // 분석 결과 저장
  const analysis = await prisma.contractAnalysis.create({
    data: {
      projectId,
      documentId: doc.id,
      status: "DRAFT",
      aiUsed: extracted.aiUsed,
      gaps: {
        create: extracted.data.gaps.map((g) => ({
          category:     g.category,
          tenderItem:   g.tenderItem,
          contractItem: g.contractItem,
          gapType:      g.gapType,
          isRisk:       g.isRisk,
          sourcePage:   g.sourcePage ?? null,
          remark:       g.remark ?? null,
        })),
      },
    },
  })

  return NextResponse.json({
    analysisId: analysis.id,
    gapCount: extracted.data.gaps.length,
    riskCount: extracted.data.gaps.filter((g) => g.isRisk).length,
    aiUsed: extracted.aiUsed,
  })
}
