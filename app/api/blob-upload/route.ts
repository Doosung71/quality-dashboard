import { issueSignedToken } from "@vercel/blob"
import { handleUploadPresigned, type HandleUploadPresignedBody } from "@vercel/blob/client"
import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"

const MAX_UPLOAD_BYTES = 500 * 1024 * 1024
const TOKEN_TTL_MS = 60 * 60 * 1000

const ALLOWED_CONTENT_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-excel", // .xls
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/msword", // .doc
]

const ALLOWED_EXTENSIONS = [".pdf", ".xlsx", ".xls", ".docx", ".doc"]

function assertAllowedPath(pathname: string) {
  const allowed = pathname.startsWith("tender-documents/") || pathname.startsWith("contract-documents/")
  if (!allowed) throw new Error("허용되지 않은 업로드 경로입니다.")
  const hasAllowedExt = ALLOWED_EXTENSIONS.some((ext) => pathname.toLowerCase().endsWith(ext))
  if (!hasAllowedExt) throw new Error("허용되지 않은 파일 형식입니다.")
}

export async function POST(request: NextRequest) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const body = (await request.json()) as HandleUploadPresignedBody

  try {
    const jsonResponse = await handleUploadPresigned({
      body,
      request,
      webhookPublicKey: "not-used",
      getSignedToken: async (pathname) => {
        assertAllowedPath(pathname)
        const validUntil = Date.now() + TOKEN_TTL_MS
        return {
          token: await issueSignedToken({
            pathname,
            operations: ["put"],
            allowedContentTypes: ALLOWED_CONTENT_TYPES,
            maximumSizeInBytes: MAX_UPLOAD_BYTES,
            validUntil,
          }),
          urlOptions: {
            allowedContentTypes: ALLOWED_CONTENT_TYPES,
            maximumSizeInBytes: MAX_UPLOAD_BYTES,
            validUntil,
          },
        }
      },
    })
    return NextResponse.json(jsonResponse)
  } catch (error) {
    console.error("[blob-upload] 업로드 URL 발급 실패:", error)
    return NextResponse.json({ error: "업로드 토큰 발급 실패" }, { status: 400 })
  }
}
