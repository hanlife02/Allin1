"use client"

import { useState } from "react"
import { Activity, Circle, Plus, Trash2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useLocale } from "@/lib/i18n"
import { useLocalStorage } from "@/hooks/use-local-storage"

type ApiRequestFormat = "openai" | "anthropic" | "gemini" | "custom"

interface MonitorTarget {
  id: string
  name: string
  channel?: string
  baseUrl?: string
  apiKey?: string
  requestFormat?: ApiRequestFormat
  // Compatibility field for older records
  url?: string
  status: "online" | "offline" | "unknown"
  lastCheck: string
  responseTime: number | null
}

const defaultTargets: MonitorTarget[] = [
  {
    id: "1",
    name: "OpenAI Main",
    channel: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    apiKey: "sk-example-openai-key",
    requestFormat: "openai",
    status: "online",
    lastCheck: "2026-03-01 14:30",
    responseTime: 234,
  },
  {
    id: "2",
    name: "Anthropic Backup",
    channel: "Anthropic",
    baseUrl: "https://api.anthropic.com",
    apiKey: "sk-ant-example-key",
    requestFormat: "anthropic",
    status: "online",
    lastCheck: "2026-03-01 14:30",
    responseTime: 156,
  },
]

const MONITOR_STORAGE_KEY = "allin1_api_monitors_v1"

function normalizeRequestFormat(value: string | undefined): ApiRequestFormat {
  if (value === "openai" || value === "anthropic" || value === "gemini" || value === "custom") {
    return value
  }
  return "openai"
}

function maskApiKey(rawKey: string | undefined, emptyLabel: string): string {
  const key = (rawKey || "").trim()
  if (!key) return emptyLabel
  if (key.length <= 8) return "****"
  return `${key.slice(0, 4)}...${key.slice(-4)}`
}

export function ApiMonitorCard() {
  const { t } = useLocale()
  const [targets, setTargets] = useLocalStorage<MonitorTarget[]>(MONITOR_STORAGE_KEY, defaultTargets)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newTarget, setNewTarget] = useState<{
    name: string
    channel: string
    baseUrl: string
    apiKey: string
    requestFormat: ApiRequestFormat
  }>({
    name: "",
    channel: "",
    baseUrl: "",
    apiKey: "",
    requestFormat: "openai",
  })

  function addTarget() {
    if (!newTarget.name.trim() || !newTarget.channel.trim() || !newTarget.baseUrl.trim()) return
    setTargets((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        name: newTarget.name.trim(),
        channel: newTarget.channel.trim(),
        baseUrl: newTarget.baseUrl.trim(),
        apiKey: newTarget.apiKey.trim(),
        requestFormat: newTarget.requestFormat,
        status: "unknown" as const,
        lastCheck: new Date().toLocaleString(),
        responseTime: null,
      },
    ])
    setNewTarget({ name: "", channel: "", baseUrl: "", apiKey: "", requestFormat: "openai" })
    setDialogOpen(false)
  }

  function deleteTarget(id: string) {
    setTargets((prev) => prev.filter((t) => t.id !== id))
  }

  const statusStyles: Record<string, string> = {
    online: "text-foreground",
    offline: "text-muted-foreground/40",
    unknown: "text-muted-foreground/60",
  }

  const statusLabels: Record<string, string> = {
    online: t.tools.apMonitor.online,
    offline: t.tools.apMonitor.offline,
    unknown: t.tools.apMonitor.unknown,
  }

  const formatLabels: Record<ApiRequestFormat, string> = {
    openai: t.tools.apMonitor.formats.openai,
    anthropic: t.tools.apMonitor.formats.anthropic,
    gemini: t.tools.apMonitor.formats.gemini,
    custom: t.tools.apMonitor.formats.custom,
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">{t.tools.apMonitor.title}</CardTitle>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Plus className="h-4 w-4" />
                <span className="sr-only">{t.tools.apMonitor.addTarget}</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t.tools.apMonitor.addTarget}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>{t.tools.apMonitor.name}</Label>
                  <Input
                    value={newTarget.name}
                    onChange={(e) => setNewTarget((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t.tools.apMonitor.channel}</Label>
                  <Input
                    value={newTarget.channel}
                    onChange={(e) => setNewTarget((p) => ({ ...p, channel: e.target.value }))}
                    placeholder="OpenAI / Azure / Claude..."
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t.tools.apMonitor.baseUrl}</Label>
                  <Input
                    value={newTarget.baseUrl}
                    onChange={(e) => setNewTarget((p) => ({ ...p, baseUrl: e.target.value }))}
                    placeholder="https://api.openai.com/v1"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t.tools.apMonitor.apiKey}</Label>
                  <Input
                    type="password"
                    value={newTarget.apiKey}
                    onChange={(e) => setNewTarget((p) => ({ ...p, apiKey: e.target.value }))}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t.tools.apMonitor.requestFormat}</Label>
                  <Select
                    value={newTarget.requestFormat}
                    onValueChange={(value) =>
                      setNewTarget((p) => ({ ...p, requestFormat: normalizeRequestFormat(value) }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">{formatLabels.openai}</SelectItem>
                      <SelectItem value="anthropic">{formatLabels.anthropic}</SelectItem>
                      <SelectItem value="gemini">{formatLabels.gemini}</SelectItem>
                      <SelectItem value="custom">{formatLabels.custom}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  {t.common.cancel}
                </Button>
                <Button onClick={addTarget}>{t.common.add}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {targets.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t.tools.apMonitor.noTargets}</p>
        ) : (
          <div className="space-y-2">
            {targets.map((target) => {
              const channelText = (target.channel || "").trim() || t.tools.apMonitor.notSet
              const baseUrlText = (target.baseUrl || target.url || "").trim() || t.tools.apMonitor.notSet
              const format = normalizeRequestFormat(target.requestFormat)
              return (
                <div
                  key={target.id}
                  className="group flex items-center gap-3 rounded-md border p-3 transition-colors"
                >
                  <Circle
                    className={`h-2.5 w-2.5 shrink-0 fill-current ${statusStyles[target.status]}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{target.name}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{channelText}</span>
                      <span>|</span>
                      <span>{formatLabels[format]}</span>
                      <span>|</span>
                      <span>{statusLabels[target.status]}</span>
                      {target.responseTime !== null && (
                        <>
                          <span>|</span>
                          <span>{target.responseTime}ms</span>
                        </>
                      )}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">{baseUrlText}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {t.tools.apMonitor.apiKey}: {maskApiKey(target.apiKey, t.tools.apMonitor.notSet)}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={() => deleteTarget(target.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export const ApMonitorCard = ApiMonitorCard