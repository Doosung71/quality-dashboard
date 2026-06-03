"use client"

import { useState } from "react"

type User = {
  id: string; name: string; email: string
  role: string; status: string
  department: string | null; employeeId: string | null
  createdAt: Date; restrictedUntil: Date | null
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "대기", ACTIVE: "활성", RESTRICTED: "정지", BANNED: "강퇴(영구)"
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

const SUSPEND_OPTIONS = [
  { label: "1일",   days: 1 },
  { label: "1주일", days: 7 },
  { label: "1달",   days: 30 },
  { label: "3개월", days: 90 },
  { label: "6개월", days: 180 },
]

function restrictedUntilLabel(until: Date | null | undefined): string {
  if (!until) return ""
  const d = new Date(until)
  if (d < new Date()) return "(정지 만료)"
  return `~${d.toLocaleDateString("ko-KR")} ${d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}까지`
}

export function AdminUsersClient({ users: initial }: { users: User[] }) {
  const [users, setUsers] = useState(initial)
  const [loading, setLoading] = useState<string | null>(null)
  const [tempPasswords, setTempPasswords] = useState<Record<string, string>>({})
  const [suspendDays, setSuspendDays] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  // PENDING 승인 시 선택할 역할 (userId → role)
  const [pendingRole, setPendingRole] = useState<Record<string, string>>({})
  // ACTIVE 사용자 역할 변경 임시값 (userId → role), 저장 버튼 클릭 시 반영
  const [roleEdit, setRoleEdit] = useState<Record<string, string>>({})

  async function refresh() {
    const res = await fetch("/api/admin/users")
    const data = await res.json()
    setUsers(data)
  }

  async function patch(id: string, body: object) {
    setLoading(id)
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    await refresh()
    setLoading(null)
  }

  // PENDING → ACTIVE + 역할 동시 저장
  async function approve(id: string) {
    const role = pendingRole[id] ?? "PRACTITIONER"
    await patch(id, { status: "ACTIVE", role })
  }

  // ACTIVE 사용자 역할 저장
  async function saveRole(id: string) {
    const role = roleEdit[id]
    if (!role) return
    await patch(id, { role })
    setRoleEdit(prev => { const n = { ...prev }; delete n[id]; return n })
  }

  async function suspend(id: string) {
    const days = parseInt(suspendDays[id] ?? "1")
    const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
    const label = days >= 30 ? `${Math.round(days / 30)}개월` : days >= 7 ? `${Math.round(days / 7)}주일` : `${days}일`
    if (!confirm(`${label} 사용정지합니다.\n정지 해제일: ${until.toLocaleDateString("ko-KR")}`)) return
    await patch(id, { status: "RESTRICTED", restrictedUntil: until.toISOString() })
  }

  async function ban(id: string) {
    if (!confirm("영구 강퇴합니다.\n강퇴된 계정은 이 이메일로 다시 가입하거나 복구할 수 없습니다.\n계속하시겠습니까?")) return
    await patch(id, { status: "BANNED" })
  }

  async function deleteUser(id: string, name: string) {
    if (!confirm(`"${name}" 계정과 관련 데이터(입찰 분석 이력 포함)를 완전히 삭제합니다.\n삭제 후 동일 이메일로 재가입이 가능합니다.\n계속하시겠습니까?`)) return
    setLoading(id)
    setErrors(prev => { const n = { ...prev }; delete n[id]; return n })
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setErrors(prev => ({ ...prev, [id]: data.error ?? "삭제 중 오류가 발생했습니다." }))
    }
    await refresh()
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
          {users.map(u => {
            const editingRole = roleEdit[u.id]
            const currentDisplayRole = editingRole ?? u.role
            const roleChanged = editingRole !== undefined && editingRole !== u.role

            return (
              <tr key={u.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 align-top">
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{u.email}</td>
                <td className="px-4 py-3 text-slate-500">{u.department ?? "-"}</td>

                {/* 상태 */}
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[u.status]}`}>
                    {STATUS_LABEL[u.status]}
                  </span>
                  {u.status === "RESTRICTED" && u.restrictedUntil && (
                    <p className="text-[10px] text-orange-600 mt-0.5">{restrictedUntilLabel(u.restrictedUntil)}</p>
                  )}
                </td>

                {/* 역할 — PENDING은 승인 전 선택용, 나머지는 변경+저장 */}
                <td className="px-4 py-3">
                  {u.status === "PENDING" ? (
                    <select
                      value={pendingRole[u.id] ?? "PRACTITIONER"}
                      onChange={e => setPendingRole(prev => ({ ...prev, [u.id]: e.target.value }))}
                      disabled={loading === u.id}
                      className="border border-amber-300 rounded px-2 py-1 text-xs bg-amber-50 text-amber-800">
                      {Object.entries(ROLE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  ) : u.status !== "BANNED" ? (
                    <div className="flex items-center gap-1">
                      <select
                        value={currentDisplayRole}
                        onChange={e => setRoleEdit(prev => ({ ...prev, [u.id]: e.target.value }))}
                        disabled={loading === u.id}
                        className={`border rounded px-2 py-1 text-xs ${roleChanged ? "border-indigo-400 bg-indigo-50 text-indigo-800" : "border-slate-200"}`}>
                        {Object.entries(ROLE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                      {roleChanged && (
                        <button onClick={() => saveRole(u.id)} disabled={loading === u.id}
                          className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap">
                          저장
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">{ROLE_LABEL[u.role]}</span>
                  )}
                </td>

                {/* 가입일 */}
                <td className="px-4 py-3 text-slate-400 text-xs">
                  {new Date(u.createdAt).toLocaleDateString("ko-KR")}
                </td>

                {/* 액션 */}
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex flex-wrap gap-1">

                      {/* PENDING → 역할 선택 후 승인 */}
                      {u.status === "PENDING" && (
                        <button onClick={() => approve(u.id)} disabled={loading === u.id}
                          className="px-2 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50">
                          승인 ({ROLE_LABEL[pendingRole[u.id] ?? "PRACTITIONER"]})
                        </button>
                      )}

                      {/* ACTIVE → 사용정지 */}
                      {u.status === "ACTIVE" && (
                        <div className="flex items-center gap-1">
                          <select
                            value={suspendDays[u.id] ?? "1"}
                            onChange={e => setSuspendDays(prev => ({ ...prev, [u.id]: e.target.value }))}
                            disabled={loading === u.id}
                            className="border border-orange-300 rounded px-1.5 py-1 text-xs text-orange-700 bg-orange-50">
                            {SUSPEND_OPTIONS.map(o => (
                              <option key={o.days} value={String(o.days)}>{o.label}</option>
                            ))}
                          </select>
                          <button onClick={() => suspend(u.id)} disabled={loading === u.id}
                            className="px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50">
                            정지
                          </button>
                        </div>
                      )}

                      {/* RESTRICTED → 정지해제 */}
                      {u.status === "RESTRICTED" && (
                        <button onClick={() => patch(u.id, { status: "ACTIVE" })} disabled={loading === u.id}
                          className="px-2 py-1 text-xs bg-slate-600 text-white rounded hover:bg-slate-700 disabled:opacity-50">
                          정지해제
                        </button>
                      )}

                      {/* ACTIVE / RESTRICTED → 강퇴 */}
                      {(u.status === "ACTIVE" || u.status === "RESTRICTED") && (
                        <button onClick={() => ban(u.id)} disabled={loading === u.id}
                          className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50">
                          강퇴
                        </button>
                      )}

                      {/* PW 초기화 (BANNED 제외) */}
                      {u.status !== "BANNED" && (
                        <button onClick={() => resetPassword(u.id)} disabled={loading === u.id}
                          className="px-2 py-1 text-xs bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-50">
                          PW초기화
                        </button>
                      )}

                      {/* 계정 삭제 */}
                      <button onClick={() => deleteUser(u.id, u.name)} disabled={loading === u.id}
                        className="px-2 py-1 text-xs bg-slate-200 text-slate-600 rounded hover:bg-slate-300 disabled:opacity-50">
                        삭제
                      </button>
                    </div>

                    {/* 삭제 오류 표시 */}
                    {errors[u.id] && (
                      <p className="text-xs text-red-600 mt-1">{errors[u.id]}</p>
                    )}

                    {/* 임시 비밀번호 표시 */}
                    {tempPasswords[u.id] && (
                      <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                        <span className="text-xs font-mono font-bold text-amber-800">{tempPasswords[u.id]}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(tempPasswords[u.id])
                            setTempPasswords(prev => ({ ...prev, [u.id]: prev[u.id] + " ✓" }))
                          }}
                          className="text-xs text-amber-600 hover:text-amber-800 ml-1">
                          복사
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
