"use client";

import { useRouter } from "next/navigation";
import { FileQuestion, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="text-center space-y-6 max-w-sm">
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center">
            <FileQuestion className="w-10 h-10 text-slate-400" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-black text-slate-900">404</h1>
          <p className="text-slate-500 font-medium">페이지를 찾을 수 없습니다.</p>
          <p className="text-xs text-slate-400">
            요청한 주소가 없거나 삭제된 페이지입니다.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => router.back()}
            className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> 이전 페이지로
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full py-2.5 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-200 flex items-center justify-center gap-2 transition-colors"
          >
            <Home className="w-4 h-4" /> 대시보드로
          </button>
        </div>
      </div>
    </div>
  );
}
