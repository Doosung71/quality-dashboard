import { issueSignedToken } from "@vercel/blob"
import { handleUploadPresigned, type HandleUploadPresignedBody } from "@vercel/blob/client"
import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"

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
        const validUntil = Date.now() + 60 * 60 * 1000
        return {
          token: await issueSignedToken({
            pathname,
            operations: ["put"],
            allowedContentTypes: ["application/pdf"],
            maximumSizeInBytes: 500 * 1024 * 1024,
            validUntil,
          }),
          urlOptions: {
            allowedContentTypes: ["application/pdf"],
            maximumSizeInBytes: 500 * 1024 * 1024,
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
