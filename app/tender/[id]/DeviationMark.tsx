"use client"

import { useState } from "react"

type DeviationType = "DEVIATION" | "CLARIFICATION" | "ASSUMPTION"

const LABELS: Record<DeviationType, string> = {
  DEVIATION: "Deviation",
  CLARIFICATION: "Clarification",
  ASSUMPTION: "Assumption",
}

const ACTIVE_STYLE: Record<DeviationType, string> = {
  DEVIATION: "bg-red-100 text-red-700 border-transparent font-medium",
  CLARIFICATION: "bg-blue-100 text-blue-700 border-transparent font-medium",
  ASSUMPTION: "bg-purple-100 text-purple-700 border-transparent font-medium",
}

const BADGE_STYLE: Record<DeviationType, string> = {
  DEVIATION: "bg-red-100 text-red-700",
  CLARIFICATION: "bg-blue-100 text-blue-700",
  ASSUMPTION: "bg-purple-100 text-purple-700",
}

type ComplianceStatus = "COMPLY" | "NON_COMPLY" | "TBD"

const COMPLY_HINT: Record<ComplianceStatus, { text: string; style: string }> = {
  COMPLY: {
    text: "부합 항목은 판단 불필요 (필요 시 선택 가능)",
    style: "text-zinc-400",
  },
  NON_COMPLY: {
    text: "불부합: Deviation 선택 및 사유 기재 권장",
    style: "text-red-500",
  },
  TBD: {
    text: "검토중: Clarification(발주처 확인) 또는 Assumption(가정 설정) 선택",
    style: "text-amber-600",
  },
}

type Props = {
  requirementId: string
  initialType: DeviationType | null
  initialText: string | null
  canEdit: boolean
  complyStatus?: ComplianceStatus | null
}

export default function DeviationMark({ requirementId, initialType, initialText, canEdit, complyStatus }: Props) {
  const [deviationType, setDeviationType] = useState<DeviationType | null>(initialType)
  const [deviationText, setDeviationText] = useState(initialText ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function patch(payload: Record<string, unknown>): Promise<boolean> {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/requirements/${requirementId}/deviation`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError((data as { error?: string }).error ?? "저장 실패")
        return false
      }
      return true
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(value: DeviationType) {
    const next = deviationType === value ? null : value
    const ok = await patch({ deviationType: next, deviationText: next ? deviationText || null : null })
    if (ok) {
      setDeviationType(next)
      if (next === null) setDeviationText("")
    }
  }

  async function handleTextBlur() {
    if (!deviationType) return
    await patch({ deviationType, deviationText: deviationText || null })
  }

  if (!canEdit) {
    if (!deviationType) return null
    return (
      <span className={`text-xs px-1.5 py-0.5 rounded ${BADGE_STYLE[deviationType]}`}>
        {LABELS[deviationType]}
        {deviationText && <span className="ml-1 opacity-75">— {deviationText}</span>}
      </span>
    )
  }

  const isDisabled = complyStatus === "COMPLY"
  const hint = complyStatus ? COMPLY_HINT[complyStatus] : null

  return (
    <div className="mt-1 space-y-1">
      {hint && (
        <p className={`text-[10px] ${hint.style}`}>{hint.text}</p>
      )}
      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-xs text-zinc-400 mr-0.5">판단:</span>
        {(["DEVIATION", "CLARIFICATION", "ASSUMPTION"] as DeviationType[]).map((v) => (
          <button
            key={v}
            type="button"
            disabled={saving || isDisabled}
            onClick={() => handleToggle(v)}
            className={`text-xs px-2 py-0.5 rounded border transition-colors ${
              isDisabled
                ? "bg-zinc-50 text-zinc-300 border-zinc-100 cursor-not-allowed"
                : deviationType === v
                ? ACTIVE_STYLE[v]
                : "bg-white text-zinc-400 border-zinc-200 hover:border-zinc-400 hover:text-zinc-600"
            }`}
          >
            {LABELS[v]}
          </button>
        ))}
      </div>
      {deviationType && (
        <input
          type="text"
          placeholder="메모 (선택)"
          value={deviationText}
          onChange={(e) => setDeviationText(e.target.value)}
          onBlur={handleTextBlur}
          className="text-xs border rounded px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-zinc-400"
          disabled={saving}
        />
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
