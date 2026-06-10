import Link from "next/link";
import { ArrowRight, Coins } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireActivePageSession } from "@/lib/session-guard";
import { NcrKpi } from "@/components/ncr/ncr-kpi";
import { ClaimsKpi } from "@/components/claims/claims-kpi";
import { qcostData } from "@/data/qcost.data";
import type { NCR, NCRTimelineItem, NCRAttachment } from "@/types/ncr";
import type { Claim, ClaimTimelineItem, ClaimAttachment } from "@/types/claim";

export default async function QualityIssuesPage() {
  await requireActivePageSession();

  const [rawNcrs, rawClaims] = await Promise.all([
    prisma.ncr.findMany({ orderBy: { issuedDate: "desc" } }),
    prisma.claim.findMany({ orderBy: { receivedAt: "desc" } }),
  ]);

  const ncrs: NCR[] = rawNcrs.map(n => ({
    id:          n.id,
    ncrNo:       n.ncrNo,
    title:       n.title,
    source:      n.source,
    severity:    n.severity    as NCR["severity"],
    status:      n.status      as NCR["status"],
    disposition: n.disposition as NCR["disposition"],
    issuedDate:  n.issuedDate.toISOString().slice(0, 10),
    targetDate:  n.targetDate.toISOString().slice(0, 10),
    closedDate:  n.closedDate?.toISOString().slice(0, 10),
    assignee:    n.assignee,
    description: n.description,
    timeline:    (n.timeline as unknown as NCRTimelineItem[]) ?? [],
    attachments: (n.attachments as unknown as NCRAttachment[]) ?? [],
  }));

  const claims: Claim[] = rawClaims.map(c => ({
    id:          c.id,
    claimNo:     c.claimNo,
    title:       c.title,
    customer:    c.customer,
    priority:    c.priority as Claim["priority"],
    status:      c.status   as Claim["status"],
    receivedAt:  c.receivedAt.toISOString().slice(0, 10),
    targetDate:  c.targetDate?.toISOString().slice(0, 10),
    closedAt:    c.closedAt?.toISOString().slice(0, 10),
    assignee:    c.assignee,
    description: c.description,
    timeline:    (c.timeline as unknown as ClaimTimelineItem[]) ?? [],
    attachments: (c.attachments as unknown as ClaimAttachment[]) ?? [],
  }));

  const latest  = qcostData.monthlyCosts[qcostData.monthlyCosts.length - 1];
  const prev    = qcostData.monthlyCosts[qcostData.monthlyCosts.length - 2];
  const sumCost = (m: typeof latest) =>
    m.externalFailure + m.internalFailure + m.executionLoss + m.appraisal + m.prevention;
  const totalCost     = sumCost(latest);
  const prevTotalCost = sumCost(prev);
  const costDelta     = prevTotalCost > 0
    ? Math.round(((totalCost - prevTotalCost) / prevTotalCost) * 100)
    : 0;
  const failureCost   = latest.externalFailure + latest.internalFailure;

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">품질 이상/사후 관리 현황</h1>
        <p className="text-slate-500 mt-1">부적합품·고객클레임·품질비용의 누적 현황을 한눈에 파악합니다.</p>
      </div>

      {/* ── NCR 현황 ─────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">부적합품 (NCR)</h2>
          <Link href="/ncr"
            className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors">
            등록·관리 <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <NcrKpi ncrs={ncrs} />
      </section>

      {/* ── 클레임 현황 ──────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">고객 클레임</h2>
          <Link href="/claims"
            className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors">
            등록·관리 <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <ClaimsKpi claims={claims} />
      </section>

      {/* ── 품질비용 현황 ─────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">품질비용 (Q-Cost) · {latest.month}</h2>
          <Link href="/qcost"
            className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors">
            상세 보기 <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">이달 총 품질비용</p>
              <p className="text-3xl font-bold text-slate-900">{totalCost.toLocaleString()}M</p>
              <p className={`text-xs font-semibold ${costDelta > 0 ? "text-rose-500" : costDelta < 0 ? "text-emerald-500" : "text-slate-400"}`}>
                전월 대비 {costDelta > 0 ? "+" : ""}{costDelta}%
              </p>
            </div>
            <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center">
              <Coins className="w-6 h-6" />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 shadow-sm hover:shadow-md transition-all">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">실패비용</p>
            <p className="text-3xl font-bold mt-1 text-rose-600">{failureCost.toLocaleString()}M</p>
            <div className="flex gap-4 mt-3 text-[10px] text-slate-400 uppercase">
              <div>
                <p>외부실패</p>
                <p className="text-sm font-semibold text-slate-700">{latest.externalFailure}M</p>
              </div>
              <div>
                <p>내부실패</p>
                <p className="text-sm font-semibold text-slate-700">{latest.internalFailure}M</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 shadow-sm hover:shadow-md transition-all">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">예방·평가비용</p>
            <p className="text-3xl font-bold mt-1 text-emerald-600">{(latest.prevention + latest.appraisal).toLocaleString()}M</p>
            <div className="flex gap-4 mt-3 text-[10px] text-slate-400 uppercase">
              <div>
                <p>예방</p>
                <p className="text-sm font-semibold text-slate-700">{latest.prevention}M</p>
              </div>
              <div>
                <p>평가</p>
                <p className="text-sm font-semibold text-slate-700">{latest.appraisal}M</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
