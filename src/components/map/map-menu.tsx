"use client"

import { Menu } from "@base-ui/react/menu"
import { LoaderCircle, LogOut, Moon, MoreHorizontal, Sun } from "lucide-react"
import { cn } from "cn"
import { useTransition } from "react"
import { logout } from "@/app/login/actions"

const item =
  "flex h-11 cursor-default items-center gap-2.5 px-2.5 text-[11px] font-bold uppercase tracking-[0.06em] text-ink outline-none select-none data-highlighted:bg-paper-2"

/**
 * The "⋯" on the map: things you rarely need, kept off the map itself.
 * A small receipt that drops down from the button, torn at the bottom.
 */
export function MapMenu({
  theme,
  onToggleTheme,
  className,
}: {
  theme: "dark" | "light"
  onToggleTheme: () => void
  /** the tile look, shared with the other map controls */
  className: string
}) {
  const [signingOut, startSignOut] = useTransition()

  return (
    <Menu.Root>
      <Menu.Trigger aria-label="Menu" className={cn(className, "w-11 data-popup-open:bg-paper-2 data-pressed:bg-paper-2")}>
        {signingOut ? <LoaderCircle className="size-5 animate-spin" /> : <MoreHorizontal className="size-5" />}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={8} align="end" className="z-50 outline-none">
          <Menu.Popup className="flex w-48 origin-(--transform-origin) flex-col font-mono outline-none drop-shadow-[0_3px_6px_rgba(0,0,0,0.3)] transition-[scale,opacity] duration-100 ease-out data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0">
            <div className="flex flex-col bg-paper p-1">
              <Menu.Item className={item} onClick={onToggleTheme}>
                {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
                {theme === "dark" ? "Light map" : "Dark map"}
              </Menu.Item>
              <Menu.Item
                className={cn(item, "border-t border-dashed border-rule")}
                onClick={() => startSignOut(async () => await logout())}
              >
                <LogOut className="size-4" />
                Sign out
              </Menu.Item>
            </div>
            <span aria-hidden className="zigzag-bottom block" />
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
