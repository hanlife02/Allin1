"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PageHeader } from "@/components/page-header"
import {
  UserManagement,
  defaultUserPreferences,
  type UserPreferences,
} from "@/components/settings/user-management"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { useLocale } from "@/lib/i18n"
import {
  NOTIFICATION_SETTINGS_STORAGE_KEY,
  defaultNotificationSettings,
  type NotificationSettings,
} from "@/lib/notification-settings"

const USER_PREFS_KEY = "allin1_preferences"

function isSameSettings(
  leftPrefs: UserPreferences,
  rightPrefs: UserPreferences,
  leftNotifications: NotificationSettings,
  rightNotifications: NotificationSettings,
): boolean {
  return JSON.stringify(leftPrefs) === JSON.stringify(rightPrefs)
    && JSON.stringify(leftNotifications) === JSON.stringify(rightNotifications)
}

export default function SettingsPage() {
  const router = useRouter()
  const { t } = useLocale()
  const [savedPrefs, setSavedPrefs, prefsMounted] = useLocalStorage<UserPreferences>(
    USER_PREFS_KEY,
    defaultUserPreferences,
  )
  const [savedNotifications, setSavedNotifications, notificationsMounted] = useLocalStorage<NotificationSettings>(
    NOTIFICATION_SETTINGS_STORAGE_KEY,
    defaultNotificationSettings,
  )
  const [draftPrefs, setDraftPrefs] = useState<UserPreferences>(defaultUserPreferences)
  const [draftNotifications, setDraftNotifications] = useState<NotificationSettings>(defaultNotificationSettings)
  const [pendingNavigationHref, setPendingNavigationHref] = useState<string | null>(null)

  useEffect(() => {
    setDraftPrefs(savedPrefs)
  }, [savedPrefs])

  useEffect(() => {
    setDraftNotifications(savedNotifications)
  }, [savedNotifications])

  const hasUnsavedChanges = useMemo(
    () => !isSameSettings(draftPrefs, savedPrefs, draftNotifications, savedNotifications),
    [draftNotifications, draftPrefs, savedNotifications, savedPrefs],
  )

  const persistSettings = useCallback(
    (nextPrefs: UserPreferences, nextNotifications: NotificationSettings) => {
      setSavedPrefs(nextPrefs)
      setSavedNotifications(nextNotifications)
    },
    [setSavedNotifications, setSavedPrefs],
  )

  const saveCurrentDraft = useCallback(() => {
    persistSettings(draftPrefs, draftNotifications)
  }, [draftNotifications, draftPrefs, persistSettings])

  useEffect(() => {
    if (!hasUnsavedChanges) return

    const onDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const target = event.target as Element | null
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null
      if (!anchor) return
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return

      const nextUrl = new URL(anchor.href, window.location.href)
      const currentUrl = new URL(window.location.href)
      const isSameRoute = nextUrl.pathname === currentUrl.pathname && nextUrl.search === currentUrl.search
      if (isSameRoute) return

      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()
      setPendingNavigationHref(`${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`)
    }

    document.addEventListener("click", onDocumentClick, true)
    return () => document.removeEventListener("click", onDocumentClick, true)
  }, [hasUnsavedChanges])

  const cancelPendingNavigation = useCallback(() => {
    setPendingNavigationHref(null)
  }, [])

  const discardAndLeave = useCallback(() => {
    if (!pendingNavigationHref) return
    const href = pendingNavigationHref
    setPendingNavigationHref(null)
    router.push(href)
  }, [pendingNavigationHref, router])

  const saveAndLeave = useCallback(() => {
    if (!pendingNavigationHref) return
    const href = pendingNavigationHref
    saveCurrentDraft()
    setPendingNavigationHref(null)
    router.push(href)
  }, [pendingNavigationHref, router, saveCurrentDraft])

  return (
    <>
      <PageHeader
        title={t.settings.title}
        actions={
          <Button
            size="sm"
            onClick={saveCurrentDraft}
            disabled={!prefsMounted || !notificationsMounted || !hasUnsavedChanges}
          >
            {t.settings.userManagement.save}
          </Button>
        }
      />
      <div className="flex-1 p-4 md:p-5 lg:p-6">
        <UserManagement
          prefs={draftPrefs}
          notifications={draftNotifications}
          onPrefsChange={setDraftPrefs}
          onNotificationsChange={setDraftNotifications}
        />
      </div>
      <Dialog open={pendingNavigationHref !== null} onOpenChange={(open) => !open && cancelPendingNavigation()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.settings.unsaved.title}</DialogTitle>
            <DialogDescription>{t.settings.unsaved.saveBeforeLeave}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={cancelPendingNavigation}>
              {t.common.cancel}
            </Button>
            <Button variant="ghost" onClick={discardAndLeave}>
              {t.settings.unsaved.discardAction}
            </Button>
            <Button onClick={saveAndLeave}>
              {t.settings.unsaved.saveAndLeave}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
