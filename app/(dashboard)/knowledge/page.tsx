"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Plus, X, Loader2, PlusCircle, Pencil, Trash2,
  Download, FileText, Search, ChevronDown,
} from "lucide-react";

// ── 카테고리 설정 ─────────────────────────────────────────────
const SUBCATEGORIES = [
  "사내규격", "국제규격", "국가규격", "단체규격", "고객규격",
  "Tender", "논문", "특허", "시험성적서", "분석보고서",
  "가이드라인", "매뉴얼", "기타",
] as const;
type SubCat = typeof SUBCATEGORIES[number];

const INTERNAL_CATS = ["재료규격", "공정규격", "설계규격", "기타"] as const;

const FORM_LABEL: Record<SubCat, { code: string; publisher: string; title: string; year: string; codePh: string; publisherPh: string; titlePh: string }> = {
  "사내규격":    { code: "규격 번호 (선택)", publisher: "작성 부서", title: "규격 제목", year: "작성 연도", codePh: "예: 산특-2024-001", publisherPh: "예: 개발부, 품질팀", titlePh: "예: 동선 인장강도 시험 방법" },
  "국제규격":    { code: "규격 번호", publisher: "발행 기관", title: "규격 제목", year: "발행 연도", codePh: "예: IEC 60840", publisherPh: "예: IEC, ISO, CIGRE", titlePh: "예: IEC 60840 Power cables..." },
  "국가규격":    { code: "규격 번호", publisher: "발행 기관", title: "규격 제목", year: "발행 연도", codePh: "예: KS C 3301", publisherPh: "예: 국가기술표준원, ANSI", titlePh: "예: KS C 3301 전력 케이블" },
  "단체규격":    { code: "규격 번호", publisher: "발행 기관", title: "규격 제목", year: "발행 연도", codePh: "예: ASTM B179", publisherPh: "예: ASTM, NFPA, UL", titlePh: "예: ASTM B179 알루미늄합금" },
  "고객규격":    { code: "규격 번호 (선택)", publisher: "고객사", title: "규격 제목", year: "발행 연도", codePh: "예: CUST-2024-001", publisherPh: "예: 한국전력, LS전선", titlePh: "고객 요구 규격 제목" },
  "Tender":      { code: "입찰 번호 (선택)", publisher: "발주처", title: "입찰 제목", year: "발행 연도", codePh: "예: TND-2024-001", publisherPh: "예: 한국전력, 해외 발주처", titlePh: "입찰 문서 제목" },
  "논문":        { code: "DOI / 논문 번호 (선택)", publisher: "학술지 / 학회", title: "논문 제목", year: "발행 연도", codePh: "예: 10.1109/...", publisherPh: "예: IEEE, CIGRE", titlePh: "논문 제목 입력" },
  "특허":        { code: "특허 번호", publisher: "특허청 / 출원인", title: "특허 제목", year: "출원 연도", codePh: "예: KR102024001234", publisherPh: "예: 특허청, LS전선", titlePh: "특허 명칭 입력" },
  "시험성적서":  { code: "보고서 번호 (선택)", publisher: "시험 기관", title: "시험 항목", year: "시험 연도", codePh: "예: RPT-2024-001", publisherPh: "예: KEMA, TÜV", titlePh: "시험 항목 및 케이블 사양" },
  "분석보고서":  { code: "보고서 번호 (선택)", publisher: "작성 부서", title: "분석 제목", year: "작성 연도", codePh: "예: ANL-2024-001", publisherPh: "예: 품질팀, 기술연구소", titlePh: "분석 주제 입력" },
  "가이드라인":  { code: "문서 번호 (선택)", publisher: "작성 부서 / 기관", title: "가이드라인 제목", year: "작성 연도", codePh: "예: GDL-2024-001", publisherPh: "예: 내부, 외부 기관", titlePh: "가이드라인 제목 입력" },
  "매뉴얼":      { code: "문서 번호 (선택)", publisher: "작성 부서 / 기관", title: "매뉴얼 제목", year: "작성 연도", codePh: "예: MAN-2024-001", publisherPh: "예: 품질팀, 연구소", titlePh: "매뉴얼 제목 입력" },
  "기타":        { code: "문서 번호 (선택)", publisher: "작성 부서 / 기관", title: "문서 제목", year: "작성 연도", codePh: "예: DOC-2024-001", publisherPh: "예: 내부, 외부 기관", titlePh: "문서 제목 입력" },
};

