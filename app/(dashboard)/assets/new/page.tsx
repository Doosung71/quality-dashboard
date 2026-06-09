"use client";

import { useRouter } from "next/navigation";
import { facilitiesData } from "@/data/facilities.data";
import { EquipmentForm } from "@/components/assets/equipment-form";

export default function AssetNewPage() {
  const router = useRouter();

  return (
    <div className="space-y-1">
      <h1 className="text-lg font-semibold text-slate-800">설비 등록</h1>
      <p className="text-xs text-slate-400 mb-4">새 시험설비·계측설비를 등록합니다</p>
      <div className="bg-white rounded-xl border border-slate-200 px-6 py-5 max-w-lg">
        <EquipmentForm
          facilitiesData={facilitiesData}
          onSuccess={() => router.push("/assets")}
          onCancel={() => router.push("/assets")}
        />
      </div>
    </div>
  );
}
