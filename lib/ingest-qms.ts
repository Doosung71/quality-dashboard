// QMS 산출물 → knowledge_chunks 인제스트 (원칙3: 지식 선순환 루프)
// 종결된 NCR/Claim을 Markdown으로 변환 후 pgvector KB에 적재한다.
// TRA의 ingest-approved.ts 패턴을 그대로 따른다.
import { neon } from "@neondatabase/serverless"
import { prisma } from "@/lib/prisma"
import Anthropic from "@anthropic-ai/sdk"

// 설계 판단 ④: Haiku 사용 — 텍스트 정리·추출 목적이므로 충분. 상수로 관리해 변경 용이.
const SUMMARY_MODEL = "claude-haiku-4-5-20251001"

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

// 설계 판단 ⑤: 3개 필드 추출 (근본원인 / 핵심 대책 / 교훈)
async function generateQmsSummary(markdown: string): Promise<string> {
  const client = new Anthropic()
  const message = await client.messages.create({
    model: SUMMARY_MODEL,
    max_tokens: 1024,
    messages: [{
      role: "user",
      content: `아래 품질 이슈 보고서에서 핵심 내용을 추출하세요.

${markdown}

다음 3개 항목을 한국어로 간결하게 작성하세요:

## 근본원인 (Root Cause)
[근본원인을 1~3문장으로]

## 핵심 대책 (Corrective Action)
[핵심 대책을 1~3문장으로]

## 교훈 (Lesson Learned)
[유사 사례 재발 방지를 위한 교훈을 1~2문장으로]`,
    }],
  })
  const block = message.content[0]
  if (block.type !== "text") throw new Error("예상치 못한 응답 타입")
  return block.text
}

// 설계 판단 ①: qms_summary 별도 행으로 저장
// 설계 판단 ②: fail-open — LLM 실패 시 요약만 스킵, 호출부에서 try/catch 처리
async function ingestSummaryChunk(
  sourcePrefix: string,
  title: string,
  summaryText: string,
): Promise<void> {
  if (!process.env.DATABASE_URL_UNPOOLED) throw new Error("DATABASE_URL_UNPOOLED 없음")
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY 없음")

  const embedding = await embedText(summaryText)
  const sql = neon(process.env.DATABASE_URL_UNPOOLED)
  const sourcePath = `${sourcePrefix}/summary`

  await sql.transaction([
    sql`DELETE FROM knowledge_chunks WHERE source_path = ${sourcePath}`,
    sql`
      INSERT INTO knowledge_chunks (content, embedding, source_path, source_type, title, metadata)
      VALUES (
        ${summaryText},
        ${JSON.stringify(embedding)}::vector,
        ${sourcePath},
        'qms_summary',
        ${title},
        ${{ summary: true, ingested_at: new Date().toISOString() }}::jsonb
      )
    `,
  ])
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
    const title = `[NCR] ${ncr.ncrNo} ${ncr.title}`
    const sourcePrefix = `ncr_closed/${ncrId}`

    await ingestChunks(
      sourcePrefix,
      "ncr_closed",
      title,
      markdown,
      { ncr_id: ncrId, ncr_no: ncr.ncrNo, severity: ncr.severity, source: ncr.source },
    )
    console.log(`[ingest-qms] NCR 인제스트 완료 — ${ncr.ncrNo}`)

    // 설계 판단 ②: fail-open — 요약 실패 시 원본 청크는 이미 저장됨
    try {
      if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY 없음")
      const summary = await generateQmsSummary(markdown)
      await ingestSummaryChunk(sourcePrefix, `[요약] ${title}`, `${title}\n\n${summary}`)
      console.log(`[ingest-qms] NCR 요약 인제스트 완료 — ${ncr.ncrNo}`)
    } catch (summaryError) {
      console.error(`[ingest-qms] NCR 요약 스킵 (fail-open) — ${ncr.ncrNo}:`, summaryError)
    }
  } catch (error) {
    console.error(`[ingest-qms] NCR 인제스트 실패 — ${ncrId}:`, error)
  }
}

