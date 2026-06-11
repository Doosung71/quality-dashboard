import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"

function getRedis() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Redis } = require("@upstash/redis")
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ ok: false }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const currentPage = typeof body.currentPage === "string" ? body.currentPage.slice(0, 100) : "/"

  const redis = getRedis()
  if (redis) {
    await redis.set(
      `presence:${session.user.id}`,
      JSON.stringify({
        id: session.user.id,
        name: session.user.name ?? "알 수 없음",
        role: (session.user as { role?: string }).role ?? "PRACTITIONER",
        currentPage,
        lastSeen: new Date().toISOString(),
      }),
      { ex: 90 }
    )
  }

  return NextResponse.json({ ok: true })
}
