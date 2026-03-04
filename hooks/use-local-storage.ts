"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export const LOCAL_STORAGE_SYNC_EVENT = "allin1-local-storage-sync"

function readStoredValue<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key)
    if (!stored) return defaultValue
    return JSON.parse(stored) as T
  } catch {
    return defaultValue
  }
}

export function useLocalStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(defaultValue)
  const [mounted, setMounted] = useState(false)
  const valueRef = useRef<T>(defaultValue)

  useEffect(() => {
    const nextValue = readStoredValue(key, defaultValue)
    valueRef.current = nextValue
    setValue(nextValue)

    const onStorage = (event: StorageEvent) => {
      if (event.key !== key) return
      const nextValueFromStorage = readStoredValue(key, defaultValue)
      valueRef.current = nextValueFromStorage
      setValue(nextValueFromStorage)
    }

    const onCustomSync = (event: Event) => {
      const customEvent = event as CustomEvent<{ key?: string }>
      if (customEvent.detail?.key !== key) return
      const nextValueFromStorage = readStoredValue(key, defaultValue)
      valueRef.current = nextValueFromStorage
      setValue(nextValueFromStorage)
    }

    window.addEventListener("storage", onStorage)
    window.addEventListener(LOCAL_STORAGE_SYNC_EVENT, onCustomSync as EventListener)
    setMounted(true)
    return () => {
      window.removeEventListener("storage", onStorage)
      window.removeEventListener(LOCAL_STORAGE_SYNC_EVENT, onCustomSync as EventListener)
    }
  }, [key])

  useEffect(() => {
    valueRef.current = value
  }, [value])

  const setStoredValue = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      const resolved =
        typeof newValue === "function"
          ? (newValue as (prev: T) => T)(valueRef.current)
          : newValue
      valueRef.current = resolved
      setValue(resolved)
      localStorage.setItem(key, JSON.stringify(resolved))
      window.dispatchEvent(new CustomEvent(LOCAL_STORAGE_SYNC_EVENT, { detail: { key } }))
    },
    [key]
  )

  return [value, setStoredValue, mounted] as const
}
