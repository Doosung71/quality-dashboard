import type { Role } from "@/lib/generated/prisma/client"

interface RoleGateProps {
  role: Role
  allow: Role[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function RoleGate({ role, allow, children, fallback = null }: RoleGateProps) {
  if (!allow.includes(role)) return <>{fallback}</>
  return <>{children}</>
}

export function RoleBadge({ role }: { role: Role }) {
  const map: Record<Role, { label: string; className: string }> = {
    PRACTITIONER: { label: "실무자",  className: "bg-slate-100 text-slate-600" },
    TEAM_LEAD:    { label: "팀장",    className: "bg-blue-100 text-blue-700" },
    DIRECTOR:     { label: "임원",    className: "bg-purple-100 text-purple-700" },
    ADMIN:        { label: "관리자",  className: "bg-indigo-100 text-indigo-700" },
  }
  const { label, className } = map[role]
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}
