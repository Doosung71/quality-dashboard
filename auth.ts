import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { authConfig } from "@/auth.config"
import type { Role, UserStatus } from "@/lib/generated/prisma/client"

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: [
    process.env.AUTH_SECRET!,
    ...(process.env.AUTH_SECRET_OLD ? [process.env.AUTH_SECRET_OLD] : []),
  ],
  session: { maxAge: 8 * 60 * 60 },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined
        const password = credentials?.password as string | undefined
        if (!email || !password) return null

        const user = await prisma.user.findUnique({ where: { email } })
        if (!user) return null

        const ok = await bcrypt.compare(password, user.passwordHash)
        if (!ok) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
          restrictedUntil: user.restrictedUntil?.toISOString() ?? null,
          nickname: user.nickname ?? null,
        }
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role: Role }).role
        token.status = (user as { status: UserStatus }).status
        token.restrictedUntil = (user as { restrictedUntil: string | null }).restrictedUntil
        token.nickname = (user as { nickname: string | null }).nickname
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as Role
      session.user.status = token.status as UserStatus
      session.user.restrictedUntil = (token.restrictedUntil ?? null) as string | null
      session.user.nickname = (token.nickname ?? null) as string | null
      return session
    },
  },
})
