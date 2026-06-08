"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { Equipment, EquipmentOwnerHistory, EquipmentRepair, RepairStatus } from "@/types/asset";
import { RepairForm } from "./repair-form";
import { AttachmentUploader, AttachmentList, type AttachmentItem } from "@/components/ui/attachment-uploader";
import { Paperclip } from "lucide-react";

const SITE_LABEL: Record<string, string> = {
  gumi: "구미", donghae: "동해", indon: "인동", external: "외부",
};
const STATUS_LABEL: Record<string, string> = {
  new: "신규", normal: "정상", aging: "노후", planned: "도입예정",
};
const STATUS_BADGE: Record<string, string> = {
  new:     "bg-blue-100 text-blue-700",
  normal:  "bg-emerald-100 text-emerald-700",
  aging:   "bg-red-100 text-red-700",
  planned: "bg-slate-100 text-slate-500",
};
const REPAIR_STATUS_STYLE: Record<RepairStatus, string> = {
  "접수":   "bg-slate-100 text-slate-600 border-slate-200",
  "진행중": "bg-amber-100 text-amber-700 border-amber-200",
  "완료":   "bg-emerald-100 text-emerald-700 border-emerald-200",
  "보류":   "bg-rose-100 text-rose-700 border-rose-200",
};
const REPAIR_TYPE_COLOR: Record<string, string> = {
  "고장": "text-red-600", "예방점검": "text-blue-600", "수선": "text-amber-600", "교정": "text-violet-600",
};

interface UserOption { id: string; name: string; department: string | null }

interface Props {
  equipment: Equipment;
  userRole: string;
  onClose: () => void;
  onSaved: () => void;
}

