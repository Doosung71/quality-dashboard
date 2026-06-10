// QMS 산출물 → knowledge_chunks 인제스트 (원칙3: 지식 선순환 루프)
// 종결된 NCR/Claim을 Markdown으로 변환 후 pgvector KB에 적재한다.
// TRA의 ingest-approved.ts 패턴을 그대로 따른다.
import { neon } from "@neondatabase/serverless"
import { prisma } from "@/lib/prisma"

const CHUNK_CHARS = 3_000
const OVERLAP_CHARS = 500

function chunkText(text: string): string[] {
  const chunks: string[] = []
  let start = 0
  while (start < text.length) {
    chunks.push(text.slice(start, start + CHUNK_CHARS))
    if (start + CHUNK_CHARS >= text.length) break
    start += CHUNK_CHARS - OVERLAP_CHARS
  }
  return chunks
}

async function embedText(text: string): Promise<number[]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI embedding 실패 (${res.status}): ${err.slice(0, 200)}`)
  }
  const data = (await res.json()) as { data: [{ embedding: number[] }] }
  return data.data[0].embedding
}

interface TimelineItem { date: string; action: string; user?: string }

function buildNcrMarkdown(ncr: {
  ncrNo: string; title: string; source: string; severity: string
  disposition: string; description: string; assignee: string
  issuedDate: Date; targetDate: Date; closedDate?: Date | null
  timeline: unknown
}): string {
  const severityLabel: Record<string, string> = {
    Critical: "치명결함 (Critical)", Major: "중결함 (Major)", Minor: "경결함 (Minor)",
  }
  const dispositionLabel: Record<string, string> = {
    Scrap: "폐기 (Scrap)", Rework: "재작업 (Rework)",
    Concession: "특채 (Concession)", TBD: "미결정 (TBD)",
  }
  const lines: string[] = [
    `# [${ncr.ncrNo}] ${ncr.title}`,
    "",
    "## 개요",
    `- **발생처**: ${ncr.source}`,
    `- **중요도**: ${severityLabel[ncr.severity] ?? ncr.severity}`,
    `- **처분**: ${dispositionLabel[ncr.disposition] ?? ncr.disposition}`,
    `- **담당자**: ${ncr.assignee}`,
    `- **발행일**: ${ncr.issuedDate.toISOString().slice(0, 10)}`,
    `- **종결일**: ${ncr.closedDate ? ncr.closedDate.toISOString().slice(0, 10) : "-"}`,
    "",
    "## 발생 내용",
    ncr.description,
    "",
  ]

  const timeline = Array.isArray(ncr.timeline) ? (ncr.timeline as TimelineItem[]) : []
  if (timeline.length > 0) {
    lines.push("## 조치 이력 (Timeline)")
    for (const entry of timeline) {
      const user = entry.user ? ` (${entry.user})` : ""
      lines.push(`- **${entry.date}**${user}: ${entry.action}`)
    }
    lines.push("")
  }

  return lines.join("\n")
}

function buildClaimMarkdown(claim: {
  claimNo: string; title: string; customer: string; priority: string
  description: string; assignee: string
  receivedAt: Date; targetDate?: Date | null; closedAt?: Date | null
  timeline: unknown
}): string {
  const priorityLabel: Record<string, string> = {
    High: "긴급 (High)", Mid: "보통 (Mid)", Low: "낮음 (Low)",
  }
  const lines: string[] = [
    `# [${claim.claimNo}] ${claim.title}`,
    "",
    "## 개요",
    `- **고객**: ${claim.customer}`,
    `- **우선순위**: ${priorityLabel[claim.priority] ?? claim.priority}`,
    `- **담당자**: ${claim.assignee}`,
    `- **접수일**: ${claim.receivedAt.toISOString().slice(0, 10)}`,
    ...(claim.targetDate ? [`- **목표기한**: ${claim.targetDate.toISOString().slice(0, 10)}`] : []),
    `- **종결일**: ${claim.closedAt ? claim.closedAt.toISOString().slice(0, 10) : "-"}`,
    "",
    "## 클레임 내용",
    claim.description,
    "",
  ]

  const timeline = Array.isArray(claim.timeline) ? (claim.timeline as TimelineItem[]) : []
  if (timeline.length > 0) {
    lines.push("## 처리 이력 (Timeline)")
    for (const entry of timeline) {
      lines.push(`- **${entry.date}**: ${entry.action}`)
    }
    lines.push("")
  }

  return lines.join("\n")
}

async function ingestChunks(
  sourcePrefix: string,
  sourceType: string,
  title: string,
  text: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  if (!process.env.DATABASE_URL_UNPOOLED) throw new Error("DATABASE_URL_UNPOOLED 없음")
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY 없음")

  const chunks = chunkText(text)
  if (chunks.length === 0) return

  const nowStr = new Date().toISOString()
  type ChunkRow = { chunk: string; embedding: number[]; sourcePath: string; meta: string }
  const rows: ChunkRow[] = []
  for (const [i, chunk] of chunks.entries()) {
    const embedding = await embedText(chunk)
    rows.push({
      chunk,
      embedding,
      sourcePath: `${sourcePrefix}/${i}`,
      meta: JSON.stringify({ ...metadata, chunk_index: i, ingested_at: nowStr }),
    })
  }

  const sql = neon(process.env.DATABASE_URL_UNPOOLED)
  const likePattern = `${sourcePrefix}/%`
  await sql.transaction([
    sql`DELETE FROM knowledge_chunks WHERE source_path LIKE ${likePattern}`,
    ...rows.map(
      (row) => sql`
        INSERT INTO knowledge_chunks (content, embedding, source_path, source_type, title, metadata)
        VALUES (
          ${row.chunk},
          ${JSON.stringify(row.embedding)}::vector,
          ${row.sourcePath},
          ${sourceType},
          ${title},
          ${row.meta}::jsonb
        )
      `
    ),
  ])
}

export async function ingestClosedNcr(ncrId: string): Promise<void> {
  try {
    const ncr = await prisma.ncr.findUnique({ where: { id: ncrId } })
    if (!ncr || ncr.status !== "Closed") return

    const markdown = buildNcrMarkdown(ncr)
    await ingestChunks(
      `ncr_closed/${ncrId}`,
      "ncr_closed",
      `[NCR] ${ncr.ncrNo} ${ncr.title}`,
      markdown,
      { ncr_id: ncrId, ncr_no: ncr.ncrNo, severity: ncr.severity, source: ncr.source },
    )
    console.log(`[ingest-qms] NCR 인제스트 완료 — ${ncr.ncrNo}`)
  } catch (error) {
    console.error(`[ingest-qms] NCR 인제스트 실패 — ${ncrId}:`, error)
  }
}

export async function ingestClosedClaim(claimId: string): Promise<void> {
  try {
    const claim = await prisma.claim.findUnique({ where: { id: claimId } })
    if (!claim || claim.status !== "Closed") return

    const markdown = buildClaimMarkdown(claim)
    await ingestChunks(
      `claim_closed/${claimId}`,
      "claim_closed",
      `[클레임] ${claim.claimNo} ${claim.title}`,
      markdown,
      { claim_id: claimId, claim_no: claim.claimNo, customer: claim.customer, priority: claim.priority },
    )
    console.log(`[ingest-qms] Claim 인제스트 완료 — ${claim.claimNo}`)
  } catch (error) {
    console.error(`[ingest-qms] Claim 인제스트 실패 — ${claimId}:`, error)
  }
}
