type WeekType = "all" | "odd" | "even"

export interface ImportedScheduleCourse {
  id: string
  name: string
  classroom: string
  slot: number
  span: number
  weekday: number
  weekType: WeekType
}

export interface ParsedRequestConfig {
  url?: string
  userAgent?: string
  headers: Record<string, string>
  cookies: Record<string, string>
}

export interface ParsedScheduleResult {
  courses: ImportedScheduleCourse[]
  selectedRows: number
  totalRows: number
  ignoredLines: number
}

const WEEKDAY_MAP: Record<string, number> = {
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  日: 7,
  天: 7,
}

const HTML_ENTITY_MAP: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  "#39": "'",
}

export const DEFAULT_PKU_RESULT_URL =
  "https://elective.pku.edu.cn/elective2008/edu/pku/stu/elective/controller/electiveWork/showResults.do"

export const DEFAULT_PKU_REFERER =
  "https://elective.pku.edu.cn/elective2008/edu/pku/stu/elective/controller/help/HelpController.jpf"

function decodeHtmlEntities(input: string): string {
  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (_, raw) => {
    const key = String(raw)
    if (HTML_ENTITY_MAP[key]) return HTML_ENTITY_MAP[key]
    if (key.startsWith("#x") || key.startsWith("#X")) {
      const code = Number.parseInt(key.slice(2), 16)
      return Number.isFinite(code) ? String.fromCodePoint(code) : _
    }
    if (key.startsWith("#")) {
      const code = Number.parseInt(key.slice(1), 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : _
    }
    return _
  })
}

function cleanHtmlCell(input: string): string {
  return decodeHtmlEntities(
    input
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]*>/g, "")
      .replace(/\u00a0/g, " "),
  )
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim()
}

function normalizePowerShellString(input: string): string {
  return input.replace(/`"/g, '"').replace(/``/g, "`").trim()
}

function removeOuterQuotes(input: string): string {
  const text = input.trim()
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    return text.slice(1, -1)
  }
  return text
}

function normalizeHeaderKey(input: string): string {
  return input
    .trim()
    .split("-")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1).toLowerCase())
    .join("-")
}

export function parseCookieText(cookieText: string): Record<string, string> {
  const cookieMap: Record<string, string> = {}
  const parts = cookieText
    .split(/[\n;]+/)
    .map((part) => part.trim())
    .filter(Boolean)

  for (const part of parts) {
    const index = part.indexOf("=")
    if (index <= 0) continue
    const name = part.slice(0, index).trim()
    const value = part.slice(index + 1).trim()
    if (!name || !value) continue
    cookieMap[name] = value
  }

  return cookieMap
}

export function buildCookieHeader(cookies: Record<string, string>): string {
  return Object.entries(cookies)
    .filter(([, value]) => Boolean(value))
    .map(([name, value]) => `${name}=${value}`)
    .join("; ")
}

export function parsePowerShellRequestScript(script: string): ParsedRequestConfig {
  const text = script || ""
  const parsed: ParsedRequestConfig = {
    headers: {},
    cookies: {},
  }

  const urlMatch = text.match(/-Uri\s+["']([^"']+)["']/i)
  if (urlMatch) parsed.url = normalizePowerShellString(urlMatch[1])

  const userAgentMatch = text.match(/UserAgent\s*=\s*["']([^"']+)["']/i)
  if (userAgentMatch) parsed.userAgent = normalizePowerShellString(userAgentMatch[1])

  const cookieRegex =
    /System\.Net\.Cookie\(\s*["']([^"']+)["']\s*,\s*["']([^"']*)["']/gi
  let cookieMatch = cookieRegex.exec(text)
  while (cookieMatch) {
    const name = cookieMatch[1]?.trim()
    const value = normalizePowerShellString(cookieMatch[2] ?? "")
    if (name && value) parsed.cookies[name] = value
    cookieMatch = cookieRegex.exec(text)
  }

  const headerBlockMatch = text.match(/-Headers\s*@\{([\s\S]*?)\}\s*$/im)
  if (headerBlockMatch) {
    const lines = headerBlockMatch[1]
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)

    for (const line of lines) {
      const cleanLine = line.replace(/,\s*$/, "")
      const pairMatch = cleanLine.match(/^["']([^"']+)["']\s*=\s*(.+)$/)
      if (!pairMatch) continue

      const headerKey = normalizeHeaderKey(pairMatch[1])
      const headerValue = normalizePowerShellString(removeOuterQuotes(pairMatch[2]))
      if (!headerValue) continue
      parsed.headers[headerKey] = headerValue
    }
  }

  if (parsed.headers.Cookie) {
    Object.assign(parsed.cookies, parseCookieText(parsed.headers.Cookie))
    delete parsed.headers.Cookie
  }

  return parsed
}

