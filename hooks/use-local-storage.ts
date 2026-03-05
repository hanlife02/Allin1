"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export const LOCAL_STORAGE_SYNC_EVENT = "allin1-local-storage-sync"

interface StorageSyncDetail<T> {
  key?: string
  value?: T
}

async function readServerValue<T>(key: string): Promise<{ found: boolean; value: T | null }> {
  const response = await fetch(`/api/storage?key=${encodeURIComponent(key)}`, {
    method: "GET",
    cache: "no-store",
  })
  if (!response.ok) throw new Error(`storage_read_failed_${response.status}`)
  return (await response.json()) as { found: boolean; value: T | null }
}

async function writeServerValue<T>(key: string, value: T): Promise<void> {
  const response = await fetch("/api/storage", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value }),
  })
  if (!response.ok) throw new Error(`storage_write_failed_${response.status}`)
}

function readLegacyLocalValue<T>(key: string): T | undefined {
  try {
    const stored = localStorage.getItem(key)
    if (!stored) return undefined
    return JSON.parse(stored) as T
  } catch {
    return undefined
  }
}

export function useLocalStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(defaultValue)
  const [mounted, setMounted] = useState(false)
  const valueRef = useRef<T>(defaultValue)

  useEffect(() => {
    let cancelled = false

    const syncFromServer = async () => {
      try {
        const payload = await readServerValue<T>(key)
        if (payload.found) {
          if (cancelled) return
          const nextValue = (payload.value ?? defaultValue) as T
          valueRef.current = nextValue
          setValue(nextValue)
          return
        }
      } catch {
        // Ignore and fallback to local migration/default below.
      }

      const legacyValue = readLegacyLocalValue<T>(key)
      if (legacyValue !== undefined) {
        if (!cancelled) {
          valueRef.current = legacyValue
          setValue(legacyValue)
        }
        void writeServerValue(key, legacyValue)
        localStorage.removeItem(key)
        return
      }

      if (!cancelled) {
        valueRef.current = defaultValue
        setValue(defaultValue)
      }
    }

    const onCustomSync = (event: Event) => {
      const customEvent = event as CustomEvent<StorageSyncDetail<T>>
      if (customEvent.detail?.key !== key) return
      if (customEvent.detail?.value === undefined) {
        void syncFromServer()
        return
      }
      valueRef.current = customEvent.detail.value
      setValue(customEvent.detail.value)
    }

    void syncFromServer().finally(() => {
      if (!cancelled) setMounted(true)
    })

    window.addEventListener(LOCAL_STORAGE_SYNC_EVENT, onCustomSync as EventListener)
    return () => {
      cancelled = true
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
      void writeServerValue(key, resolved)
      window.dispatchEvent(new CustomEvent<StorageSyncDetail<T>>(LOCAL_STORAGE_SYNC_EVENT, { detail: { key, value: resolved } }))
    },
    [key]
  )

  return [value, setStoredValue, mounted] as const
}
