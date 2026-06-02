"use client"

import { useState } from "react"

type User = {
  id: string; name: string; email: string
  role: string; status: string
  department: string | null; employeeId: string | null
  createdAt: Date
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "대기", ACTIVE: "활성", RESTRICTED: "정지", BANNED: "강퇴"
}
const ROLE_LABEL: Record<string, string> = {
  PRACTITIONER: "실무자", TEAM_LEAD: "팀장", DIRECTOR: "임원"
}
const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  ACTIVE: "bg-emerald-100 text-emerald-700",
  RESTRICTED: "bg-orange-100 text-orange-700",
  BANNED: "bg-red-100 text-red-700",
}

export function AdminUsersClient({ users: initial }: { users: User[] }) {
  const [users, setUsers] = useState(initial)
  const [loading, setLoading] = useState<string | null>(null)
  const [tempPasswords, setTempPasswords] = useState<Record<string, string>>({})

  async function update(id: string, body: object) {
    setLoading(id)
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const res = await fetch("/api/admin/users")
    const data = await res.json()
    setUsers(data)
    setLoading(null)
  }

  async function resetPassword(id: string) {
    if (!confirm("비밀번호를 초기화하시겠습니까?")) return
    setLoading(id)
    const res = await fetch(`/api/admin/users/${id}/reset-password`, { method: "POST" })
    const data = await res.json()
    setTempPasswords(prev => ({ ...prev, [id]: data.tempPassword }))
    setLoading(null)
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            {["이름", "이메일", "부서", "상태", "역할", "가입일", "액션"].map(h => (
              <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
              <td className="px-4 py-3 font-medium">{u.name}</td>
              <td className="px-4 py-3 text-slate-500">{u.email}</td>
              <td className="px-4 py-3 text-slate-500">{u.department ?? "-"}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[u.status]}`}>
                  {STATUS_LABEL[u.status]}
                </span>
              </td>
              <td className="px-4 py-3">
                <select value={u.role} disabled={loading === u.id}
                  onChange={e => update(u.id, { role: e.target.value })}
                  className="border border-slate-200 rounded px-2 py-1 text-xs">
                  {Object.entries(ROLE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </td>
              <td className="px-4 py-3 text-slate-400 text-xs">
                {new Date(u.createdAt).toLocaleDateString("ko-KR")}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-col gap-1">
                  <div className="flex gap-1">
                    {u.status === "PENDING" && (
                      <button onClick={() => update(u.id, { status: "ACTIVE" })} disabled={loading === u.id}
                        className="px-2 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50">
                        승인
                      </button>
                    )}
                    {u.status === "ACTIVE" && (
                      <button onClick={() => update(u.id, { status: "BANNED" })} disabled={loading === u.id}
                        className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50">
                        강퇴
                      </button>
                    )}
                    {u.status === "BANNED" && (
                      <button onClick={() => update(u.id, { status: "ACTIVE" })} disabled={loading === u.id}
                        className="px-2 py-1 text-xs bg-slate-600 text-white rounded hover:bg-slate-700 disabled:opacity-50">
                        복구
                      </button>
                    )}
                    <button onClick={() => resetPassword(u.id)} disabled={loading === u.id}
                      className="px-2 py-1 text-xs bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-50">
                      PW초기화
                    </button>
                  </div>
                  {tempPasswords[u.id] && (
                    <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                      <span className="text-xs font-mono font-bold text-amber-800">{tempPasswords[u.id]}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(tempPasswords[u.id])
                          setTempPasswords(prev => ({ ...prev, [u.id]: prev[u.id] + " ✓" }))
                        }}
                        className="text-xs text-amber-600 hover:text-amber-800 ml-1"
                      >
                        복사
                      </button>
                    </div>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