// ── 내부 표준 타입 ─────────────────────────────────────────────
type InternalItem = {
  id: string;
  title: string;
  code?: string;
  subCategory: string;
  internalCat?: string;
  publisher: string;
  publishYear: string;
  summary: string;
  keywords: string[];
  fileUrl?: string;
  fileSize?: string;
};

// ── 파일 업로드 ────────────────────────────────────────────────
async function uploadFile(file: File) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("context", "internal-standards");
  const res = await fetch("/api/attachments/upload", { method: "POST", body: fd });
  if (!res.ok) return null;
  return res.json() as Promise<{ url: string; name: string; size: number }>;
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────
export default function KnowledgeRegisterPage() {
  // 선택된 서브카테고리
  const [selectedCat, setSelectedCat] = useState<SubCat>("사내규격");

  // 등록된 사내 항목 목록
  const [items, setItems] = useState<InternalItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listSearch, setListSearch] = useState("");

  // 신규 등록 폼 상태
  const [showForm, setShowForm] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newPublisher, setNewPublisher] = useState("내부");
  const [newYear, setNewYear] = useState(String(new Date().getFullYear()));
  const [newInternalCat, setNewInternalCat] = useState("재료규격");
  const [newSummary, setNewSummary] = useState("");
  const [newKeywords, setNewKeywords] = useState("");
  const [newFile, setNewFile] = useState<File | null>(null);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // 수정 상태
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: "", code: "", internalCat: "재료규격", description: "", publisher: "", publishYear: "", keywords: "" });
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 목록 로드
  useEffect(() => {
    setListLoading(true);
    fetch("/api/knowledge/assets")
      .then(r => r.json())
      .then(d => {
        const internal = (d.assets ?? [])
          .filter((a: { isInternal?: boolean }) => a.isInternal)
          .map((a: {
            internalId?: string; title: string; code?: string;
            subCategory: string; internalCat?: string; publisher: string;
            publishYear: string; summary: string; keywords: string[];
            linkUrl?: string; fileSize?: string;
          }) => ({
            id: a.internalId,
            title: a.title,
            code: a.code,
            subCategory: a.subCategory,
            internalCat: a.internalCat,
            publisher: a.publisher,
            publishYear: a.publishYear,
            summary: a.summary,
            keywords: a.keywords,
            fileUrl: a.linkUrl,
            fileSize: a.fileSize,
          }));
        setItems(internal);
      })
      .catch(() => {})
      .finally(() => setListLoading(false));
  }, []);

  // 현재 서브카테고리 항목 필터링
  const filteredItems = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    return items
      .filter(i => i.subCategory === selectedCat)
      .filter(i => !q || i.title.toLowerCase().includes(q) || (i.code ?? "").toLowerCase().includes(q) || i.publisher.toLowerCase().includes(q));
  }, [items, selectedCat, listSearch]);

  // 폼 초기화
  function resetForm() {
    setNewCode(""); setNewTitle(""); setNewPublisher("내부");
    setNewYear(String(new Date().getFullYear())); setNewInternalCat("재료규격");
    setNewSummary(""); setNewKeywords(""); setNewFile(null); setFormError("");
  }

  // 등록
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setFormSaving(true); setFormError("");
    try {
      let fileUrl: string | undefined, fileName: string | undefined, fileSize: number | undefined;
      if (newFile) {
        const up = await uploadFile(newFile);
        if (!up) { setFormError("파일 업로드 실패"); setFormSaving(false); return; }
        fileUrl = up.url; fileName = up.name; fileSize = up.size;
      }
      const res = await fetch("/api/internal-standards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(), code: newCode.trim() || null,
          subCategory: selectedCat, internalCat: newInternalCat,
          description: newSummary.trim(), publisher: newPublisher.trim(),
          publishYear: newYear, keywords: newKeywords.split(",").map(k => k.trim()).filter(Boolean),
          fileUrl, fileName, fileSize,
        }),
      });
      const d = await res.json();
      if (!res.ok) { setFormError(d.error ?? "저장 실패"); return; }
      const std = d.standard;
      setItems(prev => [{
        id: std.id, title: std.title, code: std.code ?? undefined,
        subCategory: std.subCategory, internalCat: std.internalCat,
        publisher: std.publisher, publishYear: std.publishYear ?? "-",
        summary: std.description, keywords: std.keywords,
        fileUrl: std.fileUrl ?? undefined,
        fileSize: std.fileSize ? `${(std.fileSize / 1024 / 1024).toFixed(1)} MB` : undefined,
      }, ...prev]);
      resetForm(); setShowForm(false);
    } finally {
      setFormSaving(false);
    }
  }

  // 수정 시작
  function startEdit(item: InternalItem) {
    setEditingId(item.id);
    setEditForm({ title: item.title, code: item.code ?? "", internalCat: item.internalCat ?? "재료규격", description: item.summary, publisher: item.publisher, publishYear: item.publishYear, keywords: item.keywords.join(", ") });
    setEditFile(null); setEditError("");
  }

  // 수정 저장
  async function handleEditSave(item: InternalItem) {
    if (!editForm.title.trim()) return;
    setEditSaving(true); setEditError("");
    try {
      let fileUrl: string | undefined, fileName: string | undefined, fileSize: number | undefined;
      if (editFile) {
        const up = await uploadFile(editFile);
        if (!up) { setEditError("파일 업로드 실패"); setEditSaving(false); return; }
        fileUrl = up.url; fileName = up.name; fileSize = up.size;
      }
      const body = {
        title: editForm.title.trim(), code: editForm.code.trim() || null,
        internalCat: editForm.internalCat, description: editForm.description.trim(),
        publisher: editForm.publisher.trim(), publishYear: editForm.publishYear.trim(),
        keywords: editForm.keywords.split(",").map(k => k.trim()).filter(Boolean),
        ...(editFile ? { fileUrl, fileName, fileSize } : {}),
      };
      const res = await fetch(`/api/internal-standards/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await res.json();
      if (!res.ok) { setEditError(d.error ?? "수정 실패"); return; }
      const std = d.standard;
      setItems(prev => prev.map(i => i.id === item.id ? {
        ...i, title: std.title, code: std.code ?? undefined, internalCat: std.internalCat,
        summary: std.description, publisher: std.publisher, publishYear: std.publishYear ?? "-",
        keywords: std.keywords,
        ...(editFile ? { fileUrl: std.fileUrl ?? undefined, fileSize: std.fileSize ? `${(std.fileSize / 1024 / 1024).toFixed(1)} MB` : undefined } : {}),
      } : i));
      setEditingId(null);
    } finally {
      setEditSaving(false);
    }
  }

  // 삭제
  async function handleDelete(item: InternalItem) {
    if (!confirm(`"${item.title}" 을(를) 삭제하시겠습니까?`)) return;
    setDeletingId(item.id);
    const res = await fetch(`/api/internal-standards/${item.id}`, { method: "DELETE" });
    if (res.ok) setItems(prev => prev.filter(i => i.id !== item.id));
    setDeletingId(null);
  }

  const lbl = FORM_LABEL[selectedCat];
  const totalInternal = items.length;

  return (
    <div className="flex flex-col gap-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">지식/규격 등록</h1>
        <p className="text-slate-500">사내규격·국제규격·국가규격·단체규격·기술자료 등을 등록·수정·삭제합니다.</p>
      </div>

      {/* 카테고리 탭 */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 pt-4 pb-0 border-b border-slate-100">
          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mb-2">등록 유형 선택</p>
          <div className="flex gap-1 flex-wrap">
            {SUBCATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => { setSelectedCat(cat); setShowForm(false); resetForm(); setEditingId(null); }}
                className={`px-3 py-1.5 rounded-t-lg text-xs font-bold transition-all border-b-2 ${
                  selectedCat === cat
                    ? "bg-slate-950 text-white border-slate-950"
                    : "text-slate-500 hover:text-slate-800 border-transparent hover:bg-slate-50"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* 등록 폼 영역 */}
        <div className="p-5">
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" /> {selectedCat} 신규 등록
            </button>
          ) : (
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-violet-900 flex items-center gap-1.5">
                  <PlusCircle className="w-4 h-4 text-violet-600" /> {selectedCat} 신규 등록
                </h3>
                <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="p-1 rounded hover:bg-slate-100">
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>
              {formError && <p className="text-xs text-rose-600 bg-rose-50 rounded px-3 py-2 font-bold">{formError}</p>}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                {selectedCat === "사내규격" && (
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">사내 분류</label>
                    <select value={newInternalCat} onChange={e => setNewInternalCat(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white">
                      {INTERNAL_CATS.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                )}
                <div className="space-y-1">
                  <label className="font-bold text-slate-600">{lbl.code}</label>
                  <input value={newCode} onChange={e => setNewCode(e.target.value)} placeholder={lbl.codePh}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white" />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-600">{lbl.publisher}</label>
                  <input value={newPublisher} onChange={e => setNewPublisher(e.target.value)} placeholder={lbl.publisherPh}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                <div className="md:col-span-3 space-y-1">
                  <label className="font-bold text-slate-600">{lbl.title} <span className="text-rose-500">*</span></label>
                  <input required value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder={lbl.titlePh}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white" />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-600">{lbl.year}</label>
                  <input value={newYear} onChange={e => setNewYear(e.target.value)} placeholder="YYYY"
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600">핵심 요약</label>
                  <textarea rows={3} value={newSummary} onChange={e => setNewSummary(e.target.value)}
                    placeholder="적용 범위, 핵심 요건, 합격 기준 등을 요약해 주세요."
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white resize-none" />
                </div>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">키워드 (쉼표 구분)</label>
                    <input value={newKeywords} onChange={e => setNewKeywords(e.target.value)} placeholder="예: 케이블, 절연, IEC"
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">파일 첨부 (PDF)</label>
                    <input type="file" accept=".pdf,.doc,.docx" onChange={e => setNewFile(e.target.files?.[0] ?? null)}
                      className="w-full text-xs text-slate-500 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-violet-50 file:text-violet-700 file:font-bold file:cursor-pointer hover:file:bg-violet-100" />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-1">
                <button type="button" onClick={() => { setShowForm(false); resetForm(); }}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                  취소
                </button>
                <button type="submit" disabled={formSaving || !newTitle.trim()}
                  className="px-5 py-2 text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-xl transition-colors flex items-center gap-1.5">
                  {formSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlusCircle className="w-3.5 h-3.5" />}
                  {formSaving ? "저장 중…" : "등록"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* 등록 내역 테이블 */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-extrabold text-slate-800">
              {selectedCat} 등록 내역
              <span className="ml-2 text-xs font-bold text-slate-400">
                {listLoading ? "…" : `${filteredItems.length}건`}
              </span>
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">직접 등록한 사내 문서만 수정·삭제 가능합니다 (총 사내 등록 {totalInternal}건)</p>
          </div>
          <div className="relative shrink-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              value={listSearch} onChange={e => setListSearch(e.target.value)}
              placeholder="제목·번호·기관 검색"
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 w-48"
            />
          </div>
        </div>

        {listLoading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> 불러오는 중…
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
            {listSearch ? "검색 결과가 없습니다." : `등록된 ${selectedCat} 항목이 없습니다.`}
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filteredItems.map(item => (
              <div key={item.id} className="px-5 py-3">
                {editingId === item.id ? (
                  /* 인라인 수정 폼 */
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center gap-2 mb-1">
                      <Pencil className="w-3.5 h-3.5 text-violet-600" />
                      <span className="font-bold text-violet-800">수정 중</span>
                      {editError && <span className="text-rose-600 font-bold">{editError}</span>}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {item.subCategory === "사내규격" && (
                        <select value={editForm.internalCat} onChange={e => setEditForm(f => ({ ...f, internalCat: e.target.value }))}
                          className="border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500 bg-white">
                          {INTERNAL_CATS.map(c => <option key={c}>{c}</option>)}
                        </select>
                      )}
                      <input value={editForm.code} onChange={e => setEditForm(f => ({ ...f, code: e.target.value }))} placeholder="규격 번호 (선택)"
                        className="border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500 bg-white" />
                      <input value={editForm.publisher} onChange={e => setEditForm(f => ({ ...f, publisher: e.target.value }))} placeholder="발행 기관"
                        className="border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500 bg-white" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                      <input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} placeholder="제목 *"
                        className="md:col-span-3 border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500 bg-white" />
                      <input value={editForm.publishYear} onChange={e => setEditForm(f => ({ ...f, publishYear: e.target.value }))} placeholder="연도"
                        className="border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500 bg-white" />
                    </div>
                    <textarea rows={2} value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} placeholder="요약"
                      className="w-full border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500 bg-white resize-none" />
                    <input value={editForm.keywords} onChange={e => setEditForm(f => ({ ...f, keywords: e.target.value }))} placeholder="키워드 (쉼표 구분)"
                      className="w-full border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500 bg-white" />
                    <input type="file" accept=".pdf,.doc,.docx" onChange={e => setEditFile(e.target.files?.[0] ?? null)}
                      className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-violet-50 file:text-violet-700 file:text-xs file:font-bold file:cursor-pointer" />
                    <div className="flex gap-2">
                      <button onClick={() => handleEditSave(item)} disabled={editSaving}
                        className="px-4 py-1.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-lg flex items-center gap-1.5 disabled:opacity-50 transition-colors">
                        {editSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Pencil className="w-3.5 h-3.5" />}
                        {editSaving ? "저장 중…" : "저장"}
                      </button>
                      <button onClick={() => setEditingId(null)}
                        className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors">
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  /* 일반 행 */
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.internalCat && (
                          <span className="text-[9px] font-extrabold px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded">{item.internalCat}</span>
                        )}
                        {item.code && (
                          <span className="text-[9px] font-bold text-slate-400 font-mono">{item.code}</span>
                        )}
                        <span className="text-[10px] text-slate-400">{item.publisher} · {item.publishYear}</span>
                      </div>
                      <p className="text-sm font-bold text-slate-900 leading-snug truncate">{item.title}</p>
                      {item.keywords.length > 0 && (
                        <div className="flex gap-1 flex-wrap mt-0.5">
                          {item.keywords.slice(0, 4).map(k => (
                            <span key={k} className="text-[9px] bg-slate-100 text-slate-600 rounded px-1.5 py-0.5">#{k}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.fileUrl && (
                        <a href={item.fileUrl} target="_blank" rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 transition-colors" title="파일 다운로드">
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button onClick={() => startEdit(item)}
                        className="p-1.5 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-600 transition-colors" title="수정">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(item)} disabled={deletingId === item.id}
                        className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-500 transition-colors disabled:opacity-50" title="삭제">
                        {deletingId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
