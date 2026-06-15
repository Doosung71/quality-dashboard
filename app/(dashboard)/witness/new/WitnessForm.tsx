"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, X } from "lucide-react"

type Room = { id: string; name: string; siteId: string; type: string }
type ConflictItem = { id: string; inspNo: string; customer: string; assigneeName: string }

const REGION_OPTIONS = [
  { value: "DOMESTIC",    label: "국내" },
  { value: "EUROPE",      label: "유럽" },
  { value: "ASIA",        label: "아시아" },
  { value: "MIDDLE_EAST", label: "중동" },
  { value: "OTHER",       label: "기타" },
]
const SITE_OPTIONS = [
  { value: "gumi",     label: "구미" },
  { value: "donghae",  label: "동해" },
  { value: "indon",    label: "인동" },
  { value: "external", label: "기타(사외)" },
]
const TYPE_OPTIONS = ["DC", "AC", "복합", "기타"]

type Props = { defaultAssigneeName: string; defaultAssigneeId: string }

export default function WitnessForm({ defaultAssigneeName, defaultAssigneeId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState("")

  const [form, setForm] = useState({
    customer:       "",
    projectName:    "",
    projectNumber:  "",
    productName:    "",
    inspectionDate: new Date().toISOString().slice(0, 10),
    endDate:        "",
    location:       "",
    region:         "",
    roomId:         "",
    assigneeName:   defaultAssigneeName,
    description:    "",
    notes:          "",
  })

  // 시험장 목록
  const [rooms, setRooms]           = useState<Room[]>([])
  const [roomsLoading, setRoomsLoading] = useState(true)

  // 장소 충돌
  const [conflicts, setConflicts]   = useState<ConflictItem[]>([])

  // 신규 장소 등록 모달
  const [showRoomModal, setShowRoomModal] = useState(false)
  const [newRoom, setNewRoom] = useState({ name: "", siteId: "gumi", type: "AC" })
  const [roomSaving, setRoomSaving] = useState(false)
  const [roomError, setRoomError]   = useState("")

  useEffect(() => {
    fetch("/api/witness/rooms")
      .then(r => r.json())
      .then((data: Room[]) => setRooms(data))
      .finally(() => setRoomsLoading(false))
  }, [])

  const checkConflicts = useCallback(async (roomId: string, date: string) => {
    if (!roomId || !date) { setConflicts([]); return }
    try {
      const res = await fetch(`/api/witness/conflicts?roomId=${roomId}&date=${date}`)
      const data = await res.json() as ConflictItem[]
      setConflicts(data)
    } catch {
      setConflicts([])
    }
  }, [])

  function set(key: string, val: string) {
    setForm(f => {
      const next = { ...f, [key]: val }
      if (key === "roomId" || key === "inspectionDate") {
        checkConflicts(
          key === "roomId" ? val : f.roomId,
          key === "inspectionDate" ? val : f.inspectionDate,
        )
      }
      return next
    })
  }

  function handleRoomChange(val: string) {
    if (val === "__new__") {
      setNewRoom({ name: "", siteId: "gumi", type: "AC" })
      setRoomError("")
      setShowRoomModal(true)
      return
    }
    set("roomId", val)
  }

  async function handleSaveRoom() {
    if (!newRoom.name.trim()) { setRoomError("장소 이름을 입력해주세요."); return }
    setRoomSaving(true); setRoomError("")
    try {
      const res = await fetch("/api/witness/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRoom),
      })
      if (!res.ok) {
        const j = await res.json() as { error?: string }
        throw new Error(j.error ?? "등록 실패")
      }
      const room = await res.json() as Room
      setRooms(prev => [...prev, room])
      set("roomId", room.id)
      setShowRoomModal(false)
      checkConflicts(room.id, form.inspectionDate)
    } catch (err) {
      setRoomError((err as Error).message)
    } finally {
      setRoomSaving(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.customer.trim())    { setError("고객사를 입력해주세요."); return }
    if (!form.projectName.trim()) { setError("프로젝트명을 입력해주세요."); return }
    if (!form.assigneeName.trim()) { setError("담당자를 입력해주세요."); return }
    if (form.endDate && form.endDate < form.inspectionDate) {
      setError("종료일은 시작일 이후여야 합니다."); return
    }

    setLoading(true); setError("")
    try {
      const res = await fetch("/api/witness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer:      form.customer.trim(),
          projectName:   form.projectName.trim(),
          projectNumber: form.projectNumber.trim() || undefined,
          productName:   form.productName.trim() || undefined,
          inspectionDate: form.inspectionDate,
          endDate:        form.endDate || undefined,
          location:       form.location.trim() || undefined,
          region:         form.region || undefined,
          roomId:         form.roomId || undefined,
          assigneeId:     defaultAssigneeId,
          assigneeName:   form.assigneeName.trim(),
          description:    form.description.trim() || undefined,
          notes:          form.notes.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const j = await res.json() as { error?: string }
        throw new Error(j.error ?? "등록 실패")
      }
      const { id } = await res.json() as { id: string }
      router.push(`/witness/${id}`)
    } catch (err) {
      setError((err as Error).message)
      setLoading(false)
    }
  }

  // 시험장 드롭다운 그룹 구성
  const roomsBySite = SITE_OPTIONS.map(s => ({
    ...s,
    rooms: rooms.filter(r => r.siteId === s.value),
  })).filter(s => s.rooms.length > 0)

  const field = "w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
  const label = "text-xs font-semibold text-slate-700 block mb-1.5"

  return (
    <>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">

        <fieldset className="space-y-4">
          <legend className="text-xs font-bold text-slate-400 uppercase tracking-wide pb-1 border-b border-slate-100 w-full">고객 / 프로젝트 정보</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={label}>고객사 *</label>
              <input value={form.customer} onChange={e => set("customer", e.target.value)}
                className={field} placeholder="예: 한국전력공사" required />
            </div>
            <div>
              <label className={label}>프로젝트명 *</label>
              <input value={form.projectName} onChange={e => set("projectName", e.target.value)}
                className={field} placeholder="예: 765kV XLPE Cable 공급" required />
            </div>
            <div>
              <label className={label}>수주번호</label>
              <input value={form.projectNumber} onChange={e => set("projectNumber", e.target.value)}
                className={field} placeholder="예: SO-2026-1234" />
            </div>
            <div className="sm:col-span-2">
              <label className={label}>제품명/품목</label>
              <input value={form.productName} onChange={e => set("productName", e.target.value)}
                className={field} placeholder="예: 154kV 800㎟ XLPE Cable" />
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-xs font-bold text-slate-400 uppercase tracking-wide pb-1 border-b border-slate-100 w-full">검사 일정 및 장소</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={label}>검사 시작일 *</label>
              <input type="date" value={form.inspectionDate} onChange={e => set("inspectionDate", e.target.value)}
                className={field} required />
            </div>
            <div>
              <label className={label}>검사 종료일 <span className="text-slate-400 font-normal">(다일 검사 시)</span></label>
              <input type="date" value={form.endDate} onChange={e => set("endDate", e.target.value)}
                min={form.inspectionDate} className={field} />
            </div>

            {/* 시험장 선택 */}
            <div>
              <label className={label}>시험장</label>
              <select
                value={form.roomId}
                onChange={e => handleRoomChange(e.target.value)}
                className={field}
                disabled={roomsLoading}
              >
                <option value="">시험장 선택 (선택사항)</option>
                {roomsBySite.map(site => (
                  <optgroup key={site.value} label={`${site.label} 사업장`}>
                    {site.rooms.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </optgroup>
                ))}
                <option value="__new__">+ 새 시험장 등록...</option>
              </select>
            </div>

            {/* 권역 선택 */}
            <div>
              <label className={label}>고객 권역</label>
              <select value={form.region} onChange={e => set("region", e.target.value)} className={field}>
                <option value="">권역 선택 (선택사항)</option>
                {REGION_OPTIONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className={label}>상세 장소 메모 <span className="text-slate-400 font-normal">(시험장 내 구체적 위치 등)</span></label>
              <input value={form.location} onChange={e => set("location", e.target.value)}
                className={field} placeholder="예: 2번 시험선 / 750kV 시험대" />
            </div>

            <div>
              <label className={label}>담당자 *</label>
              <input value={form.assigneeName} onChange={e => set("assigneeName", e.target.value)}
                className={field} placeholder="담당자 이름" required />
            </div>
          </div>

          {/* 장소 충돌 경고 */}
          {conflicts.length > 0 && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-xs text-amber-800">
                <p className="font-semibold mb-1">이 날 동일 시험장에 입회검사가 있습니다. 담당자 간 협의 후 등록해주세요.</p>
                {conflicts.map(c => (
                  <p key={c.id} className="text-amber-700">
                    · {c.inspNo} — {c.customer} (담당: {c.assigneeName})
                  </p>
                ))}
              </div>
            </div>
          )}
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-xs font-bold text-slate-400 uppercase tracking-wide pb-1 border-b border-slate-100 w-full">검사 내용 (선택)</legend>
          <div>
            <label className={label}>검사 범위 / 내용</label>
            <textarea value={form.description} onChange={e => set("description", e.target.value)}
              rows={3} className={field}
              placeholder="검사 항목, 적용 규격, 확인 포인트 등을 입력하세요..." />
          </div>
          <div>
            <label className={label}>비고</label>
            <textarea value={form.notes} onChange={e => set("notes", e.target.value)}
              rows={2} className={field}
              placeholder="특이사항, 준비물, 고객 요청 사전 메모 등" />
          </div>
        </fieldset>

        {error && <p className="text-xs text-rose-600">{error}</p>}

        <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
          <button type="button" onClick={() => router.back()}
            className="px-4 py-2 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
            취소
          </button>
          <button type="submit" disabled={loading}
            className="px-5 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {loading ? "등록 중..." : "입회검사 등록"}
          </button>
        </div>
      </form>

      {/* 신규 시험장 등록 모달 */}
      {showRoomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">새 시험장 등록</h3>
              <button onClick={() => setShowRoomModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className={label}>시험장 이름 *</label>
                <input
                  value={newRoom.name}
                  onChange={e => setNewRoom(p => ({ ...p, name: e.target.value }))}
                  className={field} placeholder="예: 물성실, 환경시험실"
                  autoFocus
                />
              </div>
              <div>
                <label className={label}>사업장</label>
                <select
                  value={newRoom.siteId}
                  onChange={e => setNewRoom(p => ({ ...p, siteId: e.target.value }))}
                  className={field}
                >
                  {SITE_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className={label}>시험장 유형</label>
                <select
                  value={newRoom.type}
                  onChange={e => setNewRoom(p => ({ ...p, type: e.target.value }))}
                  className={field}
                >
                  {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {roomError && <p className="text-xs text-rose-600">{roomError}</p>}

            <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
              <button type="button" onClick={() => setShowRoomModal(false)}
                className="px-4 py-2 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
                취소
              </button>
              <button type="button" onClick={handleSaveRoom} disabled={roomSaving}
                className="px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {roomSaving ? "등록 중..." : "등록"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
