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
      access: "public",
      contentType: file.type,
    })
    return NextResponse.json({ url: blob.url }, { status: 201 })
  } catch (e) {
    console.error("[feedback/image] blob upload failed:", e)
    return NextResponse.json({ error: "이미지 저장에 실패했습니다. 잠시 후 다시 시도해주세요." }, { status: 500 })
  }
}
