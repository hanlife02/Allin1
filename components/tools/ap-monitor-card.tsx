"use client"

import { useState } from "react"
import { Activity, Circle, Plus, Trash2, Pencil, Play, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useLocale } from "@/lib/i18n"
import { useLocalStorage } from "@/hooks/use-local-storage"

type ApiRequestFormat = "openai" | "anthropic" | "gemini" | "custom"

interface MonitorTarget {
  id: string
  name: string
  baseUrl?: string
  apiKey?: string
  requestFormat?: ApiRequestFormat
  // Compatibility field for older records
  url?: string
  status: "online" | "offline" | "unknown"
  lastCheck: string
  responseTime: number | null
  modelCount?: number
  lastError?: string
}

const defaultTargets: MonitorTarget[] = [
  {
    id: "1",
    name: "OpenAI Main",
    baseUrl: "https://api.openai.com/v1",
    apiKey: "sk-example-openai-key",
    requestFormat: "openai",
    status: "unknown",
    lastCheck: "",
    responseTime: null,
  },
  {
    id: "2",
    name: "Anthropic Backup",
    baseUrl: "https://api.anthropic.com",
    apiKey: "sk-ant-example-key",
    requestFormat: "anthropic",
    status: "unknown",
    lastCheck: "",
    responseTime: null,
  },
]

const MONITOR_STORAGE_KEY = "allin1_monitors"
const EMPTY_TARGET_FORM = {
  name: "",
  baseUrl: "",
  apiKey: "",
  requestFormat: "openai" as ApiRequestFormat,
}

function normalizeRequestFormat(value: string | undefined): ApiRequestFormat {
  if (value === "openai" || value === "anthropic" || value === "gemini" || value === "custom") {
    return value
  }
  return "openai"
}

interface ApiTestResult {
  ok: boolean
  modelCount?: number
  responseTime?: number
  error?: string
}

