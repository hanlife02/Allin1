import { NextRequest, NextResponse } from "next/server"

interface BarkNotifyRequestBody {
  token?: string
  title?: string
  body?: string
  url?: string
  group?: string
}

function normalizeToken(token: string): string {
  return token
    .trim()
    .replace(/^https?:\/\/api\.day\.app\//i, "")
    .replace(/^\/+/, "")
}

function buildBarkUrl(payload: Required<Pick<BarkNotifyRequestBody, "token" | "title" | "body">> & Pick<BarkNotifyRequestBody, "url" | "group">): string {
  const encodedToken = encodeURIComponent(payload.token)
  const encodedTitle = encodeURIComponent(payload.title)
  const encodedBody = encodeURIComponent(payload.body)
  const url = new URL(`https://api.day.app/${encodedToken}/${encodedTitle}/${encodedBody}`)
  if (payload.url) url.searchParams.set("url", payload.url)
  if (payload.group) url.searchParams.set("group", payload.group)
  return url.toString()
}

export async function POST(request: NextRequest) {
  let body: BarkNotifyRequestBody
  try {
    body = (await request.json()) as BarkNotifyRequestBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const token = normalizeToken(body.token || "")
  const title = (body.title || "").trim()
  const message = (body.body || "").trim()
  const url = body.url?.trim()
  const group = body.group?.trim()

  if (!token) {
    return NextResponse.json({ error: "Missing Bark token." }, { status: 400 })
  }
  if (!title || !message) {
    return NextResponse.json({ error: "Missing Bark title or body." }, { status: 400 })
  }

  const barkUrl = buildBarkUrl({ token, title, body: message, url, group })

  let response: Response
  try {
    response = await fetch(barkUrl, {
      method: "GET",
      cache: "no-store",
    })
  } catch {
    return NextResponse.json({ error: "Failed to request Bark service." }, { status: 502 })
  }

  const responseText = await response.text()
  if (!response.ok) {
    return NextResponse.json(
      {
        error: `Bark request failed with status ${response.status}.`,
        preview: responseText.slice(0, 240),
      },
      { status: 502 },
    )
  }

  return NextResponse.json({
    ok: true,
    provider: "bark",
    responsePreview: responseText.slice(0, 240),
  })
}