export async function ingestClosedClaim(claimId: string): Promise<void> {
  try {
    const claim = await prisma.claim.findUnique({ where: { id: claimId } })
    if (!claim || claim.status !== "Closed") return

    const markdown = buildClaimMarkdown(claim)
    const title = `[클레임] ${claim.claimNo} ${claim.title}`
    const sourcePrefix = `claim_closed/${claimId}`

    await ingestChunks(
      sourcePrefix,
      "claim_closed",
      title,
      markdown,
      { claim_id: claimId, claim_no: claim.claimNo, customer: claim.customer, priority: claim.priority },
    )
    console.log(`[ingest-qms] Claim 인제스트 완료 — ${claim.claimNo}`)

    // 설계 판단 ②: fail-open — 요약 실패 시 원본 청크는 이미 저장됨
    try {
      if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY 없음")
      const summary = await generateQmsSummary(markdown)
      await ingestSummaryChunk(sourcePrefix, `[요약] ${title}`, `${title}\n\n${summary}`)
      console.log(`[ingest-qms] Claim 요약 인제스트 완료 — ${claim.claimNo}`)
    } catch (summaryError) {
      console.error(`[ingest-qms] Claim 요약 스킵 (fail-open) — ${claim.claimNo}:`, summaryError)
    }
  } catch (error) {
    console.error(`[ingest-qms] Claim 인제스트 실패 — ${claimId}:`, error)
  }
}

function buildIncomingInspectionMarkdown(item: {
  itemName: string; vendorName: string
  inspectionDate: Date; quantity: number
  sampleSize: number | null; defectCount: number | null; defectRate: number | null
  result: string | null; notes: string | null; inspector: string | null
}): string {
  const resultLabel: Record<string, string> = {
    PASS: "합격", FAIL: "불합격", CONDITIONAL_PASS: "조건부합격",
  }
  const lines: string[] = [
    `# [수입검사] ${item.itemName}`,
    "",
    "## 검사 개요",
    `- **협력업체**: ${item.vendorName}`,
    `- **검사일**: ${item.inspectionDate.toISOString().slice(0, 10)}`,
    `- **수량**: ${item.quantity}`,
    ...(item.sampleSize  != null ? [`- **샘플 수량**: ${item.sampleSize}`]  : []),
    ...(item.defectCount != null ? [`- **불량 수량**: ${item.defectCount}`] : []),
    ...(item.defectRate  != null ? [`- **불량률**: ${item.defectRate}%`]    : []),
    `- **판정**: ${item.result ? (resultLabel[item.result] ?? item.result) : "-"}`,
    ...(item.inspector ? [`- **검사원**: ${item.inspector}`] : []),
    "",
  ]
  if (item.notes) lines.push("## 특이사항", item.notes, "")
  return lines.join("\n")
}

function buildSourceInspectionMarkdown(item: {
  itemName: string; vendorName: string
  inspectionDate: Date; location: string | null; quantity: number
  sampleSize: number | null; defectCount: number | null; defectRate: number | null
  result: string | null; notes: string | null; inspector: string | null
}): string {
  const resultLabel: Record<string, string> = {
    PASS: "합격", FAIL: "불합격", CONDITIONAL_PASS: "조건부합격",
  }
  const lines: string[] = [
    `# [출장검사] ${item.itemName}`,
    "",
    "## 검사 개요",
    `- **협력업체**: ${item.vendorName}`,
    `- **검사일**: ${item.inspectionDate.toISOString().slice(0, 10)}`,
    ...(item.location    ? [`- **검사장소**: ${item.location}`]            : []),
    `- **수량**: ${item.quantity}`,
    ...(item.sampleSize  != null ? [`- **샘플 수량**: ${item.sampleSize}`]  : []),
    ...(item.defectCount != null ? [`- **불량 수량**: ${item.defectCount}`] : []),
    ...(item.defectRate  != null ? [`- **불량률**: ${item.defectRate}%`]    : []),
    `- **판정**: ${item.result ? (resultLabel[item.result] ?? item.result) : "-"}`,
    ...(item.inspector ? [`- **검사원**: ${item.inspector}`] : []),
    "",
  ]
  if (item.notes) lines.push("## 특이사항", item.notes, "")
  return lines.join("\n")
}

