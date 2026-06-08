import type { NextAuthConfig } from "next-auth"

const ADMIN_EMAILS = ["doosung71@gmail.com"]

export const authConfig = {
  pages: { signIn: "/login" },
  callbacks: {
    session({ session, token }) {
      const u = session.user as unknown as Record<string, unknown>
      u.status = token.status ?? null
      u.restrictedUntil = token.restrictedUntil ?? null
      return session
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const pathname = nextUrl.pathname
      const user = auth?.user as { status?: string; restrictedUntil?: string | null; email?: string | null; role?: string | null } | undefined
      const status = user?.status
      const restrictedUntil = user?.restrictedUntil ?? null
      const email = user?.email
      const role = user?.role
      const isAdminUser = (!!email && ADMIN_EMAILS.includes(email)) || role === "ADMIN"
      const restrictionExpired = status === "RESTRICTED" && !!restrictedUntil && new Date(restrictedUntil) < new Date()
      const isEffectivelyActive = status === "ACTIVE" || restrictionExpired

      if (pathname.startsWith("/review-demo")) return true

      if (pathname.startsWith("/login") || pathname.startsWith("/register")) {
        if (!isLoggedIn) return true
        if (isEffectivelyActive || isAdminUser) return Response.redirect(new URL("/", nextUrl))
        if (status === "PENDING") return Response.redirect(new URL("/pending", nextUrl))
        return Response.redirect(new URL("/banned", nextUrl))
      }

      if (!isLoggedIn) return Response.redirect(new URL("/login", nextUrl))

      if (pathname.startsWith("/pending") || pathname.startsWith("/banned")) {
        if (isEffectivelyActive || isAdminUser) return Response.redirect(new URL("/", nextUrl))
        return true
      }

      if (pathname.startsWith("/admin")) {
        if (!isAdminUser) return Response.redirect(new URL("/", nextUrl))
        return true
      }

      if (!isEffectivelyActive && !isAdminUser) {
        if (status === "PENDING") return Response.redirect(new URL("/pending", nextUrl))
        return Response.redirect(new URL("/banned", nextUrl))
      }

      return true
    },
  },
  providers: [],
} satisfies NextAuthConfig
