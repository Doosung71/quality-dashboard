"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export default function MatchStandardsButton({ analysisId }: { analysisId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<number | null>(null)

  async function handleMatch() {
    setLoading(true)
    try {
      const res = await fetch(`/api/analysis/${analysisId}/match-standards`, { method: "POST" })
      if (!res.ok) { alert("매칭 실패"); return }
      const { matchedCount } = await res.json() as { matchedCount: number }
      setResult(matchedCount)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" onClick={handleMatch} disabled={loading}>
        {loading ? "매칭 중…" : "표준 자동 매칭"}
      </Button>
      {result !== null && (
        <span className="text-xs text-zinc-500">{result}건 매칭됨</span>
      )}
    </div>
  )
}
