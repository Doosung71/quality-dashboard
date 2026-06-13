import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import WitnessPageClient from "./WitnessPageClient"

export default async function WitnessPage() {
  const session = await auth()
  if (!session) redirect("/login")
  return <Suspense><WitnessPageClient /></Suspense>
}
