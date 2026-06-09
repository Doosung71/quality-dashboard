"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Equipment } from "@/types/asset";
import type { Test, TestsData, TestStatus } from "@/types/test";
import type { FacilitiesData } from "@/types/facility";
import { TestCategoryChip, TestStatusBadge } from "./badges";
import { TestPlanForm } from "@/components/assets/test-plan-form";
import { Edit2, Trash2, Plus, X, Save } from "lucide-react";

type FilterValue = TestStatus | "전체";

interface EditForm {
  status:       TestStatus;
  progress:     number;
  actualStart:  string;
  actualEnd:    string;
  ownerName:    string;
  managingTeam: string;
}

const FILTERS: { label: string; value: FilterValue }[] = [
  { label: "전체",   value: "전체" },
  { label: "시험중", value: "시험중" },
  { label: "준비중", value: "준비중" },
  { label: "지연",   value: "지연" },
  { label: "완료",   value: "완료" },
];

const PROGRESS_COLOR: Record<TestStatus, string> = {
  "시험중": "bg-blue-400",
  "완료":   "bg-emerald-400",
  "지연":   "bg-red-400",
  "준비중": "bg-slate-300",
};

export function FacilitiesView({
  data,    // TestPlanForm 내부 설비 브라우저에서 사용 — 뷰에는 미표시
  assets,
  testsData,
}: {
  data: FacilitiesData;
  assets: Equipment[];
  testsData: TestsData;
}) {
  const router = useRouter();
  const tests = testsData.tests;

  const [filter,       setFilter]       = useState<FilterValue>("전체");
  const [showCreate,   setShowCreate]   = useState(false);
  const [editTarget,   setEditTarget]   = useState<Test | null>(null);
  const [editForm,     setEditForm]     = useState<EditForm | null>(null);
  const [saving,       setSaving]       = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting,     setDeleting]     = useState(false);

  const counts: Record<FilterValue, number> = {
    전체:   tests.length,
    시험중: tests.filter(t => t.status === "시험중").length,
    준비중: tests.filter(t => t.status === "준비중").length,
    지연:   tests.filter(t => t.status === "지연").length,
    완료:   tests.filter(t => t.status === "완료").length,
  };

  const filtered = filter === "전체" ? tests : tests.filter(t => t.status === filter);

  function openEdit(test: Test) {
    setEditTarget(test);
    setEditForm({
      status:       test.status,
      progress:     test.progress,
      actualStart:  test.actualStart  ?? "",
      actualEnd:    test.actualEnd    ?? "",
      ownerName:    test.ownerName    ?? "",
      managingTeam: test.managingTeam ?? "",
    });
  }

  async function handleSave() {
    if (!editTarget || !editForm) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/test-plans/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status:       editForm.status,
          progress:     editForm.progress,
          actualStart:  editForm.actualStart  || null,
          actualEnd:    editForm.actualEnd    || null,
          ownerName:    editForm.ownerName    || null,
          managingTeam: editForm.managingTeam || null,
        }),
      });
      if (!res.ok) throw new Error("저장 실패");
      setEditTarget(null);
      setEditForm(null);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      const res = await fetch(`/api/test-plans/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("삭제 실패");
      setConfirmDeleteId(null);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-5">

      {/* 필터 칩 + 등록 버튼 */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {FILTERS.map(({ label, value }) => (
            <button key={value} onClick={() => setFilter(value)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors",
                filter === value
                  ? "bg-violet-600 text-white border-violet-600"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              )}>
              {label}
              <span className={cn(
                "px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                filter === value ? "bg-violet-500 text-white" : "bg-slate-100 text-slate-500"
              )}>
                {counts[value]}
              </span>
            </button>
          ))}
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors">
          <Plus className="w-4 h-4" /> 시험 계획 등록
        </button>
      </div>

      {/* 시험 계획 등록 모달 */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-800">시험 계획 등록</h2>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4">
              <TestPlanForm
                equipment={assets} tests={tests} facilitiesData={data}
                onSuccess={() => { setShowCreate(false); router.refresh(); }}
                onCancel={() => setShowCreate(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* 시험 계획 수정 모달 */}
      {editTarget && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-800">시험 계획 수정</h2>
                <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{editTarget.projectName}</p>
              </div>
              <button onClick={() => { setEditTarget(null); setEditForm(null); }} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">상태</label>
                  <select value={editForm.status}
                    onChange={e => setEditForm(f => f ? {...f, status: e.target.value as TestStatus} : f)}
                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white">
                    <option value="준비중">준비중</option>
                    <option value="시험중">시험중</option>
                    <option value="완료">완료</option>
                    <option value="지연">지연</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">진행률 (%)</label>
                  <input type="number" min={0} max={100} value={editForm.progress}
                    onChange={e => setEditForm(f => f ? {...f, progress: Number(e.target.value)} : f)}
                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">실제 시작일</label>
                  <input type="date" value={editForm.actualStart}
                    onChange={e => setEditForm(f => f ? {...f, actualStart: e.target.value} : f)}
                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">실제 완료일</label>
                  <input type="date" value={editForm.actualEnd}
                    onChange={e => setEditForm(f => f ? {...f, actualEnd: e.target.value} : f)}
                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">담당자</label>
                  <input type="text" value={editForm.ownerName} placeholder="담당자 이름"
                    onChange={e => setEditForm(f => f ? {...f, ownerName: e.target.value} : f)}
                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">관리팀</label>
                  <input type="text" value={editForm.managingTeam} placeholder="팀명"
                    onChange={e => setEditForm(f => f ? {...f, managingTeam: e.target.value} : f)}
                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                <button onClick={() => { setEditTarget(null); setEditForm(null); }}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl">취소</button>
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-xl disabled:opacity-50">
                  <Save className="w-3.5 h-3.5" /> {saving ? "저장 중..." : "저장"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 시험 계획 목록 */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
          <p className="text-sm text-slate-400">
            {filter === "전체" ? "등록된 시험 계획이 없습니다." : `"${filter}" 상태의 시험 계획이 없습니다.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((test) => {
            const eq = assets.find(e => e.id === test.equipmentId);
            const isConfirmDelete = confirmDeleteId === test.id;

            return (
              <div key={test.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:border-slate-200 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <TestCategoryChip category={test.testCategory} />
                      <TestStatusBadge  status={test.status} />
                    </div>
                    <p className="text-sm font-semibold text-slate-800 wrap-break-word">{test.projectName}</p>
                    {test.sampleDescription && (
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{test.sampleDescription}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 flex-wrap text-xs text-slate-400">
                      {eq && (
                        <span>설비: <span className="font-medium text-slate-600">{eq.name}</span></span>
                      )}
                      <span>{test.plannedStart} ~ {test.plannedEnd}</span>
                      {test.ownerName    && <span>담당: {test.ownerName}</span>}
                      {test.managingTeam && <span>관리팀: {test.managingTeam}</span>}
                    </div>
                  </div>

                  {/* 액션 버튼 */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isConfirmDelete ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-rose-600 font-semibold">삭제?</span>
                        <button onClick={() => setConfirmDeleteId(null)}
                          className="px-2.5 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg">취소</button>
                        <button onClick={() => handleDelete(test.id)} disabled={deleting}
                          className="px-2.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg disabled:opacity-50">
                          {deleting ? "삭제 중" : "확인"}
                        </button>
                      </div>
                    ) : (
                      <>
                        <button onClick={() => openEdit(test)}
                          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setConfirmDeleteId(test.id)}
                          className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* 진행률 바 */}
                {test.progress > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span>진행률</span>
                      <span className="font-semibold text-violet-600">{test.progress}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all", PROGRESS_COLOR[test.status])}
                        style={{ width: `${test.progress}%` }} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
