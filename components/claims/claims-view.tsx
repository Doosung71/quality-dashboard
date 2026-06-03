"use client";

import { useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { ClaimsData, Claim, ClaimPriority, ClaimStatus } from "@/types/claim";

const VALID_PRIORITIES: (ClaimPriority | "All")[] = ["All", "High", "Mid", "Low"];
import { ClaimsKpi } from "./claims-kpi";
import { ClaimsKanban } from "./claims-kanban";
import { ClaimDetail } from "./claim-detail";

const STAGE_LABELS: Record<ClaimStatus, string> = {
  Received: "접수", Investigating: "조사", Action: "대책", Verification: "검증", Closed: "종결",
};

export function ClaimsView({ data, canEdit = true }: { data: ClaimsData; canEdit?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const searchTerm = searchParams.get("q") ?? "";
  const rawPriority = searchParams.get("priority");
  const priorityFilter: ClaimPriority | "All" = VALID_PRIORITIES.includes(rawPriority as ClaimPriority | "All")
    ? (rawPriority as ClaimPriority | "All")
    : "All";

  const [claims, setClaims] = useState<Claim[]>(data.claims);
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);

  const setSearchTerm = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("q", value);
    else params.delete("q");
    router.replace(`${pathname}?${params.toString()}`);
  };

  const setPriorityFilter = (value: ClaimPriority | "All") => {
    const params = new URLSearchParams(searchParams.toString());
    if (value !== "All") params.set("priority", value);
    else params.delete("priority");
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleMoveStage = (id: string, newStatus: ClaimStatus) => {
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    setClaims(prev => prev.map(c => {
      if (c.id !== id) return c;
      return {
        ...c,
        status: newStatus,
        closedAt: newStatus === "Closed" ? today : undefined,
        timeline: [...(c.timeline ?? []), { date: today, action: `단계 이동 → ${STAGE_LABELS[newStatus]}` }],
      };
    }));
  };

  const filteredClaims = claims.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         c.customer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = priorityFilter === "All" || c.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  const selectedClaim = selectedClaimId
    ? claims.find(c => c.id === selectedClaimId) ?? null
    : null;

  return (
    <div className="space-y-6 relative">
      <ClaimsKpi claims={claims} />

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm overflow-x-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">클레임 진행 보드</h2>
            <p className="text-xs text-slate-400 mt-1">
              각 단계별 적체 건수를 확인하고, 지연 이슈를 집중 관리하십시오.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="클레임명, 고객사 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all min-w-[240px]"
              />
            </div>

            <div className="flex bg-slate-100 p-1 rounded-lg">
              {(["All", "High", "Mid", "Low"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPriorityFilter(p)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                    priorityFilter === p
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  {p === "All" ? "전체" : p === "High" ? "높음" : p === "Mid" ? "보통" : "낮음"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <ClaimsKanban
          claims={filteredClaims}
          onSelectClaim={(id) => setSelectedClaimId(id)}
        />
      </div>

      {selectedClaimId && (
        <div
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-[2px] z-40"
          onClick={() => setSelectedClaimId(null)}
        />
      )}
      <ClaimDetail
        claim={selectedClaim}
        onClose={() => setSelectedClaimId(null)}
        onMoveStage={canEdit ? handleMoveStage : undefined}
      />
    </div>
  );
}
