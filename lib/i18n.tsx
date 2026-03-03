"use client"

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import { zh, type LocaleDict } from "@/lib/locale/zh"
import { en } from "@/lib/locale/en"

export type Locale = "zh" | "en"

const dictionaries: Record<Locale, LocaleDict> = { zh, en }

interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: LocaleDict
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

const STORAGE_KEY = "allin1_locale"

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "zh"
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === "zh" || stored === "en") return stored
  const browserLang = navigator.language
  return browserLang.startsWith("zh") ? "zh" : "en"
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("zh")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setLocaleState(getInitialLocale())
    setMounted(true)
  }, [])

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    localStorage.setItem(STORAGE_KEY, newLocale)
    document.documentElement.lang = newLocale === "zh" ? "zh-CN" : "en"
  }, [])

  const t = dictionaries[locale]

  if (!mounted) {
    return <I18nContext.Provider value={{ locale: "zh", setLocale, t: dictionaries.zh }}>{children}</I18nContext.Provider>
  }

  return <I18nContext.Provider value={{ locale, setLocale, t }}>{children}</I18nContext.Provider>
}

export function useLocale() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error("useLocale must be used within I18nProvider")
  }
  return context
}
