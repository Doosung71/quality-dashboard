"use client"

import { useState } from "react"

type ComplianceStatus = "COMPLY" | "NON_COMPLY" | "TBD"

const LABELS: Record<ComplianceStatus, string> = {
  COMPLY: "부합",
  NON_COMPLY: "불부합",
  TBD: "검토중",
}

const ACTIVE_STYLE: Record<ComplianceStatus, string> = {
  COMPLY: "bg-green-100 text-green-700 border-transparent font-medium",
  NON_COMPLY: "bg-red-100 text-red-600 border-transparent font-medium",
  TBD: "bg-amber-100 text-amber-700 border-transparent font-medium",
}

const BADGE_STYLE: Record<ComplianceStatus, string> = {
  COMPLY: "bg-green-100 text-green-700",
  NON_COMPLY: "bg-red-100 text-red-600",
  TBD: "bg-amber-100 text-amber-700",
}

type Props = {
  requirementId: string
  initialComply: ComplianceStatus | null
  initialRemark: string | null
  canEdit: boolean
}

export default function ComplyMark({ requirementId, initialComply, initialRemark, canEdit }: Props) {
  const [comply, setComply] = useState<ComplianceStatus | null>(initialComply)
  const [remark, setRemark] = useState(initialRemark ?? "")
  const [saving, setSaving] = useState(false)

  async function patch(payload: Record<string, unknown>) {
    setSaving(true)
    try {
      await fetch(`/api/requirements/${requirementId}/comply`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(value: ComplianceStatus) {
    const next = comply === value ? null : value
    await patch({ comply: next })
    setComply(next)
    if (next !== "NON_COMPLY") setRemark("")
  }

  async function handleRemarkBlur() {
    await patch({ remark: remark || null })
  }

  if (!canEdit) {
    if (!comply) return null
    return (
      <span className={`text-xs px-1.5 py-0.5 rounded ${BADGE_STYLE[comply]}`}>
        {LABELS[comply]}
      </span>
    )
  }

  return (
    <div className="mt-1.5 space-y-1.5">
      <div className="flex items-center gap-1">
        {(["COMPLY", "NON_COMPLY", "TBD"] as ComplianceStatus[]).map((v) => (
          <button
            key={v}
            type="button"
            disabled={saving}
            onClick={() => handleToggle(v)}
            className={`text-xs px-2 py-0.5 rounded border transition-colors ${
              comply === v
                ? ACTIVE_STYLE[v]
                : "bg-white text-zinc-400 border-zinc-200 hover:border-zinc-400 hover:text-zinc-600"
            }`}
          >
            {LABELS[v]}
          </button>
        ))}
      </div>
      {comply === "NON_COMPLY" && (
        <input
          type="text"
          placeholder="불부합 사유 (선택)"
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          onBlur={handleRemarkBlur}
          className="text-xs border rounded px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-zinc-400"
        />
      )}
    </div>
  )
}
