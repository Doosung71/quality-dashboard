import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const feedbacks = await prisma.feedback.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { id: true, name: true, nickname: true, role: true } },
      replies: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true, nickname: true, role: true } } },
      },
    },
  })

  return NextResponse.json(feedbacks)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { content, imageUrls } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: "내용을 입력해주세요" }, { status: 400 })

  const validatedUrls = Array.isArray(imageUrls)
    ? imageUrls.filter((u): u is string => {
        if (typeof u !== "string") return false
        // proxy URL: /api/blob/serve?url=<encoded-blob-url>
        if (u.startsWith("/api/blob/serve?url=")) {
          try {
            const inner = new URL(decodeURIComponent(u.slice("/api/blob/serve?url=".length)))
            return inner.protocol === "https:" && inner.hostname.endsWith(".blob.vercel-storage.com")
          } catch { return false }
        }
        // direct blob URL (legacy)
        try {
          const parsed = new URL(u)
          return parsed.protocol === "https:" && parsed.hostname.endsWith(".blob.vercel-storage.com")
        } catch { return false }
      }).slice(0, 3)
    : []

  const feedback = await prisma.feedback.create({
    data: {
      content: content.trim(),
      authorId: session.user.id,
      imageUrls: validatedUrls.length > 0 ? JSON.stringify(validatedUrls) : null,
    },
    include: {
      author: { select: { id: true, name: true, nickname: true, role: true } },
      replies: { include: { author: { select: { id: true, name: true, nickname: true, role: true } } } },
    },
  })

  return NextResponse.json(feedback, { status: 201 })
}
