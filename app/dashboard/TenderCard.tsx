"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import TenderThread, { type HistoryEntry, type CommentEntry } from "./TenderThread"
import {
  AlertTriangle,
  FileX,
  Eye,
  Edit2,
  Trash2,
  CalendarDays,
  User
} from "lucide-react"

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
  creatorName?: string
}

export default function TenderCard({
  id, title, createdAt, statusLabel, statusClass, canEdit, canDelete,
  analysisId, threadHistory, threadComments, riskCount, nonComplyCount, creatorName,
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
    <li className="bg-white border border-slate-100 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300">
      
      {/* 카드 정보 및 태그 메타 데이터 */}
      <div className="flex-1 min-w-0 space-y-2 text-xs">
        <div className="flex items-center gap-3 flex-wrap">
          {/* 상태 뱃지 */}
          {statusLabel && (
            <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold border uppercase tracking-wider ${statusClass}`}>
              {statusLabel}
            </span>
          )}
          
          {/* 리스크 빨간 뱃지 */}
          {(riskCount ?? 0) > 0 && (
            <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-rose-50 text-rose-700 border border-rose-100 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-rose-500" /> RISK {riskCount}
            </span>
          )}

          {/* 불부합 주황 뱃지 */}
          {(nonComplyCount ?? 0) > 0 && (
            <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-amber-50 text-amber-700 border border-amber-100 flex items-center gap-1">
              <FileX className="w-3 h-3 text-amber-500" /> 불부합 {nonComplyCount}
            </span>
          )}
        </div>

        {/* 입찰 프로젝트 제목 */}
        <p className="text-sm font-extrabold text-slate-900 leading-snug truncate" title={title}>
          {title}
        </p>

        {/* 생성 일자 + 등록자 */}
        <div className="flex items-center gap-3 flex-wrap text-[10px] text-slate-400 font-mono">
          <span className="flex items-center gap-1">
            <CalendarDays className="w-3.5 h-3.5" /> 등록일: {createdAt}
          </span>
          {creatorName && (
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" /> {creatorName}
            </span>
          )}
        </div>
      </div>

      {/* 조작 도구 및 댓글 스레드 토글 */}
      <div className="flex items-center gap-2 w-full md:w-auto shrink-0 justify-end pt-3 md:pt-0 border-t md:border-t-0 border-slate-50">
        <Link href={`/tender/${id}`}>
          <Button variant="ghost" size="sm" className="text-xs font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-50 px-2.5 py-1.5 rounded-lg flex items-center gap-1 border">
            <Eye className="w-3.5 h-3.5" /> 조회
          </Button>
        </Link>
        
        {canEdit && (
          <Link href={`/tender/${id}`}>
            <Button variant="ghost" size="sm" className="text-xs font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-50 px-2.5 py-1.5 rounded-lg flex items-center gap-1 border">
              <Edit2 className="w-3.5 h-3.5" /> 편집
            </Button>
          </Link>
        )}

        {canDelete && (
          <Button
            size="sm"
            variant="ghost"
            className="text-xs font-bold text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg flex items-center gap-1 border border-rose-100/50"
            onClick={handleDelete}
            disabled={deleting}
          >
            <Trash2 className="w-3.5 h-3.5" /> 삭제
          </Button>
        )}

        {analysisId && (
          <div className="border-l pl-2 ml-1">
            <TenderThread
              analysisId={analysisId}
              history={threadHistory}
              comments={threadComments}
            />
          </div>
        )}
      </div>

    </li>
  )
}
