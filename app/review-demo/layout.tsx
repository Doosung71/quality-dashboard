import { notFound } from "next/navigation"
import { DemoShell } from "@/components/review-demo/demo-shell"

export const metadata = {
  title: "Review Demo — QMS 2.0",
  robots: "noindex,nofollow",
}

export default function ReviewDemoLayout({ children }: { children: React.ReactNode }) {
  if (process.env.ENABLE_REVIEW_DEMO !== "true") notFound()
  return <DemoShell>{children}</DemoShell>
}
