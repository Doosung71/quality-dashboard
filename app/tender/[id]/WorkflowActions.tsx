"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

type Props = {
  analysisId: string
  role: string
  status: string
  isSubmitted: boolean
}

export default function WorkflowActions({ analysisId, role, status, isSubmitted }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [submitMessage, setSubmitMessage] = useState("")
  const [showApproveForm, setShowApproveForm] = useState(false)
  const [approveComment, setApproveComment] = useState("")
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [showFinalApproveForm, setShowFinalApproveForm] = useState(false)
  const [finalApproveComment, setFinalApproveComment] = useState("")
  const [showFinalRejectForm, setShowFinalRejectForm] = useState(false)
  const [finalRejectReason, setFinalRejectReason] = useState("")

  async function callApi(endpoint: string, body?: object) {
    setLoading(true)
    try {
      const res = await fetch(`/api/analysis/${analysisId}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      })
      if (!res.ok) {
        const data = res.headers.get("content-type")?.includes("application/json")
          ? await res.json()
          : {}
        alert((data as { error?: string }).error ?? "오류가 발생했습니다.")
        return
      }
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  // 실무자/관리자: DRAFT + 미제출 → 메모 + 제출 버튼
  if (["PRACTITIONER", "ADMIN"].includes(role) && status === "DRAFT" && !isSubmitted) {
    return (
      <div className="bg-white border rounded-lg px-4 py-3 space-y-3">
        <p className="text-sm font-medium text-zinc-700">팀장에게 제출</p>
        <textarea
          className="w-full border rounded p-2 text-sm resize-none"
          placeholder="검토 요청 메모를 입력하세요 (선택)"
          rows={3}
          value={submitMessage}
          onChange={(e) => setSubmitMessage(e.target.value)}
        />
        <Button
          onClick={() => callApi("submit", submitMessage.trim() ? { message: submitMessage } : undefined)}
          disabled={loading}
        >
          {loading ? "처리 중..." : "팀장에게 제출"}
        </Button>
      </div>
    )
  }

  // 팀장/관리자: DRAFT + 제출됨 → 승인/반려
  if (["TEAM_LEAD", "ADMIN"].includes(role) && status === "DRAFT" && isSubmitted) {
    if (showRejectForm) {
      return (
        <div className="bg-white border rounded-lg px-4 py-3 space-y-2">
          <p className="text-sm font-medium text-zinc-700">반려 사유</p>
          <textarea
            className="w-full border rounded p-2 text-sm resize-none"
            placeholder="반려 사유를 입력하세요 (필수)"
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              variant="destructive"
              size="sm"
              disabled={loading || !rejectReason.trim()}
              onClick={() => callApi("review-reject", { reason: rejectReason })}
            >
              반려 확정
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setShowRejectForm(false); setRejectReason("") }}
            >
              취소
            </Button>
          </div>
        </div>
      )
    }

    if (showApproveForm) {
      return (
        <div className="bg-white border rounded-lg px-4 py-3 space-y-2">
          <p className="text-sm font-medium text-zinc-700">승인 의견 <span className="text-zinc-400 font-normal">(선택)</span></p>
          <textarea
            className="w-full border rounded p-2 text-sm resize-none"
            placeholder="승인 의견을 입력하세요 (생략 가능)"
            rows={3}
            value={approveComment}
            onChange={(e) => setApproveComment(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={loading}
              onClick={() => callApi("review-approve", approveComment.trim() ? { reason: approveComment } : undefined)}
            >
              {loading ? "처리 중..." : "승인 확정"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setShowApproveForm(false); setApproveComment("") }}
            >
              취소
            </Button>
          </div>
        </div>
      )
    }

    return (
      <div className="bg-white border rounded-lg px-4 py-3 space-y-3">
        <p className="text-sm font-medium text-zinc-700">팀장 검토</p>
        <div className="flex gap-2">
          <Button onClick={() => setShowApproveForm(true)} disabled={loading}>승인</Button>
          <Button variant="outline" onClick={() => setShowRejectForm(true)} disabled={loading}>반려</Button>
        </div>
      </div>
    )
  }

  // 부문장/관리자: REVIEWED → 최종 승인/반려
  if (["DIRECTOR", "ADMIN"].includes(role) && status === "REVIEWED") {
    if (showFinalRejectForm) {
      return (
        <div className="bg-white border rounded-lg px-4 py-3 space-y-2">
          <p className="text-sm font-medium text-zinc-700">반려 사유</p>
          <textarea
            className="w-full border rounded p-2 text-sm resize-none"
            placeholder="반려 사유를 입력하세요 (필수)"
            rows={3}
            value={finalRejectReason}
            onChange={(e) => setFinalRejectReason(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              variant="destructive"
              size="sm"
              disabled={loading || !finalRejectReason.trim()}
              onClick={() => callApi("final-reject", { reason: finalRejectReason })}
            >
              반려 확정
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setShowFinalRejectForm(false); setFinalRejectReason("") }}
            >
              취소
            </Button>
          </div>
        </div>
      )
    }

    if (showFinalApproveForm) {
      return (
        <div className="bg-white border rounded-lg px-4 py-3 space-y-2">
          <p className="text-sm font-medium text-zinc-700">최종 승인 의견 <span className="text-zinc-400 font-normal">(선택)</span></p>
          <textarea
            className="w-full border rounded p-2 text-sm resize-none"
            placeholder="승인 의견을 입력하세요 (생략 가능)"
            rows={3}
            value={finalApproveComment}
            onChange={(e) => setFinalApproveComment(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={loading}
              onClick={() => callApi("final-approve", finalApproveComment.trim() ? { reason: finalApproveComment } : undefined)}
            >
              {loading ? "처리 중..." : "최종 승인 확정"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setShowFinalApproveForm(false); setFinalApproveComment("") }}
            >
              취소
            </Button>
          </div>
        </div>
      )
    }

    return (
      <div className="bg-white border rounded-lg px-4 py-3 space-y-3">
        <p className="text-sm font-medium text-zinc-700">부문장 최종 검토</p>
        <div className="flex gap-2">
          <Button onClick={() => setShowFinalApproveForm(true)} disabled={loading}>최종 승인</Button>
          <Button variant="outline" onClick={() => setShowFinalRejectForm(true)} disabled={loading}>반려</Button>
        </div>
      </div>
    )
  }

  return null
}
