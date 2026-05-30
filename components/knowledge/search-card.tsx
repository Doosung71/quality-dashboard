import { cn } from "@/lib/utils"
import type { KnowledgeChunk } from "@/lib/knowledge"

interface SearchCardProps {
  chunk: KnowledgeChunk
}

export function SearchCard({ chunk }: SearchCardProps) {
  const filename = chunk.source_path.split(/[\\/]/).pop() ?? chunk.source_path
  const similarityPct = Math.round(chunk.similarity * 100)

  return (
    <div className="border rounded-lg p-4 space-y-2 hover:border-slate-400 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-medium text-sm leading-snug">{chunk.title ?? filename}</h3>
        <span className={cn(
          "text-xs px-2 py-0.5 rounded-full shrink-0 font-medium",
          similarityPct >= 80 ? "bg-green-100 text-green-800" :
          similarityPct >= 60 ? "bg-yellow-100 text-yellow-800" :
          "bg-slate-100 text-slate-600"
        )}>
          {similarityPct}%
        </span>
      </div>
      <p className="text-xs text-slate-400 truncate">{filename}</p>
      <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">{chunk.content}</p>
    </div>
  )
}
