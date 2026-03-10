import { NextRequest, NextResponse } from "next/server"

type ApiRequestFormat = "openai" | "anthropic" | "gemini" | "custom"
type ApiMonitorAction = "list-models" | "test-model"

interface TestRequestBody {
  action?: ApiMonitorAction
  baseUrl?: string
  apiKey?: string
  requestFormat?: ApiRequestFormat
  model?: string
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

const VERSION_SUFFIX_PATTERN = /\/v\d[\w.-]*\/?$/i
const RESPONSE_PREVIEW_LIMIT = 500

function normalizeFormat(value: string | undefined): ApiRequestFormat {
  if (value === "openai" || value === "anthropic" || value === "gemini" || value === "custom") {
    return value
  }
  return "openai"
}

function normalizeAction(value: string | undefined, model: string): ApiMonitorAction {
  if (value === "list-models" || value === "test-model") return value
  return model ? "test-model" : "list-models"
}

function normalizeBaseUrlInput(rawBaseUrl: string): string {
  let value = rawBaseUrl.trim()
  if (!value) return value

  value = value.replace(/^(https?)\/\//i, "$1://")
  value = value.replace(/^(https?:\/\/)(https?):\/\//i, (_match, _outer: string, inner: string) => `${inner}://`)
  value = value.replace(/^(https?:\/\/)(https?)\/\//i, (_match, _outer: string, inner: string) => `${inner}://`)

  if (!/^https?:\/\//i.test(value) && /^[a-z0-9.-]+\.[a-z]{2,}([/:?#]|$)/i.test(value)) {
    value = `https://${value}`
  }

  return value
}

function isValidAbsoluteHttpUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

function joinUrl(baseUrl: string, path: string): string {
  const trimmedBase = baseUrl.replace(/\/+$/, "")
  const trimmedPath = path.replace(/^\/+/, "")
  return `${trimmedBase}/${trimmedPath}`
}

function getOpenAiBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, "")
  if (/\/models$/i.test(trimmed)) return trimmed.replace(/\/models$/i, "")
  if (/\/chat\/completions$/i.test(trimmed)) return trimmed.replace(/\/chat\/completions$/i, "")
  if (VERSION_SUFFIX_PATTERN.test(trimmed)) return trimmed
  return joinUrl(trimmed, "v1")
}

function getAnthropicBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, "")
  if (/\/v1\/models$/i.test(trimmed)) return trimmed.replace(/\/models$/i, "")
  if (/\/v1\/messages$/i.test(trimmed)) return trimmed.replace(/\/messages$/i, "")
  if (/\/v1$/i.test(trimmed)) return trimmed
  return joinUrl(trimmed, "v1")
}

function getGeminiBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, "")
  if (/\/models$/i.test(trimmed)) return trimmed.replace(/\/models$/i, "")
  if (VERSION_SUFFIX_PATTERN.test(trimmed)) return trimmed
  return joinUrl(trimmed, "v1beta")
}

function normalizeGeminiModelName(model: string): string {
  return model.replace(/^models\//i, "")
}

function buildListModelsRequest(baseUrl: string, apiKey: string, format: ApiRequestFormat): {
  url: string
  init: RequestInit
} {
  if (format === "anthropic") {
    const targetUrl = joinUrl(getAnthropicBaseUrl(baseUrl), "models")
    return {
      url: targetUrl,
      init: {
        method: "GET",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        cache: "no-store",
      },
    }
  }

  if (format === "gemini") {
    const modelUrl = joinUrl(getGeminiBaseUrl(baseUrl), "models")
    const separator = modelUrl.includes("?") ? "&" : "?"
    return {
      url: `${modelUrl}${separator}key=${encodeURIComponent(apiKey)}`,
      init: {
        method: "GET",
        cache: "no-store",
      },
    }
  }

  const openAiUrl = joinUrl(getOpenAiBaseUrl(baseUrl), "models")
  return {
    url: openAiUrl,
    init: {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      cache: "no-store",
    },
  }
}

function buildModelTestRequest(baseUrl: string, apiKey: string, model: string, format: ApiRequestFormat): {
  url: string
  init: RequestInit
} {
  if (format === "anthropic") {
    return {
      url: joinUrl(getAnthropicBaseUrl(baseUrl), "messages"),
      init: {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 1,
          messages: [{ role: "user", content: "ping" }],
        }),
        cache: "no-store",
      },
    }
  }

  if (format === "gemini") {
    const geminiBaseUrl = getGeminiBaseUrl(baseUrl)
    const endpoint = joinUrl(geminiBaseUrl, `models/${normalizeGeminiModelName(model)}:generateContent`)
    const separator = endpoint.includes("?") ? "&" : "?"
    return {
      url: `${endpoint}${separator}key=${encodeURIComponent(apiKey)}`,
      init: {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "ping" }] }],
          generationConfig: {
            maxOutputTokens: 1,
            temperature: 0,
          },
        }),
        cache: "no-store",
      },
    }
  }

  return {
    url: joinUrl(getOpenAiBaseUrl(baseUrl), "chat/completions"),
    init: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 1,
        temperature: 0,
      }),
      cache: "no-store",
    },
  }
}

