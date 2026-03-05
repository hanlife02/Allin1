"use client"

import { useRef, useCallback } from "react"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { useLocale } from "@/lib/i18n"

const MIN_WIDTH = 160
const MAX_WIDTH = 400
const DEFAULT_WIDTH = 220

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { locale } = useLocale()
  const providerRef = useRef<HTMLDivElement>(null)
  const widthRef = useRef(DEFAULT_WIDTH)
  const currentYear = new Date().getFullYear()
  const footerText = locale === "zh"
    ? `Allin1 个人平台 · © ${currentYear} · 保留所有权利`
    : `Allin1 Personal Platform · © ${currentYear} · All rights reserved`

  const startDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    const el = providerRef.current
    if (!el) return

    const startX = e.clientX
    const startWidth = widthRef.current

    function onMove(ev: PointerEvent) {
      const delta = ev.clientX - startX
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + delta))
      widthRef.current = next
      el!.style.setProperty("--sidebar-width", `${next}px`)
    }

    function onUp() {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }

    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
  }, [])

  return (
    <SidebarProvider
      ref={providerRef}
      style={{ "--sidebar-width": `${DEFAULT_WIDTH}px` } as React.CSSProperties}
    >
      <AppSidebar />

      {/* Drag handle — sits right on the sidebar/content seam */}
      <div
        className="relative z-20 flex-none w-0 cursor-col-resize group"
        onPointerDown={startDrag}
        aria-hidden="true"
      >
        {/* Visible hit area: 8px wide, centered on the seam */}
        <div className="absolute inset-y-0 -left-1 w-2 group-hover:bg-border/60 transition-colors" />
      </div>

      <SidebarInset>
        {children}
        <footer className="border-t border-border/60 px-4 py-3 text-xs text-muted-foreground md:px-6">
          {footerText}
        </footer>
      </SidebarInset>
    </SidebarProvider>
  )
}
