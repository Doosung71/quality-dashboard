import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"

const NAVER_CLIENT_ID     = process.env.NAVER_CLIENT_ID     ?? ""
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET ?? ""
const TIMEOUT_MS          = 8000

async function naverSearch(query: string): Promise<{ title: string; snippet: string; url: string }[]> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  let newsItems: { title: string; snippet: string; url: string }[] = []
  let webItems:  { title: string; snippet: string; url: string }[] = []

  try {
    // 뉴스 검색 (최신 동향 파악)
    const [newsRes, webRes] = await Promise.all([
      fetch(
        `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query)}&display=5&sort=date`,
        {
          headers: {
            "X-Naver-Client-Id":     NAVER_CLIENT_ID,
            "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
          },
          signal: controller.signal,
        }
      ),
      fetch(
        `https://openapi.naver.com/v1/search/webkr.json?query=${encodeURIComponent(query)}&display=5`,
        {
          headers: {
            "X-Naver-Client-Id":     NAVER_CLIENT_ID,
            "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
          },
          signal: controller.signal,
        }
      ),
    ])

    const stripHtml = (s: string) => s.replace(/<[^>]*>/g, "").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim()

    if (newsRes.ok) {
      const data = await newsRes.json() as { items: { title: string; description: string; link: string; pubDate: string }[] }
      newsItems = (data.items ?? []).map(item => ({
        title:   `[뉴스] ${stripHtml(item.title)}`,
        snippet: `${stripHtml(item.description)} (${item.pubDate.slice(0, 16)})`,
        url:     item.link,
      }))
    }

    if (webRes.ok) {
      const data = await webRes.json() as { items: { title: string; description: string; link: string }[] }
      webItems = (data.items ?? []).map(item => ({
        title:   stripHtml(item.title),
        snippet: stripHtml(item.description),
        url:     item.link,
      }))
    }
  } finally {
    clearTimeout(timer)
  }

  // 뉴스 우선, 웹 결과로 채움 (최대 8건)
  return [...newsItems, ...webItems].slice(0, 8)
}

export async function POST(req: NextRequest) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const { role } = session.user
  if (!["DIRECTOR", "ADMIN", "TEAM_LEAD"].includes(role as string)) {
    return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 })
  }

  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
    return NextResponse.json(
      { error: "웹 검색 API가 설정되지 않았습니다. 관리자에게 문의하세요. (NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 환경변수 필요)" },
      { status: 503 }
    )
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
    const results = await naverSearch(query.trim())
    return NextResponse.json({ results })
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === "AbortError"
    console.error("[intelligence/websearch]", err)
    return NextResponse.json(
      { error: isTimeout ? "검색 요청 시간이 초과됐습니다. 다시 시도해 주세요." : "검색 중 오류가 발생했습니다." },
      { status: 502 }
    )
  }
}
