"use client";

import { useState, useEffect } from "react";
import { knowledgeRepositoryData } from "@/data/knowledge.data";
import type { KnowledgeRepositoryData } from "@/types/knowledge";
import { KnowledgeRepository } from "@/components/knowledge/knowledge-repository";

export default function KnowledgePage() {
  const [repoData, setRepoData] = useState<KnowledgeRepositoryData>(knowledgeRepositoryData);
  const [repoLoading, setRepoLoading] = useState(true);

  useEffect(() => {
    fetch("/api/knowledge/assets")
      .then((r) => r.json())
      .then((d) => {
        if (d.assets?.length > 0) setRepoData(d);
      })
      .catch(() => {/* fallback: 정적 JSON 유지 */})
      .finally(() => setRepoLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">지식 저장소 — QKM (Quality Knowledge Management)</h1>
        <p className="text-slate-500">
          초고압·해저 케이블 관련 국제·국가 규격, 입찰 문서, 기술 연구자료를 분류별로 조회합니다.
        </p>
      </div>

      <KnowledgeRepository
        data={repoData}
        repoLoading={repoLoading}
      />
    </div>
  );
}
