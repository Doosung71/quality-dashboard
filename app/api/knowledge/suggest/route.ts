import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { searchKnowledge } from "@/lib/knowledge"

const CACHE_TTL = 3600 // 1시간

function getCacheKey(query: string) {
  // 간단한 해시: 쿼리를 64자 이내로 정규화
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
