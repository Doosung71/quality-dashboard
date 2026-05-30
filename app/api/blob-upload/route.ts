import { issueSignedToken } from "@vercel/blob"
import { handleUploadPresigned, type HandleUploadPresignedBody } from "@vercel/blob/client"
import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"

const MAX_UPLOAD_BYTES = 500 * 1024 * 1024
const TOKEN_TTL_MS = 60 * 60 * 1000
const PDF_CONTENT_TYPES = ["application/pdf"]

function assertTenderPdfPath(pathname: string) {
  if (!pathname.startsWith("tender-documents/") || !pathname.endsWith(".pdf")) {
    throw new Error("허용되지 않은 업로드 경로입니다.")
  }
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
        assertTenderPdfPath(pathname)
        const validUntil = Date.now() + TOKEN_TTL_MS
        return {
          token: await issueSignedToken({
            pathname,
            operations: ["put"],
            allowedContentTypes: PDF_CONTENT_TYPES,
            maximumSizeInBytes: MAX_UPLOAD_BYTES,
            validUntil,
          }),
          urlOptions: {
            allowedContentTypes: PDF_CONTENT_TYPES,
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
