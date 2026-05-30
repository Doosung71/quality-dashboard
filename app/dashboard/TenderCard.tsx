"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import TenderThread, { type HistoryEntry, type CommentEntry } from "./TenderThread"

type Props = {
  id: string
  title: string
  createdAt: string
  statusLabel: string
  statusClass: string
  canEdit: boolean
  canDelete: boolean
  analysisId?: string
  threadHistory: HistoryEntry[]
  threadComments: CommentEntry[]
  riskCount?: number
  nonComplyCount?: number
}

export default function TenderCard({
  id, title, createdAt, statusLabel, statusClass, canEdit, canDelete,
  analysisId, threadHistory, threadComments, riskCount, nonComplyCount,
}: Props) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm(`"${title}" 입찰을 삭제하시겠습니까? 분석 결과도 함께 삭제됩니다.`)) return
    setDeleting(true)
    const res = await fetch(`/api/tenders/${id}`, { method: "DELETE" })
    setDeleting(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      alert((data as { error?: string }).error ?? "삭제 실패")
      return
    }
    router.refresh()
  }

  return (
    <li className="bg-white border rounded-lg px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{title}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-xs text-zinc-400">{createdAt}</span>
          {statusLabel && (
            <span className={`px-1.5 py-0.5 rounded text-xs ${statusClass}`}>
              {statusLabel}
            </span>
          )}
          {(riskCount ?? 0) > 0 && (
            <span className="px-1.5 py-0.5 rounded text-xs bg-red-100 text-red-600">
              RISK {riskCount}
            </span>
          )}
          {(nonComplyCount ?? 0) > 0 && (
            <span className="px-1.5 py-0.5 rounded text-xs bg-orange-100 text-orange-600">
              불부합 {nonComplyCount}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Link href={`/tender/${id}`}>
          <Button variant="ghost" size="sm" className="text-xs text-zinc-400 hover:text-zinc-700 px-2">
            조회
          </Button>
        </Link>
        {canEdit && (
          <Link href={`/tender/${id}`}>
            <Button variant="ghost" size="sm" className="text-xs text-zinc-400 hover:text-zinc-700 px-2">
              편집
            </Button>
          </Link>
        )}
        {canDelete && (
          <Button
            size="sm"
            variant="ghost"
            className="text-xs text-red-400 hover:text-red-600 px-2"
            onClick={handleDelete}
            disabled={deleting}
          >
            삭제
          </Button>
        )}
      </div>
      {analysisId && (
        <TenderThread
          analysisId={analysisId}
          history={threadHistory}
          comments={threadComments}
        />
      )}
    </li>
  )
}
