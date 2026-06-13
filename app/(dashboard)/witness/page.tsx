import { requireActivePageSession } from "@/lib/session-guard"
import { Suspense } from "react"
import WitnessPageClient from "./WitnessPageClient"

export default async function WitnessPage() {
  await requireActivePageSession()
  return <Suspense><WitnessPageClient /></Suspense>
}
