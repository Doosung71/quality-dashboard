import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { isAdmin } from "@/lib/admin"

function getRedis() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Redis } = require("@upstash/redis")
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
}

export async function GET() {
  const session = await auth()
  if (!session || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const redis = getRedis()
  if (!redis) return NextResponse.json([])

  const keys: string[] = await redis.keys("presence:*")
  if (keys.length === 0) return NextResponse.json([])

  const values: unknown[] = await redis.mget(...keys)
  const users = values
    .filter(Boolean)
    .map((v) => (typeof v === "string" ? JSON.parse(v) : v))
    .sort((a: { lastSeen: string }, b: { lastSeen: string }) =>
      new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
    )

  return NextResponse.json(users)
}
