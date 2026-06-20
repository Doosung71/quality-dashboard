// pdf-parse v2는 클래스 기반 API를 사용한다: new PDFParse({ data: buffer }).getText()
// require()를 함수 내부에서 지연 호출하면 DOMMatrix 폴리필 설치 순서를 보장한다.
// (pdfjs-dist는 require 시점에 DOMMatrix를 참조한다 — ARM64 Windows 대응)

const MAX_CHARS = 300_000

export interface PdfExtractResult {
  text: string
  truncated: boolean
  originalLength: number
}

// TDS 페이지 범위 — 비우면(undefined) 전체 추출
export interface PageRange {
  startPage?: number
  endPage?: number
}

// 잘못된 페이지 범위 입력 — 호출부에서 400(fail-closed)로 매핑
export class PdfRangeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "PdfRangeError"
  }
}

// 페이지 범위 입력 검증 (PDF를 읽기 전, 순수 입력 단계).
// 둘 다 비면 null(전체), 하나만 채우거나 시작>끝이면 PdfRangeError를 던진다.
export function validatePageRange(range?: PageRange): { startPage: number; endPage: number } | null {
  if (!range) return null
  const { startPage, endPage } = range
  const hasStart = startPage !== undefined && startPage !== null
  const hasEnd = endPage !== undefined && endPage !== null
  if (!hasStart && !hasEnd) return null
  if (hasStart !== hasEnd) {
    throw new PdfRangeError("TDS 페이지는 시작·끝을 모두 입력하거나 모두 비워주세요.")
  }
  if (!Number.isInteger(startPage) || !Number.isInteger(endPage) || (startPage as number) < 1 || (endPage as number) < 1) {
    throw new PdfRangeError("TDS 페이지 번호는 1 이상의 정수여야 합니다.")
  }
  if ((startPage as number) > (endPage as number)) {
    throw new PdfRangeError("TDS 시작 페이지가 끝 페이지보다 큽니다.")
  }
  return { startPage: startPage as number, endPage: endPage as number }
}

export async function extractTextFromPdf(buffer: Buffer, range?: PageRange): Promise<PdfExtractResult> {
  // 입력 검증 먼저 (잘못된 범위면 PdfRangeError → 호출부 400)
  const validated = validatePageRange(range)

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
    // first/last 둘 다 주면 inclusive 범위(first..last). 없으면 전체.
    const getTextParams = validated ? { first: validated.startPage, last: validated.endPage } : undefined
    const { text: raw, total } = await parser.getText(getTextParams) as { text: string; total: number }
    // 시작 페이지가 문서 총 페이지를 초과하면 추출 결과가 비므로 fail-closed
    if (validated && typeof total === "number" && validated.startPage > total) {
      throw new PdfRangeError(`TDS 시작 페이지(${validated.startPage})가 문서 총 페이지(${total})를 초과합니다.`)
    }
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
