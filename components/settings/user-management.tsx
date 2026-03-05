"use client"

import { useRef, useState, type ChangeEvent } from "react"
import { BellRing, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useLocale } from "@/lib/i18n"
import {
  defaultNotificationSettings,
  type NotificationSettings,
} from "@/lib/notification-settings"

export type ApiRequestFormat = "openai" | "anthropic" | "gemini" | "custom"

export interface UserPreferences {
  username: string
  email: string
  avatarDataUrl?: string
  apiBaseUrl?: string
  apiKey?: string
  apiRequestFormat?: ApiRequestFormat
}

export const defaultUserPreferences: UserPreferences = {
  username: "User",
  email: "user@example.com",
  apiBaseUrl: "",
  apiKey: "",
  apiRequestFormat: "openai",
}

interface UserManagementProps {
  prefs: UserPreferences
  notifications: NotificationSettings
  onPrefsChange: (updater: UserPreferences | ((prev: UserPreferences) => UserPreferences)) => void
  onNotificationsChange: (
    updater: NotificationSettings | ((prev: NotificationSettings) => NotificationSettings),
  ) => void
}

async function fileToAvatarDataUrl(file: File): Promise<string> {
  const imageSource = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ""))
    reader.onerror = () => reject(new Error("read_failed"))
    reader.readAsDataURL(file)
  })

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("decode_failed"))
    img.src = imageSource
  })

  const side = Math.min(image.naturalWidth, image.naturalHeight)
  const sx = Math.max(0, Math.floor((image.naturalWidth - side) / 2))
  const sy = Math.max(0, Math.floor((image.naturalHeight - side) / 2))
  const outputSize = 384

  const canvas = document.createElement("canvas")
  canvas.width = outputSize
  canvas.height = outputSize
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("canvas_failed")

  ctx.drawImage(image, sx, sy, side, side, 0, 0, outputSize, outputSize)
  return canvas.toDataURL("image/jpeg", 0.92)
}

export function UserManagement({
  prefs,
  notifications,
  onPrefsChange,
  onNotificationsChange,
}: UserManagementProps) {
  const { t } = useLocale()
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarUploadError, setAvatarUploadError] = useState("")
  const avatarInputRef = useRef<HTMLInputElement | null>(null)

  async function handleAvatarFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.currentTarget.value = ""
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setAvatarUploadError(t.settings.userManagement.avatarUploadError)
      return
    }

    setAvatarUploadError("")
    setAvatarUploading(true)
    try {
      const avatarDataUrl = await fileToAvatarDataUrl(file)
      onPrefsChange((prev) => ({ ...prev, avatarDataUrl }))
    } catch {
      setAvatarUploadError(t.settings.userManagement.avatarUploadError)
    } finally {
      setAvatarUploading(false)
    }
  }

  function removeAvatar() {
    setAvatarUploadError("")
    onPrefsChange((prev) => ({ ...prev, avatarDataUrl: "" }))
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-medium">{t.settings.userManagement.title}</h2>
      </div>
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={prefs.avatarDataUrl || undefined} alt={prefs.username} className="object-cover" />
          <AvatarFallback className="text-lg bg-muted">{prefs.username.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{prefs.username}</p>
          <p className="text-sm text-muted-foreground">{prefs.email}</p>
          <div className="mt-2 flex items-center gap-2">
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarFileChange}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
            >
              {avatarUploading ? t.common.loading : t.settings.userManagement.uploadAvatar}
            </Button>
            {prefs.avatarDataUrl && (
              <Button type="button" variant="ghost" size="sm" onClick={removeAvatar}>
                {t.settings.userManagement.removeAvatar}
              </Button>
            )}
          </div>
          {avatarUploadError && (
            <p className="mt-1 text-xs text-destructive">{avatarUploadError}</p>
          )}
        </div>
      </div>

      <Separator />

      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label>{t.settings.userManagement.username}</Label>
          <Input
            value={prefs.username}
            onChange={(e) => onPrefsChange((prev) => ({ ...prev, username: e.target.value }))}
          />
        </div>
        <div className="grid gap-2">
          <Label>{t.settings.userManagement.email}</Label>
          <Input
            type="email"
            value={prefs.email}
            onChange={(e) => onPrefsChange((prev) => ({ ...prev, email: e.target.value }))}
          />
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h2 className="text-sm font-medium">{t.settings.api.title}</h2>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>{t.settings.api.baseUrl}</Label>
            <Input
              value={prefs.apiBaseUrl ?? ""}
              onChange={(e) => onPrefsChange((prev) => ({ ...prev, apiBaseUrl: e.target.value }))}
              placeholder="https://api.openai.com/v1"
            />
          </div>
          <div className="grid gap-2">
            <Label>{t.settings.api.apiKey}</Label>
            <Input
              type="password"
              value={prefs.apiKey ?? ""}
              onChange={(e) => onPrefsChange((prev) => ({ ...prev, apiKey: e.target.value }))}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div className="grid gap-2">
            <Label>{t.settings.api.requestFormat}</Label>
            <Select
              value={prefs.apiRequestFormat || "openai"}
              onValueChange={(value) =>
                onPrefsChange((prev) => ({ ...prev, apiRequestFormat: value as ApiRequestFormat }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">{t.settings.api.formats.openai}</SelectItem>
                <SelectItem value="anthropic">{t.settings.api.formats.anthropic}</SelectItem>
                <SelectItem value="gemini">{t.settings.api.formats.gemini}</SelectItem>
                <SelectItem value="custom">{t.settings.api.formats.custom}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <BellRing className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-medium">{t.settings.notification.title}</h2>
        </div>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>{t.settings.notification.barkToken}</Label>
            <Input
              value={notifications.barkToken}
              onChange={(e) =>
                onNotificationsChange((prev) => ({ ...prev, barkToken: e.target.value }))
              }
            />
          </div>
          <div className="grid gap-2">
            <Label>{t.settings.notification.telegramBotToken}</Label>
            <Input
              value={notifications.telegramBotToken}
              onChange={(e) =>
                onNotificationsChange((prev) => ({ ...prev, telegramBotToken: e.target.value }))
              }
            />
          </div>
        </div>
      </div>
    </section>
  )
}
