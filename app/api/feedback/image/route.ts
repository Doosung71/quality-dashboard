import { NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { auth } from "@/auth"

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"]
const MAX_BYTES = 4 * 1024 * 1024

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const form = await req.formData()
  const file = form.get("file") as File | null
  if (!file) return NextResponse.json({ error: "파일이 없습니다" }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type))
    return NextResponse.json({ error: "PNG/JPG/WebP/GIF만 첨부 가능합니다" }, { status: 400 })
  if (file.size > MAX_BYTES)
    return NextResponse.json({ error: "파일 크기는 4MB 이하여야 합니다" }, { status: 400 })

  const extMap: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" }
  const ext = (file.name.split(".").pop() || extMap[file.type]) ?? "png"

  try {
    const blob = await put(`feedback/${Date.now()}-${crypto.randomUUID()}.${ext}`, file, {
      access: "private",
      contentType: file.type,
    })
    const proxyUrl = `/api/blob/serve?url=${encodeURIComponent(blob.url)}`
    return NextResponse.json({ url: proxyUrl }, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error("[feedback/image] blob upload failed:", msg)
    return NextResponse.json({ error: `이미지 저장 실패: ${msg}` }, { status: 500 })
  }
}
