import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

/** PDF 추출 텍스트 정리:
 * - 목차 점선 제거 (............4)
 * - 여러 공백/탭을 단일 공백으로
 * - 3개 이상 연속 줄바꿈 → 2개로
 * - 섹션 번호 앞에 줄바꿈 삽입 (가독성)
 */
function cleanPdfText(raw: string): string {
  return raw
    .replace(/\.{4,}\s*\d*/g, "")           // TOC 점선 + 끝 페이지 번호
    .replace(/[ \t]{2,}/g, " ")              // 연속 공백 → 단일 공백
    .replace(/([.!?;])\s{1,2}(\d{1,2}[\s.])/, "$1\n\n$2")  // 문장 끝 + 섹션 번호 → 단락 구분
    .replace(/\n{3,}/g, "\n\n")              // 3줄 이상 빈 줄 → 2줄
    .trim()
}

export async function GET(req: NextRequest) {
  const sourcePath = req.nextUrl.searchParams.get("path")
  if (!sourcePath) return NextResponse.json({ text: "" }, { status: 400 })
  if (!process.env.DATABASE_URL_UNPOOLED)
    return NextResponse.json({ text: "" }, { status: 500 })

  const sql = neon(process.env.DATABASE_URL_UNPOOLED)
  const rows = await sql`
    SELECT content
    FROM knowledge_chunks
    WHERE source_path = ${sourcePath}
    ORDER BY created_at ASC
    LIMIT 30
  `
  const raw = (rows as { content: string }[]).map((r) => r.content).join("\n\n---\n\n")
  return NextResponse.json({ text: cleanPdfText(raw) })
}
