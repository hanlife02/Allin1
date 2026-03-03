"use client"

import { useCallback, useEffect, useState } from "react"

export function useLocalStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(defaultValue)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(key)
      if (stored) {
        setValue(JSON.parse(stored))
      }
    } catch {
      // ignore parse errors
    }
    setMounted(true)
  }, [key])

  const setStoredValue = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof newValue === "function" ? (newValue as (prev: T) => T)(prev) : newValue
        localStorage.setItem(key, JSON.stringify(resolved))
        return resolved
      })
    },
    [key]
  )

  return [value, setStoredValue, mounted] as const
}
