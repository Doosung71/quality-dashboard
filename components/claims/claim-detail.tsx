"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { Claim, ClaimStatus } from "@/types/claim";
import { ClaimStatusBadge, ClaimPriorityBadge } from "./claim-badges";

const STAGES: { status: ClaimStatus; label: string }[] = [
  { status: "Received",      label: "접수" },
  { status: "Investigating", label: "조사" },
  { status: "Action",        label: "대책" },
  { status: "Verification",  label: "검증" },
  { status: "Closed",        label: "종결" },
];

const PRIORITY_LABELS: Record<string, string> = { High: "높음", Mid: "보통", Low: "낮음" };

function generateReport(claim: Claim): string {
  const divider = "━".repeat(32);
  const stageLabel = STAGES.find(s => s.status === claim.status)?.label ?? claim.status;
  const timelineText = (claim.timeline ?? []).length > 0
    ? claim.timeline!.map(t => `  ${t.date}  ${t.action}`).join("\n")
    : "  등록된 이력 없음";
  return [
    divider,
    "클레임 보고서",
    divider,
    `ID: ${claim.id}`,
    `제목: ${claim.title}`,
    `고객사: ${claim.customer}`,
    `중요도: ${PRIORITY_LABELS[claim.priority] ?? claim.priority}`,
    `현재 단계: ${stageLabel}`,
    `담당자: ${claim.assignee}`,
    `접수일: ${claim.receivedAt}`,
    "",
    "■ 상세 내용",
    claim.description,
    "",
    "■ 조치 이력",
    timelineText,
    divider,
  ].join("\n");
}

interface ClaimDetailProps {
  claim: Claim | null;
  onClose: () => void;
  onMoveStage?: (id: string, newStatus: ClaimStatus) => void;
}

export function ClaimDetail({ claim, onClose, onMoveStage }: ClaimDetailProps) {
  const [isMoving, setIsMoving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setIsMoving(false);
    setCopied(false);
  }, [claim?.id]);

  const handleCopyReport = async () => {
    if (!claim) return;
    try {
      await navigator.clipboard.writeText(generateReport(claim));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API 미지원 환경 무시
    }
  };

  if (!claim) return null;

  return (
    <div 
      className={cn(
        "fixed inset-y-0 right-0 w-full sm:w-[450px] bg-white shadow-2xl border-l border-slate-200 z-50 transform transition-transform duration-300 ease-in-out flex flex-col",
        claim ? "translate-x-0" : "translate-x-full"
      )}
    >
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-mono text-slate-400">{claim.id}</span>
          <h2 className="text-lg font-bold text-slate-900 leading-tight mt-1">{claim.title}</h2>
        </div>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
          aria-label="닫기"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-y-6">
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">고객사</p>
            <p className="text-sm font-medium text-slate-700">{claim.customer}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">담당자</p>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                {claim.assignee[0]}
              </div>
              <p className="text-sm font-medium text-slate-700">{claim.assignee}</p>
            </div>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">중요도</p>
            <ClaimPriorityBadge priority={claim.priority} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">진행 상태</p>
            <ClaimStatusBadge status={claim.status} />
          </div>
        </div>

        {/* Description */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">상세 내용</p>
          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
            {claim.description}
          </p>
        </div>

        {/* Timeline */}
        <div>
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            조치 이력 (Timeline)
          </h3>
          <div className="space-y-6 ml-2">
            {claim.timeline?.map((item, idx) => (
              <div key={idx} className="relative pl-6">
                {/* Vertical Line */}
                {idx !== claim.timeline!.length - 1 && (
                  <div className="absolute left-[3px] top-2 w-[1px] h-full bg-slate-200" />
                )}
                {/* Dot */}
                <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full border-2 border-blue-500 bg-white" />
                
                <div>
                  <p className="text-[10px] font-medium text-slate-400">{item.date}</p>
                  <p className="text-sm text-slate-700 font-medium mt-0.5">{item.action}</p>
                </div>
              </div>
            ))}
            {(!claim.timeline || claim.timeline.length === 0) && (
              <p className="text-xs text-slate-400 italic">등록된 이력이 없습니다.</p>
            )}
          </div>
        </div>
      </div>

      {/* Footer / Actions */}
      <div className="p-6 border-t border-slate-100 bg-slate-50/50">
        {isMoving ? (
          <div className="space-y-3">
            <p className="text-xs font-medium text-slate-500">이동할 단계를 선택하세요</p>
            <div className="grid grid-cols-5 gap-1">
              {STAGES.map((stage) => (
                <button
                  key={stage.status}
                  disabled={stage.status === claim.status}
                  onClick={() => { onMoveStage?.(claim.id, stage.status); setIsMoving(false); }}
                  className={cn(
                    "py-2 text-xs font-medium rounded-lg border transition-all",
                    stage.status === claim.status
                      ? "bg-blue-50 border-blue-300 text-blue-600 cursor-default"
                      : "bg-white border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50"
                  )}
                >
                  {stage.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setIsMoving(false)}
              className="w-full text-xs text-slate-400 hover:text-slate-600 py-1 transition-colors"
            >
              취소
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleCopyReport}
              className={cn(
                "flex-1 border text-sm font-medium py-2 rounded-lg transition-colors",
                copied
                  ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              )}
            >
              {copied ? "복사 완료 ✓" : "보고서 복사"}
            </button>
            {onMoveStage && (
              <button
                onClick={() => setIsMoving(true)}
                className="flex-1 bg-blue-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                단계 이동 →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
