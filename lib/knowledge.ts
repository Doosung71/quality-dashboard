// Neon HTTP driver를 직접 사용하는 이유:
// knowledge_chunks 테이블은 Prisma 스키마 외부(PKM 프로젝트)에서 생성됐고,
// pgvector <=> 연산자를 raw SQL로 실행해야 한다.
// Neon HTTP driver는 무상태이므로 매 호출 생성이 연결 풀을 소비하지 않는다.
// DATABASE_URL_UNPOOLED: pgvector 쿼리는 세션 단위 파라미터(set_limit 등)가 필요 없어 unpooled 사용.
import { neon } from "@neondatabase/serverless"

export interface KnowledgeChunk {
  content: string
  source_type: string
  source_path: string
  title: string | null
  similarity: number
  rrf_score: number
  metadata: {
    tags: string[]
    section: string
    vault_links: string[]
  }
}

export interface KnowledgeSearchOptions {
  limit?: number
  filter?: { tags?: string[] }
  /** 검색 대상 source_type 목록. 기본: obsidian·standards·pdf_inbox. tra_approved는 항상 제외. */
  sourceTypes?: string[]
}

const DEFAULT_SOURCE_TYPES = [
  'obsidian', 'standards', 'pdf_inbox',
  'ncr_closed', 'claim_closed',
  'incoming_inspection', 'source_inspection', 'supplier_audit',
  'qms_summary', 'verified_lesson',
]
// tra_approved는 TRA 전용 RAG 경로에서만 사용. 일반 검색에서 항상 차단.
const BLOCKED_SOURCE_TYPES = new Set(['tra_approved'])

async function createQueryEmbedding(query: string): Promise<number[]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: "text-embedding-3-small", input: query }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI embedding 오류 (${res.status}): ${err}`)
  }
  const data = await res.json()
  return data.data[0].embedding as number[]
}

export async function searchKnowledge(
  query: string,
  { limit = 5, filter, sourceTypes = DEFAULT_SOURCE_TYPES }: KnowledgeSearchOptions = {}
): Promise<KnowledgeChunk[]> {
  // 호출자가 sourceTypes를 오버라이드해도 tra_approved는 항상 차단
  const safeSourceTypes = sourceTypes.filter((t) => !BLOCKED_SOURCE_TYPES.has(t))
  if (!process.env.DATABASE_URL_UNPOOLED) {
    throw new Error("[knowledge] DATABASE_URL_UNPOOLED 환경변수가 설정되지 않았습니다.")
  }
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("[knowledge] OPENAI_API_KEY 환경변수가 설정되지 않았습니다.")
  }

  const embedding = await createQueryEmbedding(query)
  const embStr = JSON.stringify(embedding)
  const safeLimit = Math.min(Math.max(1, limit), 20)

  const sql = neon(process.env.DATABASE_URL_UNPOOLED)

  const tags = filter?.tags?.length ? filter.tags : null
  let rows: unknown[]

  // search_knowledge_hybrid: 벡터 코사인 유사도 + FTS 키워드 RRF 결합 검색
  // tra_approved 격리 정책 유지. sourceTypes 인자로 호출자가 범위 제어 가능.
  if (tags) {
    // 태그 필터: 후보를 넉넉히 뽑아 post-filter 적용
    rows = await sql`
      SELECT source_type, source_path, title, content, metadata,
             similarity::float, rrf_score::float
      FROM search_knowledge_hybrid(
        ${embStr}::vector,
        ${query},
        ${safeLimit * 3},
        ${safeSourceTypes}::text[],
        60
      )
      WHERE metadata->'tags' @> ${JSON.stringify(tags)}::jsonb
      LIMIT ${safeLimit}
    `
  } else {
    rows = await sql`
      SELECT source_type, source_path, title, content, metadata,
             similarity::float, rrf_score::float
      FROM search_knowledge_hybrid(
        ${embStr}::vector,
        ${query},
        ${safeLimit},
        ${safeSourceTypes}::text[],
        60
      )
    `
  }

  interface DBRow {
    content: string
    source_type: string
    source_path: string
    title: string | null
    similarity: string | number
    rrf_score: string | number
    metadata: KnowledgeChunk["metadata"]
  }

  return (rows as unknown as DBRow[]).map((r) => ({
    content: r.content,
    source_type: r.source_type,
    source_path: r.source_path,
    title: r.title,
    similarity: typeof r.similarity === "number" ? r.similarity : parseFloat(r.similarity),
    rrf_score: typeof r.rrf_score === "number" ? r.rrf_score : parseFloat(r.rrf_score),
    metadata: r.metadata,
  }))
}
