// 출장검사·수입검사 수량 정합성 검증 (서버·클라이언트 공통 규칙)
// 규칙: 납품 ≥ 샘플 ≥ 불량, 모두 정수, 납품>0·샘플>0·불량≥0
// 반환: 위반 시 에러 메시지(한국어), 정상이면 null
export function validateInspectionQuantities(
  quantity: unknown,
  sampleSize: unknown,
  defectCount: unknown,
): string | null {
  if (!Number.isInteger(quantity) || (quantity as number) <= 0) {
    return "납품 수량은 1 이상의 정수여야 합니다."
  }
  const qty = quantity as number

  let sampleCap = qty
  if (sampleSize != null) {
    if (!Number.isInteger(sampleSize) || (sampleSize as number) <= 0) {
      return "샘플 검사 수량은 1 이상의 정수여야 합니다."
    }
    const sample = sampleSize as number
    if (sample > qty) {
      return "샘플 검사 수량은 납품 수량을 초과할 수 없습니다."
    }
    sampleCap = sample
  }

  if (defectCount != null) {
    if (!Number.isInteger(defectCount) || (defectCount as number) < 0) {
      return "불량 수량은 0 이상의 정수여야 합니다."
    }
    if ((defectCount as number) > sampleCap) {
      return "불량 수량은 샘플 검사 수량을 초과할 수 없습니다."
    }
  }

  return null
}
