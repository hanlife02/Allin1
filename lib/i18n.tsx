"use client"

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import { zh, type LocaleDict } from "@/lib/locale/zh"
import { en } from "@/lib/locale/en"
import { useLocalStorage } from "@/hooks/use-local-storage"

export type Locale = "zh" | "en"

const dictionaries: Record<Locale, LocaleDict> = { zh, en }

interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: LocaleDict
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

const STORAGE_KEY = "allin1_locale"

function getBrowserPreferredLocale(): Locale {
  if (typeof window === "undefined") return "zh"
  const browserLang = navigator.language
  return browserLang.startsWith("zh") ? "zh" : "en"
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState, mounted] = useLocalStorage<Locale>(STORAGE_KEY, getBrowserPreferredLocale())

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en"
  }, [locale])

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