function parseWeekType(token?: string): WeekType {
  if (token?.includes("单周")) return "odd"
  if (token?.includes("双周")) return "even"
  return "all"
}

function isSelectedResultText(text: string): boolean {
  const normalized = text.replace(/\s+/g, "")
  if (!normalized) return false
  if (/(未选|落选|失败|退选)/.test(normalized)) return false
  return /(已选|选上|成功|中签|已中)/.test(normalized)
}

function parseClassroomFromLine(line: string, fallbackRaw: string): string {
  const direct = line.trim()
  if (direct) return direct

  const remarkMatch = fallbackRaw.match(/备注[:：]\s*([^，,；;]+)/)
  if (remarkMatch?.[1]) return remarkMatch[1].trim()

  return "暂无教室"
}

function mergeContiguousCourses(courses: ImportedScheduleCourse[]): ImportedScheduleCourse[] {
  const sorted = [...courses].sort(
    (a, b) => a.weekday - b.weekday || a.slot - b.slot || a.name.localeCompare(b.name),
  )
  const merged: ImportedScheduleCourse[] = []

  for (const course of sorted) {
    const last = merged[merged.length - 1]
    if (
      last &&
      last.weekday === course.weekday &&
      last.weekType === course.weekType &&
      last.name === course.name &&
      last.classroom === course.classroom &&
      last.slot + last.span === course.slot
    ) {
      last.span += course.span
      continue
    }
    merged.push({ ...course })
  }

  return merged
}

