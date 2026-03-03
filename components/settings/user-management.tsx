"use client"

import { User } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { useLocale } from "@/lib/i18n"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { useTheme } from "next-themes"

interface UserPreferences {
  username: string
  email: string
  defaultCity: string
}

const defaultPrefs: UserPreferences = {
  username: "User",
  email: "user@example.com",
  defaultCity: "Beijing",
}

export function UserManagement() {
  const { t, locale, setLocale } = useLocale()
  const { theme, setTheme } = useTheme()
  const [prefs, setPrefs] = useLocalStorage<UserPreferences>("allin1_preferences", defaultPrefs)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">{t.settings.userManagement.title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-lg bg-muted">{prefs.username.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{prefs.username}</p>
            <p className="text-sm text-muted-foreground">{prefs.email}</p>
          </div>
        </div>

        <Separator />

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>{t.settings.userManagement.username}</Label>
            <Input
              value={prefs.username}
              onChange={(e) => setPrefs((p) => ({ ...p, username: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label>{t.settings.userManagement.email}</Label>
            <Input
              type="email"
              value={prefs.email}
              onChange={(e) => setPrefs((p) => ({ ...p, email: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label>{t.settings.userManagement.defaultCity}</Label>
            <Input
              value={prefs.defaultCity}
              onChange={(e) => setPrefs((p) => ({ ...p, defaultCity: e.target.value }))}
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <p className="text-sm font-medium">{t.settings.userManagement.preferences}</p>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>{t.settings.userManagement.defaultTheme}</Label>
              <Select value={theme || "system"} onValueChange={setTheme}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">{t.settings.theme.light}</SelectItem>
                  <SelectItem value="dark">{t.settings.theme.dark}</SelectItem>
                  <SelectItem value="system">{t.settings.theme.system}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t.settings.userManagement.defaultLanguage}</Label>
              <Select value={locale} onValueChange={(v) => setLocale(v as "zh" | "en")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zh">{t.settings.language.zh}</SelectItem>
                  <SelectItem value="en">{t.settings.language.en}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
