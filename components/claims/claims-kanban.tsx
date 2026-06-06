"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Claim, ClaimStatus } from "@/types/claim";
import { ClaimPriorityBadge } from "./claim-badges";

const COLUMNS: { status: ClaimStatus; label: string; color: string }[] = [
  { status: "Received",      label: "접수",   color: "bg-slate-500" },
  { status: "Investigating", label: "조사",   color: "bg-blue-500" },
  { status: "Action",        label: "대책",   color: "bg-amber-500" },
  { status: "Verification",  label: "검증",   color: "bg-purple-500" },
  { status: "Closed",        label: "종결",   color: "bg-emerald-500" },
];

function getToday() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
}

function getDDay(claim: Claim): { label: string; cls: string } | null {
  if (claim.status === "Closed" || !claim.targetDate) return null;
  const today = getToday();
  // KST 기준 날짜 문자열로 정규화 — Prisma DateTime ISO 타임스탬프의 UTC 오프셋 하루 오차 방지
  const target = new Date(claim.targetDate).toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  const days = Math.round(
    (new Date(target).getTime() - new Date(today).getTime()) / 86_400_000
  );
  if (days < 0)  return { label: `D+${-days}`, cls: "bg-rose-100 text-rose-700 animate-pulse" };
  if (days <= 3) return { label: days === 0 ? "D-Day" : `D-${days}`, cls: "bg-amber-100 text-amber-700" };
  return { label: `D-${days}`, cls: "bg-emerald-50 text-emerald-700" };
}

function ClaimCard({ claim }: { claim: Claim }) {
  const dd = getDDay(claim);
  const overdue = dd?.label.startsWith("D+") ?? false;
  return (
    <Link
      href={`/claims/${claim.id}`}
      className={cn(
        "block bg-white rounded-lg border border-slate-200 p-3 shadow-sm hover:shadow-md hover:border-blue-300 transition-all",
        overdue && "ring-1 ring-rose-400 border-rose-200 bg-rose-50/5"
      )}
    >
      <div className="flex justify-between items-start mb-2">
        <ClaimPriorityBadge priority={claim.priority} />
        <span className="text-[10px] text-slate-400 font-mono">{claim.claimNo}</span>
      </div>
      <h4 className="text-sm font-bold text-slate-800 leading-tight mb-1 group-hover:text-blue-700">{claim.title}</h4>
      <p className="text-xs text-slate-500 mb-3">{claim.customer}</p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
            {claim.assignee[0]}
          </div>
          <span className="text-[10px] text-slate-500">{claim.assignee}</span>
        </div>
        {dd ? (
          <span className={cn("px-1.5 py-0.5 rounded font-bold text-[8px] flex items-center gap-0.5", dd.cls)}>
            {overdue && <ShieldAlert className="w-2.5 h-2.5" />}
            {dd.label}
          </span>
        ) : (
          <span className="text-[10px] text-slate-400">{claim.receivedAt.slice(5).replace("-", "/")}</span>
        )}
      </div>
    </Link>
  );
}

export function ClaimsKanban({ claims }: { claims: Claim[] }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 min-h-[600px]">
      {COLUMNS.map((col) => {
        const colClaims = claims.filter((c) => c.status === col.status);
        return (
          <div key={col.status} className="w-72 shrink-0 flex flex-col gap-3">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", col.color)} />
                <h3 className="text-sm font-semibold text-slate-700">{col.label}</h3>
                <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {colClaims.length}
                </span>
              </div>
            </div>

            <div className="bg-slate-50/50 rounded-xl p-2 flex-1 flex flex-col gap-2 border border-dashed border-slate-200">
              {colClaims.map((claim) => (
                <ClaimCard key={claim.id} claim={claim} />
              ))}
              {colClaims.length === 0 && (
                <div className="flex-1 flex items-center justify-center border border-dashed border-slate-200 rounded-lg">
                  <span className="text-xs text-slate-300">항목 없음</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
