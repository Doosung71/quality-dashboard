import { describe, it, expect } from 'vitest'
import { validatePageRange, PdfRangeError } from './pdf'

describe('validatePageRange — TDS 페이지 범위 검증 (fail-closed)', () => {
  it('범위 미지정(undefined)이면 null = 전체 추출', () => {
    expect(validatePageRange()).toBeNull()
    expect(validatePageRange(undefined)).toBeNull()
  })

  it('시작·끝 모두 비면 null = 전체 추출', () => {
    expect(validatePageRange({})).toBeNull()
    expect(validatePageRange({ startPage: undefined, endPage: undefined })).toBeNull()
  })

  it('정상 범위는 정규화된 {startPage, endPage} 반환', () => {
    expect(validatePageRange({ startPage: 3, endPage: 6 })).toEqual({ startPage: 3, endPage: 6 })
    expect(validatePageRange({ startPage: 1, endPage: 1 })).toEqual({ startPage: 1, endPage: 1 })
  })

  it('하나만 입력하면 PdfRangeError (시작·끝 모두 필요)', () => {
    expect(() => validatePageRange({ startPage: 3 })).toThrow(PdfRangeError)
    expect(() => validatePageRange({ endPage: 6 })).toThrow(PdfRangeError)
  })

  it('시작 > 끝이면 PdfRangeError', () => {
    expect(() => validatePageRange({ startPage: 50, endPage: 10 })).toThrow(PdfRangeError)
  })

  it('0 이하·음수는 PdfRangeError', () => {
    expect(() => validatePageRange({ startPage: 0, endPage: 5 })).toThrow(PdfRangeError)
    expect(() => validatePageRange({ startPage: 1, endPage: 0 })).toThrow(PdfRangeError)
    expect(() => validatePageRange({ startPage: -2, endPage: 5 })).toThrow(PdfRangeError)
  })

  it('정수가 아니면 PdfRangeError', () => {
    expect(() => validatePageRange({ startPage: 1.5, endPage: 5 })).toThrow(PdfRangeError)
    expect(() => validatePageRange({ startPage: 3, endPage: 6.7 })).toThrow(PdfRangeError)
  })
})