function parseFromClassAssignmentTable(html: string): ImportedScheduleCourse[] {
  const tableMatch = html.match(/<table[^>]*id=["']classAssignment["'][\s\S]*?<\/table>/i)
  if (!tableMatch) return []

  const tableHtml = tableMatch[0]
  const rowRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi
  const cellRegex = /<td\b[^>]*>([\s\S]*?)<\/td>/gi

  const rawCourses: ImportedScheduleCourse[] = []
  let slot = 0
  let rowMatch = rowRegex.exec(tableHtml)
  while (rowMatch) {
    const rowHtml = rowMatch[1]
    if (/<th\b/i.test(rowHtml)) {
      rowMatch = rowRegex.exec(tableHtml)
      continue
    }

    slot += 1
    const cells: string[] = []
    let cellMatch = cellRegex.exec(rowHtml)
    while (cellMatch) {
      cells.push(cleanHtmlCell(cellMatch[1]))
      cellMatch = cellRegex.exec(rowMatch[1])
    }

    for (let weekday = 1; weekday <= 7; weekday += 1) {
      const cellText = (cells[weekday] || "").trim()
      if (!cellText) continue
      const lines = cellText.split("\n").map((line) => line.trim()).filter(Boolean)
      if (lines.length === 0) continue

      const name = lines[0]
      if (!name) continue

      const classroomLine =
        lines.find((line) => /^\(([^()（）]+)\)$/.test(line)) ||
        lines.find((line) => line.includes("教室")) ||
        ""
      const classroom =
        classroomLine.replace(/^\(/, "").replace(/\)$/, "").trim() || "暂无教室"

      rawCourses.push({
        id: `fallback-${weekday}-${slot}-${rawCourses.length + 1}`,
        name,
        classroom,
        slot,
        span: 1,
        weekday,
        weekType: parseWeekType(cellText),
      })
    }

    rowMatch = rowRegex.exec(tableHtml)
  }

  const merged = mergeContiguousCourses(rawCourses)
  return merged.map((course, index) => ({ ...course, id: `fallback-${index + 1}` }))
}

export function parsePkuScheduleHtml(
  html: string,
  options?: { onlySelected?: boolean },
): ParsedScheduleResult {
  const onlySelected = options?.onlySelected !== false
  const rowRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi
  const cellRegex = /<td\b[^>]*>([\s\S]*?)<\/td>/gi

  const imported: ImportedScheduleCourse[] = []
  const dedupe = new Set<string>()

  let totalRows = 0
  let selectedRows = 0
  let ignoredLines = 0

  let rowMatch = rowRegex.exec(html)
  while (rowMatch) {
    const rowHtml = rowMatch[1]
    if (/<th\b/i.test(rowHtml)) {
      rowMatch = rowRegex.exec(html)
      continue
    }

    const cells: string[] = []

    let cellMatch = cellRegex.exec(rowHtml)
    while (cellMatch) {
      cells.push(cleanHtmlCell(cellMatch[1]))
      cellMatch = cellRegex.exec(rowHtml)
    }

    if (cells.length < 9) {
      rowMatch = rowRegex.exec(html)
      continue
    }
    totalRows += 1

    const courseNo = cells[0] || "unknown"
    const courseName = cells[1] || "未命名课程"
    const classroomInfo = cells[8] || ""
    const resultText = cells[10] || ""

    if (onlySelected && !isSelectedResultText(resultText)) {
      rowMatch = rowRegex.exec(html)
      continue
    }

    selectedRows += 1

    const lines = classroomInfo
      .split(/\n+/)
      .map((line) => line.trim().replace(/\s+/g, " "))
      .filter(Boolean)

    for (const line of lines) {
      // Example: 1~15周 每周周四3~4节 理教301
      const scheduleMatch = line.match(
        /(\d+)\s*[~～-]\s*(\d+)周\s*(每周|单周|双周)?\s*周([一二三四五六日天])\s*(\d+)\s*[~～-]\s*(\d+)节\s*([^\(（;；\n]*)/,
      )
      if (!scheduleMatch) {
        ignoredLines += 1
        continue
      }

      const weekday = WEEKDAY_MAP[scheduleMatch[4]]
      if (!weekday) {
        ignoredLines += 1
        continue
      }

      const slotStart = Number.parseInt(scheduleMatch[5], 10)
      const slotEnd = Number.parseInt(scheduleMatch[6], 10)
      if (!Number.isFinite(slotStart) || !Number.isFinite(slotEnd)) {
        ignoredLines += 1
        continue
      }

      const normalizedStart = Math.max(1, Math.min(slotStart, slotEnd))
      const normalizedEnd = Math.min(12, Math.max(slotStart, slotEnd))
      const span = normalizedEnd - normalizedStart + 1
      if (span < 1) {
        ignoredLines += 1
        continue
      }

      const classroom = parseClassroomFromLine(scheduleMatch[7] ?? "", line)
      const weekType = parseWeekType(scheduleMatch[3])
      const key = `${courseName}|${weekday}|${normalizedStart}|${span}|${classroom}|${weekType}`
      if (dedupe.has(key)) continue
      dedupe.add(key)

      imported.push({
        id: `${courseNo}-${weekday}-${normalizedStart}-${imported.length + 1}`,
        name: courseName,
        classroom,
        slot: normalizedStart,
        span,
        weekday,
        weekType,
      })
    }

    rowMatch = rowRegex.exec(html)
  }

  imported.sort((a, b) => a.slot - b.slot || a.weekday - b.weekday || a.name.localeCompare(b.name))

  const finalCourses =
    imported.length > 0
      ? imported
      : parseFromClassAssignmentTable(html)

  return {
    courses: finalCourses,
    selectedRows,
    totalRows,
    ignoredLines,
  }
}
