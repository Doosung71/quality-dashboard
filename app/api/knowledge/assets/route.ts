import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import type { KnowledgeAsset, KnowledgeCategory, KnowledgeSubCategory } from "@/types/knowledge"

type DBRow = {
  source_path: string
  source_type: string
  title: string | null
  summary: string
  metadata: { tags?: string[] }
}

// 국제규격: IEC, ISO, IEEE, CIGRE (국제 표준화 기구)
const INTERNATIONAL_ORG = /\b(IEC|ISO|IEEE|CIGRE)\b/
// 국가규격: 각국 국가 표준 (DIN=독일, BS=영국, JIS=일본, ANSI=미국, KS=한국, GB=중국)
const NATIONAL_ORG = /\b(DIN|BS EN|BSEN|JIS|ANSI|KS|KGS|GB)\b/
// 단체규격: 산업협회·단체 표준 (ASTM, NFPA, API, SAE, UL, CSA)
const ASSOCIATION_ORG = /\b(ASTM|NFPA|API|SAE|UL|CSA)\b/
// 고객규격: 발주처 사양
const CUSTOMER_ORG = /KEPCO|한전|고객규격|CUSTOMER/

function classifyDocument(
  sourceType: string,
  title: string,
  sourcePath: string,
): { category: KnowledgeCategory; subCategory: KnowledgeSubCategory } {
  const upper = (title + " " + sourcePath).toUpperCase()

  if (sourceType === "standards" || sourceType === "pdf_inbox") {
    if (/TENDER|입찰/.test(upper)) return { category: "Standards", subCategory: "Tender" }
    if (CUSTOMER_ORG.test(upper)) return { category: "Standards", subCategory: "고객규격" }
    if (NATIONAL_ORG.test(upper)) return { category: "Standards", subCategory: "국가규격" }
    if (ASSOCIATION_ORG.test(upper)) return { category: "Standards", subCategory: "단체규격" }
    if (INTERNATIONAL_ORG.test(upper)) return { category: "Standards", subCategory: "국제규격" }
    // 판별 불가 → 국제규격으로 fallback
    return { category: "Standards", subCategory: "국제규격" }
  }

  if (sourceType === "obsidian") {
    if (/04_THINKING/i.test(sourcePath)) return { category: "Others", subCategory: "가이드라인" }
    if (/03_VIBECODING/i.test(sourcePath)) return { category: "TechnicalDocs", subCategory: "논문" }
    return { category: "Others", subCategory: "기타" }
  }

  return { category: "Others", subCategory: "기타" }
}

function detectPublisher(title: string, sourcePath: string): string {
  const t = (title + " " + sourcePath).toUpperCase()
  if (/\bIEC\b/.test(t)) return "IEC"
  if (/\bISO\b/.test(t)) return "ISO"
  if (/\bIEEE\b/.test(t)) return "IEEE"
  if (/\bCIGRE\b/.test(t)) return "CIGRE"
  if (/\bASTM\b/.test(t)) return "ASTM"
  if (/\bBS EN\b|\bBSEN\b/.test(t)) return "BSI"
  if (/\bDIN\b/.test(t)) return "DIN"
  if (/\bUL\b/.test(t)) return "UL"
  if (/\bKS\b/.test(t)) return "국가기술표준원"
  if (/\bKGS\b/.test(t)) return "한국가스안전공사"
  return "내부"
}

function detectYear(title: string, sourcePath: string): string {
  // 실제 연도 패턴: 하이픈·공백·언더스코어 뒤 또는 문장 끝에 있는 201x~202x
  // 규격 번호(IEC 62067, DIN 2078 등) 안의 숫자와 구분하기 위해 앞에 \D 경계 요구
  const match = (title + " " + sourcePath).match(/(?<![0-9])20(1\d|2[0-9])(?![0-9])/)
  return match ? match[0] : "-"
}

function detectCode(title: string): string | undefined {
  const match = title.match(
    /(?:IEC|ISO|IEEE|KS|ASTM|BS|DIN|UL|CIGRE)\s*[\w-]+(?:\s+[\w.-]+)?/i,
  )
  return match ? match[0] : undefined
}

function pathToTitle(sourcePath: string): string {
  const parts = sourcePath.replace(/\\/g, "/").split("/")
  const fileName = parts[parts.length - 1]
  return fileName.replace(/\.(md|pdf)$/i, "").replace(/[-_]/g, " ")
}

export async function GET() {
  if (!process.env.DATABASE_URL_UNPOOLED) {
    return NextResponse.json({ assets: [], error: "DB 환경변수 미설정" }, { status: 500 })
  }

  try {
    const sql = neon(process.env.DATABASE_URL_UNPOOLED)

    const rows = (await sql`
      SELECT DISTINCT ON (source_path)
        source_path, source_type, title,
        LEFT(content, 200) AS summary,
        metadata
      FROM knowledge_chunks
      WHERE source_type IN ('obsidian', 'standards', 'pdf_inbox')
      ORDER BY source_path, created_at ASC
    `) as unknown as DBRow[]

    const assets: KnowledgeAsset[] = rows.map((r, i) => {
      const title = r.title || pathToTitle(r.source_path)
      const { category, subCategory } = classifyDocument(r.source_type, title, r.source_path)
      const keywords = Array.isArray(r.metadata?.tags) ? r.metadata.tags.slice(0, 5) : []

      return {
        id: `KB-DYN-${String(i + 1).padStart(4, "0")}`,
        category,
        subCategory,
        title,
        code: detectCode(title),
        publisher: detectPublisher(title, r.source_path),
        publishYear: detectYear(title, r.source_path),
        summary: r.summary?.slice(0, 150) || "",
        keywords,
      }
    })

    return NextResponse.json({ assets })
  } catch (err) {
    return NextResponse.json({ assets: [], error: String(err) }, { status: 500 })
  }
}