function buildSupplierAuditMarkdown(audit: {
  vendorName: string; auditDate: Date
  auditType: string; auditor: string
  overallGrade: string | null; totalScore: number | null
  status: string; summary: string | null
  findings: { category: string; severity: string; description: string | null }[]
}): string {
  const lines: string[] = [
    `# [협력업체 감사] ${audit.vendorName}`,
    "",
    "## 감사 개요",
    `- **감사일**: ${audit.auditDate.toISOString().slice(0, 10)}`,
    `- **감사 유형**: ${audit.auditType}`,
    `- **감사원**: ${audit.auditor}`,
    ...(audit.overallGrade ? [`- **종합 등급**: ${audit.overallGrade}`] : []),
    ...(audit.totalScore != null ? [`- **총점**: ${audit.totalScore}`]  : []),
    `- **상태**: ${audit.status}`,
    "",
  ]
  if (audit.summary) lines.push("## 감사 요약", audit.summary, "")
  if (audit.findings.length > 0) {
    lines.push("## 지적 사항")
    for (const f of audit.findings) {
      lines.push(`- **[${f.severity}] ${f.category}**${f.description ? `: ${f.description}` : ""}`)
    }
    lines.push("")
  }
  return lines.join("\n")
}

export async function ingestIncomingInspection(id: string): Promise<void> {
  try {
    const item = await prisma.incomingInspection.findUnique({ where: { id } })
    if (!item || !item.result) return

    const markdown = buildIncomingInspectionMarkdown(item)
    await ingestChunks(
      `incoming_inspection/${id}`,
      "incoming_inspection",
      `[수입검사] ${item.itemName} (${item.vendorName})`,
      markdown,
      { id, item_name: item.itemName, result: item.result, vendor: item.vendorName },
    )
    console.log(`[ingest-qms] 수입검사 인제스트 완료 — ${item.itemName}`)
  } catch (error) {
    console.error(`[ingest-qms] 수입검사 인제스트 실패 — ${id}:`, error)
  }
}

export async function ingestSourceInspection(id: string): Promise<void> {
  try {
    const item = await prisma.sourceInspection.findUnique({ where: { id } })
    if (!item || !item.result) return

    const markdown = buildSourceInspectionMarkdown(item)
    await ingestChunks(
      `source_inspection/${id}`,
      "source_inspection",
      `[출장검사] ${item.itemName} (${item.vendorName})`,
      markdown,
      { id, item_name: item.itemName, result: item.result, vendor: item.vendorName },
    )
    console.log(`[ingest-qms] 출장검사 인제스트 완료 — ${item.itemName}`)
  } catch (error) {
    console.error(`[ingest-qms] 출장검사 인제스트 실패 — ${id}:`, error)
  }
}

export async function ingestSupplierAudit(id: string): Promise<void> {
  try {
    const audit = await prisma.supplierAudit.findUnique({
      where: { id },
      include: { findings: { select: { category: true, severity: true, description: true } } },
    })
    // 감사 결과가 있고(overallGrade 또는 status가 COMPLETED) 인제스트
    if (!audit || (!audit.overallGrade && audit.status !== "COMPLETED")) return

    const markdown = buildSupplierAuditMarkdown(audit)
    await ingestChunks(
      `supplier_audit/${id}`,
      "supplier_audit",
      `[협력업체 감사] ${audit.vendorName} (${audit.auditDate.toISOString().slice(0, 10)})`,
      markdown,
      { id, vendor: audit.vendorName, overall_grade: audit.overallGrade, status: audit.status },
    )
    console.log(`[ingest-qms] 협력업체 감사 인제스트 완료 — ${audit.vendorName}`)
  } catch (error) {
    console.error(`[ingest-qms] 협력업체 감사 인제스트 실패 — ${id}:`, error)
  }
}
