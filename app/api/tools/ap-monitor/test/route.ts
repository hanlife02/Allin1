import { NextRequest, NextResponse } from "next/server"

type ApiRequestFormat = "openai" | "anthropic" | "gemini" | "custom"

interface TestRequestBody {
  baseUrl?: string
  apiKey?: string
  requestFormat?: ApiRequestFormat
}

interface TestSuccessResponse {
  ok: true
  modelCount: number
  responseTime: number
}

interface TestFailureResponse {
  ok: false
  error: string
  responseTime: number
}

function normalizeFormat(value: string | undefined): ApiRequestFormat {
  if (value === "openai" || value === "anthropic" || value === "gemini" || value === "custom") {
    return value
  }
  return "openai"
}

function joinUrl(baseUrl: string, path: string): string {
  const trimmedBase = baseUrl.replace(/\/+$/, "")
  const trimmedPath = path.replace(/^\/+/, "")
  return `${trimmedBase}/${trimmedPath}`
}

function buildRequest(baseUrl: string, apiKey: string, format: ApiRequestFormat): {
  url: string
  init: RequestInit
} {
  if (format === "anthropic") {
    const targetUrl = /\/v1\/?$/i.test(baseUrl)
      ? joinUrl(baseUrl, "models")
      : joinUrl(baseUrl, "v1/models")
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
    const modelUrl = /\/models\/?$/i.test(baseUrl)
      ? baseUrl.replace(/\/+$/, "")
      : joinUrl(baseUrl, "models")
    const separator = modelUrl.includes("?") ? "&" : "?"
    return {
      url: `${modelUrl}${separator}key=${encodeURIComponent(apiKey)}`,
      init: {
        method: "GET",
        cache: "no-store",
      },
    }
  }

  const openaiLikeUrl = joinUrl(baseUrl, "models")
  return {
    url: openaiLikeUrl,
    init: {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      cache: "no-store",
    },
  }
}

function parseModelCount(payload: unknown): number {
  if (!payload || typeof payload !== "object") return 0

  const record = payload as Record<string, unknown>
  const dataModels = record.data
  if (Array.isArray(dataModels)) return dataModels.length

  const models = record.models
  if (Array.isArray(models)) return models.length

  const nestedResult = record.result
  if (nestedResult && typeof nestedResult === "object") {
    const nestedModels = (nestedResult as Record<string, unknown>).models
    if (Array.isArray(nestedModels)) return nestedModels.length
  }

  return 0
}

function getErrorPreview(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, 140)
}

export async function POST(request: NextRequest) {
  let body: TestRequestBody
  try {
    body = (await request.json()) as TestRequestBody
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body.", responseTime: 0 } satisfies TestFailureResponse, { status: 400 })
  }

  const baseUrl = (body.baseUrl || "").trim()
  const apiKey = (body.apiKey || "").trim()
  const requestFormat = normalizeFormat(body.requestFormat)

  if (!baseUrl || !apiKey) {
    return NextResponse.json(
      { ok: false, error: "Missing baseUrl or apiKey.", responseTime: 0 } satisfies TestFailureResponse,
      { status: 400 },
    )
  }

  const { url, init } = buildRequest(baseUrl, apiKey, requestFormat)
  const startedAt = Date.now()

  try {
    const response = await fetch(url, init)
    const responseTime = Date.now() - startedAt
    const rawText = await response.text()

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: `HTTP ${response.status}${rawText ? `: ${getErrorPreview(rawText)}` : ""}`,
          responseTime,
        } satisfies TestFailureResponse,
        { status: 200 },
      )
    }

    let json: unknown = null
    try {
      json = rawText ? JSON.parse(rawText) : null
    } catch {
      // keep json as null if body is not JSON.
    }

    return NextResponse.json(
      {
        ok: true,
        modelCount: parseModelCount(json),
        responseTime,
      } satisfies TestSuccessResponse,
      { status: 200 },
    )
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Request failed. Check network, base URL, and API key.",
        responseTime: Date.now() - startedAt,
      } satisfies TestFailureResponse,
      { status: 200 },
    )
  }
}
