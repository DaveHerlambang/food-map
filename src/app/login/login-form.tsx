"use client"

import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { login, type LoginState } from "./actions"

const label = "text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted"

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, undefined)

  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className={label}>Email</span>
        <Input
          name="email"
          type="email"
          autoComplete="username"
          autoCapitalize="none"
          required
          className="h-12 text-base"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={label}>Password</span>
        <Input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-12 text-base"
        />
      </label>
      {state?.error && (
        <p role="alert" className="text-[13px] font-bold text-barbados">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="mt-1 h-12 text-sm">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  )
}
