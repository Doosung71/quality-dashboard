export type Visibility = "ALL" | "TEAM_LEAD_UP" | "DIRECTOR_UP"

export const VISIBILITY_CONFIG: Record<Visibility, {
  label: string; shortLabel: string; icon: string
  allowedRoles: string[]; color: string
}> = {
  ALL:          { label: "전체 공개",   shortLabel: "전체",   icon: "🌐", allowedRoles: ["PRACTITIONER","TEAM_LEAD","DIRECTOR","ADMIN"], color: "bg-emerald-100 text-emerald-700" },
  TEAM_LEAD_UP: { label: "팀장 이상",   shortLabel: "팀장+",  icon: "🔒", allowedRoles: ["TEAM_LEAD","DIRECTOR","ADMIN"],               color: "bg-blue-100 text-blue-700"    },
  DIRECTOR_UP:  { label: "부문장 이상", shortLabel: "부문장+", icon: "🔐", allowedRoles: ["DIRECTOR","ADMIN"],                           color: "bg-violet-100 text-violet-700" },
}

export function canView(visibility: string, role: string): boolean {
  const cfg = VISIBILITY_CONFIG[visibility as Visibility]
  return cfg ? cfg.allowedRoles.includes(role) : false
}

export function isAdmin(role: string): boolean {
  return role === "ADMIN"
}

export function isPrivileged(role: string): boolean {
  return role === "ADMIN" || role === "DIRECTOR"
}
