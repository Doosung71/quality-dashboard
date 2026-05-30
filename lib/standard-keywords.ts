// 표준 ID → 매칭 키워드 (한국어+영어, 대소문자 무관 부분 일치)
const STANDARD_KEYWORDS: Record<string, string[]> = {
  "IEC 60840": [
    "60840", "XLPE", "절연 두께", "insulation thickness", "BIL", "뇌임펄스",
    "partial discharge", "부분방전", "tan delta", "유전정접", "압출 절연",
  ],
  "IEC 62067": [
    "62067", "XLPE", "절연 두께", "insulation thickness", "BIL", "뇌임펄스",
    "partial discharge", "부분방전", "tan delta", "유전정접", "압출 절연",
  ],
  "IEC 60287": [
    "60287", "허용전류", "ampacity", "current rating", "매설 깊이",
    "토양 열저항", "soil thermal resistivity", "도체 온도", "conductor temperature",
  ],
  "IEC 60287-1-1": ["60287-1-1", "허용전류 계산", "current rating equation", "도체 손실"],
  "IEC 60287-2-1": ["60287-2-1", "열저항 계산", "thermal resistance calculation"],
  "IEC 60287-3-2": ["60287-3-2", "경제적 단면적", "economic optimization"],
  "IEC 60228": [
    "60228", "도체 저항", "conductor resistance", "단면적", "cross-section",
    "소선", "stranded", "연동선", "구리 도체",
  ],
  "IEC 60332": [
    "60332", "난연", "flame retardant", "연소 시험", "fire performance", "fire propagation",
  ],
  "IEC 60502": ["60502", "압출 절연 전력케이블", "extruded insulation power cable"],
  "IEC 60502-1": ["60502-1"],
  "IEC 60502-2": ["60502-2"],
  "IEC 63026": ["63026", "해저 케이블", "submarine cable", "submarine power cable"],
  "IEEE 404": [
    "IEEE 404", "접속함", "joint", "직수접속", "직선접속", "절연통",
    "extruded joint", "laminated joint",
  ],
  "IEEE 48": [
    "IEEE 48", "종단", "termination", "기중종단", "EB-A", "유중종단", "EB-G",
  ],
  "CIGRE TB 490": [
    "TB 490", "CIGRE 490", "해저 케이블 전기 시험", "long AC submarine",
  ],
  "CIGRE TB 623": [
    "TB 623", "CIGRE 623", "기계 시험", "mechanical test", "coiling", "권취",
    "tensile bending", "인장 굴곡", "외수압", "external water pressure",
  ],
  "CIGRE TB 883": [
    "TB 883", "CIGRE 883", "설치 지침", "installation guideline", "포설 가이드",
  ],
  "KS C IEC 60840": ["KS C IEC 60840", "KS 60840"],
  "KS C IEC 62067": ["KS C IEC 62067", "KS 62067"],
}

export function matchStandardIds(content: string): string[] {
  const lower = content.toLowerCase()
  return Object.entries(STANDARD_KEYWORDS)
    .filter(([, keywords]) => keywords.some((kw) => lower.includes(kw.toLowerCase())))
    .map(([id]) => id)
}
