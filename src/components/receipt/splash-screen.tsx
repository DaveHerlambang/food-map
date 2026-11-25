import { Barcode, Rule, Zigzag } from "./receipt"

/**
 * The opening screen: the login receipt without the form, on asphalt.
 *
 * Shown while the map loads (the Suspense fallbacks in (app)). The iPhone
 * home screen app shows a still picture of this same screen while it starts
 * (public/splash/*.png, drawn by scripts/splash.html), so keep the two in
 * step: same sizes, same text, centered on the whole screen. Asphalt on both
 * map themes, because the picture can't know which one you use.
 */
export function SplashScreen() {
  return (
    <main className="flex h-dvh items-center justify-center bg-asphalt">
      <p role="status" className="sr-only">
        Loading the map…
      </p>
      <div aria-hidden="true" className="w-60 text-ink drop-shadow-[0_12px_32px_rgba(0,0,0,0.55)]">
        <Zigzag side="top" />
        <div className="flex flex-col items-center gap-3 bg-paper px-6 py-7">
          <p className="pl-[0.16em] text-lg font-bold tracking-[0.16em]">FOOD MAP</p>
          <p className="text-[10px] tracking-[0.12em] text-ink-muted">A TABLE FOR TWO</p>
          <Rule className="self-stretch" />
          <Barcode scanning />
          <p className="text-[10px] tracking-[0.12em] text-ink-muted">SELAMAT MAKAN</p>
        </div>
        <Zigzag side="bottom" />
      </div>
    </main>
  )
}
