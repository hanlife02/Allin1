"use client"

import { useLocale } from "@/lib/i18n"
import { Button } from "@/components/ui/button"

export function LocaleToggle() {
  const { locale, setLocale, t } = useLocale()

  function cycle() {
    setLocale(locale === "zh" ? "en" : "zh")
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-xs font-medium"
      onClick={cycle}
      aria-label={t.settings.language.title}
    >
      {locale === "zh" ? "中" : "EN"}
    </Button>
  )
}
