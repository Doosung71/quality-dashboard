import { NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { requireActiveSession } from "@/lib/session-guard"

const MAX_SIZE = 20 * 1024 * 1024 // 20MB
const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "application/zip",
  "application/x-zip-compressed",
]
const ALLOWED_EXTENSIONS = [
  "jpg", "jpeg", "png", "gif", "webp",
  "pdf", "docx", "xlsx", "pptx", "txt", "zip",
]

export async function POST(req: NextRequest) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const form = await req.formData()
  const file = form.get("file") as File | null
  const context = (form.get("context") as string | null) ?? "attachment"

  if (!file) return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 })
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "파일 크기는 20MB 이하여야 합니다." }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: "지원하지 않는 파일 형식입니다." }, { status: 400 })

  const ext = (file.name.split(".").pop() ?? "").toLowerCase()
  if (!ALLOWED_EXTENSIONS.includes(ext)) return NextResponse.json({ error: "지원하지 않는 파일 확장자입니다." }, { status: 400 })

  const safe = context.replace(/[^a-z0-9_-]/gi, "-").toLowerCase()
  const path = `${safe}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  try {
    const blob = await put(path, file, { access: "private", contentType: file.type })
    const proxyUrl = `/api/blob/serve?url=${encodeURIComponent(blob.url)}`
    return NextResponse.json({
      url: proxyUrl,
      name: file.name,
      size: file.size,
      contentType: file.type,
    })
  } catch (e) {
    console.error("[attachments/upload] blob upload failed:", e)
    return NextResponse.json({ error: "파일 저장에 실패했습니다. 잠시 후 다시 시도해주세요." }, { status: 500 })
  }
}
