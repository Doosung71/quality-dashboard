import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"

export async function GET(req: NextRequest) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const url = req.nextUrl.searchParams.get("url")
  if (!url) return new NextResponse("Missing url", { status: 400 })

  // SSRF guard: only proxy Vercel Blob URLs
  if (!url.startsWith("https://") || !url.includes(".blob.vercel-storage.com")) {
    return new NextResponse("Invalid url", { status: 400 })
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) return new NextResponse("Blob not configured", { status: 503 })

  const blobResp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => null)

  if (!blobResp || !blobResp.ok) {
    return new NextResponse("Not found", { status: 404 })
  }

  const contentType = blobResp.headers.get("content-type") ?? "application/octet-stream"
  const body = await blobResp.arrayBuffer()

  return new NextResponse(body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600",
    },
  })
}
