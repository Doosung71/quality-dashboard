import { NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { requireActiveSession } from "@/lib/session-guard"

const MAX_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
]

const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "pdf", "docx", "xlsx", "pptx", "txt"]

export async function POST(req: NextRequest) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const form = await req.formData()
  const file = form.get("file") as File | null
  if (!file) return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 })
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "파일 크기는 10MB 이하여야 합니다." }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: "지원하지 않는 파일 형식입니다." }, { status: 400 })
  const ext = (file.name.split(".").pop() ?? "").toLowerCase()
  if (!ALLOWED_EXTENSIONS.includes(ext)) return NextResponse.json({ error: "지원하지 않는 파일 확장자입니다." }, { status: 400 })
  const safeName = `board/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext || "bin"}`

  const blob = await put(safeName, file, { access: "private", contentType: file.type })
  const proxyUrl = `/api/blob/serve?url=${encodeURIComponent(blob.url)}`

  return NextResponse.json({
    url: proxyUrl,
    name: file.name,
    size: file.size,
    contentType: file.type,
  })
}
