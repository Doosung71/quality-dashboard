// Neon HTTP driver를 직접 사용하는 이유:
// knowledge_chunks 테이블은 Prisma 스키마 외부(PKM 프로젝트)에서 생성됐고,
// pgvector <=> 연산자를 raw SQL로 실행해야 한다.
// Neon HTTP driver는 무상태이므로 매 호출 생성이 연결 풀을 소비하지 않는다.
// DATABASE_URL_UNPOOLED: pgvector 쿼리는 세션 단위 파라미터(set_limit 등)가 필요 없어 unpooled 사용.
import { neon } from "@neondatabase/serverless"

export interface KnowledgeChunk {
  content: string
  source_path: string
  title: string | null
  similarity: number
  metadata: {
    tags: string[]
    section: string
    vault_links: string[]
  }
}

export interface KnowledgeSearchOptions {
  limit?: number
  filter?: { tags?: string[] }
}

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
  { limit = 5, filter }: KnowledgeSearchOptions = {}
): Promise<KnowledgeChunk[]> {
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

  if (tags) {
    rows = await sql`
      SELECT content, source_path, title, metadata,
             1 - (embedding <=> ${embStr}::vector) AS similarity
      FROM knowledge_chunks
      WHERE metadata->'tags' @> ${JSON.stringify(tags)}::jsonb
      ORDER BY embedding <=> ${embStr}::vector
      LIMIT ${safeLimit}
    `
  } else {
    rows = await sql`
      SELECT content, source_path, title, metadata,
             1 - (embedding <=> ${embStr}::vector) AS similarity
      FROM knowledge_chunks
      ORDER BY embedding <=> ${embStr}::vector
      LIMIT ${safeLimit}
    `
  }

  return (rows as any[]).map((r) => ({
    content: r.content as string,
    source_path: r.source_path as string,
    title: r.title as string | null,
    similarity: parseFloat(r.similarity),
    metadata: r.metadata as KnowledgeChunk["metadata"],
  }))
}
