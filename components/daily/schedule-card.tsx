"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { MapPin, Plus, Trash2, Settings2, ChevronLeft, ChevronRight, Download, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { DatePicker } from "@/components/ui/date-picker"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useLocale } from "@/lib/i18n"
import { useLocalStorage } from "@/hooks/use-local-storage"
import {
  NOTIFICATION_SETTINGS_STORAGE_KEY,
  defaultNotificationSettings,
  type NotificationSettings,
} from "@/lib/notification-settings"

// 鈹€鈹€鈹€ Types 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

type WeekType = "all" | "odd" | "even"

interface Course {
  id: string
  name: string
  classroom: string
  /** slot index 1鈥?2 */
  slot: number
  /** how many consecutive slots this course occupies */
  span: number
  /** 1=Mon 鈥?7=Sun */
  weekday: number
  weekType: WeekType
}

interface SemesterConfig {
  /** ISO date string of the first Monday of the semester, e.g. "2026-02-23" */
  startDate: string
  /** total weeks in the semester */
  totalWeeks: number
}

interface VisibleCourse extends Course {
  span: number
  endSlot: number
}

interface ScheduleImportConfig {
  routeCookie: string
  jsessionId: string
}

interface WeekendVisibilityConfig {
  showSaturday: boolean
  showSunday: boolean
}

// 鈹€鈹€鈹€ Constants 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

const SLOTS = [
  { label: "1", time: "8:00-8:50" },
  { label: "2", time: "9:00-9:50" },
  { label: "3", time: "10:10-11:00" },
  { label: "4", time: "11:10-12:00" },
  { label: "5", time: "13:00-13:50" },
  { label: "6", time: "14:00-14:50" },
  { label: "7", time: "15:10-16:00" },
  { label: "8", time: "16:10-17:00" },
  { label: "9", time: "17:10-18:00" },
  { label: "10", time: "18:40-19:30" },
  { label: "11", time: "19:40-20:30" },
  { label: "12", time: "20:40-21:30" },
]

// Start / end minutes for each slot (for "current slot" highlighting)
const SLOT_RANGES = [
  [480, 530],   // 8:00鈥?:50
  [540, 590],   // 9:00鈥?:50
  [610, 660],   // 10:10鈥?1:00
  [670, 720],   // 11:10鈥?2:00
  [780, 830],   // 13:00鈥?3:50
  [840, 890],   // 14:00鈥?4:50
  [910, 960],   // 15:10鈥?6:00
  [970, 1020],  // 16:10鈥?7:00
  [1030, 1080], // 17:10鈥?8:00
  [1120, 1170], // 18:40鈥?9:30
  [1180, 1230], // 19:40鈥?0:30
  [1240, 1290], // 20:40鈥?1:30
]

const defaultCourses: Course[] = [
  { id: "1", name: "Calculus", classroom: "A301", slot: 1, span: 2, weekday: 1, weekType: "all" },
  { id: "2", name: "Linear Algebra", classroom: "B205", slot: 3, span: 2, weekday: 1, weekType: "odd" },
  { id: "3", name: "Physics", classroom: "C102", slot: 5, span: 2, weekday: 2, weekType: "all" },
  { id: "4", name: "English", classroom: "D401", slot: 1, span: 2, weekday: 3, weekType: "even" },
  { id: "5", name: "Data Structures", classroom: "A205", slot: 3, span: 2, weekday: 4, weekType: "all" },
  { id: "6", name: "Operating Systems", classroom: "B301", slot: 5, span: 2, weekday: 5, weekType: "odd" },
]

const defaultSemester: SemesterConfig = {
  startDate: "2026-02-23",
  totalWeeks: 18,
}

const defaultScheduleImportConfig: ScheduleImportConfig = {
  routeCookie: "",
  jsessionId: "",
}

const defaultWeekendVisibility: WeekendVisibilityConfig = {
  showSaturday: true,
  showSunday: true,
}

const BARK_REMIND_AHEAD_MINUTES = 10
const BARK_CHECK_INTERVAL_MS = 30000
const BARK_NOTIFIED_EVENTS_STORAGE_KEY = "allin1_bark_notified_events_v1"
const BARK_NOTIFIED_RETENTION_MS = 14 * 86400000

const MIN_SCHEDULE_HEIGHT = 280
const DEFAULT_SCHEDULE_HEIGHT = 960
const MAX_SCHEDULE_HEIGHT_FALLBACK = 2400
const SLOT_SECTION_BREAKS = [4, 9] as const
const SLOT_SECTION_GAP_WEIGHT = 0.24
const SLOT_SECTION_BREAK_SET = new Set<number>(SLOT_SECTION_BREAKS)
const SLOT_GRID_ROW_COUNT = SLOTS.length + SLOT_SECTION_BREAKS.length
const SLOT_GRID_TOTAL_UNITS = SLOTS.length + SLOT_SECTION_BREAKS.length * SLOT_SECTION_GAP_WEIGHT
const SLOT_GRID_TEMPLATE_ROWS = SLOTS.map((_, idx) => {
  const slot = idx + 1
  if (SLOT_SECTION_BREAK_SET.has(slot)) {
    return `minmax(0, 1fr) minmax(0, ${SLOT_SECTION_GAP_WEIGHT}fr)`
  }
  return "minmax(0, 1fr)"
}).join(" ")

// 鈹€鈹€鈹€ Helpers 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

/**
 * Given a semester start date (Monday) and today's date,
 * returns { weekNo, isOdd } where weekNo is 1-based (0 = before semester).
 */
