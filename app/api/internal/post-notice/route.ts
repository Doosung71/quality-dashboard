import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// One-shot: create blob-limit notice. Remove after use.
const TOKEN = "qms-notice-2026-0612-blob"

const TITLE = "📢 [시스템 공지] 파일 첨부 기능 일시 중단 안내"

const CONTENT = `안녕하세요, QMS 2.0 운영팀입니다.

현재 **사진·파일 첨부 기능**이 일시적으로 작동하지 않는 상태입니다.

## 원인

플랫폼의 월간 파일 저장 용량 한도(Vercel Blob Free Tier)가 E2E-1 테스트 기간 중 업로드된 첨부파일로 인해 초과되었습니다.

## 영향 범위

- 게시판·피드백·클레임·NCR·검사 기록 등 **모든 파일/이미지 첨부 기능** 일시 불가
- 기존 등록된 데이터 조회, 텍스트 입력/저장은 **정상 작동합니다**

## 복구 일정

> **한국시간 6월 12일(목) 오전 9시** — 월간 사용량 자동 리셋 후 즉시 정상화됩니다.

그때까지는 첨부가 필요한 내용을 텍스트로 기록해 두시고, 내일 오전 9시 이후 첨부 등록 부탁드립니다.
불편을 드려 진심으로 죄송합니다.

*QMS 2.0 운영팀*`

export async function POST(req: NextRequest) {
  const { token } = await req.json()
  if (token !== TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const admin = await prisma.user.findFirst({
    where: { email: "doosung71@gmail.com" },
    select: { id: true },
  })
  if (!admin) {
    return NextResponse.json({ error: "admin not found" }, { status: 404 })
  }

  const post = await prisma.boardPost.create({
    data: {
      title: TITLE,
      content: CONTENT,
      category: "NOTICE",
      pinned: true,
      authorId: admin.id,
      attachments: [],
      displayMode: "REAL",
      visibility: "ALL",
    },
  })

  return NextResponse.json({ ok: true, postId: post.id })
}
