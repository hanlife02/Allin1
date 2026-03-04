"use client"

import { useEffect, useState } from "react"
import { Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "next-themes"
import { useLocale } from "@/lib/i18n"
import { Button } from "@/components/ui/button"

const THEMES = ["light", "dark", "system"] as const
type Theme = typeof THEMES[number]

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()
  const { t } = useLocale()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  function cycle() {
    const current = (theme as Theme) ?? "system"
    const idx = THEMES.indexOf(current)
    const next = THEMES[(idx + 1) % THEMES.length]
    setTheme(next)
  }

  const icon = !mounted ? (
    <Monitor className="h-4 w-4" />
  ) : theme === "dark" ? (
      <Moon className="h-4 w-4" />
    ) : theme === "light" ? (
      <Sun className="h-4 w-4" />
    ) : (
      <Monitor className="h-4 w-4" />
    )

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={cycle}
      aria-label={t.settings.theme.title}
    >
      {icon}
    </Button>
  )
}
