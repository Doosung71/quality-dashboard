// Q1 Tender 생애주기 연결 키 (project_key) 공용 유틸 — 클라이언트·서버 양쪽에서 사용.
// 입찰·NCR·클레임·교훈을 하나의 프로젝트로 묶는 kebab-case 식별자.

// kebab-case: 소문자 영숫자 토큰을 하이픈으로 연결. 예) qat-gtc-3001-230kv
export const PROJECT_KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export const PROJECT_KEY_MAX_LENGTH = 64

// 서버·클라 공통 검증. 빈 값/null은 "키 없음"으로 fail-open 처리하므로 여기서는 false.
export function isValidProjectKey(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= PROJECT_KEY_MAX_LENGTH &&
    PROJECT_KEY_PATTERN.test(value)
  )
}

// 입력 보조: 사람이 친 문자열을 kebab-case 후보로 정규화 (클라 입력 도우미).
// 소문자화 → 허용외 문자를 하이픈으로 → 연속/양끝 하이픈 정리 → 길이 컷.
export function normalizeProjectKey(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, PROJECT_KEY_MAX_LENGTH)
}

// 저장 직전 서버 정제: 빈 문자열·공백 → null(키 없음), 유효하면 그대로, 무효면 throw 유도용 null 구분.
// 반환: { value: string | null, invalid: boolean }
//  - invalid=true → 사용자가 값을 넣었으나 형식이 틀림 (라우트에서 400)
//  - invalid=false, value=null → 빈 입력 (fail-open, 키 없이 저장)
export function parseProjectKeyInput(raw: unknown): { value: string | null; invalid: boolean } {
  if (raw == null) return { value: null, invalid: false }
  if (typeof raw !== "string") return { value: null, invalid: true }
  const trimmed = raw.trim()
  if (trimmed.length === 0) return { value: null, invalid: false }
  if (!isValidProjectKey(trimmed)) return { value: null, invalid: true }
  return { value: trimmed, invalid: false }
}
