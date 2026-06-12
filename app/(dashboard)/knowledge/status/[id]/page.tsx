"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { knowledgeRepositoryData } from "@/data/knowledge.data";
import type { KnowledgeAsset } from "@/types/knowledge";
import { MarkdownContent } from "@/components/ui/markdown-content";
import {
  ArrowLeft,
  Download,
  Eye,
  Maximize2,
  Calendar,
  FileText,
  X,
  Loader2,
} from "lucide-react";

const CATEGORY_MAP: Record<string, { label: string; bg: string; text: string; border: string }> = {
  Standards: { label: "규격 (Standards)", bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-100" },
  TechnicalDocs: { label: "기술자료 (Docs)", bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-100" },
  Reports: { label: "보고서 (Reports)", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-100" },
  Others: { label: "기타 (Others)", bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" },
};

export default function KnowledgeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const assetId = decodeURIComponent(id);
  const router = useRouter();

  const [asset, setAsset] = useState<KnowledgeAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [contentText, setContentText] = useState<string | null>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // 정적 JSON에서 먼저 찾고, DB API에서 보완
    const staticMatch = knowledgeRepositoryData.assets.find((a) => a.id === assetId);
    if (staticMatch) {
      setAsset(staticMatch);
      setLoading(false);
    }

    fetch("/api/knowledge/assets")
      .then((r) => r.json())
      .then((d) => {
        const found = (d.assets as KnowledgeAsset[])?.find((a) => a.id === assetId);
        if (found) setAsset(found);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [assetId]);

  const handleViewContent = () => {
    if (!asset?.sourcePath) return;
    if (contentText) { setContentText(null); return; }
    setContentLoading(true);
    fetch(`/api/knowledge/content?path=${encodeURIComponent(asset.sourcePath)}`)
      .then((r) => r.json())
      .then((d) => setContentText(d.text || "(내용 없음)"))
      .catch(() => setContentText("(내용을 불러올 수 없습니다)"))
      .finally(() => setContentLoading(false));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        불러오는 중...
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-slate-400 gap-4">
        <FileText className="w-12 h-12 opacity-30" />
        <p>해당 문서를 찾을 수 없습니다.</p>
        <button
          onClick={() => router.push("/knowledge/status")}
          className="flex items-center gap-1.5 text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> 목록으로 돌아가기
        </button>
      </div>
    );
  }

  const catStyle = CATEGORY_MAP[asset.category] ?? CATEGORY_MAP.Others;

  return (
    <>
      {/* 내용 크게 보기 모달 */}
      {showModal && contentText && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 sm:p-8"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <h2 className="font-black text-slate-900 text-sm line-clamp-1">{asset.title}</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-6">
              <MarkdownContent content={contentText} className="text-sm" />
            </div>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto space-y-6">
        {/* 뒤로 가기 */}
        <button
          onClick={() => router.push("/knowledge/status")}
          className="flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> 지식/규격 현황으로
        </button>

        {/* 헤더 카드 */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
              >
                {asset.isInternal ? `사내규격 · ${asset.internalCat}` : asset.subCategory}
              </span>
              {asset.code && (
                <span className="text-xs font-black text-indigo-700 font-mono tracking-wide uppercase">
                  {asset.code}
                </span>
              )}
            </div>
            {asset.fileSize && (
              <span className="text-[10px] font-mono text-slate-400 shrink-0">
                파일 {asset.fileSize}
              </span>
            )}
          </div>

          <h1 className="text-xl font-black text-slate-950 leading-relaxed">{asset.title}</h1>

          <div className="flex items-center gap-6 text-xs text-slate-500 font-mono border-t pt-4">
            <span>
              발행: <strong className="text-slate-700 font-bold">{asset.publisher}</strong>
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> {asset.publishYear}년
            </span>
          </div>
        </div>

        {/* 요약 */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-3">
          <h2 className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
            규격 합격기준 및 기술 핵심요약
          </h2>
          <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
            <MarkdownContent content={asset.summary || "(요약 없음)"} className="text-sm" />
          </div>
        </div>

        {/* 키워드 */}
        {asset.keywords.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-3">
            <h2 className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
              태그 / 색인 키워드
            </h2>
            <div className="flex flex-wrap gap-2">
              {asset.keywords.map((k) => (
                <span
                  key={k}
                  className="bg-slate-100 text-slate-700 rounded-lg px-3 py-1 text-xs font-bold"
                >
                  #{k}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-3">
          {asset.linkUrl && (
            <a
              href={asset.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 bg-slate-950 hover:bg-slate-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" />
              {asset.isInternal ? "파일 다운로드" : "원문 보기"}
            </a>
          )}

          {asset.sourcePath && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  onClick={handleViewContent}
                  disabled={contentLoading}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  {contentLoading ? "불러오는 중…" : contentText ? "내용 접기" : "내용 보기"}
                </button>
                {contentText && (
                  <button
                    onClick={() => setShowModal(true)}
                    className="px-4 py-3 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors"
                    title="크게 보기"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              {contentText && (
                <div className="rounded-xl border border-slate-100 bg-white p-5">
                  <MarkdownContent content={contentText} className="text-sm" />
                </div>
              )}
            </div>
          )}

          {!asset.linkUrl && !asset.sourcePath && (
            <p className="text-center text-xs text-slate-400 py-4">
              원문 파일 또는 내용이 등록되지 않은 문서입니다.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