function extractModelName(item: unknown): string | null {
  if (typeof item === "string" && item.trim()) return item.trim()
  if (!item || typeof item !== "object") return null

  const record = item as Record<string, unknown>
  for (const key of ["id", "name", "model", "baseModelId"]) {
    const value = record[key]
    if (typeof value === "string" && value.trim()) return value.trim()
  }

  return null
}

function extractModelIds(payload: unknown): string[] {
  if (!payload || typeof payload !== "object") return []

  const record = payload as Record<string, unknown>
  const candidates = [record.data, record.models]

  const nestedResult = record.result
  if (nestedResult && typeof nestedResult === "object") {
    candidates.push((nestedResult as Record<string, unknown>).models)
  }

  const models: string[] = []
  const seen = new Set<string>()

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue
    for (const item of candidate) {
      const modelName = extractModelName(item)
      if (!modelName || seen.has(modelName)) continue
      seen.add(modelName)
      models.push(modelName)
    }
  }

  return models
}

function getMethod(init: RequestInit): string {
  return typeof init.method === "string" ? init.method.toUpperCase() : "GET"
}

function maskSecret(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return "***"
  if (trimmed.length <= 8) return `${trimmed.slice(0, 2)}***`
  return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`
}

function maskSensitiveUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl)
    for (const key of ["key", "api_key", "apikey", "access_token", "token"]) {
      if (parsed.searchParams.has(key)) {
        parsed.searchParams.set(key, maskSecret(parsed.searchParams.get(key) || ""))
      }
    }
    return parsed.toString()
  } catch {
    return rawUrl.replace(
      /([?&](?:key|api_?key|apikey|access_token|token)=)([^&]+)/gi,
      (_, prefix: string, secret: string) => `${prefix}${maskSecret(secret)}`,
    )
  }
}

function previewText(raw: string, limit = RESPONSE_PREVIEW_LIMIT): string {
  const normalized = raw.replace(/\s+/g, " ").trim()
  if (normalized.length <= limit) return normalized
  return `${normalized.slice(0, limit)}...`
}

function getStringField(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return null
}

function getProviderErrorMessage(payload: unknown): string | null {
  if (typeof payload === "string" && payload.trim()) {
    return previewText(payload)
  }

  if (!payload || typeof payload !== "object") return null

  const record = payload as Record<string, unknown>
  const nestedError = record.error
  if (nestedError && typeof nestedError === "object") {
    const errorRecord = nestedError as Record<string, unknown>
    const message =
      getStringField(errorRecord, ["message", "detail", "error_description", "description", "reason"]) ||
      getStringField(record, ["message", "detail", "error_description", "description"])
    const meta = [getStringField(errorRecord, ["type"]), getStringField(errorRecord, ["code"]), getStringField(errorRecord, ["param"])].filter(Boolean)
    if (message && meta.length > 0) return `${message} (${meta.join(", ")})`
    if (message) return message
  }

  if (typeof nestedError === "string" && nestedError.trim()) {
    return previewText(nestedError)
  }

  const directMessage = getStringField(record, ["message", "detail", "error_description", "description", "title", "reason"])
  if (directMessage) return directMessage

  const details = record.details
  if (Array.isArray(details)) {
    const detailMessage = details
      .map((detail) => {
        if (typeof detail === "string") return detail.trim()
        if (!detail || typeof detail !== "object") return null
        return getStringField(detail as Record<string, unknown>, ["message", "detail", "description", "reason"])
      })
      .filter((value): value is string => Boolean(value))
      .join("; ")
    if (detailMessage) return previewText(detailMessage)
  }

  return null
}

function getThrownErrorMessage(error: unknown): string | null {
  if (error instanceof Error) {
    const parts = [`${error.name}: ${error.message}`]
    const cause = error.cause
    if (cause instanceof Error) {
      parts.push(`${cause.name}: ${cause.message}`)
    } else if (typeof cause === "string" && cause.trim()) {
      parts.push(cause.trim())
    } else if (cause && typeof cause === "object") {
      const causeMessage = getStringField(cause as Record<string, unknown>, ["message", "code", "name"])
      if (causeMessage) parts.push(causeMessage)
    }
    return parts.join(" | ")
  }

  if (typeof error === "string" && error.trim()) return error.trim()
  if (error && typeof error === "object") {
    return getStringField(error as Record<string, unknown>, ["message", "code", "name"])
  }
  return null
}

function formatDetailedError(params: {
  action: ApiMonitorAction
  requestFormat: ApiRequestFormat
  url: string
  init: RequestInit
  baseUrlInput?: string
  model?: string
  status?: number
  statusText?: string
  contentType?: string | null
  rawText?: string
  parsedPayload?: unknown
  thrownError?: unknown
}): string {
  const lines = [
    params.status ? "Request failed" : "Request could not be completed",
    `Action: ${params.action}`,
    `Format: ${params.requestFormat}`,
    `Request: ${getMethod(params.init)} ${maskSensitiveUrl(params.url)}`,
  ]

  if (params.baseUrlInput && params.baseUrlInput !== params.url) {
    lines.push(`Base URL Input: ${params.baseUrlInput}`)
  }

  if (params.model) lines.push(`Model: ${params.model}`)

  if (typeof params.status === "number") {
    lines.push(`HTTP: ${params.status}${params.statusText ? ` ${params.statusText}` : ""}`)
  }

  if (params.contentType) {
    lines.push(`Content-Type: ${params.contentType}`)
  }

  const providerMessage = getProviderErrorMessage(params.parsedPayload)
  if (providerMessage) {
    lines.push(`Provider: ${providerMessage}`)
  }

  if (params.rawText) {
    lines.push(`Response: ${previewText(params.rawText)}`)
  }

  const thrownMessage = getThrownErrorMessage(params.thrownError)
  if (thrownMessage) {
    lines.push(`Cause: ${thrownMessage}`)
  }

  return lines.join("\n")
}

function buildFailure(action: ApiMonitorAction, responseTime: number, error: string, model?: string) {
  return {
    ok: false,
    action,
    error,
    responseTime,
    model,
  } satisfies FailureResponse
}

export async function POST(request: NextRequest) {
  let body: TestRequestBody
  try {
    body = (await request.json()) as TestRequestBody
  } catch {
    return NextResponse.json(buildFailure("list-models", 0, "Invalid JSON body."), { status: 400 })
  }

  const baseUrlInput = (body.baseUrl || "").trim()
  const baseUrl = normalizeBaseUrlInput(baseUrlInput)
  const apiKey = (body.apiKey || "").trim()
  const model = (body.model || "").trim()
  const requestFormat = normalizeFormat(body.requestFormat)
  const action = normalizeAction(body.action, model)

  if (!baseUrl || !apiKey) {
    return NextResponse.json(buildFailure(action, 0, "Missing baseUrl or apiKey."), { status: 400 })
  }

  if (action === "test-model" && !model) {
    return NextResponse.json(buildFailure(action, 0, "Missing model name.", model || undefined), { status: 400 })
  }

  if (!isValidAbsoluteHttpUrl(baseUrl)) {
    return NextResponse.json(
      buildFailure(
        action,
        0,
        [
          "Invalid Base URL",
          `Input: ${baseUrlInput || "(empty)"}`,
          `Normalized: ${baseUrl || "(empty)"}`,
          "Expected an absolute URL like https://api.example.com or https://api.example.com/v1",
        ].join("\n"),
        action === "test-model" ? model : undefined,
      ),
      { status: 400 },
    )
  }

  const { url, init } =
    action === "list-models"
      ? buildListModelsRequest(baseUrl, apiKey, requestFormat)
      : buildModelTestRequest(baseUrl, apiKey, model, requestFormat)
  const startedAt = Date.now()

  try {
    const response = await fetch(url, init)
    const responseTime = Date.now() - startedAt
    const rawText = await response.text()

    if (!response.ok) {
      let parsedErrorPayload: unknown = null
      try {
        parsedErrorPayload = rawText ? JSON.parse(rawText) : null
      } catch {
        parsedErrorPayload = null
      }

      return NextResponse.json(
        buildFailure(
          action,
          responseTime,
          formatDetailedError({
            action,
            requestFormat,
            url,
            init,
            baseUrlInput,
            model: action === "test-model" ? model : undefined,
            status: response.status,
            statusText: response.statusText,
            contentType: response.headers.get("content-type"),
            rawText,
            parsedPayload: parsedErrorPayload,
          }),
          action === "test-model" ? model : undefined,
        ),
        { status: 200 },
      )
    }

    let json: unknown = null
    try {
      json = rawText ? JSON.parse(rawText) : null
    } catch {
      json = null
    }

    if (action === "list-models") {
      const models = extractModelIds(json)
      return NextResponse.json(
        {
          ok: true,
          action,
          models,
          modelCount: models.length,
          responseTime,
        } satisfies ListModelsSuccessResponse,
        { status: 200 },
      )
    }

    return NextResponse.json(
      {
        ok: true,
        action,
        model,
        responseTime,
      } satisfies TestModelSuccessResponse,
      { status: 200 },
    )
  } catch (error) {
    return NextResponse.json(
      buildFailure(
        action,
        Date.now() - startedAt,
        formatDetailedError({
          action,
          requestFormat,
          url,
          init,
          baseUrlInput,
          model: action === "test-model" ? model : undefined,
          thrownError: error,
        }),
        action === "test-model" ? model : undefined,
      ),
      { status: 200 },
    )
  }
}