export function EquipmentDetailDrawer({ equipment, userRole, onClose, onSaved }: Props) {
  const canEdit = ["DIRECTOR", "ADMIN", "TEAM_LEAD"].includes(userRole);

  // ── 기본정보 편집 ──
  const [editMode, setEditMode]     = useState(false);
  const [editForm, setEditForm]     = useState({
    name:          equipment.name,
    type:          equipment.type,
    maker:         equipment.maker,
    makerCountry:  equipment.makerCountry ?? "",
    yearIntroduced: String(equipment.yearIntroduced),
    quantity:      String(equipment.quantity),
    status:        equipment.status,
    notes:         equipment.notes,
    specVoltage:   equipment.spec?.voltage ?? "",
    specCurrent:   equipment.spec?.current ?? "",
    specEnergy:    equipment.spec?.energy  ?? "",
  });
  const [saving, setSaving]         = useState(false);
  const [saveErr, setSaveErr]       = useState("");

  // ── 담당자 이력 ──
  const [ownerHistory, setOwnerHistory]     = useState<(EquipmentOwnerHistory & { ownerDept?: string | null })[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [users, setUsers]                   = useState<UserOption[]>([]);
  const [ownerEditOpen, setOwnerEditOpen]   = useState(false);
  const [managingTeam, setManagingTeam]     = useState(equipment.managingTeam ?? "");
  const [ownerId, setOwnerId]               = useState(equipment.ownerId ?? "");
  const [ownerName, setOwnerName]           = useState(equipment.ownerName ?? "");
  const [ownerNote, setOwnerNote]           = useState("");
  const [ownerSaving, setOwnerSaving]       = useState(false);
  const [ownerErr, setOwnerErr]             = useState("");

  // ── 첨부파일 ──
  const [attachments, setAttachments] = useState<AttachmentItem[]>(
    (equipment.attachments ?? []) as AttachmentItem[]
  );
  const [savingAttachments, setSavingAttachments] = useState(false);

  async function handleAttachmentsChange(next: AttachmentItem[]) {
    setAttachments(next);
    setSavingAttachments(true);
    try {
      await fetch(`/api/assets/${equipment.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attachments: next }),
      });
    } finally { setSavingAttachments(false); }
  }

  // ── 수선 이력 ──
  const [repairs, setRepairs]               = useState<EquipmentRepair[]>([]);
  const [repairsLoading, setRepairsLoading] = useState(true);
  const [showRepairForm, setShowRepairForm] = useState(false);

  // 초기 데이터 로드 (드로어 열릴 때 모두 한 번에)
  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((d: UserOption[]) => setUsers(d.filter((u) => u.id)))
      .catch(() => {});

    fetch(`/api/assets/${equipment.id}/owner-history`)
      .then((r) => r.json())
      .then(setOwnerHistory)
      .catch(() => {})
      .finally(() => setHistoryLoading(false));

    fetch(`/api/assets/${equipment.id}/repairs`)
      .then((r) => r.json())
      .then(setRepairs)
      .catch(() => {})
      .finally(() => setRepairsLoading(false));
  }, [equipment.id]);

  function loadRepairs() {
    setRepairsLoading(true);
    fetch(`/api/assets/${equipment.id}/repairs`)
      .then((r) => r.json()).then(setRepairs).catch(() => {})
      .finally(() => setRepairsLoading(false));
  }

  async function handleSaveInfo() {
    setSaving(true); setSaveErr("");
    const spec: Record<string, string> = {};
    if (editForm.specVoltage) spec.voltage = editForm.specVoltage;
    if (editForm.specCurrent) spec.current = editForm.specCurrent;
    if (editForm.specEnergy)  spec.energy  = editForm.specEnergy;

    const res = await fetch(`/api/assets/${equipment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editForm.name, type: editForm.type, spec,
        maker: editForm.maker, makerCountry: editForm.makerCountry || null,
        yearIntroduced: Number(editForm.yearIntroduced),
        quantity: Number(editForm.quantity),
        status: editForm.status, notes: editForm.notes,
      }),
    });

    if (res.ok) { setEditMode(false); onSaved(); }
    else { const d = await res.json().catch(() => ({})); setSaveErr(d.error ?? "저장 실패"); }
    setSaving(false);
  }

  async function handleSaveOwner() {
    if (!managingTeam.trim() && !ownerId && !ownerName.trim()) {
      setOwnerErr("관리팀 또는 담당자를 입력하세요."); return;
    }
    setOwnerSaving(true); setOwnerErr("");
    const res = await fetch(`/api/assets/${equipment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        managingTeam: managingTeam.trim() || null,
        ownerId: ownerId || null,
        ownerName: ownerName.trim() || null,
        ownerChangeNote: ownerNote.trim() || null,
      }),
    });
    if (res.ok) {
      setOwnerEditOpen(false); setOwnerNote("");
      setHistoryLoading(true);
      fetch(`/api/assets/${equipment.id}/owner-history`)
        .then((r) => r.json()).then(setOwnerHistory).catch(() => {})
        .finally(() => setHistoryLoading(false));
      onSaved();
    } else {
      const d = await res.json().catch(() => ({})); setOwnerErr(d.error ?? "저장 실패");
    }
    setOwnerSaving(false);
  }

  const f = (k: keyof typeof editForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setEditForm((p) => ({ ...p, [k]: e.target.value }));

  const selectedUser = users.find((u) => u.id === ownerId);
  const specStr = [equipment.spec?.voltage, equipment.spec?.current, equipment.spec?.energy].filter(Boolean).join(" / ") || "—";

  return (
    <>
      {/* 배경 딤 */}
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* 드로어 */}
      <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[500px] lg:w-[560px] bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">

        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between shrink-0 bg-white">
          <div className="min-w-0 pr-4">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-bold text-slate-900 text-base">{equipment.name}</h2>
              <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold", STATUS_BADGE[equipment.status] ?? "bg-slate-100 text-slate-500")}>
                {STATUS_LABEL[equipment.status] ?? equipment.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {SITE_LABEL[equipment.siteId] ?? equipment.siteId} · {equipment.category} · {equipment.id}
            </p>
          </div>
          <button onClick={onClose} className="shrink-0 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 스크롤 영역 */}
        <div className="flex-1 overflow-y-auto">

          {/* ══ 기본 정보 ══ */}
          <section className="px-6 py-5 space-y-4">
            <div className="flex items-center justify-between">
              <SectionTitle>기본 정보</SectionTitle>
              {canEdit && !editMode && (
                <button onClick={() => setEditMode(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  편집
                </button>
              )}
            </div>

            {saveErr && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{saveErr}</p>}

            {editMode ? (
              <div className="space-y-3">
                <FieldRow label="설비명"><input value={editForm.name} onChange={f("name")} className={inputCls} /></FieldRow>
                <FieldRow label="유형">
                  <select value={editForm.type} onChange={f("type")} className={inputCls}>
                    {["AC","DC","Imp","전류원","기타"].map((t) => <option key={t}>{t}</option>)}
                  </select>
                </FieldRow>
                <FieldRow label="규격 전압"><input value={editForm.specVoltage} onChange={f("specVoltage")} placeholder="예: AC 500kV" className={inputCls} /></FieldRow>
                <FieldRow label="규격 전류"><input value={editForm.specCurrent} onChange={f("specCurrent")} placeholder="예: 2A" className={inputCls} /></FieldRow>
                <FieldRow label="규격 에너지"><input value={editForm.specEnergy} onChange={f("specEnergy")} placeholder="예: 50kJ" className={inputCls} /></FieldRow>
                <FieldRow label="제조사"><input value={editForm.maker} onChange={f("maker")} className={inputCls} /></FieldRow>
                <FieldRow label="제조국"><input value={editForm.makerCountry} onChange={f("makerCountry")} placeholder="예: DE, KR, US" className={inputCls} /></FieldRow>
                <FieldRow label="도입연도"><input type="number" value={editForm.yearIntroduced} onChange={f("yearIntroduced")} className={inputCls} /></FieldRow>
                <FieldRow label="수량"><input type="number" min="1" value={editForm.quantity} onChange={f("quantity")} className={inputCls} /></FieldRow>
                <FieldRow label="상태">
                  <select value={editForm.status} onChange={f("status")} className={inputCls}>
                    {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </FieldRow>
                <FieldRow label="비고"><textarea value={editForm.notes} onChange={f("notes")} rows={2} className={inputCls + " resize-none"} /></FieldRow>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => { setEditMode(false); setSaveErr(""); }}
                    className="flex-1 py-2.5 text-sm font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
                    취소
                  </button>
                  <button onClick={handleSaveInfo} disabled={saving}
                    className={cn("flex-1 py-2.5 text-sm font-medium rounded-lg text-white", saving ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700")}>
                    {saving ? "저장 중..." : "저장"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 rounded-xl divide-y divide-slate-100">
                <InfoRow label="사업장"    value={SITE_LABEL[equipment.siteId] ?? equipment.siteId} highlight />
                <InfoRow label="관리팀"    value={equipment.managingTeam ?? "미지정"} highlight={!!equipment.managingTeam} />
                <InfoRow label="담당자"    value={equipment.ownerName ?? (equipment.ownerId ? `ID: ${equipment.ownerId}` : "미지정")} highlight={!!(equipment.ownerName || equipment.ownerId)} />
                <InfoRow label="유형"      value={equipment.type} />
                <InfoRow label="규격"      value={specStr} />
                <InfoRow label="제조사"    value={`${equipment.maker}${equipment.makerCountry ? ` (${equipment.makerCountry})` : ""}`} />
                <InfoRow label="도입연도"  value={`${equipment.yearIntroduced}년`} />
                <InfoRow label="사용 연수" value={`${2026 - equipment.yearIntroduced}년`} />
                <InfoRow label="수량"      value={`${equipment.quantity}대`} />
                {equipment.notes && <InfoRow label="비고" value={equipment.notes} />}
              </div>
            )}
          </section>

          <Divider />

          {/* ══ 담당자·관리팀 이력 ══ */}
          <section className="px-6 py-5 space-y-4">
            <div className="flex items-center justify-between">
              <SectionTitle>담당자·관리팀 이력</SectionTitle>
              {canEdit && (
                <button onClick={() => setOwnerEditOpen((v) => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  담당자 변경
                </button>
              )}
            </div>

            {ownerEditOpen && (
              <div className="bg-indigo-50/60 rounded-xl p-4 space-y-3 border border-indigo-100">
                {ownerErr && <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">{ownerErr}</p>}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">관리팀</label>
                  <input value={managingTeam} onChange={(e) => setManagingTeam(e.target.value)} placeholder="예: 구미 시험1팀" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">담당자 (시스템 계정)</label>
                  <select value={ownerId} onChange={(e) => { setOwnerId(e.target.value); if (e.target.value) setOwnerName(""); }} className={inputCls}>
                    <option value="">직접 입력 또는 선택 안 함</option>
                    {users.map((u) => <option key={u.id} value={u.id}>{u.name}{u.department ? ` (${u.department})` : ""}</option>)}
                  </select>
                  {selectedUser?.department && <p className="text-xs text-slate-400 mt-0.5">{selectedUser.department}</p>}
                </div>
                {!ownerId && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">담당자명 (직접 입력)</label>
                    <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="예: 홍길동" className={inputCls} />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">변경 사유 (선택)</label>
                  <input value={ownerNote} onChange={(e) => setOwnerNote(e.target.value)} placeholder="예: 인사이동" className={inputCls} />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setOwnerEditOpen(false); setOwnerErr(""); }}
                    className="flex-1 py-2 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-white">취소</button>
                  <button onClick={handleSaveOwner} disabled={ownerSaving}
                    className={cn("flex-1 py-2 text-xs font-medium rounded-lg text-white", ownerSaving ? "bg-indigo-400" : "bg-indigo-600 hover:bg-indigo-700")}>
                    {ownerSaving ? "저장 중..." : "변경 저장"}
                  </button>
                </div>
              </div>
            )}

            {historyLoading ? (
              <p className="py-4 text-center text-sm text-slate-400">불러오는 중...</p>
            ) : ownerHistory.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">변경 이력이 없습니다.</p>
            ) : (
              <div className="relative">
                <div className="absolute left-3 top-2 bottom-2 w-px bg-slate-200" />
                <div className="space-y-3">
                  {ownerHistory.map((h, i) => (
                    <div key={h.id} className="flex gap-3">
                      <div className={cn("shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center z-10 mt-1",
                        i === 0 ? "bg-indigo-600 border-indigo-600" : "bg-white border-slate-300")}>
                        <div className={cn("w-2 h-2 rounded-full", i === 0 ? "bg-white" : "bg-slate-300")} />
                      </div>
                      <div className="flex-1 bg-slate-50 rounded-lg px-3 py-2.5 text-xs space-y-0.5 mb-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-700">{h.ownerName ?? "담당자 미지정"}</span>
                          <span className="text-slate-400 shrink-0">{new Date(h.changedAt).toLocaleDateString("ko-KR")}</span>
                        </div>
                        {h.managingTeam && <p className="text-slate-500">팀: {h.managingTeam}</p>}
                        {h.ownerDept    && <p className="text-slate-500">부서: {h.ownerDept}</p>}
                        <p className="text-slate-400">변경자: {h.changedByName}</p>
                        {h.note && <p className="text-slate-500 italic">&ldquo;{h.note}&rdquo;</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <Divider />

          {/* ══ 수선·고장 이력 ══ */}
          <section className="px-6 py-5 space-y-4">
            <div className="flex items-center justify-between">
              <SectionTitle>
                수선·고장 이력
                {repairs.length > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full">{repairs.length}</span>
                )}
              </SectionTitle>
              {canEdit && (
                <button onClick={() => setShowRepairForm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  수선 등록
                </button>
              )}
            </div>

            {repairsLoading ? (
              <p className="py-4 text-center text-sm text-slate-400">불러오는 중...</p>
            ) : repairs.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-slate-400">수선·고장 이력이 없습니다.</p>
                {canEdit && <p className="text-xs text-slate-300 mt-1">위 버튼으로 등록하세요.</p>}
              </div>
            ) : (
              <div className="space-y-2.5">
                {repairs.map((r) => (
                  <div key={r.id} className="rounded-xl border border-slate-100 bg-white p-4 space-y-2 shadow-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={cn("text-xs font-bold shrink-0", REPAIR_TYPE_COLOR[r.type] ?? "text-slate-600")}>[{r.type}]</span>
                        <p className="text-sm font-medium text-slate-800 truncate">{r.title}</p>
                      </div>
                      <span className={cn("shrink-0 px-2 py-0.5 text-[10px] font-bold rounded-full border", REPAIR_STATUS_STYLE[r.status])}>
                        {r.status}
                      </span>
                    </div>
                    {r.description && <p className="text-xs text-slate-500">{r.description}</p>}
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] text-slate-400">
                      <span>발생: {new Date(r.reportedAt).toLocaleDateString("ko-KR")}</span>
                      {r.completedAt && <span>완료: {new Date(r.completedAt).toLocaleDateString("ko-KR")}</span>}
                      {r.vendor && <span>업체: {r.vendor}</span>}
                      {r.cost != null && <span>비용: {r.cost.toLocaleString()}원</span>}
                      <span>등록자: {r.reportedByName}</span>
                    </div>
                    {r.result && (
                      <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-1.5">
                        <p className="text-xs text-emerald-700"><span className="font-medium">결과:</span> {r.result}</p>
                      </div>
                    )}
                    {r.attachments && r.attachments.length > 0 && (
                      <AttachmentList attachments={r.attachments as AttachmentItem[]} />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* 하단 여백 */}
            <div className="h-6" />
          </section>

          {/* 첨부파일 */}
          <section className="px-6 py-5 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-slate-400" />
              첨부파일
              {savingAttachments && <span className="text-[10px] text-slate-400 font-normal">저장 중...</span>}
            </h3>
            {canEdit ? (
              <AttachmentUploader attachments={attachments} onChange={handleAttachmentsChange} context="equipment" />
            ) : (
              <AttachmentList attachments={attachments} />
            )}
          </section>
        </div>
      </div>

      {showRepairForm && (
        <RepairForm
          equipmentId={equipment.id}
          equipmentName={equipment.name}
          onClose={() => setShowRepairForm(false)}
          onSaved={() => { setShowRepairForm(false); loadRepairs(); }}
        />
      )}
    </>
  );
}

/* ── 작은 헬퍼 컴포넌트 ── */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1">{children}</h3>;
}

function Divider() {
  return <div className="mx-6 border-t border-slate-100" />;
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[90px_1fr] gap-3 items-start">
      <label className="text-xs font-medium text-slate-500 pt-2.5">{label}</label>
      <div>{children}</div>
    </div>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="grid grid-cols-[90px_1fr] gap-3 px-4 py-2.5">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className={cn("text-sm", highlight ? "text-slate-900 font-medium" : "text-slate-600")}>{value}</p>
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
