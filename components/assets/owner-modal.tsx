"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { EquipmentOwnerHistory } from "@/types/asset";

interface UserOption { id: string; name: string; department: string | null }

interface OwnerModalProps {
  equipmentId: string;
  equipmentName: string;
  currentManagingTeam: string | null;
  currentOwnerId: string | null;
  currentOwnerName: string | null;
  onClose: () => void;
  onSaved: () => void;
}

export function OwnerModal({
  equipmentId, equipmentName,
  currentManagingTeam, currentOwnerId, currentOwnerName,
  onClose, onSaved,
}: OwnerModalProps) {
  const [tab, setTab] = useState<"edit" | "history">("edit");
  const [users, setUsers] = useState<UserOption[]>([]);
  const [history, setHistory] = useState<(EquipmentOwnerHistory & { ownerDept?: string | null })[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [managingTeam, setManagingTeam] = useState(currentManagingTeam ?? "");
  const [ownerId, setOwnerId]           = useState(currentOwnerId ?? "");
  const [ownerName, setOwnerName]       = useState(currentOwnerName ?? "");
  const [note, setNote]                 = useState("");
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState("");

  // 시스템 사용자 목록 로드
  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((data: UserOption[]) => setUsers(data.filter((u) => u.id)))
      .catch(() => {});
  }, []);

  // 이력 탭 전환 시 로드
  useEffect(() => {
    if (tab !== "history") return;
    setHistoryLoading(true);
    fetch(`/api/assets/${equipmentId}/owner-history`)
      .then((r) => r.json())
      .then((data) => setHistory(data))
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, [tab, equipmentId]);

  const handleSave = async () => {
    if (!managingTeam.trim() && !ownerId && !ownerName.trim()) {
      setError("관리팀 또는 담당자를 입력하세요.");
      return;
    }
    setSaving(true); setError("");

    const body: Record<string, string | null> = {
      managingTeam:    managingTeam.trim() || null,
      ownerId:         ownerId             || null,
      ownerName:       ownerName.trim()    || null,
      ownerChangeNote: note.trim()         || null,
    };

    const res = await fetch(`/api/assets/${equipmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) { onSaved(); }
    else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "저장 실패");
    }
    setSaving(false);
  };

  const selectedUser = users.find((u) => u.id === ownerId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base font-semibold text-slate-800">담당자 관리</h2>
            <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[280px]">{equipmentName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-slate-100 shrink-0">
          {(["edit", "history"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 py-2.5 text-sm font-medium transition-colors",
                tab === t ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-500 hover:text-slate-700"
              )}
            >
              {t === "edit" ? "담당자 변경" : "변경 이력"}
            </button>
          ))}
        </div>

        {/* 콘텐츠 */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {tab === "edit" ? (
            <div className="space-y-4">
              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

              {/* 현재 담당 정보 */}
              {(currentManagingTeam || currentOwnerName || currentOwnerId) && (
                <div className="bg-slate-50 rounded-lg px-4 py-3 text-xs text-slate-600 space-y-1">
                  <p className="font-medium text-slate-500 mb-1">현재 담당</p>
                  {currentManagingTeam && <p>팀: <span className="font-medium">{currentManagingTeam}</span></p>}
                  {(currentOwnerName || currentOwnerId) && (
                    <p>담당자: <span className="font-medium">{currentOwnerName ?? users.find((u) => u.id === currentOwnerId)?.name ?? currentOwnerId}</span></p>
                  )}
                </div>
              )}

              {/* 관리팀 */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">관리팀</label>
                <input
                  value={managingTeam}
                  onChange={(e) => setManagingTeam(e.target.value)}
                  placeholder="예: 구미 시험1팀"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>

              {/* 담당자 (시스템 사용자) */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">담당자 (시스템 계정)</label>
                <select
                  value={ownerId}
                  onChange={(e) => { setOwnerId(e.target.value); if (e.target.value) setOwnerName(""); }}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">직접 입력 또는 선택 안 함</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}{u.department ? ` (${u.department})` : ""}
                    </option>
                  ))}
                </select>
                {selectedUser?.department && (
                  <p className="text-xs text-slate-400 mt-1">{selectedUser.department}</p>
                )}
              </div>

              {/* 담당자명 직접입력 (시스템 계정 없는 경우) */}
              {!ownerId && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">담당자명 (직접 입력)</label>
                  <input
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="예: 홍길동"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
              )}

              {/* 변경 사유 */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">변경 사유 (선택)</label>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="예: 인사이동, 업무 재배정"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className={cn(
                  "w-full py-2.5 text-sm font-medium rounded-lg text-white transition-colors",
                  saving ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
                )}
              >
                {saving ? "저장 중..." : "담당자 변경 저장"}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {historyLoading ? (
                <div className="py-8 text-center text-sm text-slate-400">불러오는 중...</div>
              ) : history.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-400">변경 이력이 없습니다.</div>
              ) : (
                <div className="relative">
                  {/* 타임라인 세로선 */}
                  <div className="absolute left-3 top-2 bottom-2 w-px bg-slate-200" />
                  <div className="space-y-4">
                    {history.map((h, i) => (
                      <div key={h.id} className="flex gap-3">
                        {/* 타임라인 도트 */}
                        <div className={cn(
                          "shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center z-10",
                          i === 0 ? "bg-blue-600 border-blue-600" : "bg-white border-slate-300"
                        )}>
                          <div className={cn("w-2 h-2 rounded-full", i === 0 ? "bg-white" : "bg-slate-300")} />
                        </div>
                        {/* 카드 */}
                        <div className="flex-1 bg-slate-50 rounded-lg px-3 py-2.5 text-xs space-y-1 mb-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-slate-700">
                              {h.ownerName ?? "담당자 미지정"}
                            </span>
                            <span className="text-slate-400">
                              {new Date(h.changedAt).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })}
                            </span>
                          </div>
                          {h.managingTeam && (
                            <p className="text-slate-500">팀: {h.managingTeam}</p>
                          )}
                          {h.ownerDept && (
                            <p className="text-slate-500">부서: {h.ownerDept}</p>
                          )}
                          <p className="text-slate-400">변경자: {h.changedByName}</p>
                          {h.note && (
                            <p className="text-slate-500 italic">"{h.note}"</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
