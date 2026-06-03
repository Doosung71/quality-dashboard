/**
 * Naver Search API 공용 유틸
 * 환경변수: NAVER_CLIENT_ID, NAVER_CLIENT_SECRET
 * 미설정 시 빈 결과 반환 (폴백, 에러 없음)
 */

const NAVER_CLIENT_ID     = () => process.env.NAVER_CLIENT_ID     ?? ""
const NAVER_CLIENT_SECRET = () => process.env.NAVER_CLIENT_SECRET ?? ""
const TIMEOUT_MS = 7000

export interface NaverSearchResult {
  title:   string
  snippet: string
  url:     string
}

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]*>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g,  "&")
    .replace(/&lt;/g,   "<")
    .replace(/&gt;/g,   ">")
    .replace(/&#\d+;/g, "")
    .trim()
}

/** 구조화된 결과 배열 반환 (intelligence-view 등 UI 표시용) */
export async function naverSearchResults(
  query: string,
  maxItems = 8
): Promise<NaverSearchResult[]> {
  const id  = NAVER_CLIENT_ID()
  const sec = NAVER_CLIENT_SECRET()
  if (!id || !sec) return []

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const headers = {
      "X-Naver-Client-Id":     id,
      "X-Naver-Client-Secret": sec,
    }
    const half = Math.ceil(maxItems / 2)

    const [newsRes, webRes] = await Promise.all([
      fetch(
        `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query)}&display=${half}&sort=date`,
        { headers, signal: controller.signal }
      ),
      fetch(
        `https://openapi.naver.com/v1/search/webkr.json?query=${encodeURIComponent(query)}&display=${half}`,
        { headers, signal: controller.signal }
      ),
    ])

    const news: NaverSearchResult[] = newsRes.ok
      ? ((await newsRes.json()) as { items: { title: string; description: string; link: string; pubDate?: string }[] })
          .items.map(i => ({
            title:   `[뉴스] ${stripHtml(i.title)}`,
            snippet: `${stripHtml(i.description)}${i.pubDate ? ` (${i.pubDate.slice(0, 16)})` : ""}`,
            url:     i.link,
          }))
      : []

    const web: NaverSearchResult[] = webRes.ok
      ? ((await webRes.json()) as { items: { title: string; description: string; link: string }[] })
          .items.map(i => ({
            title:   stripHtml(i.title),
            snippet: stripHtml(i.description),
            url:     i.link,
          }))
      : []

    return [...news, ...web].slice(0, maxItems)
  } catch {
    return []
  } finally {
    clearTimeout(timer)
  }
}

/** AI 프롬프트 컨텍스트 주입용 plain-text 반환 (tender analyze 등) */
export async function naverSearchText(
  query: string,
  maxItems = 5
): Promise<string> {
  const results = await naverSearchResults(query, maxItems)
  if (results.length === 0) return ""
  return results
    .map((r, i) => `[웹${i + 1}] ${r.title}: ${r.snippet}`)
    .join("\n")
}
