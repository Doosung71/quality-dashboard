"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ShieldCheck,
  AlertTriangle,
  MessageSquareWarning,
  ChevronDown,
  ChevronRight,
  Link2,
  History,
} from "lucide-react"
import { MarkdownContent } from "@/components/ui/markdown-content"
import type { ProjectHistory } from "@/lib/project-history"

// 고리④ surface — 같은 project_key의 과거 이력을 입찰 상세에 노출.
// 확정 교훈(verified_lesson)을 최상단에 강조, 종결 NCR·클레임은 접이식(Simplicity).
export default function ProjectHistoryPanel({ history }: { history: ProjectHistory }) {
  const { projectKey, lessons, ncrs, claims, total } = history

  // 확정 교훈은 기본 펼침(핵심 가치), 원본 NCR·클레임은 기본 접힘.
  const [ncrOpen, setNcrOpen] = useState(false)
  const [claimOpen, setClaimOpen] = useState(false)

  return (
    <section className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <h2 className="text-xs font-extrabold text-slate-800 tracking-wider uppercase flex items-center gap-1.5">
          <History className="w-4.5 h-4.5 text-emerald-500" />
          이 프로젝트의 과거 이력
        </h2>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded-md text-[10px] font-bold text-indigo-700 font-mono">
          <Link2 className="w-3 h-3" /> {projectKey}
        </span>
      </div>

      {total === 0 ? (
        <p className="text-xs text-slate-400 italic py-2">
          이 프로젝트 키의 종결된 NCR·클레임·확정 교훈이 아직 없습니다. 종결 산출물이 쌓이면 여기에 자동으로 표시됩니다.
        </p>
      ) : (
        <div className="space-y-4">
          {/* 확정 교훈 — 최상단 강조, 기본 펼침 */}
          {lessons.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200 uppercase tracking-wide flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> 확정 교훈 · 사람 검증
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">{lessons.length}건</span>
              </div>
              {lessons.map((l) => (
                <div
                  key={l.sourcePath}
                  className="border border-emerald-200 bg-emerald-50/40 rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-xs text-emerald-900 leading-snug min-w-0">{l.title}</h3>
                    {l.refNo && (
                      <span className="text-[9px] text-emerald-600 font-mono shrink-0">{l.refNo}</span>
                    )}
                  </div>
                  {l.checklist && (
                    <p className="text-[11px] text-emerald-800 bg-white/60 border border-emerald-100 rounded px-2 py-1.5 leading-relaxed">
                      <span className="font-bold">입찰 체크포인트:</span> {l.checklist}
                    </p>
                  )}
                  <MarkdownContent content={l.content} className="text-[11px]" />
                </div>
              ))}
            </div>
          )}

          {/* 종결 NCR — 접이식 */}
          {ncrs.length > 0 && (
            <div className="border border-slate-150 rounded-lg overflow-hidden">
              <button
                onClick={() => setNcrOpen((v) => !v)}
                className="w-full flex items-center justify-between px-3 py-2 bg-slate-50/60 hover:bg-slate-100 transition-colors"
              >
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                  종결 NCR {ncrs.length}건
                </span>
                {ncrOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
              </button>
              {ncrOpen && (
                <ul className="divide-y divide-slate-100">
                  {ncrs.map((n) => (
                    <li key={n.id}>
                      <Link
                        href={`/ncr/${n.id}`}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 transition-colors"
                      >
                        <span className="text-[9px] font-mono text-slate-400 shrink-0">{n.ncrNo}</span>
                        <span className="text-[11px] font-semibold text-slate-800 truncate min-w-0 flex-1">{n.title}</span>
                        <span className="text-[9px] px-1.5 py-0.5 bg-rose-50 border border-rose-100 rounded text-rose-600 font-bold shrink-0">{n.severity}</span>
                        <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 border rounded text-slate-500 font-bold shrink-0">{n.disposition}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* 종결 클레임 — 접이식 */}
          {claims.length > 0 && (
            <div className="border border-slate-150 rounded-lg overflow-hidden">
              <button
                onClick={() => setClaimOpen((v) => !v)}
                className="w-full flex items-center justify-between px-3 py-2 bg-slate-50/60 hover:bg-slate-100 transition-colors"
              >
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                  <MessageSquareWarning className="w-3.5 h-3.5 text-amber-500" />
                  종결 클레임 {claims.length}건
                </span>
                {claimOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
              </button>
              {claimOpen && (
                <ul className="divide-y divide-slate-100">
                  {claims.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/claims/${c.id}`}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 transition-colors"
                      >
                        <span className="text-[9px] font-mono text-slate-400 shrink-0">{c.claimNo}</span>
                        <span className="text-[11px] font-semibold text-slate-800 truncate min-w-0 flex-1">{c.title}</span>
                        <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 border rounded text-slate-500 font-bold shrink-0">{c.customer}</span>
                        <span className="text-[9px] px-1.5 py-0.5 bg-amber-50 border border-amber-100 rounded text-amber-600 font-bold shrink-0">{c.priority}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