function getSemesterWeek(startDateStr: string): { weekNo: number; isOdd: boolean } {
  const [year, month, day] = startDateStr.split("-").map(Number)
  const start = new Date(year, (month || 1) - 1, day || 1)
  // Normalise to midnight
  start.setHours(0, 0, 0, 0)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const diffDays = Math.floor((now.getTime() - start.getTime()) / 86400000)
  if (diffDays < 0) return { weekNo: 0, isOdd: true }
  const weekNo = Math.floor(diffDays / 7) + 1
  return { weekNo, isOdd: weekNo % 2 === 1 }
}

function getWeekDates(startDateStr: string, weekNo: number): Date[] {
  const [year, month, day] = startDateStr.split("-").map(Number)
  const weekStart = new Date(year, (month || 1) - 1, day || 1)
  weekStart.setHours(0, 0, 0, 0)
  weekStart.setDate(weekStart.getDate() + (weekNo - 1) * 7)

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })
}

function formatMonthDay(date: Date): string {
  return `${date.getMonth() + 1}.${date.getDate()}`
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function formatMinuteText(totalMinutes: number): string {
  const clamped = Math.min(Math.max(totalMinutes, 0), 24 * 60 - 1)
  const hours = Math.floor(clamped / 60)
  const minutes = clamped % 60
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

function pruneBarkNotifiedEventMap(
  eventMap: Record<string, number>,
  nowTimestamp: number,
): { nextMap: Record<string, number>; changed: boolean } {
  const minTimestamp = nowTimestamp - BARK_NOTIFIED_RETENTION_MS
  const nextMap: Record<string, number> = {}
  let changed = false

  for (const [key, timestamp] of Object.entries(eventMap)) {
    if (!Number.isFinite(timestamp) || timestamp < minTimestamp) {
      changed = true
      continue
    }
    nextMap[key] = timestamp
  }

  if (!changed && Object.keys(nextMap).length !== Object.keys(eventMap).length) {
    changed = true
  }

  return { nextMap, changed }
}

function getMaxScheduleHeight(): number {
  if (typeof window === "undefined") return MAX_SCHEDULE_HEIGHT_FALLBACK
  const viewportScaledMax = Math.round(window.innerHeight * 2.8)
  return Math.max(MIN_SCHEDULE_HEIGHT + 120, Math.min(MAX_SCHEDULE_HEIGHT_FALLBACK, viewportScaledMax))
}

function clampScheduleHeight(height: number, maxHeight: number = getMaxScheduleHeight()): number {
  if (!Number.isFinite(height)) return DEFAULT_SCHEDULE_HEIGHT
  return Math.min(Math.max(Math.round(height), MIN_SCHEDULE_HEIGHT), maxHeight)
}

function normalizeTotalWeeks(totalWeeks: number): number {
  if (!Number.isFinite(totalWeeks)) return 1
  return Math.min(Math.max(Math.round(totalWeeks), 1), 30)
}

function clampWeekNo(weekNo: number, totalWeeks: number): number {
  return Math.min(Math.max(Math.round(weekNo), 1), totalWeeks)
}

function formatWeekNoLabel(prefix: string, weekNo: number): string {
  return prefix === "第" ? `${prefix}${weekNo}周` : `${prefix} ${weekNo}`
}

function isCurrentSlot(slotIndex: number): boolean {
  const now = new Date()
  const cur = now.getHours() * 60 + now.getMinutes()
  const [start, end] = SLOT_RANGES[slotIndex - 1]
  return cur >= start && cur <= end
}

function getCurrentSlotIndex(): number | null {
  const now = new Date()
  const cur = now.getHours() * 60 + now.getMinutes()
  const idx = SLOT_RANGES.findIndex(([start, end]) => cur >= start && cur <= end)
  return idx === -1 ? null : idx + 1
}

function getBreakCountBeforeSlot(slot: number): number {
  let count = 0
  for (const sectionBreak of SLOT_SECTION_BREAKS) {
    if (slot > sectionBreak) count += 1
  }
  return count
}

function getBreakCountWithinRange(startSlot: number, endSlot: number): number {
  let count = 0
  for (const sectionBreak of SLOT_SECTION_BREAKS) {
    if (sectionBreak >= startSlot && sectionBreak < endSlot) count += 1
  }
  return count
}

function getGridRowStartFromSlot(slot: number): number {
  return slot + getBreakCountBeforeSlot(slot)
}

function getGridRowSpanFromSlotRange(slot: number, span: number): number {
  if (span <= 1) return 1
  const endSlot = slot + span - 1
  return span + getBreakCountWithinRange(slot, endSlot)
}

function getSlotFromYAxisUnit(yUnits: number): number {
  let cursor = 0
  for (let slot = 1; slot <= SLOTS.length; slot += 1) {
    cursor += 1
    if (yUnits <= cursor || slot === SLOTS.length) return slot

    if (SLOT_SECTION_BREAK_SET.has(slot)) {
      const gapEnd = cursor + SLOT_SECTION_GAP_WEIGHT
      if (yUnits <= gapEnd) return Math.min(slot + 1, SLOTS.length)
      cursor = gapEnd
    }
  }
  return SLOTS.length
}

// 鈹€鈹€鈹€ Component 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

export function ScheduleCard() {
  const { t } = useLocale()

  const [courses, setCourses, coursesMounted] = useLocalStorage<Course[]>("allin1_schedule_v4", defaultCourses)
  const [semester, setSemester, semesterMounted] = useLocalStorage<SemesterConfig>(
    "allin1_semester",
    defaultSemester,
  )
  const [notifications, , notificationsMounted] = useLocalStorage<NotificationSettings>(
    NOTIFICATION_SETTINGS_STORAGE_KEY,
    defaultNotificationSettings,
  )
  const totalWeeks = normalizeTotalWeeks(semester.totalWeeks)
  const { weekNo: currentWeekNoRaw } = getSemesterWeek(semester.startDate)
  const currentWeekNo = clampWeekNo(currentWeekNoRaw, totalWeeks)
  const [viewWeekNo, setViewWeekNo] = useState<number>(currentWeekNo)

  // Add course dialog
  const [addOpen, setAddOpen] = useState(false)
  const [newCourse, setNewCourse] = useState<Omit<Course, "id">>({
    name: "",
    classroom: "",
    slot: 1,
    span: 2,
    weekday: 1,
    weekType: "all",
  })
  const [draggingCourseId, setDraggingCourseId] = useState<string | null>(null)
  const [dragOverCell, setDragOverCell] = useState<{ weekday: number; slot: number; span: number } | null>(null)
  const scheduleGridRef = useRef<HTMLDivElement | null>(null)

  // Semester config dialog
  const [cfgOpen, setCfgOpen] = useState(false)
  const [cfgDraft, setCfgDraft] = useState<SemesterConfig>(semester)
  const semesterConfigDialogId = "daily-schedule-semester-config-dialog"
  const addCourseDialogId = "daily-schedule-add-course-dialog"
  const importDialogId = "daily-schedule-import-dialog"
  const [importOpen, setImportOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState("")
  const [importSummary, setImportSummary] = useState("")
  const [importConfig, setImportConfig] = useLocalStorage<ScheduleImportConfig>(
    "allin1_schedule_import_config",
    defaultScheduleImportConfig,
  )
  const [weekendVisibility, setWeekendVisibility] = useLocalStorage<WeekendVisibilityConfig>(
    "allin1_schedule_weekend_visibility",
    defaultWeekendVisibility,
  )
  const [scheduleHeight, setScheduleHeight] = useLocalStorage<number>(
    "allin1_schedule_card_height",
    DEFAULT_SCHEDULE_HEIGHT,
  )
  const [barkNotifiedEvents, setBarkNotifiedEvents] = useLocalStorage<Record<string, number>>(
    BARK_NOTIFIED_EVENTS_STORAGE_KEY,
    {},
  )
  const resizeStateRef = useRef<{ startPageY: number; startHeight: number } | null>(null)
  const resizePointerClientYRef = useRef<number | null>(null)
  const resizeAutoScrollRafRef = useRef<number | null>(null)
  const [isResizingSchedule, setIsResizingSchedule] = useState(false)
  const weekOptions = useMemo(
    () => Array.from({ length: totalWeeks }, (_, index) => index + 1),
    [totalWeeks],
  )
  const normalizedScheduleHeight = clampScheduleHeight(scheduleHeight)
  const showSaturday = weekendVisibility.showSaturday
  const showSunday = weekendVisibility.showSunday
  const visibleWeekdays = useMemo(
    () => [1, 2, 3, 4, 5, ...(showSaturday ? [6] : []), ...(showSunday ? [7] : [])],
    [showSaturday, showSunday],
  )
  const visibleDayCount = visibleWeekdays.length
  const weekdayToColumn = useMemo(
    () => new Map(visibleWeekdays.map((weekday, idx) => [weekday, idx + 1] as const)),
    [visibleWeekdays],
  )

  useEffect(() => {
    setViewWeekNo((prev) => clampWeekNo(prev, totalWeeks))
  }, [totalWeeks])

  useEffect(() => {
    const syncScheduleHeight = () => {
      setScheduleHeight((prev) => clampScheduleHeight(prev))
    }

    syncScheduleHeight()
    window.addEventListener("resize", syncScheduleHeight)
    return () => window.removeEventListener("resize", syncScheduleHeight)
  }, [setScheduleHeight])

  useEffect(() => {
    if (!isResizingSchedule) return

    const onPointerMove = (event: PointerEvent) => {
      resizePointerClientYRef.current = event.clientY
      const state = resizeStateRef.current
      if (!state) return
      const currentPageY = event.clientY + window.scrollY
      const nextHeight = clampScheduleHeight(state.startHeight + (currentPageY - state.startPageY))
      setScheduleHeight(nextHeight)
    }

    const startAutoScrollLoop = () => {
      const AUTO_SCROLL_THRESHOLD = 72
      const AUTO_SCROLL_MIN_STEP = 4
      const AUTO_SCROLL_MAX_STEP = 22

      const tick = () => {
        const state = resizeStateRef.current
        const clientY = resizePointerClientYRef.current
        if (state && clientY !== null) {
          let scrollDelta = 0

          if (clientY > window.innerHeight - AUTO_SCROLL_THRESHOLD) {
            const overflow = clientY - (window.innerHeight - AUTO_SCROLL_THRESHOLD)
            scrollDelta = Math.min(AUTO_SCROLL_MAX_STEP, Math.max(AUTO_SCROLL_MIN_STEP, overflow * 0.24))
          } else if (clientY < AUTO_SCROLL_THRESHOLD) {
            const overflow = AUTO_SCROLL_THRESHOLD - clientY
            scrollDelta = -Math.min(AUTO_SCROLL_MAX_STEP, Math.max(AUTO_SCROLL_MIN_STEP, overflow * 0.24))
          }

          if (scrollDelta !== 0) {
            const prevScrollY = window.scrollY
            window.scrollBy(0, scrollDelta)
            const currentPageY = clientY + window.scrollY
            if (window.scrollY !== prevScrollY) {
              const nextHeight = clampScheduleHeight(state.startHeight + (currentPageY - state.startPageY))
              setScheduleHeight(nextHeight)
            }
          }
        }
        resizeAutoScrollRafRef.current = window.requestAnimationFrame(tick)
      }

      resizeAutoScrollRafRef.current = window.requestAnimationFrame(tick)
    }

    const stopResizing = () => {
      if (resizeAutoScrollRafRef.current !== null) {
        window.cancelAnimationFrame(resizeAutoScrollRafRef.current)
        resizeAutoScrollRafRef.current = null
      }
      resizeStateRef.current = null
      resizePointerClientYRef.current = null
      setIsResizingSchedule(false)
    }

    startAutoScrollLoop()
    window.addEventListener("pointermove", onPointerMove)
    window.addEventListener("pointerup", stopResizing)
    window.addEventListener("pointercancel", stopResizing)
    return () => {
      if (resizeAutoScrollRafRef.current !== null) {
        window.cancelAnimationFrame(resizeAutoScrollRafRef.current)
        resizeAutoScrollRafRef.current = null
      }
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", stopResizing)
      window.removeEventListener("pointercancel", stopResizing)
    }
  }, [isResizingSchedule, setScheduleHeight])

  useEffect(() => {
    if (!isResizingSchedule) return

    const previousUserSelect = document.body.style.userSelect
    const previousCursor = document.body.style.cursor
    document.body.style.userSelect = "none"
    document.body.style.cursor = "ns-resize"

    return () => {
      document.body.style.userSelect = previousUserSelect
      document.body.style.cursor = previousCursor
    }
  }, [isResizingSchedule])

  useEffect(() => {
    if (!coursesMounted || !semesterMounted || !notificationsMounted) return

    const barkToken = notifications.barkToken.trim()
    if (!barkToken) return

    const checkAndNotify = async () => {
      const now = new Date()
      const semesterWeek = getSemesterWeek(semester.startDate)
      const semesterTotalWeeks = normalizeTotalWeeks(semester.totalWeeks)
      if (semesterWeek.weekNo < 1 || semesterWeek.weekNo > semesterTotalWeeks) return

      const todayWeekday = now.getDay() === 0 ? 7 : now.getDay()
      const nowMinutes = now.getHours() * 60 + now.getMinutes()
      const todayDateKey = formatDateKey(now)
      const currentWeekType: WeekType = semesterWeek.isOdd ? "odd" : "even"

      const todayCourses = courses.filter(
        (course) =>
          course.weekday === todayWeekday &&
          (course.weekType === "all" || course.weekType === currentWeekType),
      )
      if (todayCourses.length === 0) return

      const pruned = pruneBarkNotifiedEventMap(barkNotifiedEvents, now.getTime())
      const notifiedMap = pruned.nextMap
      let mapChanged = pruned.changed

      for (const course of todayCourses) {
        const slotRange = SLOT_RANGES[course.slot - 1]
        if (!slotRange) continue
        const startMinute = slotRange[0]
        const remindMinute = startMinute - BARK_REMIND_AHEAD_MINUTES
        if (nowMinutes < remindMinute || nowMinutes >= startMinute) continue

        const eventKey = `${todayDateKey}|${course.id}|${course.weekday}|${course.slot}|${course.weekType}`
        if (notifiedMap[eventKey]) continue

        const normalizedSpan = Math.max(1, Math.round(course.span))
        const endSlot = Math.min(SLOTS.length, course.slot + normalizedSpan - 1)
        const periodLabel =
          normalizedSpan > 1 ? `第${course.slot}-${endSlot}节` : `第${course.slot}节`
        const startTimeText = formatMinuteText(startMinute)
        const classroomText = course.classroom?.trim() ? `，地点：${course.classroom.trim()}` : ""
        const title = "上课提醒"
        const body = `${course.name} ${periodLabel}，${startTimeText} 开始${classroomText}`

        try {
          const response = await fetch("/api/notifications/bark", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token: barkToken,
              title,
              body,
              group: "allin1-schedule",
              url: "/daily",
            }),
          })
          if (response.ok) {
            notifiedMap[eventKey] = Date.now()
            mapChanged = true
          }
        } catch {
          // Ignore network errors and retry on next tick.
        }
      }

      if (mapChanged) {
        setBarkNotifiedEvents(notifiedMap)
      }
    }

    void checkAndNotify()
    const timer = window.setInterval(() => {
      void checkAndNotify()
    }, BARK_CHECK_INTERVAL_MS)

    return () => {
      window.clearInterval(timer)
    }
  }, [
    courses,
    coursesMounted,
    barkNotifiedEvents,
    notifications.barkToken,
    notificationsMounted,
    semester.startDate,
    semester.totalWeeks,
    semesterMounted,
    setBarkNotifiedEvents,
  ])

  // 鈹€鈹€ Computed week info 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
  const viewedWeekType: "odd" | "even" = viewWeekNo % 2 === 1 ? "odd" : "even"
  const isViewingCurrentWeek = currentWeekNoRaw >= 1 && currentWeekNoRaw <= totalWeeks && viewWeekNo === currentWeekNoRaw
  const currentWeekStatus =
    currentWeekNoRaw < 1
      ? t.daily.schedule.beforeSemester
      : currentWeekNoRaw > totalWeeks
      ? t.daily.schedule.afterSemester
      : null
  const weekLabelBase = `${formatWeekNoLabel(t.daily.schedule.weekLabel, viewWeekNo)} ${
    viewedWeekType === "odd" ? t.daily.schedule.oddWeek : t.daily.schedule.evenWeek
  }`
  const weekLabel = currentWeekStatus ? `${weekLabelBase} · ${currentWeekStatus}` : weekLabelBase

  // 鈹€鈹€ Handlers 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
  function handleAddCourse() {
    if (!newCourse.name.trim()) return
    const startSlot = Math.min(Math.max(newCourse.slot, 1), SLOTS.length)
    const maxSpan = SLOTS.length - startSlot + 1
    const clampedSpan = Math.min(Math.max(newCourse.span, 1), maxSpan)
    setCourses((prev) => [
      ...prev,
      { ...newCourse, slot: startSlot, span: clampedSpan, id: Date.now().toString() },
    ])
    setNewCourse({ name: "", classroom: "", slot: 1, span: 2, weekday: 1, weekType: "all" })
    setAddOpen(false)
  }

  function deleteCourse(id: string) {
    setCourses((prev) => prev.filter((c) => c.id !== id))
  }

  function saveSemesterConfig() {
    const totalWeeksDraft = normalizeTotalWeeks(cfgDraft.totalWeeks)
    const nextConfig: SemesterConfig = {
      ...cfgDraft,
      totalWeeks: totalWeeksDraft,
    }
    setSemester(nextConfig)
    setCfgDraft(nextConfig)
    setViewWeekNo((prev) => clampWeekNo(prev, totalWeeksDraft))
    setCfgOpen(false)
  }

  async function importScheduleFromPku() {
    setImportError("")
    setImportSummary("")
    setImporting(true)

    try {
      const response = await fetch("/api/schedule/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routeCookie: importConfig.routeCookie,
          jsessionId: importConfig.jsessionId,
          onlySelected: true,
        }),
      })

      const data = (await response.json()) as {
        error?: string
        finalUrl?: string
        responsePreview?: string
        responseTextPreview?: string
        courses?: Course[]
        summary?: {
          selectedRows: number
          totalRows: number
          ignoredLines: number
          importedCourses: number
        }
      }

      if (!response.ok) {
        const baseError = data.error || "课表导入失败，请检查认证信息。"
        const stat =
          data.summary
            ? `（已识别行 ${data.summary.totalRows}，可用 ${data.summary.selectedRows}，导入 ${data.summary.importedCourses}）`
            : ""
        const urlHint = data.finalUrl ? `；返回地址：${data.finalUrl}` : ""
        const previewHint = data.responsePreview
          ? `；页面片段：${data.responsePreview.replace(/\s+/g, " ").slice(0, 120)}...`
          : ""
        const textHint = data.responseTextPreview
          ? `；正文片段：${data.responseTextPreview.slice(0, 120)}...`
          : ""
        setImportError(`${baseError}${stat}${urlHint}${previewHint}${textHint}`)
        return
      }

      const nextCourses = data.courses ?? []
      if (nextCourses.length === 0) {
        setImportError("未解析到可导入课程，请确认是否有“已选上”课程和有效教室信息。")
        return
      }

      const uniqueCourses = nextCourses.map((course, index) => ({
        ...course,
        id: `${course.id || "import"}-${Date.now()}-${index}`,
      }))

      setCourses(uniqueCourses)
      setImportSummary(
        `导入成功：${data.summary?.importedCourses ?? uniqueCourses.length} 条课程（已选 ${data.summary?.selectedRows ?? "-"} / 总行 ${data.summary?.totalRows ?? "-"}）。`,
      )
    } catch {
      setImportError("导入失败：网络请求异常。")
    } finally {
      setImporting(false)
    }
  }

  function goToPreviousWeek() {
    setViewWeekNo((prev) => Math.max(1, prev - 1))
  }

  function goToNextWeek() {
    setViewWeekNo((prev) => Math.min(totalWeeks, prev + 1))
  }

  function handleResizePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    event.preventDefault()
    resizePointerClientYRef.current = event.clientY
    resizeStateRef.current = {
      startPageY: event.clientY + window.scrollY,
      startHeight: normalizedScheduleHeight,
    }
    setIsResizingSchedule(true)
  }

  function moveCourse(courseId: string, nextWeekday: number, nextSlot: number) {
    setCourses((prev) =>
      prev.map((course) => {
        if (course.id !== courseId) return course
        const span = Math.min(Math.max(course.span, 1), SLOTS.length)
        const maxStartSlot = SLOTS.length - span + 1
        return {
          ...course,
          weekday: Math.min(Math.max(nextWeekday, 1), 7),
          slot: Math.min(Math.max(nextSlot, 1), maxStartSlot),
        }
      }),
    )
  }

  function getCourseSpan(courseId: string): number {
    const course = courses.find((item) => item.id === courseId)
    if (!course) return 1
    return Math.min(Math.max(course.span, 1), SLOTS.length)
  }

  function getCellFromClientPoint(clientX: number, clientY: number): { weekday: number; slot: number } | null {
    const gridEl = scheduleGridRef.current
    if (!gridEl) return null
    if (visibleDayCount <= 0) return null

    const rect = gridEl.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return null
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
      return null
    }

    const x = clientX - rect.left
    const y = clientY - rect.top
    const colIndex = Math.min(
      Math.max(Math.floor((x / rect.width) * visibleDayCount), 0),
      visibleDayCount - 1,
    )
    const weekday = visibleWeekdays[colIndex]
    if (!weekday) return null
    const yUnits = Math.min(Math.max((y / rect.height) * SLOT_GRID_TOTAL_UNITS, 0), SLOT_GRID_TOTAL_UNITS)
    const slot = getSlotFromYAxisUnit(yUnits)
    return { weekday, slot }
  }

  function handleGridDragOver(e: React.DragEvent<HTMLDivElement>) {
    if (!draggingCourseId) return
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    const cell = getCellFromClientPoint(e.clientX, e.clientY)
    if (!cell) return

    const span = getCourseSpan(draggingCourseId)
    const maxStartSlot = SLOTS.length - span + 1
    const slot = Math.min(Math.max(cell.slot, 1), maxStartSlot)
    setDragOverCell({ weekday: cell.weekday, slot, span })
  }

  function handleGridDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    if (!draggingCourseId) return

    const cell = getCellFromClientPoint(e.clientX, e.clientY)
    if (cell) {
      const span = getCourseSpan(draggingCourseId)
      const maxStartSlot = SLOTS.length - span + 1
      const slot = Math.min(Math.max(cell.slot, 1), maxStartSlot)
      moveCourse(draggingCourseId, cell.weekday, slot)
    }

    setDragOverCell(null)
    setDraggingCourseId(null)
  }

  function handleCourseDragStart(e: React.DragEvent<HTMLDivElement>, courseId: string) {
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", courseId)
    setDraggingCourseId(courseId)
  }

  function handleCourseDragEnd() {
    setDragOverCell(null)
    setDraggingCourseId(null)
  }

  const visibleCourses = useMemo<VisibleCourse[]>(() => {
    return courses
      .filter(
        (c) =>
          (c.weekType === "all" || c.weekType === viewedWeekType) &&
          visibleWeekdays.includes(c.weekday),
      )
      .map((c) => {
        const startSlot = Math.min(Math.max(c.slot, 1), SLOTS.length)
        const maxSpan = SLOTS.length - startSlot + 1
        const clampedSpan = Math.min(Math.max(c.span, 1), maxSpan)
        return {
          ...c,
          slot: startSlot,
          span: clampedSpan,
          endSlot: startSlot + clampedSpan - 1,
        }
      })
      .sort((a, b) => a.slot - b.slot)
  }, [courses, viewedWeekType, visibleWeekdays])

  const coursesByDayAndStartSlot = useMemo(() => {
    const map = new Map<string, VisibleCourse[]>()
    for (const course of visibleCourses) {
      const key = `${course.weekday}-${course.slot}`
      const group = map.get(key)
      if (group) {
        group.push(course)
      } else {
        map.set(key, [course])
      }
    }
    return map
  }, [visibleCourses])

  const today = new Date().getDay()
  const todayWeekday = today === 0 ? 7 : today
  const currentSlotIndex = isViewingCurrentWeek ? getCurrentSlotIndex() : null
  const visibleTodayColumn = isViewingCurrentWeek
    ? (weekdayToColumn.get(todayWeekday) ?? null)
    : null

  const weekTypeBadgeLabel: Record<WeekType, string | null> = {
    all: null,
    odd: t.daily.schedule.oddWeek,
    even: t.daily.schedule.evenWeek,
  }
  const weekDateLabels = useMemo(
    () => getWeekDates(semester.startDate, viewWeekNo).map(formatMonthDay),
    [semester.startDate, viewWeekNo],
  )

  const courseBlocks = useMemo(() => {
    return Array.from(coursesByDayAndStartSlot.entries())
      .map(([key, startCourses]) => {
        const [weekday, slot] = key.split("-").map(Number)
        const maxSpan = SLOTS.length - slot + 1
        const span = Math.min(Math.max(...startCourses.map((course) => course.span)), maxSpan)
        return { weekday, slot, span, courses: startCourses }
      })
      .sort((a, b) => a.slot - b.slot || a.weekday - b.weekday)
  }, [coursesByDayAndStartSlot])

  const fontScale = {
    day: "0.95rem",
    slotLabel: "0.96rem",
    slotTime: "0.8rem",
    courseTitle: "0.92rem",
    courseMeta: "0.82rem",
    badge: "0.72rem",
  } as const
  const fontScaleMultiplier = Math.min(Math.max(normalizedScheduleHeight / DEFAULT_SCHEDULE_HEIGHT, 0.88), 1.22)
  const scaledFontSize = (baseSize: string) => `calc(${baseSize} * ${fontScaleMultiplier})`

  // 鈹€鈹€ Render 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-medium">{t.daily.schedule.title}</CardTitle>
            <span className="text-sm text-muted-foreground">{weekLabel}</span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label={t.common.previous}
              onClick={goToPreviousWeek}
              disabled={viewWeekNo <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Select value={String(viewWeekNo)} onValueChange={(value) => setViewWeekNo(Number(value))}>
              <SelectTrigger className="h-8 w-[6.75rem] px-2 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {weekOptions.map((week) => (
                  <SelectItem key={week} value={String(week)}>
                    {formatWeekNoLabel(t.daily.schedule.weekLabel, week)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label={t.common.next}
              onClick={goToNextWeek}
              disabled={viewWeekNo >= totalWeeks}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            {/* Import from PKU elective portal */}
            <Dialog open={importOpen} onOpenChange={setImportOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  aria-controls={importDialogId}
                >
                  <Download className="h-4 w-4" />
                  <span className="sr-only">导入课表</span>
                </Button>
              </DialogTrigger>
              <DialogContent id={importDialogId} className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>自动导入北大课表</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label>route</Label>
                      <Input
                        value={importConfig.routeCookie}
                        onChange={(e) =>
                          setImportConfig((prev) => ({ ...prev, routeCookie: e.target.value }))
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>JSESSIONID</Label>
                      <Input
                        value={importConfig.jsessionId}
                        onChange={(e) =>
                          setImportConfig((prev) => ({ ...prev, jsessionId: e.target.value }))
                        }
                      />
                    </div>
                  </div>

                  {importError && (
                    <p className="text-sm text-destructive">{importError}</p>
                  )}
                  {importSummary && !importError && (
                    <p className="text-sm text-muted-foreground">{importSummary}</p>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setImportOpen(false)}>
                    {t.common.cancel}
                  </Button>
                  <Button onClick={importScheduleFromPku} disabled={importing}>
                    {importing ? (
                      <>
                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        导入中
                      </>
                    ) : (
                      "自动导入北大课表并保存"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Semester config */}
            <Dialog open={cfgOpen} onOpenChange={(o) => { setCfgOpen(o); if (o) setCfgDraft(semester) }}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  aria-controls={semesterConfigDialogId}
                >
                  <Settings2 className="h-4 w-4" />
                  <span className="sr-only">{t.daily.schedule.semesterConfig}</span>
                </Button>
              </DialogTrigger>
              <DialogContent id={semesterConfigDialogId}>
                <DialogHeader>
                  <DialogTitle>{t.daily.schedule.semesterConfig}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>{t.daily.schedule.semesterStart}</Label>
                    <DatePicker
                      value={cfgDraft.startDate}
                      onChange={(v) => setCfgDraft((p) => ({ ...p, startDate: v }))}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t.daily.schedule.semesterStartHint}
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <Label>{t.daily.schedule.totalWeeks}</Label>
                    <Input
                      type="number"
                      min={1}
                      max={30}
                      value={cfgDraft.totalWeeks}
                      onChange={(e) =>
                        setCfgDraft((p) => ({ ...p, totalWeeks: Number(e.target.value) }))
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>{t.daily.schedule.weekday}</Label>
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between rounded-md border px-3 py-2">
                        <span className="text-sm">{t.daily.schedule.weekdays[5]}</span>
                        <Switch
                          checked={showSaturday}
                          onCheckedChange={(checked) =>
                            setWeekendVisibility((prev) => ({ ...prev, showSaturday: checked }))
                          }
                          aria-label={t.daily.schedule.toggleSaturday}
                        />
                      </div>
                      <div className="flex items-center justify-between rounded-md border px-3 py-2">
                        <span className="text-sm">{t.daily.schedule.weekdays[6]}</span>
                        <Switch
                          checked={showSunday}
                          onCheckedChange={(checked) =>
                            setWeekendVisibility((prev) => ({ ...prev, showSunday: checked }))
                          }
                          aria-label={t.daily.schedule.toggleSunday}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCfgOpen(false)}>
                    {t.common.cancel}
                  </Button>
                  <Button onClick={saveSemesterConfig}>{t.common.save}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Add course */}
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  aria-controls={addCourseDialogId}
                >
                  <Plus className="h-4 w-4" />
                  <span className="sr-only">{t.daily.schedule.addCourse}</span>
                </Button>
              </DialogTrigger>
              <DialogContent id={addCourseDialogId}>
                <DialogHeader>
                  <DialogTitle>{t.daily.schedule.addCourse}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>{t.daily.schedule.courseName}</Label>
                    <Input
                      value={newCourse.name}
                      onChange={(e) => setNewCourse((p) => ({ ...p, name: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>{t.daily.schedule.classroom}</Label>
                    <Input
                      value={newCourse.classroom}
                      onChange={(e) => setNewCourse((p) => ({ ...p, classroom: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label>{t.daily.schedule.startSlot}</Label>
                      <Select
                        value={String(newCourse.slot)}
                        onValueChange={(v) => setNewCourse((p) => ({ ...p, slot: Number(v) }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SLOTS.map((s, i) => (
                            <SelectItem key={i + 1} value={String(i + 1)}>
                              {t.daily.schedule.slotLabel} {i + 1} ({s.time})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>{t.daily.schedule.span}</Label>
                      <Select
                        value={String(newCourse.span)}
                        onValueChange={(v) => setNewCourse((p) => ({ ...p, span: Number(v) }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4].map((n) => (
                            <SelectItem key={n} value={String(n)}>
                              {n} {t.daily.schedule.slots}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label>{t.daily.schedule.weekday}</Label>
                      <Select
                        value={String(newCourse.weekday)}
                        onValueChange={(v) => setNewCourse((p) => ({ ...p, weekday: Number(v) }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {t.daily.schedule.weekdays.map((day, i) => (
                            <SelectItem key={i + 1} value={String(i + 1)}>
                              {day}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>{t.daily.schedule.weekType}</Label>
                      <Select
                        value={newCourse.weekType}
                        onValueChange={(v) =>
                          setNewCourse((p) => ({ ...p, weekType: v as WeekType }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t.daily.schedule.allWeeks}</SelectItem>
                          <SelectItem value="odd">{t.daily.schedule.oddWeek}</SelectItem>
                          <SelectItem value="even">{t.daily.schedule.evenWeek}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddOpen(false)}>
                    {t.common.cancel}
                  </Button>
                  <Button onClick={handleAddCourse}>{t.common.add}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="border-t">
          <div
            className="grid w-full"
            style={{
              height: `${normalizedScheduleHeight}px`,
              gridTemplateColumns: `minmax(0, 1fr) minmax(0, ${visibleDayCount}fr)`,
              gridTemplateRows: `0.56fr minmax(0, ${SLOT_GRID_TOTAL_UNITS}fr)`,
            }}
          >
            <div />

            <div
              className="relative grid"
              style={{ gridTemplateColumns: `repeat(${visibleDayCount}, minmax(0, 1fr))` }}
            >
              {visibleTodayColumn !== null && (
                <div
                  className="pointer-events-none absolute inset-y-0 rounded-lg bg-muted/10"
                  style={{
                    left: `${((visibleTodayColumn - 1) / visibleDayCount) * 100}%`,
                    width: `${100 / visibleDayCount}%`,
                  }}
                />
              )}
              {visibleWeekdays.map((weekday) => {
                const i = weekday - 1
                const dayLabel = t.daily.schedule.weekdays[i]
                const isToday = isViewingCurrentWeek && weekday === todayWeekday
                return (
                  <div
                    key={`weekday-${weekday}`}
                    className={`z-10 flex flex-col items-center justify-center leading-tight ${
                      isToday ? "text-foreground" : "text-muted-foreground"
                    }`}
                    style={{ fontSize: scaledFontSize(fontScale.day) }}
                  >
                    <span className="text-[0.82em] font-medium opacity-95">{weekDateLabels[i]}</span>
                    <span className="hidden sm:inline">{dayLabel}</span>
                    <span className="sm:hidden">{t.daily.schedule.weekdaysShort[i]}</span>
                  </div>
                )
              })}
            </div>

            <div
              className="grid"
              style={{ gridTemplateRows: SLOT_GRID_TEMPLATE_ROWS }}
            >
              {SLOTS.map((slot, slotIdx) => {
                const slotIndex = slotIdx + 1
                const isCurrent = isViewingCurrentWeek && isCurrentSlot(slotIndex)

                return (
                  <div
                    key={`slot-row-${slotIndex}`}
                    className="z-10 flex flex-col items-center justify-center gap-1 px-0.5"
                    style={{ gridRow: `${getGridRowStartFromSlot(slotIndex)} / span 1` }}
                  >
                    <span
                      className={`font-bold leading-none ${
                        isCurrent ? "text-foreground" : "text-muted-foreground"
                      }`}
                      style={{ fontSize: scaledFontSize(fontScale.slotLabel) }}
                    >
                      {slot.label}
                    </span>
                    <span
                      className="leading-tight text-muted-foreground whitespace-nowrap"
                      style={{ fontSize: scaledFontSize(fontScale.slotTime) }}
                    >
                      {slot.time}
                    </span>
                  </div>
                )
              })}
            </div>

            <div
              ref={scheduleGridRef}
              className="relative grid"
              style={{
                gridTemplateColumns: `repeat(${visibleDayCount}, minmax(0, 1fr))`,
                gridTemplateRows: SLOT_GRID_TEMPLATE_ROWS,
              }}
              onDragOver={handleGridDragOver}
              onDrop={handleGridDrop}
            >
              {dragOverCell && (
                <div
                  className="pointer-events-none z-30 rounded-md bg-primary/15 ring-1 ring-primary/35"
                  style={{
                    gridColumn: weekdayToColumn.get(dragOverCell.weekday) ?? 1,
                    gridRow: `${getGridRowStartFromSlot(dragOverCell.slot)} / span ${getGridRowSpanFromSlotRange(dragOverCell.slot, dragOverCell.span)}`,
                  }}
                />
              )}

              {visibleTodayColumn !== null && (
                <div
                  className="pointer-events-none rounded-lg bg-muted/10"
                  style={{
                    gridColumn: visibleTodayColumn,
                    gridRow: `1 / span ${SLOT_GRID_ROW_COUNT}`,
                  }}
                />
              )}

              {courseBlocks.map((block) => {
                const blockColumn = weekdayToColumn.get(block.weekday)
                if (!blockColumn) return null
                const isCurrentInBlock =
                  block.weekday === todayWeekday &&
                  currentSlotIndex !== null &&
                  currentSlotIndex >= block.slot &&
                  currentSlotIndex <= block.slot + block.span - 1

                return (
                  <div
                    key={`course-block-${block.weekday}-${block.slot}`}
                    className="z-20 p-0.5"
                    style={{
                      gridColumn: blockColumn,
                      gridRow: `${getGridRowStartFromSlot(block.slot)} / span ${getGridRowSpanFromSlotRange(block.slot, block.span)}`,
                    }}
                  >
                    <div
                      className={`h-full w-full rounded-xl border px-1 py-0.5 flex flex-col justify-center gap-0.5 ${
                        isCurrentInBlock
                          ? "border-foreground/40 bg-foreground/5"
                          : "border-border bg-background"
                      }`}
                    >
                      {block.courses.map((course) => (
                        <div
                          key={course.id}
                            className={`group relative h-full flex flex-col items-center justify-center gap-0 text-center overflow-hidden ${
                            draggingCourseId === course.id ? "opacity-60" : ""
                          }`}
                          style={{ cursor: draggingCourseId === course.id ? "grabbing" : "grab" }}
                          draggable
                          onDragStart={(e) => handleCourseDragStart(e, course.id)}
                          onDragEnd={handleCourseDragEnd}
                        >
                          <button
                            className="absolute right-0.5 top-0.5 hidden group-hover:flex h-4 w-4 items-center justify-center rounded opacity-50 hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteCourse(course.id)
                            }}
                            aria-label="delete"
                          >
                            <Trash2 className="h-3 w-3 md:h-3.5 md:w-3.5" />
                          </button>
                          <p
                            className="font-semibold leading-tight line-clamp-2 w-full"
                            style={{ fontSize: scaledFontSize(fontScale.courseTitle) }}
                          >
                            {course.name}
                          </p>
                          {course.classroom && (
                            <p
                              className="text-muted-foreground leading-tight truncate flex items-center justify-center gap-0.5 w-full"
                              style={{ fontSize: scaledFontSize(fontScale.courseMeta) }}
                            >
                              <MapPin className="h-2.5 w-2.5 md:h-3 md:w-3 shrink-0" />
                              {course.classroom}
                            </p>
                          )}
                          {course.weekType !== "all" && (
                            <Badge
                              variant="outline"
                              className="h-auto px-1 py-0.5 border-muted-foreground/30 leading-none"
                              style={{ fontSize: scaledFontSize(fontScale.badge) }}
                            >
                              {weekTypeBadgeLabel[course.weekType]}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="px-2 pb-2">
            <div
              role="separator"
              aria-label="调整课表高度"
              aria-orientation="horizontal"
              className="group flex h-4 cursor-ns-resize touch-none select-none items-center justify-center"
              onPointerDown={handleResizePointerDown}
            >
              <div
                className={`h-1.5 w-14 rounded-full transition-colors ${
                  isResizingSchedule ? "bg-primary/60" : "bg-muted group-hover:bg-muted-foreground/35"
                }`}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
