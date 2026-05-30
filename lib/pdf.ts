// pdf-parse v2는 클래스 기반 API를 사용한다: new PDFParse({ data: buffer }).getText()
// require()를 함수 내부에서 지연 호출하면 DOMMatrix 폴리필 설치 순서를 보장한다.
// (pdfjs-dist는 require 시점에 DOMMatrix를 참조한다 — ARM64 Windows 대응)

const MAX_CHARS = 300_000

export interface PdfExtractResult {
  text: string
  truncated: boolean
  originalLength: number
}

export async function extractTextFromPdf(buffer: Buffer): Promise<PdfExtractResult> {
  if (typeof globalThis.DOMMatrix === "undefined") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any).DOMMatrix = class DOMMatrix {
      a = 1; b = 0; c = 0; d = 1; e = 0; f = 0
      is2D = true; isIdentity = true
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      static fromMatrix() { return new (globalThis as any).DOMMatrix() }
      multiply() { return this }
      translate() { return this }
      scale() { return this }
      rotate() { return this }
      inverse() { return this }
      transformPoint(p: { x?: number; y?: number } = {}) {
        return { x: p.x ?? 0, y: p.y ?? 0, z: 0, w: 1 }
      }
      toFloat32Array() { return new Float32Array(16) }
      toFloat64Array() { return new Float64Array(16) }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
  const { PDFParse } = require("pdf-parse") as any
  const parser = new PDFParse({ data: buffer })
  try {
    const { text: raw } = await parser.getText() as { text: string }
    const full = raw.trim()
    const truncated = full.length > MAX_CHARS
    return {
      text: truncated ? full.slice(0, MAX_CHARS) : full,
      truncated,
      originalLength: full.length,
    }
  } finally {
    await parser.destroy()
  }
}
