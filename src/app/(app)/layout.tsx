import { connection } from "next/server"
import { Suspense } from "react"
import { SplashScreen } from "@/components/receipt/splash-screen"
import { logout } from "@/app/login/actions"
import { ReceiptCard, Rule } from "@/components/receipt/receipt"
import { Button } from "@/components/ui/button"
import { getMember } from "@/lib/auth"

// Everything under (app) requires login (proxy.ts) AND a row in `members`.
// The session read happens at request time, so it lives behind <Suspense>
// (Cache Components) instead of at the top level of the layout.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<SplashScreen />}>
      <MemberGate>{children}</MemberGate>
    </Suspense>
  )
}

async function MemberGate({ children }: { children: React.ReactNode }) {
  // Supabase checks token expiry with Date.now(); mark this as request-time
  // work so Cache Components doesn't try to prerender it.
  await connection()
  const member = await getMember()

  if (!member) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-map px-4">
        <ReceiptCard className="text-center">
          <h1 className="text-base font-bold tracking-[0.12em]">NOT SET UP YET</h1>
          <Rule />
          <p className="text-[13px] leading-relaxed text-ink-muted">
            You&apos;re signed in, but this account hasn&apos;t been added to the map yet. Ask the
            owner to add you as a member.
          </p>
          <form action={logout}>
            <Button type="submit" variant="outline" className="h-11 w-full text-xs">
              Sign out
            </Button>
          </form>
        </ReceiptCard>
      </main>
    )
  }

  return <>{children}</>
}
