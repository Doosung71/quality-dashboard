"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface MarkdownContentProps {
  content: string
  className?: string
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-sm font-black text-zinc-900 mt-3 mb-1 first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xs font-black text-zinc-800 mt-3 mb-1 border-b border-zinc-100 pb-1 first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs font-bold text-zinc-700 mt-2 mb-0.5 first:mt-0">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="text-xs text-zinc-800 leading-relaxed mb-1.5 last:mb-0">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-zinc-900">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-zinc-700">{children}</em>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside text-xs text-zinc-800 space-y-0.5 mb-1.5 pl-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside text-xs text-zinc-800 space-y-0.5 mb-1.5 pl-1">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed">{children}</li>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-2">
              <table className="text-xs border-collapse w-full">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead>{children}</thead>,
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => <tr className="even:bg-zinc-50">{children}</tr>,
          th: ({ children }) => (
            <th className="border border-zinc-200 bg-zinc-100 px-2 py-1.5 text-left font-bold text-zinc-700 whitespace-nowrap">{children}</th>
          ),
          td: ({ children }) => (
            <td className="border border-zinc-200 px-2 py-1.5 text-zinc-800 align-top">{children}</td>
          ),
          hr: () => <hr className="border-zinc-200 my-2" />,
          code: ({ children }) => (
            <code className="bg-zinc-100 rounded px-1 text-[11px] font-mono text-zinc-700">{children}</code>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-zinc-300 pl-3 text-zinc-600 italic my-1.5">{children}</blockquote>
          ),
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">{children}</a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
