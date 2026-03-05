import { NextRequest, NextResponse } from "next/server"
import { deleteStorageValue, getStorageValue, setStorageValue } from "@/lib/server/sqlite-storage"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function validateKey(rawKey: string | null): string | null {
  const key = rawKey?.trim()
  if (!key) return null
  if (key.length > 200) return null
  return key
}

export async function GET(request: NextRequest) {
  const key = validateKey(request.nextUrl.searchParams.get("key"))
  if (!key) {
    return NextResponse.json({ error: "Invalid storage key." }, { status: 400 })
  }

  const raw = getStorageValue(key)
  if (raw === null) {
    return NextResponse.json({ found: false, value: null })
  }

  try {
    return NextResponse.json({
      found: true,
      value: JSON.parse(raw),
    })
  } catch {
    return NextResponse.json({
      found: true,
      value: raw,
    })
  }
}

export async function PUT(request: NextRequest) {
  let body: { key?: unknown; value?: unknown }
  try {
    body = (await request.json()) as { key?: unknown; value?: unknown }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const key = validateKey(typeof body.key === "string" ? body.key : null)
  if (!key) {
    return NextResponse.json({ error: "Invalid storage key." }, { status: 400 })
  }

  setStorageValue(key, JSON.stringify(body.value ?? null))
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const key = validateKey(request.nextUrl.searchParams.get("key"))
  if (!key) {
    return NextResponse.json({ error: "Invalid storage key." }, { status: 400 })
  }

  deleteStorageValue(key)
  return NextResponse.json({ ok: true })
}

