import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function GET(req: NextRequest) {
  const sourcePath = req.nextUrl.searchParams.get("path")
  if (!sourcePath) return NextResponse.json({ chunks: [] }, { status: 400 })
  if (!process.env.DATABASE_URL_UNPOOLED)
    return NextResponse.json({ chunks: [] }, { status: 500 })

  const sql = neon(process.env.DATABASE_URL_UNPOOLED)
  const rows = await sql`
    SELECT content
    FROM knowledge_chunks
    WHERE source_path = ${sourcePath}
    ORDER BY created_at ASC
    LIMIT 30
  `
  const text = (rows as { content: string }[]).map((r) => r.content).join("\n\n")
  return NextResponse.json({ text })
}
