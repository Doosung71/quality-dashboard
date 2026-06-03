"use client"

import { VISIBILITY_CONFIG, type Visibility } from "@/lib/board-visibility"
import { cn } from "@/lib/utils"

interface VisibilitySelectorProps {
  value: Visibility
  onChange: (v: Visibility) => void
  compact?: boolean
}

export function VisibilitySelector({ value, onChange, compact = false }: VisibilitySelectorProps) {
  return (
    <div className={cn("flex items-center gap-2", compact ? "" : "")}>
      {!compact && <span className="text-[10px] text-slate-500 font-semibold shrink-0">공개 범위</span>}
      <div className="flex gap-1">
        {(Object.keys(VISIBILITY_CONFIG) as Visibility[]).map(v => {
          const cfg = VISIBILITY_CONFIG[v]
          const active = value === v
          return (
            <button key={v} type="button" onClick={() => onChange(v)}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all",
                active
                  ? v === "DIRECTOR_UP" ? "bg-violet-600 border-violet-600 text-white"
                    : v === "TEAM_LEAD_UP" ? "bg-blue-600 border-blue-600 text-white"
                    : "bg-emerald-600 border-emerald-600 text-white"
                  : "bg-white border-slate-200 text-slate-500 hover:border-slate-400"
              )}>
              {cfg.icon} {cfg.shortLabel}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// 공개 범위 배지 (읽기용)
export function VisibilityBadge({ visibility }: { visibility: string }) {
  const cfg = VISIBILITY_CONFIG[visibility as Visibility]
  if (!cfg || visibility === "ALL") return null
  return (
    <span className={cn("inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold", cfg.color)}>
      {cfg.icon} {cfg.shortLabel}
    </span>
  )
}
