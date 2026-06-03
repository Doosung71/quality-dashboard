import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"

const DDG_TIMEOUT_MS = 8000

export async function POST(req: NextRequest) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const { role } = session.user
  if (!["DIRECTOR", "ADMIN", "TEAM_LEAD"].includes(role as string)) {
    return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 })
  }

  const { query } = body as { query?: string }
  if (!query?.trim()) {
    return NextResponse.json({ error: "검색어를 입력해 주세요." }, { status: 400 })
  }

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), DDG_TIMEOUT_MS)
    let res: Response
    try {
      res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query.trim())}`, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timer)
    }

    if (!res.ok) return NextResponse.json({ results: [] })
    const html = await res.text()

    const titleRegex = /<a[^>]+class="result__a"[^>]+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g
    const snippetRegex = /<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g
    const urlDisplayRegex = /<span[^>]+class="result__url[^"]*"[^>]*>([\s\S]*?)<\/span>/g

    const parsed: { href: string; title: string }[] = []
    const snippets: string[] = []
    const displayUrls: string[] = []
    let m: RegExpExecArray | null

    while ((m = titleRegex.exec(html)) !== null && parsed.length < 8) {
      const title = m[2].replace(/<[^>]*>/g, "").trim()
      if (title) parsed.push({ href: m[1], title })
    }
    while ((m = snippetRegex.exec(html)) !== null && snippets.length < 8) {
      const snip = m[1].replace(/<[^>]*>/g, "").trim()
      if (snip) snippets.push(snip)
    }
    while ((m = urlDisplayRegex.exec(html)) !== null && displayUrls.length < 8) {
      const u = m[1].replace(/<[^>]*>/g, "").trim()
      if (u) displayUrls.push(u)
    }

    const results = parsed.slice(0, 8).map(({ href, title }, i) => {
      // DDG redirect href에서 실제 URL 추출
      let url = ""
      if (href.includes("uddg=")) {
        try {
          const qs = href.includes("?") ? href.split("?")[1] : href
          const uddg = new URLSearchParams(qs).get("uddg")
          if (uddg) url = decodeURIComponent(uddg)
        } catch { /* ignore */ }
      }
      if (!url && displayUrls[i]) {
        url = displayUrls[i].startsWith("http") ? displayUrls[i] : `https://${displayUrls[i]}`
      }
      return { title, snippet: snippets[i] ?? "", url }
    })

    return NextResponse.json({ results })
  } catch (err) {
    console.error("[intelligence/websearch]", err)
    return NextResponse.json({ results: [], error: "검색 중 오류가 발생했습니다." })
  }
}