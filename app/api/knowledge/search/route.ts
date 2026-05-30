import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { searchKnowledge, type KnowledgeChunk } from "@/lib/knowledge"

export interface WebSearchResult {
  title: string
  snippet: string
  url: string
}

const DDG_TIMEOUT_MS = 5000

// DuckDuckGo Lite HTML 파서를 활용한 실시간 외부 웹 검색 헬퍼 (API Key 없이 구동)
async function searchWebDuckDuckGo(query: string): Promise<WebSearchResult[]> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), DDG_TIMEOUT_MS)
    let res: Response
    try {
      res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        },
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timer)
    }
    if (!res.ok) throw new Error("DuckDuckGo HTML fetch failed")
    
    const html = await res.text()
    const results: WebSearchResult[] = []
    
    // HTML 정규식 파싱 기법
    const titleRegex = /<a class="result__title"[^>]*>([\s\S]*?)<\/a>/g
    const snippetRegex = /<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g
    const urlRegex = /<span class="result__url"[^>]*>([\s\S]*?)<\/span>/g
    
    const titles: string[] = []
    const snippets: string[] = []
    const urls: string[] = []
    
    let match: RegExpExecArray | null
    
    while ((match = titleRegex.exec(html)) !== null && titles.length < 5) {
      titles.push(match[1].replace(/<[^>]*>/g, "").trim())
    }
    while ((match = snippetRegex.exec(html)) !== null && snippets.length < 5) {
      snippets.push(match[1].replace(/<[^>]*>/g, "").trim())
    }
    while ((match = urlRegex.exec(html)) !== null && urls.length < 5) {
      urls.push(match[1].replace(/<[^>]*>/g, "").trim())
    }
    
    for (let i = 0; i < titles.length; i++) {
      if (titles[i] && snippets[i]) {
        results.push({
          title: titles[i],
          snippet: snippets[i],
          url: urls[i] ? `https://${urls[i]}` : "https://duckduckgo.com"
        })
      }
    }
    
    return results;
  } catch (err) {
    console.error("[DDG Web Search Error]", err)
    return [] // 실패 시 빈배열 폴백
  }
}

// 사내 지식 RAG 결과와 실시간 웹 검색 결과를 통합 분석하여 리포트를 생성하는 요약기 (Claude 3.5 Sonnet 활용 / OpenAI GPT-4o Fallback 지원)
async function generateSynthesizedReport(
  query: string, 
  chunks: KnowledgeChunk[], 
  webResults: WebSearchResult[]
): Promise<string> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const openaiKey = process.env.OPENAI_API_KEY

  const prompt = `
당신은 LS전선 QMS 2.0 시스템의 수석 AI 기술 품질분석원입니다.
사용자의 질의에 대해 사내 지식 베이스(RAG) 검색 결과와 외부 실시간 웹 검색 결과를 상호 대조 및 통합하여 종합 품질 검토 리포트를 마크다운 형식으로 정밀하게 작성해 주세요.

[질의어]
${query}

[사내 지식 베이스(RAG) 검색 결과]
${chunks.length === 0 ? "사내 지식 DB에 관련 조항이 없습니다." : chunks.map((c, i) => `[사내자료 ${i+1}] 규격: ${c.title ?? "미정"}, 내용: ${c.content}`).join("\n\n")}

[외부 실시간 웹 검색 결과]
${webResults.length === 0 ? "외부 웹 검색에 관련 결과가 없습니다." : webResults.map((w, i) => `[외부웹 ${i+1}] 제목: ${w.title}, 스니펫: ${w.snippet}, URL: ${w.url}`).join("\n\n")}

[작성 가이드라인]
1. **상호 대조 분석:** 사내 규격 표준(RAG)과 외부 웹의 최신 동향을 대조하여 규격이 상향되었거나 추가 검사 조건이 생겼는지 상세 기술해 주십시오.
2. **비교 요약 표:** 합격판정기준(PD, 내전압 등)이 있다면 명확하게 수치와 기준을 표 형태로 대조하여 정리해 주세요.
3. **품질 대응 Action Item:** 당사 초고압/해저 생산 또는 품질보증팀이 이행해야 할 기술적 조치 사항을 3줄 이내로 제안해 주십시오.
4. 마크다운 볼드체, 리스트, 표(Table)를 활용하여 모던하고 수려한 스타일로 작성하십시오.
`

  // 1차 시도: Claude 3.5 Sonnet 호출
  if (anthropicKey) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1500,
          messages: [{ role: "user", content: prompt }]
        })
      })
      
      if (res.ok) {
        const data = await res.json()
        return data.content[0].text
      } else {
        const err = await res.text()
        console.warn("[Claude API Warning - Falling back to OpenAI]", err)
      }
    } catch (err) {
      console.warn("[Claude Fetch Warning - Falling back to OpenAI]", err)
    }
  }

  // 2차 시도: OpenAI GPT-4o 호출 (Fallback)
  if (openaiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o",
          max_tokens: 1500,
          messages: [
            { role: "system", content: "당신은 LS전선 QMS 2.0 시스템의 수석 AI 기술 품질분석원입니다." },
            { role: "user", content: prompt }
          ]
        })
      })

      if (res.ok) {
        const data = await res.json()
        return data.choices[0].message.content
      } else {
        const err = await res.text()
        console.error("[OpenAI API Error]", err)
      }
    } catch (err) {
      console.error("[OpenAI Fetch Error]", err)
    }
  }

  // 둘 다 실패 시 에러 폴백 반환
  return "💡 AI 환경변수(Anthropic/OpenAI) 키가 올바르지 않거나 API 호출 제한에 도달하여 종합 리포트를 작성하지 못했습니다. RAG 검색 결과 및 외부 웹 검색 결과 목록을 수동으로 참조해 주십시오."
}

export async function POST(req: NextRequest) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "요청 본문이 올바른 JSON이 아닙니다." }, { status: 400 })
  }

  const bodyParsed = body as Record<string, unknown> | null | undefined
  const queryRaw = bodyParsed?.query
  if (typeof queryRaw !== "string" || !queryRaw.trim()) {
    return NextResponse.json({ error: "query 문자열이 필요합니다." }, { status: 400 })
  }

  const query: string = queryRaw.trim()
  const limit: number = typeof bodyParsed?.limit === "number" ? bodyParsed.limit : 5
  const filter = bodyParsed?.filter ?? undefined
  
  // 외부 웹 검색 포함 플래그
  const searchWeb: boolean = bodyParsed?.searchWeb === true

  try {
    // 1. 내부 RAG 지식 검색 수행
    let chunks: KnowledgeChunk[] = []
    try {
      chunks = await searchKnowledge(query, { limit, filter })
    } catch (e) {
      console.warn("[Internal RAG Search Failed, fallback to empty]", e)
    }

    // 2. 외부 웹 검색 동시 수행 (searchWeb 플래그가 활성화된 경우)
    let webResults: WebSearchResult[] = []
    if (searchWeb) {
      webResults = await searchWebDuckDuckGo(query)
    }

    // 3. 내부 RAG + 외부 Web 결과 통합 AI 분석 리포트 생성
    let synthesizedReport: string | undefined = undefined
    if (searchWeb && (chunks.length > 0 || webResults.length > 0)) {
      synthesizedReport = await generateSynthesizedReport(query, chunks, webResults)
    }

    return NextResponse.json({ 
      chunks, 
      webResults,
      synthesizedReport 
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[knowledge/search]", message)
    return NextResponse.json({ error: "지식 검색 중 오류가 발생했습니다." }, { status: 500 })
  }
}
