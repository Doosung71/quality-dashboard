/**
 * GET /api/knowledge/suggest?q=<query>
 *
 * 능동적 지식 추천 API — 화면 컨텍스트를 PKM에 검색해 관련 지식 3건을 반환한다.
 *
 * [외부 데이터 전송 경로 — 보안 고지]
 * - query 파라미터(클레임 제목·설명, 협력업체명·품목 등)가 OpenAI Embeddings API로 전송됨
 * - 전송 범위: q 파라미터 앞 300자 (개인식별정보 비포함 — 품질 업무 텍스트만 해당)
 * - 캐싱: Upstash Redis에 정규화된 쿼리 키(60자)로 1시간 저장. 원문 쿼리는 키에 포함되지 않음
 * - 비활성화: 환경변수 PKM_SUGGEST_ENABLED=false 설정 시 이 엔드포인트는 즉시 빈 배열을 반환함
 * - 로컬 개발: DATABASE_URL_UNPOOLED 미설정 시 자동 빈 배열 반환 (외부 API 미호출)
 */
import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { searchKnowledge } from "@/lib/knowledge"

const CACHE_TTL = 3600 // 1시간

function getCacheKey(query: string) {
  return `pkm:suggest:${query.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 60)}`
}

function getRedis() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Redis } = require("@upstash/redis")
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
}

export async function GET(req: NextRequest) {
  // 환경변수로 기능 전체 비활성화 가능 (PKM_SUGGEST_ENABLED=false)
  if (process.env.PKM_SUGGEST_ENABLED === "false") {
    return NextResponse.json({ results: [] })
  }

  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const q = req.nextUrl.searchParams.get("q")?.trim()
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const query = q.slice(0, 300)
  const cacheKey = getCacheKey(query)

  // Redis 캐시 조회 (Upstash 미설정 시 skip)
  const redis = getRedis()
  if (redis) {
    try {
      const cached = await redis.get(cacheKey)
      if (cached) {
        return NextResponse.json({ results: cached, cached: true })
      }
    } catch {
      // fail-open: 캐시 조회 실패 시 DB 직접 조회
    }
  }

  try {
    const chunks = await searchKnowledge(query, { limit: 3 })
    const results = chunks.map((c) => ({
      title: c.title,
      content: c.content.slice(0, 200),
      source_type: c.source_type,
      source_path: c.source_path,
      similarity: c.similarity,
      rrf_score: c.rrf_score,
    }))

    if (redis) {
      try {
        await redis.set(cacheKey, results, { ex: CACHE_TTL })
      } catch {
        // fail-open: 캐시 저장 실패 무시
      }
    }

    return NextResponse.json({ results })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[knowledge/suggest]", msg)
    return NextResponse.json({ results: [] })
  }
}
