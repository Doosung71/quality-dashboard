"use client";

import { useState, useMemo, useEffect } from "react";
import type {
  KnowledgeAsset,
  KnowledgeCategory,
  KnowledgeSubCategory
} from "@/types/knowledge";
import { MarkdownContent } from "@/components/ui/markdown-content";
import {
  Folder,
  FolderOpen,
  FileText,
  Search,
  Plus,
  X,
  PlusCircle,
  Eye,
  Maximize2,
  Calendar,
  BookOpen,
  Layers,
  Award,
  BookMarked,
  ChevronLeft,
  Loader2,
  Download,
  Pencil,
  Trash2,
  Upload,
} from "lucide-react";

interface KnowledgeRepositoryProps {
  data: { assets: KnowledgeAsset[] };
  repoLoading?: boolean;
  readOnly?: boolean;
  onCardClick?: (asset: KnowledgeAsset) => void;
}

const CATEGORY_MAP: Record<KnowledgeCategory, { label: string; bg: string; text: string; border: string }> = {
  "Standards": { label: "규격 (Standards)", bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-100" },
  "TechnicalDocs": { label: "기술자료 (Docs)", bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-100" },
  "Reports": { label: "보고서 (Reports)", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-100" },
  "Others": { label: "기타 (Others)", bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" }
};

const SUB_CATEGORIES_BY_MAIN: Record<KnowledgeCategory, KnowledgeSubCategory[]> = {
  "Standards": ["사내규격", "국제규격", "국가규격", "단체규격", "고객규격", "Tender"],
  "TechnicalDocs": ["논문", "특허"],
  "Reports": ["시험성적서", "분석보고서"],
  "Others": ["가이드라인", "매뉴얼", "기타"]
};

const INTERNAL_CATS = ["재료규격", "공정규격", "설계규격", "기타"] as const;

type FormConfig = {
  codeLabel: string;
  codePlaceholder: string;
  publisherLabel: string;
  publisherPlaceholder: string;
  titleLabel: string;
  titlePlaceholder: string;
  yearLabel: string;
  summaryPlaceholder: string;
  keywordsPlaceholder: string;
  fileLabel: string;
};

const FORM_CONFIG: Record<string, FormConfig> = {
  "사내규격": {
    codeLabel: "규격 번호 (선택)", codePlaceholder: "예: 산특-2024-001",
    publisherLabel: "작성 부서", publisherPlaceholder: "예: 개발부, 품질팀",
    titleLabel: "규격 제목", titlePlaceholder: "예: 동선 인장강도 시험 방법",
    yearLabel: "작성 연도", summaryPlaceholder: "규격 핵심 내용, 적용 범위, 합격 기준 등을 정리해 주세요.",
    keywordsPlaceholder: "예: 동선, 인장강도, 재료시험", fileLabel: "PDF / 문서 첨부 (선택)",
  },
  "국제규격": {
    codeLabel: "규격 번호", codePlaceholder: "예: IEC 60840, ISO 11801",
    publisherLabel: "발행 기관", publisherPlaceholder: "예: IEC, ISO, IEEE, CIGRE",
    titleLabel: "규격 제목", titlePlaceholder: "예: IEC 60840 Power cables with extruded insulation",
    yearLabel: "발행 연도", summaryPlaceholder: "규격의 적용 범위, 핵심 기술 요건, 합격 기준 등을 요약해 주세요.",
    keywordsPlaceholder: "예: 케이블, 절연, 초고압", fileLabel: "PDF 파일 첨부 (선택)",
  },
  "국가규격": {
    codeLabel: "규격 번호", codePlaceholder: "예: KS C 3301, ANSI/NEMA WC 71",
    publisherLabel: "발행 기관", publisherPlaceholder: "예: 국가기술표준원, ANSI, DIN",
    titleLabel: "규격 제목", titlePlaceholder: "예: KS C 3301 전력 케이블 일반 요구사항",
    yearLabel: "발행 연도", summaryPlaceholder: "규격의 적용 범위, 주요 기술 요건 등을 요약해 주세요.",
    keywordsPlaceholder: "예: KS, 전력케이블, 국가규격", fileLabel: "PDF 파일 첨부 (선택)",
  },
  "단체규격": {
    codeLabel: "규격 번호", codePlaceholder: "예: ASTM B179, NFPA 70, API 5L",
    publisherLabel: "발행 기관", publisherPlaceholder: "예: ASTM, NFPA, API, SAE, UL",
    titleLabel: "규격 제목", titlePlaceholder: "예: ASTM B179 알루미늄 합금 주물용 주괴",
    yearLabel: "발행 연도", summaryPlaceholder: "규격의 적용 범위, 주요 요구사항 등을 요약해 주세요.",
    keywordsPlaceholder: "예: ASTM, 알루미늄, 주물", fileLabel: "PDF 파일 첨부 (선택)",
  },
  "고객규격": {
    codeLabel: "사양서 번호 (선택)", codePlaceholder: "예: KEPCO-SPS-2024-001",
    publisherLabel: "고객 / 발주처", publisherPlaceholder: "예: KEPCO, 한전, LS전선 고객사",
    titleLabel: "사양서 제목", titlePlaceholder: "예: KEPCO 345kV 케이블 기술 사양서",
    yearLabel: "발행 연도", summaryPlaceholder: "고객 요구사항, 적용 범위, 핵심 기술 조건 등을 요약해 주세요.",
    keywordsPlaceholder: "예: KEPCO, 345kV, 고객규격", fileLabel: "PDF / 사양서 첨부 (선택)",
  },
  "Tender": {
    codeLabel: "입찰 번호 (선택)", codePlaceholder: "예: KEPCO-2026-T-001",
    publisherLabel: "발주처", publisherPlaceholder: "예: KEPCO, 한국전력, 해외 발주처",
    titleLabel: "입찰 건명", titlePlaceholder: "예: 345kV 초고압 케이블 공급 입찰",
    yearLabel: "입찰 연도", summaryPlaceholder: "입찰 개요, 납품 범위, 주요 기술 요건 등을 요약해 주세요.",
    keywordsPlaceholder: "예: KEPCO, 345kV, 입찰, Tender", fileLabel: "입찰 서류 첨부 (선택)",
  },
  "논문": {
    codeLabel: "DOI / 논문 ID (선택)", codePlaceholder: "예: 10.1109/TPWRD.2024.000001",
    publisherLabel: "학회 / 저널명", publisherPlaceholder: "예: IEEE TPWRD, CIGRE, 대한전기학회",
    titleLabel: "논문 제목", titlePlaceholder: "예: 고압 케이블 절연 열화 특성 분석 연구",
    yearLabel: "발표 연도", summaryPlaceholder: "연구 목적, 주요 연구 방법, 핵심 결론 등을 요약해 주세요.",
    keywordsPlaceholder: "예: 케이블 절연, 열화 분석, XLPE", fileLabel: "논문 PDF 첨부 (선택)",
  },
  "특허": {
    codeLabel: "특허 번호", codePlaceholder: "예: KR10-2024-0012345, US11234567",
    publisherLabel: "출원인 / 발명자", publisherPlaceholder: "예: LS전선 (주), 홍길동",
    titleLabel: "특허 명칭", titlePlaceholder: "예: 케이블 절연 피복 제조 방법 및 그 장치",
    yearLabel: "출원 연도", summaryPlaceholder: "발명의 목적, 주요 기술 특징, 적용 분야 등을 요약해 주세요.",
    keywordsPlaceholder: "예: 절연피복, 제조방법, 케이블특허", fileLabel: "특허 문서 첨부 (선택)",
  },
  "시험성적서": {
    codeLabel: "성적서 번호", codePlaceholder: "예: TR-2026-001",
    publisherLabel: "시험 기관", publisherPlaceholder: "예: KERI, UL, TÜV, 내부 품질팀",
    titleLabel: "성적서 제목", titlePlaceholder: "예: IEC 60840 케이블 절연 내압 시험 성적서",
    yearLabel: "시험 연도", summaryPlaceholder: "시험 품목, 적용 규격, 시험 결과 및 합격 여부를 요약해 주세요.",
    keywordsPlaceholder: "예: 내압시험, IEC60840, 합격", fileLabel: "성적서 PDF 첨부",
  },
  "분석보고서": {
    codeLabel: "보고서 번호 (선택)", codePlaceholder: "예: AR-2026-Q1-001",
    publisherLabel: "작성 부서 / 기관", publisherPlaceholder: "예: 품질팀, 연구소, 외부 기관",
    titleLabel: "보고서 제목", titlePlaceholder: "예: 2026년 1분기 케이블 부적합품 원인 분석",
    yearLabel: "작성 연도", summaryPlaceholder: "분석 배경, 조사 범위, 핵심 원인 및 개선 방안을 요약해 주세요.",
    keywordsPlaceholder: "예: 원인분석, 부적합품, 개선조치", fileLabel: "보고서 PDF 첨부 (선택)",
  },
  "_default": {
    codeLabel: "문서 번호 (선택)", codePlaceholder: "예: DOC-2026-001",
    publisherLabel: "출처 / 작성자", publisherPlaceholder: "예: 내부, 외부 기관",
    titleLabel: "문서 제목", titlePlaceholder: "문서 제목을 입력해 주세요.",
    yearLabel: "작성 연도", summaryPlaceholder: "문서의 주요 내용을 요약해 주세요.",
    keywordsPlaceholder: "예: 키워드1, 키워드2", fileLabel: "파일 첨부 (선택)",
  },
};

export function KnowledgeRepository({ data, repoLoading = false, readOnly = false, onCardClick }: KnowledgeRepositoryProps) {
  const [assets, setAssets] = useState<KnowledgeAsset[]>(data.assets);
  const [selectedAssetId, setSelectedAssetId] = useState<string>(data.assets[0]?.id || "");

  useEffect(() => {
    setAssets(data.assets);
    setSelectedAssetId(data.assets[0]?.id || "");
    setContentText(null);
    setMobileView("list");
  }, [data]);

  // 자산 변경 시 이전 내용·모달 즉시 초기화
  useEffect(() => {
    setContentText(null);
    setContentLoading(false);
    setShowModal(false);
  }, [selectedAssetId]);
  
  // 트리 구조 네비게이션 상태
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    "Standards": true,
    "TechnicalDocs": true,
    "Reports": true,
    "Others": true
  });
  const [selectedTreeCategory, setSelectedTreeCategory] = useState<KnowledgeCategory | "ALL">("ALL");
  const [selectedTreeSubCategory, setSelectedTreeSubCategory] = useState<KnowledgeSubCategory | "ALL">("ALL");

  // 검색어 필터
  const [searchQuery, setSearchQuery] = useState("");

  // 신규 자산 등록 폼 상태
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSubCategory, setNewSubCategory] = useState<string>("사내규격");
  const [newTitle, setNewTitle] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newInternalCat, setNewInternalCat] = useState("재료규격");
  const [newPublisher, setNewPublisher] = useState("내부");
  const [newPublishYear, setNewPublishYear] = useState(String(new Date().getFullYear()));
  const [newSummary, setNewSummary] = useState("");
  const [newKeywords, setNewKeywords] = useState("");
  const [newFile, setNewFile] = useState<File | null>(null);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // 편집 상태
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: "", code: "", internalCat: "재료규격", description: "", publisher: "", publishYear: "", keywords: "" });
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function uploadFile(file: File): Promise<{ url: string; name: string; size: number } | null> {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("context", "internal-standards");
    const res = await fetch("/api/attachments/upload", { method: "POST", body: fd });
    if (!res.ok) return null;
    return res.json();
  }

  // 선택된 자산 상세
  const selectedAsset = useMemo(() => {
    return assets.find(a => a.id === selectedAssetId) || null;
  }, [assets, selectedAssetId]);

  // 카테고리 토글
  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [cat]: !prev[cat]
    }));
  };

  // 트리 메뉴 클릭
  const handleTreeClick = (category: KnowledgeCategory | "ALL", subCategory: KnowledgeSubCategory | "ALL") => {
    setSelectedTreeCategory(category);
    setSelectedTreeSubCategory(subCategory);
    setSelectedAssetId("");
    setContentText(null);
    setShowAddForm(false);
    if (subCategory !== "ALL") setNewSubCategory(subCategory);
    setMobileView("list");
  };

  // KPI 요약 분석
  const kpis = useMemo(() => {
    const total = assets.length;
    const standardsCount = assets.filter(a => a.category === "Standards").length;
    const docsCount = assets.filter(a => a.category === "TechnicalDocs").length;
    const reportsCount = assets.filter(a => a.category === "Reports").length;

    return {
      total,
      standardsCount,
      docsCount,
      reportsCount
    };
  }, [assets]);

  // 필터링된 자산 목록
  const filteredAssets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = assets.filter(a => {
      if (selectedTreeCategory !== "ALL" && a.category !== selectedTreeCategory) return false;
      if (selectedTreeSubCategory !== "ALL" && a.subCategory !== selectedTreeSubCategory) return false;
      if (q) {
        const matchesTitle = a.title.toLowerCase().includes(q);
        const matchesCode = a.code?.toLowerCase().includes(q) ?? false;
        const matchesPublisher = a.publisher.toLowerCase().includes(q);
        const matchesKeywords = a.keywords.some(k => k.toLowerCase().includes(q));
        const matchesSummary = a.summary.toLowerCase().includes(q);
        if (!matchesTitle && !matchesCode && !matchesPublisher && !matchesKeywords && !matchesSummary) return false;
      }
      return true;
    });

    // 검색어 있으면 제목·코드 직접 매칭 우선, 없으면 연도 내림차순
    if (q) {
      filtered.sort((a, b) => {
        const aExact = (a.title.toLowerCase().includes(q) || (a.code?.toLowerCase().includes(q) ?? false)) ? 0 : 1;
        const bExact = (b.title.toLowerCase().includes(q) || (b.code?.toLowerCase().includes(q) ?? false)) ? 0 : 1;
        return aExact - bExact;
      });
    } else {
      filtered.sort((a, b) => b.publishYear.localeCompare(a.publishYear));
    }
    return filtered;
  }, [assets, selectedTreeCategory, selectedTreeSubCategory, searchQuery]);

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setFormSaving(true);
    setFormError("");
    try {
      let fileUrl: string | undefined, fileName: string | undefined, fileSize: number | undefined;
      if (newFile) {
        const uploaded = await uploadFile(newFile);
        if (!uploaded) { setFormError("파일 업로드에 실패했습니다."); setFormSaving(false); return; }
        fileUrl = uploaded.url; fileName = uploaded.name; fileSize = uploaded.size;
      }
      const keywords = newKeywords.split(",").map(k => k.trim()).filter(Boolean);
      const res = await fetch("/api/internal-standards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim(), code: newCode.trim() || null, subCategory: newSubCategory, internalCat: newInternalCat, description: newSummary.trim(), publisher: newPublisher.trim(), publishYear: newPublishYear, fileUrl, fileName, fileSize, keywords }),
      });
      const d = await res.json();
      if (!res.ok) { setFormError(d.error ?? "저장 실패"); setFormSaving(false); return; }
      const std = d.standard;
      const newAsset: KnowledgeAsset = {
        id: `IS-${std.id}`, category: "Standards", subCategory: (std.subCategory as KnowledgeSubCategory) || "사내규격",
        title: std.title, code: std.code ?? undefined, publisher: std.publisher,
        publishYear: std.publishYear || "-", summary: std.description,
        fileSize: std.fileSize ? `${(std.fileSize / 1024 / 1024).toFixed(1)} MB` : undefined,
        keywords: std.keywords, linkUrl: std.fileUrl ?? undefined,
        isInternal: true, internalId: std.id, internalCat: std.internalCat,
      };
      setAssets(prev => [newAsset, ...prev]);
      setSelectedAssetId(newAsset.id);
      setNewTitle(""); setNewCode(""); setNewPublisher("내부"); setNewPublishYear(String(new Date().getFullYear()));
      setNewSummary(""); setNewKeywords(""); setNewFile(null); setShowAddForm(false);
    } finally {
      setFormSaving(false);
    }
  };

  const startEdit = (asset: KnowledgeAsset) => {
    setEditingId(asset.internalId!);
    setEditForm({ title: asset.title, code: asset.code ?? "", internalCat: asset.internalCat ?? "재료규격", description: asset.summary, publisher: asset.publisher, publishYear: asset.publishYear, keywords: asset.keywords.join(", ") });
    setEditFile(null); setEditError("");
  };

  const handleEditSave = async (asset: KnowledgeAsset) => {
    if (!editForm.title.trim()) return;
    setEditSaving(true); setEditError("");
    try {
      let fileUrl: string | undefined, fileName: string | undefined, fileSize: number | undefined;
      if (editFile) {
        const uploaded = await uploadFile(editFile);
        if (!uploaded) { setEditError("파일 업로드 실패"); setEditSaving(false); return; }
        fileUrl = uploaded.url; fileName = uploaded.name; fileSize = uploaded.size;
      }
      const keywords = editForm.keywords.split(",").map(k => k.trim()).filter(Boolean);
      const body = { title: editForm.title.trim(), code: editForm.code.trim() || null, internalCat: editForm.internalCat, description: editForm.description.trim(), publisher: editForm.publisher.trim(), publishYear: editForm.publishYear.trim(), keywords, ...(editFile ? { fileUrl, fileName, fileSize } : {}) };
      const res = await fetch(`/api/internal-standards/${asset.internalId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await res.json();
      if (!res.ok) { setEditError(d.error ?? "수정 실패"); setEditSaving(false); return; }
      const std = d.standard;
      setAssets(prev => prev.map(a => a.internalId === asset.internalId ? {
        ...a, title: std.title, code: std.code ?? undefined, internalCat: std.internalCat,
        summary: std.description, publisher: std.publisher, publishYear: std.publishYear || "-",
        keywords: std.keywords,
        ...(editFile ? { linkUrl: std.fileUrl ?? undefined, fileSize: std.fileSize ? `${(std.fileSize / 1024 / 1024).toFixed(1)} MB` : undefined } : {}),
      } : a));
      setEditingId(null);
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (asset: KnowledgeAsset) => {
    setDeletingId(asset.internalId!);
    const res = await fetch(`/api/internal-standards/${asset.internalId}`, { method: "DELETE" });
    if (res.ok) {
      const remaining = assets.filter(a => a.internalId !== asset.internalId);
      setAssets(remaining);
      setSelectedAssetId(remaining[0]?.id ?? "");
    }
    setDeletingId(null);
  };

  const [contentText, setContentText] = useState<string | null>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");

  const handleViewContent = async (asset: KnowledgeAsset, autoOpenModal = false) => {
    if (!asset.sourcePath) return;
    setContentText(null);
    setContentLoading(true);
    try {
      const res = await fetch(`/api/knowledge/content?path=${encodeURIComponent(asset.sourcePath)}`);
      const data = await res.json();
      setContentText(data.text || "내용 없음");
      if (autoOpenModal) setShowModal(true);
    } catch {
      setContentText("내용을 불러오는 데 실패했습니다.");
    } finally {
      setContentLoading(false);
    }
  };

  return (
    <>
    {/* 크게 보기 모달 */}
    {showModal && contentText && selectedAsset && (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 sm:p-8" onClick={() => setShowModal(false)}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
            <div className="space-y-0.5 min-w-0">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{selectedAsset.publisher} · {selectedAsset.publishYear}</p>
              <h2 className="text-sm font-black text-slate-900 truncate">{selectedAsset.title}</h2>
            </div>
            <button onClick={() => setShowModal(false)} className="ml-4 p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-all shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-y-auto flex-1 px-8 py-6">
            <MarkdownContent content={contentText} className="text-sm" />
          </div>
        </div>
      </div>
    )}
    <div className="space-y-6">
          {/* 1. 지식자산 요약 KPI */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-[10px] font-semibold text-slate-500 tracking-wider">등록 지식자산</p>
                <h3 className="text-xl font-bold text-slate-900">
                  {repoLoading ? <span className="text-slate-300 animate-pulse">…</span> : `${kpis.total}건`}
                </h3>
              </div>
              <div className="w-10 h-10 bg-slate-50 text-slate-500 rounded-xl flex items-center justify-center">
                <BookOpen className="w-5.5 h-5.5" />
              </div>
            </div>

            <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-[10px] font-semibold text-slate-500 tracking-wider">규격 (Standards)</p>
                <h3 className="text-xl font-bold text-indigo-600">{kpis.standardsCount}건</h3>
              </div>
              <div className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center">
                <Award className="w-5.5 h-5.5" />
              </div>
            </div>

            <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-[10px] font-semibold text-slate-500 tracking-wider">기술자료 (Docs)</p>
                <h3 className="text-xl font-bold text-teal-600">{kpis.docsCount}건</h3>
              </div>
              <div className="w-10 h-10 bg-teal-50 text-teal-500 rounded-xl flex items-center justify-center">
                <FileText className="w-5.5 h-5.5" />
              </div>
            </div>

            <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-[10px] font-semibold text-slate-500 tracking-wider">검사/원인 보고서</p>
                <h3 className="text-xl font-bold text-amber-600">{kpis.reportsCount}건</h3>
              </div>
              <div className="w-10 h-10 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center">
                <Layers className="w-5.5 h-5.5" />
              </div>
            </div>
          </div>

          {/* 2. 트리 브라우징 & 메인 패널 */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:h-[calc(100vh-300px)] lg:min-h-[360px]">

            {/* 좌측: 카테고리 트리 네비게이션 (데스크탑만) */}
            <div className="hidden md:block lg:col-span-1 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-4 overflow-y-auto">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">지식 분류 트리</span>
              </div>

              {/* 카테고리 목록 아코디언 */}
              <div className="space-y-2 text-xs">
                {(["Standards", "TechnicalDocs", "Reports", "Others"] as KnowledgeCategory[]).map(catKey => {
                  const label = catKey === "Standards" ? "규격 (Standards)" :
                                catKey === "TechnicalDocs" ? "기술자료 (Docs)" :
                                catKey === "Reports" ? "보고서 (Reports)" : "기타 (Others)";
                  
                  const isExpanded = expandedCategories[catKey];
                  const subCats = SUB_CATEGORIES_BY_MAIN[catKey];
                  
                  return (
                    <div key={catKey} className="space-y-1">
                      {/* 대분류 헤더 */}
                      <div 
                        onClick={() => toggleCategory(catKey)}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                          {isExpanded ? <FolderOpen className="w-4 h-4 text-slate-400 shrink-0" /> : <Folder className="w-4 h-4 text-slate-400 shrink-0" />}
                          {label}
                        </span>
                        <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded-full">
                          {assets.filter(a => a.category === catKey).length}
                        </span>
                      </div>

                      {/* 소분류 목록 (확장 시) */}
                      {isExpanded && (
                        <div className="pl-6 space-y-0.5 border-l border-slate-100 ml-3.5">
                          {/* 대분류 자체 필터용 선택 버튼 */}
                          <div
                            onClick={() => handleTreeClick(catKey, "ALL")}
                            className={`p-1.5 rounded cursor-pointer font-bold ${selectedTreeCategory === catKey && selectedTreeSubCategory === "ALL" ? "bg-slate-100 text-slate-950 font-extrabold" : "text-slate-500 hover:text-slate-800"}`}
                          >
                            ↳ 전체 {catKey === "Standards" ? "규격" : catKey === "TechnicalDocs" ? "기술자료" : catKey === "Reports" ? "보고서" : "기타"}
                          </div>

                          {/* 하위 소분류 */}
                          {subCats.map(subCat => {
                            const isSelected = selectedTreeCategory === catKey && selectedTreeSubCategory === subCat;
                            const count = assets.filter(a => a.category === catKey && a.subCategory === subCat).length;
                            
                            return (
                              <div
                                key={subCat}
                                onClick={() => handleTreeClick(catKey, subCat)}
                                className={`p-1.5 rounded cursor-pointer flex justify-between items-center transition-all ${isSelected ? "bg-slate-900 text-white font-bold" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50/50"}`}
                              >
                                <span>{subCat}</span>
                                <span className={`text-[8px] font-mono font-bold px-1 rounded-full ${isSelected ? "bg-white/20 text-white" : "bg-slate-50 text-slate-400"}`}>
                                  {count}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 우측 메인 패널: 리스트 및 세부사항 */}
            <div className="lg:col-span-3 flex flex-col gap-6 min-h-0">

              {/* 상단 검색 및 필터 설명 & 추가 버튼 */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4 shrink-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      {selectedTreeCategory === "ALL" ? "전체 지식자산 리스트" : `${CATEGORY_MAP[selectedTreeCategory].label} > ${selectedTreeSubCategory === "ALL" ? "전체" : selectedTreeSubCategory}`}
                    </h4>
                    <p className="text-[10px] text-slate-400">
                      총 {filteredAssets.length}개의 매칭 문서가 발견되었습니다.
                    </p>
                  </div>

                  {/* 카테고리별 등록 버튼 — 서브카테고리 선택 시만 표시, 현황 조회 모드 제외 */}
                  {!readOnly && selectedTreeSubCategory !== "ALL" && (
                    <button
                      type="button"
                      onClick={() => { setNewSubCategory(selectedTreeSubCategory); setShowAddForm(prev => !prev); }}
                      className="text-xs font-bold text-violet-600 hover:text-violet-800 flex items-center gap-0.5 bg-violet-50 px-2.5 py-1.5 rounded-lg border border-violet-200 transition-all self-start md:self-auto"
                    >
                      {showAddForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      {showAddForm ? "취소" : `${selectedTreeSubCategory} 등록`}
                    </button>
                  )}
                </div>

                {/* 모바일 카테고리 칩 (md 미만에서만 표시) */}
                <div className="md:hidden space-y-2">
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    <button
                      onClick={() => handleTreeClick("ALL", "ALL")}
                      className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${selectedTreeCategory === "ALL" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200"}`}
                    >
                      전체
                    </button>
                    {(["Standards", "TechnicalDocs", "Reports", "Others"] as KnowledgeCategory[]).map(catKey => {
                      const labels: Record<string, string> = { Standards: "규격", TechnicalDocs: "기술자료", Reports: "보고서", Others: "기타" };
                      const active = selectedTreeCategory === catKey;
                      return (
                        <button
                          key={catKey}
                          onClick={() => handleTreeClick(catKey, "ALL")}
                          className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${active ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200"}`}
                        >
                          {labels[catKey]}
                          <span className={`ml-1 text-[9px] font-mono ${active ? "text-white/70" : "text-slate-400"}`}>
                            {assets.filter(a => a.category === catKey).length}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {selectedTreeCategory !== "ALL" && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      <button
                        onClick={() => handleTreeClick(selectedTreeCategory as KnowledgeCategory, "ALL")}
                        className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${selectedTreeSubCategory === "ALL" ? "bg-slate-900 text-white border-slate-900" : "bg-slate-100 text-slate-600 border-transparent"}`}
                      >
                        전체
                      </button>
                      {SUB_CATEGORIES_BY_MAIN[selectedTreeCategory as KnowledgeCategory].map(subCat => {
                        const isSelected = selectedTreeSubCategory === subCat;
                        const count = assets.filter(a => a.category === selectedTreeCategory && a.subCategory === subCat).length;
                        return (
                          <button
                            key={subCat}
                            onClick={() => handleTreeClick(selectedTreeCategory as KnowledgeCategory, subCat)}
                            className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${isSelected ? "bg-slate-900 text-white border-slate-900" : "bg-slate-100 text-slate-600 border-transparent"}`}
                          >
                            {subCat}
                            <span className={`ml-1 text-[9px] font-mono ${isSelected ? "text-white/70" : "text-slate-400"}`}>{count}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

              {/* 통합 검색창 */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="규격명, 번호(예: IEC 60840), 키워드 입력 후 Enter..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setMobileView("list"); }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const first = filteredAssets[0];
                        if (first) { setSelectedAssetId(first.id); setMobileView("detail"); }
                      }
                    }}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-950 text-xs transition-all"
                  />
                </div>
              </div>

              {/* 신규 자산 등록 폼 (카테고리별 컨텍스트 적용) */}
              {!readOnly && showAddForm && (() => {
                const fc = FORM_CONFIG[newSubCategory] ?? FORM_CONFIG["_default"];
                return (
                <form onSubmit={handleAddAsset} className="bg-violet-50 p-5 rounded-2xl border border-violet-200 shadow-md space-y-4 text-xs shrink-0">
                  <h4 className="text-sm font-bold text-violet-900 flex items-center gap-1.5 pb-2 border-b border-violet-200">
                    <PlusCircle className="w-4 h-4 text-violet-600" /> {newSubCategory} 신규 등록
                  </h4>
                  {formError && <p className="text-rose-600 bg-rose-50 rounded px-3 py-2">{formError}</p>}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {newSubCategory === "사내규격" && (
                      <div className="space-y-1">
                        <label className="font-bold text-slate-600">사내 분류</label>
                        <select value={newInternalCat} onChange={e => setNewInternalCat(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500">
                          {INTERNAL_CATS.map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                    )}
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">{fc.codeLabel}</label>
                      <input type="text" placeholder={fc.codePlaceholder} value={newCode}
                        onChange={e => setNewCode(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">{fc.publisherLabel}</label>
                      <input type="text" placeholder={fc.publisherPlaceholder} value={newPublisher}
                        onChange={e => setNewPublisher(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="md:col-span-3 space-y-1">
                      <label className="font-bold text-slate-600">{fc.titleLabel} <span className="text-rose-500">*</span></label>
                      <input type="text" required placeholder={fc.titlePlaceholder} value={newTitle}
                        onChange={e => setNewTitle(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">{fc.yearLabel}</label>
                      <input type="text" placeholder="2026" value={newPublishYear}
                        onChange={e => setNewPublishYear(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">내용 요약</label>
                    <textarea rows={3} placeholder={fc.summaryPlaceholder} value={newSummary}
                      onChange={e => setNewSummary(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">키워드 (쉼표 구분)</label>
                      <input type="text" placeholder={fc.keywordsPlaceholder} value={newKeywords}
                        onChange={e => setNewKeywords(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600 flex items-center gap-1"><Upload className="w-3 h-3" /> {fc.fileLabel}</label>
                      <input type="file" accept=".pdf,.docx,.xlsx"
                        onChange={e => setNewFile(e.target.files?.[0] ?? null)}
                        className="w-full text-[11px] text-slate-600 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-bold file:bg-violet-100 file:text-violet-700 hover:file:bg-violet-200" />
                      {newFile && <p className="text-[10px] text-slate-400">{newFile.name} ({(newFile.size / 1024 / 1024).toFixed(1)} MB)</p>}
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button type="submit" disabled={formSaving}
                      className="bg-violet-700 hover:bg-violet-800 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow transition-colors">
                      {formSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                      {formSaving ? "저장 중…" : "등록"}
                    </button>
                  </div>
                </form>
                );
              })()}

              {/* 지식 리스트 Split layout: 좌측 리스트 / 우측 세부사항 */}
              <div className="flex gap-4 flex-1 min-h-0">

                {/* 1) 매칭 문서 카드 목록 */}
                <div className={`md:flex-1 min-h-0 space-y-3 overflow-y-auto pr-1 ${mobileView === "detail" ? "hidden md:block" : ""}`}>
                  {filteredAssets.length === 0 ? (
                    <div className="bg-white py-12 rounded-2xl border text-center text-slate-400 text-xs">
                      매칭되는 지식 자산이 없습니다.
                    </div>
                  ) : (
                    filteredAssets.map(asset => {
                      const isSelected = asset.id === selectedAssetId;
                      const catStyle = CATEGORY_MAP[asset.category];
                      
                      return (
                        <div
                          key={asset.id}
                          onClick={() => {
                            if (onCardClick) { onCardClick(asset); return; }
                            setSelectedAssetId(asset.id);
                            setMobileView("detail");
                          }}
                          className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-2 text-xs ${isSelected ? "bg-slate-950 border-slate-950 text-white shadow-md" : "bg-white border-slate-100 hover:border-slate-300"}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-bold border tracking-wide uppercase ${isSelected ? "bg-white/10 text-white border-white/20" : `${catStyle.bg} ${catStyle.text} ${catStyle.border}`}`}>
                                {asset.subCategory}
                              </span>
                              {asset.code && (
                                <span className={`font-bold font-mono text-[9px] ${isSelected ? "text-indigo-300" : "text-indigo-600"}`}>
                                  {asset.code}
                                </span>
                              )}
                            </div>
                            <span className="text-[8px] font-mono opacity-65 flex items-center gap-1">
                              <Calendar className="w-2.5 h-2.5" /> {asset.publishYear}
                            </span>
                          </div>

                          <h5 className="font-extrabold leading-snug line-clamp-2">
                            {asset.title}
                          </h5>

                          <div className="flex items-center justify-between pt-1 opacity-75 text-[9px]">
                            <span>발행/출처: {asset.publisher}</span>
                            {asset.fileSize && <span>크기: {asset.fileSize}</span>}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* 2) 선택된 지식 자산의 정밀 요약 및 행동 유효성 검사 — 편집 모드에서만 표시 */}
                {!readOnly && <div className={`md:flex-1 min-h-0 space-y-4 overflow-y-auto ${mobileView === "list" ? "hidden md:block" : ""}`}>
                  <button
                    onClick={() => setMobileView("list")}
                    className="md:hidden flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" /> 목록으로
                  </button>
                  {!selectedAsset ? (
                    <div className="bg-white py-24 rounded-2xl border text-center text-slate-400 text-xs">
                      선택된 지식이 없습니다. 좌측 목록에서 카드를 선택해 주세요.
                    </div>
                  ) : editingId === selectedAsset.internalId ? (
                    /* 사내규격 인라인 편집 폼 */
                    <div className="bg-violet-50 p-5 rounded-2xl border border-violet-200 shadow-sm space-y-4 text-xs">
                      <h4 className="text-sm font-bold text-violet-900 flex items-center gap-1.5 pb-2 border-b border-violet-200">
                        <Pencil className="w-4 h-4 text-violet-600" /> 사내 규격 수정
                      </h4>
                      {editError && <p className="text-rose-600 bg-rose-50 rounded px-3 py-2">{editError}</p>}

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="font-bold text-slate-600">사내 분류</label>
                          <select value={editForm.internalCat} onChange={e => setEditForm(f => ({ ...f, internalCat: e.target.value }))}
                            className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500">
                            {INTERNAL_CATS.map(c => <option key={c}>{c}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold text-slate-600">규격 번호</label>
                          <input type="text" value={editForm.code} onChange={e => setEditForm(f => ({ ...f, code: e.target.value }))}
                            className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500" />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-600">규격 제목 <span className="text-rose-500">*</span></label>
                        <input type="text" value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                          className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500" />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="font-bold text-slate-600">작성 부서</label>
                          <input type="text" value={editForm.publisher} onChange={e => setEditForm(f => ({ ...f, publisher: e.target.value }))}
                            className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500" />
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold text-slate-600">작성 연도</label>
                          <input type="text" value={editForm.publishYear} onChange={e => setEditForm(f => ({ ...f, publishYear: e.target.value }))}
                            className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500" />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-600">내용 요약</label>
                        <textarea rows={3} value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                          className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none" />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-600">키워드 (쉼표 구분)</label>
                        <input type="text" value={editForm.keywords} onChange={e => setEditForm(f => ({ ...f, keywords: e.target.value }))}
                          className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500" />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-600 flex items-center gap-1"><Upload className="w-3 h-3" /> 파일 교체 (선택)</label>
                        <input type="file" accept=".pdf,.docx,.xlsx"
                          onChange={e => setEditFile(e.target.files?.[0] ?? null)}
                          className="w-full text-[11px] text-slate-600 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-bold file:bg-violet-100 file:text-violet-700 hover:file:bg-violet-200" />
                        {editFile && <p className="text-[10px] text-slate-400">{editFile.name}</p>}
                        {!editFile && selectedAsset.linkUrl && <p className="text-[10px] text-slate-400">현재: {selectedAsset.linkUrl.split("/").pop()}</p>}
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button onClick={() => handleEditSave(selectedAsset)} disabled={editSaving}
                          className="flex-1 py-2 bg-violet-700 hover:bg-violet-800 disabled:opacity-50 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors">
                          {editSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Pencil className="w-3.5 h-3.5" />}
                          {editSaving ? "저장 중…" : "저장"}
                        </button>
                        <button onClick={() => setEditingId(null)}
                          className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 font-bold transition-colors">
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-5 text-xs">
                      <div className="border-b pb-4 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${CATEGORY_MAP[selectedAsset.category].bg} ${CATEGORY_MAP[selectedAsset.category].text} ${CATEGORY_MAP[selectedAsset.category].border}`}>
                            {selectedAsset.isInternal ? `사내규격 · ${selectedAsset.internalCat}` : selectedAsset.subCategory}
                          </span>
                          {selectedAsset.fileSize && (
                            <span className="text-[9px] font-mono text-slate-400">파일 ({selectedAsset.fileSize})</span>
                          )}
                        </div>

                        {selectedAsset.code && (
                          <h4 className="text-xs font-black text-indigo-700 font-mono tracking-wide uppercase">
                            문서코드: {selectedAsset.code}
                          </h4>
                        )}

                        <h3 className="text-sm font-black text-slate-950 leading-relaxed">
                          {selectedAsset.title}
                        </h3>

                        <div className="flex items-center gap-4 text-[10px] text-slate-400 font-mono">
                          <span>발행: <strong className="text-slate-600 font-bold">{selectedAsset.publisher}</strong></span>
                          <span>발행연도: {selectedAsset.publishYear}년</span>
                        </div>
                      </div>

                      {/* 요약 */}
                      <div className="space-y-1.5">
                        <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">규격 합격기준 및 기술 핵심요약</span>
                        <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                          <MarkdownContent content={selectedAsset.summary || "(요약 없음)"} className="text-[11px]" />
                        </div>
                      </div>

                      {/* 태그 */}
                      {selectedAsset.keywords.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">태그 / 색인 키워드</span>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedAsset.keywords.map(k => (
                              <span key={k} className="bg-slate-100 text-slate-700 rounded-md px-2 py-0.5 text-[9px] font-bold">
                                #{k}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 파일/외부 링크 버튼 — isInternal 여부와 무관하게 linkUrl 있으면 표시 */}
                      {selectedAsset.linkUrl && (
                        <div className="pt-3 border-t">
                          <a href={selectedAsset.linkUrl} target="_blank" rel="noopener noreferrer"
                            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors">
                            <Download className="w-3.5 h-3.5" />
                            {selectedAsset.isInternal ? "파일 다운로드" : "원문 보기"}
                          </a>
                        </div>
                      )}

                      {/* 사내규격 편집/삭제 버튼 — 현황 조회 모드 제외 */}
                      {selectedAsset.isInternal && !readOnly && (
                        <div className={selectedAsset.linkUrl ? "space-y-2" : "pt-3 border-t space-y-2"}>
                          <div className="flex gap-2">
                            <button onClick={() => startEdit(selectedAsset)}
                              className="flex-1 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors">
                              <Pencil className="w-3.5 h-3.5" /> 수정
                            </button>
                            <button onClick={() => handleDelete(selectedAsset)} disabled={deletingId === selectedAsset.internalId}
                              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-lg flex items-center justify-center gap-1 transition-colors disabled:opacity-50">
                              {deletingId === selectedAsset.internalId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* 외부 문서 내용 보기 */}
                      {selectedAsset.sourcePath && (
                        <div className="pt-3 border-t space-y-2">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                const isMobile = window.innerWidth < 768;
                                if (isMobile) {
                                  if (contentText) { setShowModal(true); return; }
                                  handleViewContent(selectedAsset, true);
                                } else {
                                  if (contentText) { setContentText(null); return; }
                                  handleViewContent(selectedAsset);
                                }
                              }}
                              disabled={contentLoading}
                              className="flex-1 py-2 bg-slate-950 hover:bg-slate-800 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              {contentLoading ? "불러오는 중…" : contentText ? "내용 접기" : "내용 보기"}
                            </button>
                            {contentText && (
                              <button
                                onClick={() => setShowModal(true)}
                                className="px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-all"
                                title="크게 보기"
                              >
                                <Maximize2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          {contentText && (
                            <div className="rounded-lg border border-slate-100 bg-white p-4 max-h-[320px] overflow-y-auto">
                              <MarkdownContent content={contentText} className="text-[11px]" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>}

              </div>

            </div>

          </div>
    </div>
    </>
  );
}
