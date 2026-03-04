import { NextRequest, NextResponse } from "next/server"
import {
  DEFAULT_PKU_REFERER,
  DEFAULT_PKU_RESULT_URL,
  parsePkuScheduleHtml,
} from "@/lib/pku-schedule-import"

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36"

interface ScheduleImportRequestBody {
  routeCookie?: string
  jsessionId?: string
  onlySelected?: boolean
}

function detectCharsetFromContentType(contentType: string | null): string | null {
  if (!contentType) return null
  const match = contentType.match(/charset\s*=\s*["']?([^;"'\s]+)/i)
  return match?.[1]?.toLowerCase() || null
}

function decodeHtmlBuffer(bytes: Uint8Array, contentType: string | null): string {
  const headerCharset = detectCharsetFromContentType(contentType)
  const sniff = Buffer.from(bytes.subarray(0, Math.min(bytes.length, 4096))).toString("ascii")
  const metaMatch = sniff.match(/charset\s*=\s*["']?([a-zA-Z0-9\-_]+)/i)
  const metaCharset = metaMatch?.[1]?.toLowerCase() || null
  const charset = (headerCharset || metaCharset || "utf-8").toLowerCase()
  const normalizedCharset =
    charset === "gbk" || charset === "gb2312" || charset === "gb18030"
      ? "gb18030"
      : charset

  try {
    return new TextDecoder(normalizedCharset as BufferEncoding).decode(bytes)
  } catch {
    return new TextDecoder("utf-8").decode(bytes)
  }
}

function extractPlainText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export async function POST(request: NextRequest) {
  let body: ScheduleImportRequestBody
  try {
    body = (await request.json()) as ScheduleImportRequestBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const routeCookie = body.routeCookie?.trim()
  const jsessionId = body.jsessionId?.trim()
  if (!routeCookie || !jsessionId) {
    return NextResponse.json(
      { error: "Missing route or JSESSIONID." },
      { status: 400 },
    )
  }

  const requestHeaders = new Headers()
  requestHeaders.set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
  requestHeaders.set("Accept-Encoding", "gzip, deflate, br")
  requestHeaders.set("Accept-Language", "zh-CN,zh;q=0.9,en;q=0.8")
  requestHeaders.set("Cache-Control", "max-age=0")
  requestHeaders.set("Pragma", "no-cache")
  requestHeaders.set("Upgrade-Insecure-Requests", "1")
  requestHeaders.set("Sec-Fetch-Dest", "document")
  requestHeaders.set("Sec-Fetch-Mode", "navigate")
  requestHeaders.set("Sec-Fetch-Site", "same-origin")
  requestHeaders.set("Sec-Fetch-User", "?1")
  requestHeaders.set("sec-ch-ua", '"Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"')
  requestHeaders.set("sec-ch-ua-mobile", "?0")
  requestHeaders.set("sec-ch-ua-platform", '"Windows"')
  requestHeaders.set("User-Agent", DEFAULT_USER_AGENT)
  requestHeaders.set("Referer", DEFAULT_PKU_REFERER)
  requestHeaders.set("Cookie", `route=${routeCookie}; JSESSIONID=${jsessionId}`)

  let html = ""
  let responseStatus = 0
  let finalUrl = DEFAULT_PKU_RESULT_URL
  try {
    const response = await fetch(DEFAULT_PKU_RESULT_URL, {
      method: "GET",
      headers: requestHeaders,
      cache: "no-store",
      redirect: "follow",
    })

    responseStatus = response.status
    finalUrl = response.url
    const bytes = new Uint8Array(await response.arrayBuffer())
    html = decodeHtmlBuffer(bytes, response.headers.get("content-type"))
  } catch {
    return NextResponse.json(
      { error: "Failed to request elective page." },
      { status: 502 },
    )
  }

  if (responseStatus >= 400) {
    return NextResponse.json(
      {
        error: `Elective page request failed with status ${responseStatus}.`,
        finalUrl,
        responsePreview: html.slice(0, 500),
      },
      { status: responseStatus },
    )
  }

  const parsed = parsePkuScheduleHtml(html, {
    onlySelected: body.onlySelected !== false,
  })

  if (parsed.courses.length === 0) {
    const hasScheduleTable = /classAssignment|datagrid-header/i.test(html)
    const looksLikeLogin = /登录|login|用户名|密码/i.test(html) && !/logout\.do/i.test(html)
    const looksLikeSystemPrompt = /系统提示/.test(html)
    const looksLikeResultTitle = /选课结果|showResults\.do/i.test(html)
    const redirectedAway = !/showResults\.do/i.test(finalUrl)
    const plainText = extractPlainText(html).slice(0, 240)

    return NextResponse.json(
      {
        error: looksLikeLogin
          ? "会话已失效或认证不足，请重新获取 route 和 JSESSIONID。"
          : looksLikeSystemPrompt
          ? "服务端返回了“系统提示”页面，通常是会话上下文不完整或认证校验未通过。"
          : redirectedAway
          ? "认证通过后被重定向到了非选课结果页面。"
          : looksLikeResultTitle && !hasScheduleTable
          ? "已进入选课结果页面，但未发现课程表格结构。"
          : hasScheduleTable
          ? "已获取页面，但解析到 0 门课，请检查当前学期是否有“已选上”课程。"
          : "已请求成功，但返回内容不是课表页面。",
        finalUrl,
        summary: {
          selectedRows: parsed.selectedRows,
          totalRows: parsed.totalRows,
          ignoredLines: parsed.ignoredLines,
          importedCourses: parsed.courses.length,
        },
        responsePreview: html.slice(0, 600),
        responseTextPreview: plainText,
      },
      { status: 422 },
    )
  }

  return NextResponse.json({
    finalUrl,
    courses: parsed.courses,
    summary: {
      selectedRows: parsed.selectedRows,
      totalRows: parsed.totalRows,
      ignoredLines: parsed.ignoredLines,
      importedCourses: parsed.courses.length,
    },
  })
}
