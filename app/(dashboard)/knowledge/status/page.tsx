"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { knowledgeRepositoryData } from "@/data/knowledge.data";
import type { KnowledgeRepositoryData } from "@/types/knowledge";
import { KnowledgeRepository } from "@/components/knowledge/knowledge-repository";

export default function KnowledgeStatusPage() {
  const router = useRouter();
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
        <h1 className="text-2xl font-bold text-slate-900">지식/규격 현황</h1>
        <p className="text-slate-500">
          등록된 지식자산(국제·국가·단체 규격, 사내규격, 기술자료)의 전체 현황을 조회합니다.
        </p>
      </div>

      <KnowledgeRepository
        data={repoData}
        repoLoading={repoLoading}
        onCardClick={(asset) => router.push(`/knowledge/status/${encodeURIComponent(asset.id)}`)}
      />
    </div>
  );
}
