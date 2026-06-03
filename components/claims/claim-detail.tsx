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

const PRIORITY_GRADIENT: Record<string, string> = {
  High: "bg-linear-to-r from-rose-500 via-rose-400 to-orange-300",
  Mid:  "bg-linear-to-r from-amber-400 via-amber-300 to-yellow-200",
  Low:  "bg-linear-to-r from-blue-500 via-blue-400 to-sky-300",
};

// 단계별 의미론적 아이콘
const STAGE_ICON: Record<ClaimStatus, React.ReactNode> = {
  Received: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  Investigating: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  Action: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  Verification: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2m-6 9l2 2 4-4" />
    </svg>
  ),
  Closed: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
  ),
};

const STAGE_ICON_COLOR: Record<ClaimStatus, string> = {
  Received:      "bg-slate-100 text-slate-500 border-slate-200",
  Investigating: "bg-blue-50 text-blue-500 border-blue-200",
  Action:        "bg-amber-50 text-amber-500 border-amber-200",
  Verification:  "bg-violet-50 text-violet-500 border-violet-200",
  Closed:        "bg-emerald-50 text-emerald-500 border-emerald-200",
};

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
  const [copyGlow, setCopyGlow] = useState(false);

  useEffect(() => {
    setIsMoving(false);
    setCopied(false);
  }, [claim?.id]);

  const handleCopyReport = async () => {
    if (!claim) return;
    try {
      await navigator.clipboard.writeText(generateReport(claim));
      setCopied(true);
      setCopyGlow(true);
      setTimeout(() => setCopied(false), 2000);
      setTimeout(() => setCopyGlow(false), 900);
    } catch {
      // clipboard API 미지원 환경 무시
    }
  };

  if (!claim) return null;

  const gradient = PRIORITY_GRADIENT[claim.priority] ?? "from-slate-400 to-slate-300";

  return (
    <>
      {/* 오버레이 */}
      <div
        className="fixed inset-0 bg-slate-900/20 backdrop-blur-[2px] z-40 transition-opacity"
        onClick={onClose}
      />

      {/* 슬라이드인 패널 */}
      <div
        className={cn(
          "fixed inset-y-0 right-0 w-full sm:w-[450px] z-50 transform transition-transform duration-300 ease-in-out flex flex-col",
          "bg-white/95 backdrop-blur-xl shadow-2xl border-l border-white/30",
          claim ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* 우선순위 그라데이션 스트립 */}
        <div className={cn("h-1 w-full shrink-0", gradient)} />

        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100/80 flex items-center justify-between">
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
                <div className="w-6 h-6 rounded-full bg-linear-to-br from-slate-700 to-slate-500 flex items-center justify-center text-[10px] font-bold text-white">
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
          <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-100 shadow-inner">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">상세 내용</p>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
              {claim.description}
            </p>
          </div>

          {/* Timeline */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-5 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              조치 이력 (Timeline)
            </h3>
            <div className="space-y-5 ml-2">
              {claim.timeline?.map((item, idx) => {
                const stageStatus = STAGES.find(s => s.label === item.action.split(" ")[0])?.status
                  ?? STAGES[Math.min(idx, STAGES.length - 1)].status;
                const iconColor = STAGE_ICON_COLOR[stageStatus];
                const icon = STAGE_ICON[stageStatus];
                const isLast = idx === (claim.timeline?.length ?? 0) - 1;

                return (
                  <div key={idx} className="relative pl-8">
                    {/* Vertical Line with gradient */}
                    {!isLast && (
                      <div className="absolute left-[13px] top-7 w-[2px] h-[calc(100%+8px)] bg-linear-to-b from-slate-200 to-transparent" />
                    )}
                    {/* Icon Node */}
                    <div className={cn(
                      "absolute left-0 top-0.5 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all",
                      iconColor
                    )}>
                      {icon}
                    </div>

                    <div className="pt-0.5">
                      <p className="text-[10px] font-medium text-slate-400">{item.date}</p>
                      <p className="text-sm text-slate-700 font-medium mt-0.5">{item.action}</p>
                    </div>
                  </div>
                );
              })}
              {(!claim.timeline || claim.timeline.length === 0) && (
                <p className="text-xs text-slate-400 italic">등록된 이력이 없습니다.</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer / Actions */}
        <div className="p-6 border-t border-slate-100/80 bg-slate-50/50">
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
                        : "bg-white border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 hover:shadow-sm hover:shadow-blue-100"
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
                  "flex-1 border text-sm font-medium py-2.5 rounded-lg transition-all duration-300",
                  copied
                    ? "bg-emerald-50 border-emerald-300 text-emerald-700 shadow-emerald-100 shadow-md"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm",
                  copyGlow && "animate-copy-glow"
                )}
              >
                <span className={cn("transition-all duration-200", copied && "scale-110 inline-block")}>
                  {copied ? "✓ 복사 완료" : "보고서 복사"}
                </span>
              </button>
              {onMoveStage && (
                <button
                  onClick={() => setIsMoving(true)}
                  className="flex-1 bg-linear-to-r from-blue-600 to-blue-500 text-white text-sm font-medium py-2.5 rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all shadow-sm hover:shadow-md hover:shadow-blue-200"
                >
                  단계 이동 →
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
