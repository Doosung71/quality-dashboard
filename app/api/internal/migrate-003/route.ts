import { neon } from "@neondatabase/serverless"
import { NextRequest, NextResponse } from "next/server"

// 일회성 마이그레이션 엔드포인트 — 실행 후 즉시 삭제할 것
// 사용법: GET /api/internal/migrate-003?t=<INTERNAL_MIGRATION_TOKEN>
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("t")
  if (!token || token !== process.env.INTERNAL_MIGRATION_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const sql = neon(process.env.DATABASE_URL_UNPOOLED!)

  await sql`
    CREATE OR REPLACE FUNCTION search_knowledge_hybrid(
      query_embedding vector(1536),
      query_text      text,
      match_count     int     DEFAULT 5,
      source_types    text[]  DEFAULT NULL,
      rrf_k           int     DEFAULT 60
    )
    RETURNS TABLE (
      id          uuid,
      source_type text,
      source_path text,
      title       text,
      content     text,
      metadata    jsonb,
      similarity  float,
      rrf_score   float
    )
    LANGUAGE sql STABLE AS $$
      WITH vector_matches AS (
        SELECT
          id,
          row_number() OVER (ORDER BY embedding <=> query_embedding) AS rank,
          1 - (embedding <=> query_embedding) AS similarity
        FROM knowledge_chunks
        WHERE
          (source_types IS NULL OR source_type = ANY(source_types))
          AND embedding IS NOT NULL
        ORDER BY embedding <=> query_embedding
        LIMIT match_count * 5
      ),
      keyword_matches AS (
        SELECT
          id,
          row_number() OVER (
            ORDER BY ts_rank(
              to_tsvector('simple', content),
              plainto_tsquery('simple', query_text)
            ) DESC
          ) AS rank
        FROM knowledge_chunks
        WHERE
          (source_types IS NULL OR source_type = ANY(source_types))
          AND to_tsvector('simple', content) @@ plainto_tsquery('simple', query_text)
        ORDER BY ts_rank(
          to_tsvector('simple', content),
          plainto_tsquery('simple', query_text)
        ) DESC
        LIMIT match_count * 5
      )
      SELECT
        kc.id,
        kc.source_type,
        kc.source_path,
        kc.title,
        kc.content,
        kc.metadata,
        COALESCE(vm.similarity, 0.0)::float        AS similarity,
        (
          COALESCE(1.0 / (rrf_k + vm.rank), 0.0) +
          COALESCE(1.0 / (rrf_k + km.rank), 0.0)
        )::float                                   AS rrf_score
      FROM knowledge_chunks kc
      LEFT JOIN vector_matches  vm ON kc.id = vm.id
      LEFT JOIN keyword_matches km ON kc.id = km.id
      WHERE vm.id IS NOT NULL OR km.id IS NOT NULL
      ORDER BY rrf_score DESC
      LIMIT match_count;
    $$
  `

  return NextResponse.json({ ok: true, migration: "003_search_knowledge_hybrid" })
}
