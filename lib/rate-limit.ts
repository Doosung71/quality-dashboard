import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { NextRequest, NextResponse } from "next/server"

// UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN 미설정 시 Fail-Open (제한 없이 통과)
const redisClient =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null

// IP당 1분에 5회 — AI 분석·검색 전용
export const aiRateLimiter = redisClient
  ? new Ratelimit({
      redis: redisClient,
      limiter: Ratelimit.slidingWindow(5, "60 s"),
      analytics: true,
      prefix: "qms_ai",
    })
  : null

/**
 * AI/검색 API 라우트 앞에서 호출.
 * 한도 초과 시 429 Response 반환, 통과 시 null.
 * Upstash 미설정 또는 장애 시 null(Fail-Open).
 */
export async function checkRateLimit(req: NextRequest): Promise<NextResponse | null> {
  if (!aiRateLimiter) return null

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1"

  try {
    const { success, limit, reset, remaining } = await aiRateLimiter.limit(ip)
    if (!success) {
      return NextResponse.json(
        {
          error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
          resetTime: new Date(reset).toISOString(),
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": remaining.toString(),
            "X-RateLimit-Reset": reset.toString(),
          },
        }
      )
    }
    return null
  } catch {
    return null // Fail-Open: Upstash 장애 시 통과
  }
}
