"use client"

import { useState, useRef, useEffect } from "react"
import { Smile } from "lucide-react"

const EMOJI_GROUPS = [
  { label: "😀", emojis: ["😀","😄","😂","🤣","😊","😍","🥰","😘","😎","🤩","😜","😏","🤔","😮","😱","😢","😭","🥲","😡","🤯","🥳","😴","🤧","🤒","🙄","😶","🤗","🫡","👋"] },
  { label: "👍", emojis: ["👍","👎","👏","🙌","🤝","🫶","❤️","🔥","✅","❌","⭐","💯","🎉","🎊","🚀","💡","📌","📢","🔔","⚡","💪","🙏","👀","✨","🎯","💬","📝","🗓️","⏰","🔍"] },
  { label: "🐶", emojis: ["🐶","🐱","🐻","🐼","🐨","🦊","🐯","🦁","🐮","🐷","🐔","🐧","🐦","🦆","🦉","🐺","🦋","🌸","🌺","🌻","🍎","🍕","☕","🍺","🎵","⚽","🏆","🌈","❄️","🌙"] },
]

interface EmojiPickerProps {
  onSelect: (emoji: string) => void
}

export function EmojiPicker({ onSelect }: EmojiPickerProps) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-50 transition-colors"
        title="이모티콘"
      >
        <Smile className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute bottom-9 right-0 z-50 bg-white rounded-2xl shadow-xl border border-slate-200 w-64 overflow-hidden">
          {/* 탭 */}
          <div className="flex border-b border-slate-100 px-2 pt-2">
            {EMOJI_GROUPS.map((g, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setTab(i)}
                className={`px-3 py-1.5 text-base rounded-t-lg transition-colors ${tab === i ? "bg-slate-100" : "hover:bg-slate-50"}`}
              >
                {g.label}
              </button>
            ))}
          </div>

          {/* 이모지 그리드 */}
          <div className="grid grid-cols-6 gap-0.5 p-2 max-h-48 overflow-y-auto">
            {EMOJI_GROUPS[tab].emojis.map(emoji => (
              <button
                key={emoji}
                type="button"
                onClick={() => { onSelect(emoji); setOpen(false) }}
                className="text-xl p-1.5 rounded-lg hover:bg-amber-50 transition-colors leading-none"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
