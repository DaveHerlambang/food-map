import { Barcode, ReceiptCard, Rule } from "@/components/receipt/receipt"
import { LoginForm } from "./login-form"

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-map px-4 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <ReceiptCard>
        <div className="text-center">
          <h1 className="text-xl font-bold tracking-[0.16em]">FOOD MAP</h1>
          <p className="mt-1 text-[11px] tracking-[0.12em] text-ink-muted">A TABLE FOR TWO · MEMBERS ONLY</p>
        </div>
        <Rule />
        <LoginForm />
        <Rule />
        <Barcode className="self-center" />
        <p className="text-center text-[11px] tracking-[0.14em] text-ink-muted">TERIMA KASIH · SELAMAT MAKAN</p>
      </ReceiptCard>
    </main>
  )
}
