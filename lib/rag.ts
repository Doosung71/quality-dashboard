import type { KnowledgeChunk } from "@/lib/knowledge"

const DEFAULT_THRESHOLD = 0.45

export function parseRagThreshold(raw: string | undefined): number {
  const v = parseFloat(raw ?? String(DEFAULT_THRESHOLD))
  if (!Number.isFinite(v) || v < 0 || v > 1) {
    console.warn(`[RAG] RAG_THRESHOLD "${raw}" 유효하지 않음. 기본값 ${DEFAULT_THRESHOLD} 사용.`)
    return DEFAULT_THRESHOLD
  }
  return v
}

function escapeXmlAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

function escapeXmlContent(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

export function buildKnowledgeChunksXml(chunks: KnowledgeChunk[]): string {
  if (chunks.length === 0) return ""
  return chunks
    .map(
      (c, i) =>
        `<chunk index="${i + 1}" title="${escapeXmlAttr(c.title ?? c.source_path)}" similarity="${(c.similarity * 100).toFixed(0)}%">\n${escapeXmlContent(c.content.slice(0, 1000))}\n</chunk>`
    )
    .join("\n")
}
