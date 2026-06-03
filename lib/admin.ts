const ADMIN_EMAILS = ["doosung71@gmail.com"]

// 이메일 또는 ADMIN 역할로 관리자 판별
export const isAdmin = (email?: string | null, role?: string | null) =>
  (!!email && ADMIN_EMAILS.includes(email)) || role === "ADMIN"
