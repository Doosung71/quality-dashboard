import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { canVerifyLesson } from "@/lib/permissions"
import { checkRateLimit } from "@/lib/rate-limit"
import {
  getOrDraftLesson,
  ingestVerifiedLesson,
  parseLessonSections,
  type LessonRefType,
} from "@/lib/ingest-qms"

const VALID_TYPES = ["ncr", "claim"] as const

function isValidType(t: unknown): t is LessonRefType {
  return typeof t === "string" && (VALID_TYPES as readonly string[]).includes(t)
}

// GET — 교훈 초안 조회/생성. 기존 확정본이 있으면 그대로, 없으면 LLM 구조화 초안.
export async function GET(req: NextRequest) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const rl = await checkRateLimit(req, session.user.id)
  if (rl) return rl

  const type = req.nextUrl.searchParams.get("type")
  const id = req.nextUrl.searchParams.get("id")
  if (!isValidType(type) || !id) {
    return NextResponse.json({ error: "type(ncr|claim)과 id가 필요합니다." }, { status: 400 })
  }

  try {
    const result = await getOrDraftLesson(type, id)
    if (!result) {
      return NextResponse.json({ error: "종결된 NCR/클레임만 교훈을 추출할 수 있습니다." }, { status: 400 })
    }
    return NextResponse.json(result)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "알 수 없는 오류"
    console.error(`[verified-lesson][GET] ${type}/${id}:`, msg)
    return NextResponse.json({ error: "교훈 초안 생성 중 오류가 발생했습니다." }, { status: 500 })
  }
}

// POST — 사람 확정 교훈 인제스트. fail-closed: 실패 시 500 → 패널이 에러 표시·재시도.
export async function POST(req: NextRequest) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const rl = await checkRateLimit(req, session.user.id)
  if (rl) return rl

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "올바른 JSON이 아닙니다." }, { status: 400 })
  }

  const b = body as Record<string, unknown>
  const type = b.type
  const id = typeof b.id === "string" ? b.id : ""
  const content = typeof b.content === "string" ? b.content.trim() : ""

  if (!isValidType(type) || !id) {
    return NextResponse.json({ error: "type(ncr|claim)과 id가 필요합니다." }, { status: 400 })
  }
  if (!content) {
    return NextResponse.json({ error: "교훈 내용(content)이 필요합니다." }, { status: 400 })
  }
  if (content.length > 5000) {
    return NextResponse.json({ error: "교훈 내용은 5000자 이하로 입력해 주세요." }, { status: 400 })
  }
  // VL-03: 최상위 신뢰 레일에 구조 깨진 교훈이 들어가지 않도록 필수 3섹션 서버 검증.
  if (!parseLessonSections(content)) {
    return NextResponse.json(
      { error: "교훈은 '## 근본원인', '## 시정·예방 조치', '## 입찰 검토 체크포인트' 세 섹션이 모두 채워져야 합니다." },
      { status: 400 },
    )
  }

  // VL-02 역할 가드 — 서버 권위. verified_lesson은 TEAM_LEAD 이상만 확정 가능.
  if (!canVerifyLesson(session.user.role)) {
    return NextResponse.json({ error: "교훈을 확정할 권한이 없습니다. (팀장 이상)" }, { status: 403 })
  }

  try {
    await ingestVerifiedLesson({
      type,
      id,
      content,
      verifiedBy: session.user.name ?? session.user.email ?? "확정자",
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "알 수 없는 오류"
    console.error(`[verified-lesson][POST] ${type}/${id}:`, msg)
    return NextResponse.json(
      { error: "교훈 확정 중 오류가 발생했습니다. 다시 시도해 주세요." },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true })
}