export function ApiMonitorCard() {
  const { t } = useLocale()
  const [targets, setTargets] = useLocalStorage<MonitorTarget[]>(MONITOR_STORAGE_KEY, defaultTargets)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTargetId, setEditingTargetId] = useState<string | null>(null)
  const [testingTargetId, setTestingTargetId] = useState<string | null>(null)
  const [newTarget, setNewTarget] = useState<{
    name: string
    baseUrl: string
    apiKey: string
    requestFormat: ApiRequestFormat
  }>(EMPTY_TARGET_FORM)

  function openAddDialog() {
    setEditingTargetId(null)
    setNewTarget(EMPTY_TARGET_FORM)
    setDialogOpen(true)
  }

  function openEditDialog(target: MonitorTarget) {
    setEditingTargetId(target.id)
    setNewTarget({
      name: target.name,
      baseUrl: target.baseUrl || target.url || "",
      apiKey: target.apiKey || "",
      requestFormat: normalizeRequestFormat(target.requestFormat),
    })
    setDialogOpen(true)
  }

  function upsertTarget() {
    if (!newTarget.name.trim() || !newTarget.baseUrl.trim() || !newTarget.apiKey.trim()) return

    if (editingTargetId) {
      setTargets((prev) =>
        prev.map((target) =>
          target.id === editingTargetId
            ? {
                ...target,
                name: newTarget.name.trim(),
                baseUrl: newTarget.baseUrl.trim(),
                apiKey: newTarget.apiKey.trim(),
                requestFormat: newTarget.requestFormat,
                status: "unknown",
                responseTime: null,
                modelCount: undefined,
                lastError: undefined,
                lastCheck: "",
              }
            : target,
        ),
      )
    } else {
      setTargets((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          name: newTarget.name.trim(),
          baseUrl: newTarget.baseUrl.trim(),
          apiKey: newTarget.apiKey.trim(),
          requestFormat: newTarget.requestFormat,
          status: "unknown" as const,
          lastCheck: "",
          responseTime: null,
        },
      ])
    }

    setNewTarget(EMPTY_TARGET_FORM)
    setEditingTargetId(null)
    setDialogOpen(false)
  }

  function deleteTarget(id: string) {
    setTargets((prev) => prev.filter((t) => t.id !== id))
  }

  async function testTarget(target: MonitorTarget) {
    const baseUrl = (target.baseUrl || target.url || "").trim()
    const apiKey = (target.apiKey || "").trim()

    if (!baseUrl || !apiKey) {
      setTargets((prev) =>
        prev.map((item) =>
          item.id === target.id
            ? {
                ...item,
                status: "offline",
                responseTime: null,
                modelCount: undefined,
                lastCheck: new Date().toLocaleString(),
                lastError: t.tools.apMonitor.missingConfig,
              }
            : item,
        ),
      )
      return
    }

    setTestingTargetId(target.id)
    try {
      const response = await fetch("/api/tools/ap-monitor/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl,
          apiKey,
          requestFormat: normalizeRequestFormat(target.requestFormat),
        }),
      })

      const payload = (await response.json()) as ApiTestResult
      const testedAt = new Date().toLocaleString()

      if (payload.ok) {
        setTargets((prev) =>
          prev.map((item) =>
            item.id === target.id
              ? {
                  ...item,
                  status: "online",
                  responseTime: payload.responseTime ?? null,
                  modelCount: payload.modelCount ?? 0,
                  lastCheck: testedAt,
                  lastError: undefined,
                }
              : item,
          ),
        )
        return
      }

      setTargets((prev) =>
        prev.map((item) =>
          item.id === target.id
            ? {
                ...item,
                status: "offline",
                responseTime: payload.responseTime ?? null,
                modelCount: undefined,
                lastCheck: testedAt,
                lastError: payload.error || t.tools.apMonitor.testFailed,
              }
            : item,
        ),
      )
    } catch {
      setTargets((prev) =>
        prev.map((item) =>
          item.id === target.id
            ? {
                ...item,
                status: "offline",
                responseTime: null,
                modelCount: undefined,
                lastCheck: new Date().toLocaleString(),
                lastError: t.tools.apMonitor.testFailed,
              }
            : item,
        ),
      )
    } finally {
      setTestingTargetId(null)
    }
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
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={openAddDialog}>
              <Plus className="h-4 w-4" />
              <span className="sr-only">{t.tools.apMonitor.addTarget}</span>
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingTargetId ? t.common.edit : t.tools.apMonitor.addTarget}</DialogTitle>
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
                <Button onClick={upsertTarget}>{editingTargetId ? t.common.save : t.common.add}</Button>
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
              const baseUrlText = (target.baseUrl || target.url || "").trim() || t.tools.apMonitor.notSet
              const format = normalizeRequestFormat(target.requestFormat)
              return (
                <div
                  key={target.id}
                  className="group flex cursor-pointer items-center gap-3 rounded-md border p-3 transition-colors hover:bg-muted/40"
                  onClick={() => openEditDialog(target)}
                >
                  <Circle
                    className={`h-2.5 w-2.5 shrink-0 fill-current ${statusStyles[target.status]}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{target.name}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatLabels[format]}</span>
                      <span>|</span>
                      <span>{statusLabels[target.status]}</span>
                      {typeof target.modelCount === "number" && (
                        <>
                          <span>|</span>
                          <span>
                            {t.tools.apMonitor.modelCount}: {target.modelCount}
                          </span>
                        </>
                      )}
                      {target.responseTime !== null && (
                        <>
                          <span>|</span>
                          <span>{target.responseTime}ms</span>
                        </>
                      )}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">{baseUrlText}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {t.tools.apMonitor.lastCheck}: {target.lastCheck || t.tools.apMonitor.notSet}
                    </div>
                    {target.lastError && (
                      <div className="mt-0.5 truncate text-xs text-destructive">{target.lastError}</div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 shrink-0 px-2 text-xs opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation()
                      void testTarget(target)
                    }}
                    disabled={testingTargetId === target.id}
                    title={t.tools.apMonitor.testAvailability}
                  >
                    {testingTargetId === target.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Play className="mr-1 h-3 w-3" />
                    )}
                    <span>{t.tools.apMonitor.testAvailability}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation()
                      openEditDialog(target)
                    }}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteTarget(target.id)
                    }}
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
