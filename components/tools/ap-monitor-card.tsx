"use client"

import { useState } from "react"
import { Activity, Circle, Loader2, Pencil, Play, Plus, RefreshCw, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { useLocale } from "@/lib/i18n"

type ApiRequestFormat = "openai" | "anthropic" | "gemini" | "custom"
type MonitorStatus = "online" | "offline" | "unknown"
type ApiMonitorAction = "list-models" | "test-model"

interface ModelTestState {
  status: MonitorStatus
  lastCheck: string
  responseTime: number | null
  lastError?: string
  lastResult?: string
  lastResultTone?: "success" | "error"
}

interface MonitorTarget {
  id: string
  name: string
  baseUrl?: string
  apiKey?: string
  requestFormat?: ApiRequestFormat
  testModel?: string
  models?: string[]
  lastModelSync?: string
  modelStatuses?: Record<string, ModelTestState>
  url?: string
  status: MonitorStatus
  lastCheck: string
  responseTime: number | null
  modelCount?: number
  lastError?: string
  lastResult?: string
  lastResultTone?: "success" | "error"
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
  testModel: "",
}

interface ListModelsSuccessResponse {
  ok: true
  action: "list-models"
  models: string[]
  modelCount: number
  responseTime: number
}

interface TestModelSuccessResponse {
  ok: true
  action: "test-model"
  model: string
  responseTime: number
}

interface FailureResponse {
  ok: false
  action: ApiMonitorAction
  error: string
  responseTime: number
  model?: string
}

type ApiMonitorResponse = ListModelsSuccessResponse | TestModelSuccessResponse | FailureResponse

function normalizeRequestFormat(value: string | undefined): ApiRequestFormat {
  if (value === "openai" || value === "anthropic" || value === "gemini" || value === "custom") {
    return value
  }
  return "openai"
}

function createUnknownModelState(): ModelTestState {
  return {
    status: "unknown",
    lastCheck: "",
    responseTime: null,
  }
}

function buildModelStatuses(
  models: string[],
  existing?: Record<string, ModelTestState>,
  extraModels: string[] = [],
): Record<string, ModelTestState> | undefined {
  const mergedModels = [...models]
  for (const model of extraModels) {
    if (model && !mergedModels.includes(model)) mergedModels.push(model)
  }

  if (mergedModels.length === 0) return undefined

  return Object.fromEntries(
    mergedModels.map((model) => [model, existing?.[model] ?? createUnknownModelState()]),
  )
}

function getVisibleModels(target: MonitorTarget): string[] {
  const models = [...(target.models || [])]
  const configuredModel = (target.testModel || "").trim()
  if (configuredModel && !models.includes(configuredModel)) {
    models.push(configuredModel)
  }
  return models
}

function formatModelName(model: string): string {
  return model.replace(/^models\//i, "")
}

function ResultDetails({
  message,
  tone,
}: {
  message: string
  tone: "success" | "error"
}) {
  const toneClassName =
    tone === "error"
      ? "border-destructive/20 bg-destructive/5 text-destructive"
      : "border-emerald-200/60 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"
  return (
    <pre className={`m-0 mt-1 overflow-x-auto whitespace-pre-wrap break-all rounded-md border px-2 py-1 font-mono text-[11px] leading-4 ${toneClassName}`}>
      {message}
    </pre>
  )
}

async function requestMonitor(payload: {
  action: ApiMonitorAction
  baseUrl: string
  apiKey: string
  requestFormat: ApiRequestFormat
  model?: string
}): Promise<ApiMonitorResponse> {
  const response = await fetch("/api/tools/ap-monitor/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  return (await response.json()) as ApiMonitorResponse
}

export function ApiMonitorCard() {
  const { t, locale } = useLocale()
  const [targets, setTargets] = useLocalStorage<MonitorTarget[]>(MONITOR_STORAGE_KEY, defaultTargets)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTargetId, setEditingTargetId] = useState<string | null>(null)
  const [loadingKey, setLoadingKey] = useState<string | null>(null)
  const [dialogLoadingModels, setDialogLoadingModels] = useState(false)
  const [dialogModelError, setDialogModelError] = useState<string | null>(null)
  const [dialogModels, setDialogModels] = useState<string[]>([])
  const [newTarget, setNewTarget] = useState<{
    name: string
    baseUrl: string
    apiKey: string
    requestFormat: ApiRequestFormat
    testModel: string
  }>(EMPTY_TARGET_FORM)

  function updateTarget(targetId: string, updater: (target: MonitorTarget) => MonitorTarget) {
    setTargets((prev) => prev.map((target) => (target.id === targetId ? updater(target) : target)))
  }

  function resetDialogState() {
    setDialogModelError(null)
    setDialogLoadingModels(false)
    setDialogModels([])
  }

  function summarizeError(message: string): string {
    const lines = message
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)

    for (const prefix of ["Provider:", "HTTP:", "Cause:"]) {
      const match = lines.find((line) => line.startsWith(prefix))
      if (match) return match
    }

    return lines[0] || message
  }

  function buildFetchModelsSuccessMessage(count: number): string {
    return locale === "zh" ? `模型列表获取成功，共 ${count} 个模型` : `Model list fetched successfully. ${count} models found.`
  }

  function buildFetchModelsFailureMessage(error: string): string {
    const summary = summarizeError(error)
    return locale === "zh" ? `模型列表获取失败：${summary}` : `Failed to fetch model list: ${summary}`
  }

  function buildTestSuccessMessage(model: string, responseTime: number | null): string {
    const modelName = formatModelName(model)
    if (locale === "zh") {
      return responseTime !== null ? `模型 ${modelName} 可用，响应 ${responseTime}ms` : `模型 ${modelName} 可用`
    }
    return responseTime !== null ? `Model ${modelName} is available (${responseTime}ms)` : `Model ${modelName} is available`
  }

  function buildTestFailureMessage(model: string, error: string): string {
    const modelName = formatModelName(model)
    const summary = summarizeError(error)
    return locale === "zh" ? `模型 ${modelName} 测试失败：${summary}` : `Model ${modelName} test failed: ${summary}`
  }

  function showResultToast(params: {
    tone: "success" | "error"
    title: string
    description: string
  }) {
    toast({
      title: params.title,
      description: params.description,
      variant: params.tone === "error" ? "destructive" : "default",
    })
  }

  function openAddDialog() {
    setEditingTargetId(null)
    setNewTarget(EMPTY_TARGET_FORM)
    resetDialogState()
    setDialogOpen(true)
  }

  function openEditDialog(target: MonitorTarget) {
    setEditingTargetId(target.id)
    setNewTarget({
      name: target.name,
      baseUrl: target.baseUrl || target.url || "",
      apiKey: target.apiKey || "",
      requestFormat: normalizeRequestFormat(target.requestFormat),
      testModel: target.testModel || "",
    })
    setDialogModels(target.models || [])
    setDialogModelError(null)
    setDialogLoadingModels(false)
    setDialogOpen(true)
  }

  function updateDialogConnectionField(field: "baseUrl" | "apiKey" | "requestFormat", value: string) {
    setNewTarget((prev) => ({
      ...prev,
      [field]: field === "requestFormat" ? normalizeRequestFormat(value) : value,
    }))
    setDialogModels([])
    setDialogModelError(null)
  }

  function upsertTarget() {
    const name = newTarget.name.trim()
    const baseUrl = newTarget.baseUrl.trim()
    const apiKey = newTarget.apiKey.trim()
    const testModel = newTarget.testModel.trim()
    const modelStatuses = buildModelStatuses(dialogModels, undefined, testModel ? [testModel] : [])

    if (!name || !baseUrl || !apiKey) return

    if (editingTargetId) {
      updateTarget(editingTargetId, (target) => ({
        ...target,
        name,
        baseUrl,
        apiKey,
        requestFormat: newTarget.requestFormat,
        testModel: testModel || undefined,
        models: dialogModels.length > 0 ? dialogModels : undefined,
        lastModelSync: dialogModels.length > 0 ? target.lastModelSync || "" : "",
        modelStatuses,
        status: "unknown",
        responseTime: null,
        modelCount: dialogModels.length > 0 ? dialogModels.length : undefined,
        lastError: undefined,
        lastCheck: "",
      }))
    } else {
      setTargets((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          name,
          baseUrl,
          apiKey,
          requestFormat: newTarget.requestFormat,
          testModel: testModel || undefined,
          models: dialogModels.length > 0 ? dialogModels : undefined,
          lastModelSync: "",
          modelStatuses,
          status: "unknown",
          lastCheck: "",
          responseTime: null,
          modelCount: dialogModels.length > 0 ? dialogModels.length : undefined,
        },
      ])
    }

    setNewTarget(EMPTY_TARGET_FORM)
    setEditingTargetId(null)
    resetDialogState()
    setDialogOpen(false)
  }

  function deleteTarget(id: string) {
    setTargets((prev) => prev.filter((target) => target.id !== id))
  }

  async function fetchDialogModels() {
    const baseUrl = newTarget.baseUrl.trim()
    const apiKey = newTarget.apiKey.trim()

    if (!baseUrl || !apiKey) {
      setDialogModelError(t.tools.apMonitor.missingConfig)
      showResultToast({
        tone: "error",
        title: t.tools.apMonitor.fetchModels,
        description: t.tools.apMonitor.missingConfig,
      })
      return
    }

    setDialogLoadingModels(true)
    setDialogModelError(null)

    try {
      const payload = await requestMonitor({
        action: "list-models",
        baseUrl,
        apiKey,
        requestFormat: newTarget.requestFormat,
      })

      if (payload.ok && payload.action === "list-models") {
        setDialogModels(payload.models)
        setDialogModelError(null)
        if (!newTarget.testModel.trim() && payload.models[0]) {
          setNewTarget((prev) => ({ ...prev, testModel: payload.models[0] }))
        }
        showResultToast({
          tone: "success",
          title: t.tools.apMonitor.fetchModels,
          description: buildFetchModelsSuccessMessage(payload.modelCount),
        })
        return
      }

      setDialogModels([])
      const errorMessage = payload.ok ? t.tools.apMonitor.modelFetchFailed : payload.error || t.tools.apMonitor.modelFetchFailed
      setDialogModelError(errorMessage)
      showResultToast({
        tone: "error",
        title: t.tools.apMonitor.fetchModels,
        description: buildFetchModelsFailureMessage(errorMessage),
      })
    } catch {
      setDialogModels([])
      setDialogModelError(t.tools.apMonitor.modelFetchFailed)
      showResultToast({
        tone: "error",
        title: t.tools.apMonitor.fetchModels,
        description: buildFetchModelsFailureMessage(t.tools.apMonitor.modelFetchFailed),
      })
    } finally {
      setDialogLoadingModels(false)
    }
  }

  async function fetchTargetModels(target: MonitorTarget) {
    const baseUrl = (target.baseUrl || target.url || "").trim()
    const apiKey = (target.apiKey || "").trim()

    if (!baseUrl || !apiKey) {
      const message = t.tools.apMonitor.missingConfig
      updateTarget(target.id, (item) => ({
        ...item,
        status: "offline",
        responseTime: null,
        lastCheck: new Date().toLocaleString(),
        lastError: message,
        lastResult: message,
        lastResultTone: "error",
      }))
      showResultToast({
        tone: "error",
        title: t.tools.apMonitor.fetchModels,
        description: message,
      })
      return
    }

    const requestFormat = normalizeRequestFormat(target.requestFormat)
    const requestKey = `list:${target.id}`
    setLoadingKey(requestKey)

    try {
      const payload = await requestMonitor({
        action: "list-models",
        baseUrl,
        apiKey,
        requestFormat,
      })
      const checkedAt = new Date().toLocaleString()

      if (payload.ok && payload.action === "list-models") {
        const successMessage = buildFetchModelsSuccessMessage(payload.modelCount)
        updateTarget(target.id, (item) => {
          const configuredModel = (item.testModel || "").trim()
          const nextTestModel = configuredModel || payload.models[0] || undefined
          return {
            ...item,
            status: "online",
            responseTime: payload.responseTime,
            lastCheck: checkedAt,
            lastModelSync: checkedAt,
            modelCount: payload.modelCount,
            models: payload.models,
            testModel: nextTestModel,
            modelStatuses: buildModelStatuses(payload.models, item.modelStatuses, nextTestModel ? [nextTestModel] : []),
            lastError: undefined,
            lastResult: successMessage,
            lastResultTone: "success",
          }
        })
        showResultToast({
          tone: "success",
          title: t.tools.apMonitor.fetchModels,
          description: successMessage,
        })
        return
      }

      const errorMessage = payload.ok ? t.tools.apMonitor.modelFetchFailed : payload.error || t.tools.apMonitor.modelFetchFailed
      const failureMessage = buildFetchModelsFailureMessage(errorMessage)
      updateTarget(target.id, (item) => ({
        ...item,
        status: "offline",
        responseTime: payload.responseTime ?? null,
        lastCheck: checkedAt,
        lastError: errorMessage,
        lastResult: failureMessage,
        lastResultTone: "error",
      }))
      showResultToast({
        tone: "error",
        title: t.tools.apMonitor.fetchModels,
        description: failureMessage,
      })
    } catch {
      const failureMessage = buildFetchModelsFailureMessage(t.tools.apMonitor.modelFetchFailed)
      updateTarget(target.id, (item) => ({
        ...item,
        status: "offline",
        responseTime: null,
        lastCheck: new Date().toLocaleString(),
        lastError: t.tools.apMonitor.modelFetchFailed,
        lastResult: failureMessage,
        lastResultTone: "error",
      }))
      showResultToast({
        tone: "error",
        title: t.tools.apMonitor.fetchModels,
        description: failureMessage,
      })
    } finally {
      setLoadingKey((current) => (current === requestKey ? null : current))
    }
  }

  async function testModelAvailability(target: MonitorTarget, explicitModel?: string) {
    const baseUrl = (target.baseUrl || target.url || "").trim()
    const apiKey = (target.apiKey || "").trim()
    const model = (explicitModel || target.testModel || "").trim()

    if (!baseUrl || !apiKey) {
      const message = t.tools.apMonitor.missingConfig
      updateTarget(target.id, (item) => ({
        ...item,
        status: "offline",
        responseTime: null,
        lastCheck: new Date().toLocaleString(),
        lastError: message,
        lastResult: message,
        lastResultTone: "error",
      }))
      showResultToast({
        tone: "error",
        title: t.tools.apMonitor.testAvailability,
        description: message,
      })
      return
    }

    if (!model) {
      const message = t.tools.apMonitor.missingTestModel
      updateTarget(target.id, (item) => ({
        ...item,
        status: "offline",
        responseTime: null,
        lastCheck: new Date().toLocaleString(),
        lastError: message,
        lastResult: message,
        lastResultTone: "error",
      }))
      showResultToast({
        tone: "error",
        title: t.tools.apMonitor.testAvailability,
        description: message,
      })
      return
    }

    const requestFormat = normalizeRequestFormat(target.requestFormat)
    const requestKey = `test:${target.id}:${model}`
    setLoadingKey(requestKey)

    try {
      const payload = await requestMonitor({
        action: "test-model",
        baseUrl,
        apiKey,
        requestFormat,
        model,
      })
      const checkedAt = new Date().toLocaleString()

      if (payload.ok && payload.action === "test-model") {
        const successMessage = buildTestSuccessMessage(model, payload.responseTime)
        updateTarget(target.id, (item) => ({
          ...item,
          status: "online",
          testModel: model,
          responseTime: payload.responseTime,
          lastCheck: checkedAt,
          lastError: undefined,
          lastResult: successMessage,
          lastResultTone: "success",
          modelStatuses: {
            ...(buildModelStatuses(item.models || [], item.modelStatuses, [model]) || {}),
            [model]: {
              status: "online",
              responseTime: payload.responseTime,
              lastCheck: checkedAt,
              lastResult: successMessage,
              lastResultTone: "success",
            },
          },
        }))
        showResultToast({
          tone: "success",
          title: t.tools.apMonitor.testAvailability,
          description: successMessage,
        })
        return
      }

      const errorMessage = payload.ok ? t.tools.apMonitor.testFailed : payload.error || t.tools.apMonitor.testFailed
      const failureMessage = buildTestFailureMessage(model, errorMessage)
      updateTarget(target.id, (item) => ({
        ...item,
        status: "offline",
        testModel: model,
        responseTime: payload.responseTime ?? null,
        lastCheck: checkedAt,
        lastError: errorMessage,
        lastResult: failureMessage,
        lastResultTone: "error",
        modelStatuses: {
          ...(buildModelStatuses(item.models || [], item.modelStatuses, [model]) || {}),
          [model]: {
            status: "offline",
            responseTime: payload.responseTime ?? null,
            lastCheck: checkedAt,
            lastError: errorMessage,
            lastResult: failureMessage,
            lastResultTone: "error",
          },
        },
      }))
      showResultToast({
        tone: "error",
        title: t.tools.apMonitor.testAvailability,
        description: failureMessage,
      })
    } catch {
      const failureMessage = buildTestFailureMessage(model, t.tools.apMonitor.testFailed)
      updateTarget(target.id, (item) => ({
        ...item,
        status: "offline",
        testModel: model,
        responseTime: null,
        lastCheck: new Date().toLocaleString(),
        lastError: t.tools.apMonitor.testFailed,
        lastResult: failureMessage,
        lastResultTone: "error",
        modelStatuses: {
          ...(buildModelStatuses(item.models || [], item.modelStatuses, [model]) || {}),
          [model]: {
            status: "offline",
            responseTime: null,
            lastCheck: new Date().toLocaleString(),
            lastError: t.tools.apMonitor.testFailed,
            lastResult: failureMessage,
            lastResultTone: "error",
          },
        },
      }))
      showResultToast({
        tone: "error",
        title: t.tools.apMonitor.testAvailability,
        description: failureMessage,
      })
    } finally {
      setLoadingKey((current) => (current === requestKey ? null : current))
    }
  }

  const statusStyles: Record<MonitorStatus, string> = {
    online: "text-foreground",
    offline: "text-muted-foreground/40",
    unknown: "text-muted-foreground/60",
  }

  const statusLabels: Record<MonitorStatus, string> = {
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
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>{editingTargetId ? t.common.edit : t.tools.apMonitor.addTarget}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>{t.tools.apMonitor.name}</Label>
                  <Input value={newTarget.name} onChange={(e) => setNewTarget((prev) => ({ ...prev, name: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label>{t.tools.apMonitor.baseUrl}</Label>
                  <Input
                    value={newTarget.baseUrl}
                    onChange={(e) => updateDialogConnectionField("baseUrl", e.target.value)}
                    placeholder="https://api.openai.com/v1"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t.tools.apMonitor.apiKey}</Label>
                  <Input
                    type="password"
                    value={newTarget.apiKey}
                    onChange={(e) => updateDialogConnectionField("apiKey", e.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t.tools.apMonitor.requestFormat}</Label>
                  <Select
                    value={newTarget.requestFormat}
                    onValueChange={(value) => updateDialogConnectionField("requestFormat", value)}
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
                <div className="grid gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label>{t.tools.apMonitor.testModel}</Label>
                    <Button type="button" variant="outline" size="sm" onClick={() => void fetchDialogModels()} disabled={dialogLoadingModels}>
                      {dialogLoadingModels ? (
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-1 h-3.5 w-3.5" />
                      )}
                      {dialogLoadingModels ? t.tools.apMonitor.fetchingModels : t.tools.apMonitor.fetchModels}
                    </Button>
                  </div>
                  <Input
                    value={newTarget.testModel}
                    onChange={(e) => setNewTarget((prev) => ({ ...prev, testModel: e.target.value }))}
                    placeholder={t.tools.apMonitor.testModelPlaceholder}
                  />
                  <p className="text-xs text-muted-foreground">{t.tools.apMonitor.testModelHint}</p>
                  {dialogModelError && <ResultDetails message={dialogModelError} tone="error" />}
                  <div className="rounded-md border">
                    {dialogModels.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground">{t.tools.apMonitor.noModels}</div>
                    ) : (
                      <div className="max-h-36 space-y-1 overflow-y-auto p-2">
                        {dialogModels.map((model) => {
                          const selected = model === newTarget.testModel.trim()
                          return (
                            <button
                              key={model}
                              type="button"
                              className={`block w-full rounded-md border px-2 py-1.5 text-left text-xs transition-colors ${
                                selected ? "border-foreground/20 bg-muted" : "border-transparent hover:border-border hover:bg-muted/50"
                              }`}
                              onClick={() => setNewTarget((prev) => ({ ...prev, testModel: model }))}
                            >
                              {formatModelName(model)}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
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
              const configuredModel = (target.testModel || "").trim()
              const visibleModels = getVisibleModels(target)
              return (
                <div
                  key={target.id}
                  className="group rounded-md border p-3 transition-colors hover:bg-muted/40"
                  onClick={() => openEditDialog(target)}
                >
                  <div className="flex items-start gap-3">
                    <Circle className={`mt-1 h-2.5 w-2.5 shrink-0 fill-current ${statusStyles[target.status]}`} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{target.name}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
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
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {t.tools.apMonitor.lastModelSync}: {target.lastModelSync || t.tools.apMonitor.notSet}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">
                        {t.tools.apMonitor.testModel}: {configuredModel ? formatModelName(configuredModel) : t.tools.apMonitor.notSet}
                      </div>
                      {target.lastResult && (
                        <div className="mt-1">
                          <div className="text-[11px] text-muted-foreground">{t.tools.apMonitor.lastResult}</div>
                          <ResultDetails message={target.lastResult} tone={target.lastResultTone || "success"} />
                        </div>
                      )}
                      {target.lastError && target.lastResult !== target.lastError && <ResultDetails message={target.lastError} tone="error" />}
                    </div>
                    <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={(e) => {
                          e.stopPropagation()
                          void fetchTargetModels(target)
                        }}
                        disabled={loadingKey === `list:${target.id}`}
                        title={t.tools.apMonitor.fetchModels}
                      >
                        {loadingKey === `list:${target.id}` ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-1 h-3 w-3" />
                        )}
                        <span>{t.tools.apMonitor.fetchModels}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={(e) => {
                          e.stopPropagation()
                          void testModelAvailability(target)
                        }}
                        disabled={loadingKey === `test:${target.id}:${configuredModel}`}
                        title={t.tools.apMonitor.testAvailability}
                      >
                        {loadingKey === `test:${target.id}:${configuredModel}` ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Play className="mr-1 h-3 w-3" />
                        )}
                        <span>{t.tools.apMonitor.testAvailability}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
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
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteTarget(target.id)
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  {visibleModels.length > 0 && (
                    <div className="mt-3 rounded-md border bg-background/70 p-2" onClick={(e) => e.stopPropagation()}>
                      <div className="mb-2 text-[11px] font-medium text-muted-foreground">{t.tools.apMonitor.modelList}</div>
                      <div className="max-h-44 space-y-1 overflow-y-auto">
                        {visibleModels.map((model) => {
                          const modelState = target.modelStatuses?.[model] ?? createUnknownModelState()
                          const isTestingModel = loadingKey === `test:${target.id}:${model}`
                          const isConfiguredModel = model === configuredModel
                          return (
                            <div
                              key={model}
                              className={`flex items-start gap-2 rounded-md border px-2 py-2 text-xs ${
                                isConfiguredModel ? "border-foreground/20 bg-muted/30" : "border-border/70"
                              }`}
                            >
                              <Circle className={`mt-1 h-2 w-2 shrink-0 fill-current ${statusStyles[modelState.status]}`} />
                              <div className="min-w-0 flex-1">
                                <div className="truncate font-medium">{formatModelName(model)}</div>
                                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                                  <span>{statusLabels[modelState.status]}</span>
                                  {modelState.responseTime !== null && (
                                    <>
                                      <span>|</span>
                                      <span>{modelState.responseTime}ms</span>
                                    </>
                                  )}
                                  <span>|</span>
                                  <span>
                                    {t.tools.apMonitor.lastCheck}: {modelState.lastCheck || t.tools.apMonitor.notSet}
                                  </span>
                                </div>
                                {modelState.lastResult && (
                                  <div className="mt-1">
                                    <div className="text-[11px] text-muted-foreground">{t.tools.apMonitor.lastResult}</div>
                                    <ResultDetails message={modelState.lastResult} tone={modelState.lastResultTone || "success"} />
                                  </div>
                                )}
                                {modelState.lastError && modelState.lastResult !== modelState.lastError && (
                                  <ResultDetails message={modelState.lastError} tone="error" />
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-[11px]"
                                onClick={() => void testModelAvailability(target, model)}
                                disabled={isTestingModel}
                                title={t.tools.apMonitor.testThisModel}
                              >
                                {isTestingModel ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Play className="mr-1 h-3 w-3" />
                                )}
                                <span>{t.tools.apMonitor.testThisModel}</span>
                              </Button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
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
