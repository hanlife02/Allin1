"use client"

import { useRef, useCallback } from "react"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"

const MIN_WIDTH_REM = 14
const MAX_WIDTH_REM = 24
const DEFAULT_WIDTH_REM = 18

function clampSidebarWidthRem(widthRem: number): number {
  return Math.min(MAX_WIDTH_REM, Math.max(MIN_WIDTH_REM, widthRem))
}

function toSidebarWidth(widthRem: number): string {
  return `${widthRem.toFixed(3)}rem`
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const providerRef = useRef<HTMLDivElement>(null)
  const widthRef = useRef(DEFAULT_WIDTH_REM)

  const startDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    const el = providerRef.current
    if (!el) return
    const sidebarProviderEl = el

    const startX = e.clientX
    const startRem = widthRef.current
    const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16

    function onMove(ev: PointerEvent) {
      const deltaRem = (ev.clientX - startX) / rootFontSize
      const nextRem = clampSidebarWidthRem(startRem + deltaRem)
      widthRef.current = nextRem
      sidebarProviderEl.style.setProperty("--sidebar-width", toSidebarWidth(nextRem))
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
      style={{ "--sidebar-width": toSidebarWidth(DEFAULT_WIDTH_REM) } as React.CSSProperties}
    >
      <AppSidebar />

      {/* Drag handle sits right on the sidebar/content seam */}
      <div
        className="group relative z-20 w-0 flex-none cursor-col-resize"
        onPointerDown={startDrag}
        aria-hidden="true"
      >
        {/* Visible hit area: 8px wide, centered on the seam */}
        <div className="absolute inset-y-0 -left-1 w-2 transition-colors group-hover:bg-border/60" />
      </div>

      <SidebarInset>
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
