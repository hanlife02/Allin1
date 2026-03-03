"use client"

import { useState, useRef, useEffect } from "react"
import { MapPin, Plus, Trash2, Settings2 } from "lucide-react"
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

// ─── Types ────────────────────────────────────────────────────────────────────

type WeekType = "all" | "odd" | "even"

interface Course {
  id: string
  name: string
  classroom: string
  /** slot index 1–12 */
  slot: number
  /** how many consecutive slots this course occupies */
  span: number
  /** 1=Mon … 7=Sun */
  weekday: number
  weekType: WeekType
}

interface SemesterConfig {
  /** ISO date string of the first Monday of the semester, e.g. "2026-02-23" */
  startDate: string
  /** total weeks in the semester */
  totalWeeks: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SLOTS = [
  { label: "1",  time: "8:00–8:50" },
  { label: "2",  time: "9:00–9:50" },
  { label: "3",  time: "10:10–11:00" },
  { label: "4",  time: "11:10–12:00" },
  { label: "5",  time: "13:00–13:50" },
  { label: "6",  time: "14:00–14:50" },
  { label: "7",  time: "15:10–16:00" },
  { label: "8",  time: "16:10–17:00" },
  { label: "9",  time: "17:10–18:00" },
  { label: "10", time: "18:40–19:30" },
  { label: "11", time: "19:40–20:30" },
  { label: "12", time: "20:40–21:30" },
]

// Start / end minutes for each slot (for "current slot" highlighting)
const SLOT_RANGES = [
  [480, 530],   // 8:00–8:50
  [540, 590],   // 9:00–9:50
  [610, 660],   // 10:10–11:00
  [670, 720],   // 11:10–12:00
  [780, 830],   // 13:00–13:50
  [840, 890],   // 14:00–14:50
  [910, 960],   // 15:10–16:00
  [970, 1020],  // 16:10–17:00
  [1030, 1080], // 17:10–18:00
  [1120, 1170], // 18:40–19:30
  [1180, 1230], // 19:40–20:30
  [1240, 1290], // 20:40–21:30
]

const defaultCourses: Course[] = [
  { id: "1", name: "高等数学",  classroom: "A301", slot: 1, span: 2, weekday: 1, weekType: "all" },
  { id: "2", name: "线性代数",  classroom: "B205", slot: 3, span: 2, weekday: 1, weekType: "odd" },
  { id: "3", name: "大学物理",  classroom: "C102", slot: 5, span: 2, weekday: 2, weekType: "all" },
  { id: "4", name: "英语听说",  classroom: "D401", slot: 1, span: 2, weekday: 3, weekType: "even" },
  { id: "5", name: "数据结构",  classroom: "A205", slot: 3, span: 2, weekday: 4, weekType: "all" },
  { id: "6", name: "操作系统",  classroom: "B301", slot: 5, span: 2, weekday: 5, weekType: "odd" },
]

const defaultSemester: SemesterConfig = {
  startDate: "2026-02-23",
  totalWeeks: 18,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Given a semester start date (Monday) and today's date,
 * returns { weekNo, isOdd } where weekNo is 1-based (0 = before semester).
 */
function getSemesterWeek(startDateStr: string): { weekNo: number; isOdd: boolean } {
  const start = new Date(startDateStr)
  // Normalise to midnight
  start.setHours(0, 0, 0, 0)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const diffDays = Math.floor((now.getTime() - start.getTime()) / 86400000)
  if (diffDays < 0) return { weekNo: 0, isOdd: true }
  const weekNo = Math.floor(diffDays / 7) + 1
  return { weekNo, isOdd: weekNo % 2 === 1 }
}

function isCurrentSlot(slotIndex: number): boolean {
  const now = new Date()
  const cur = now.getHours() * 60 + now.getMinutes()
  const [start, end] = SLOT_RANGES[slotIndex - 1]
  return cur >= start && cur <= end
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ScheduleCard() {
  const { t } = useLocale()

  // ── Responsive square cell size ─────────────────────────────────────────────
  // 8 equal columns: 1 time-label + 7 day cols. cellSize = containerWidth / 8.
  const containerRef = useRef<HTMLDivElement>(null)
  const [cellSize, setCellSize] = useState(64)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => setCellSize(Math.floor(el.clientWidth / 8))
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const [courses, setCourses] = useLocalStorage<Course[]>("allin1_schedule_v4", defaultCourses)
  const [semester, setSemester] = useLocalStorage<SemesterConfig>(
    "allin1_semester",
    defaultSemester,
  )

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

  // Semester config dialog
  const [cfgOpen, setCfgOpen] = useState(false)
  const [cfgDraft, setCfgDraft] = useState<SemesterConfig>(semester)

  // ── Computed week info ──────────────────────────────────────────────────────
  const { weekNo, isOdd } = getSemesterWeek(semester.startDate)
  const currentWeekType: "odd" | "even" = isOdd ? "odd" : "even"
  const inSemester = weekNo >= 1 && weekNo <= semester.totalWeeks

  const weekLabel = inSemester
    ? `${t.daily.schedule.weekLabel} ${weekNo} · ${isOdd ? t.daily.schedule.oddWeek : t.daily.schedule.evenWeek}`
    : weekNo === 0
    ? t.daily.schedule.beforeSemester
    : t.daily.schedule.afterSemester

  // ── Handlers ───────────────────────────────────────────────────────────────
  function handleAddCourse() {
    if (!newCourse.name.trim()) return
    setCourses((prev) => [...prev, { ...newCourse, id: Date.now().toString() }])
    setNewCourse({ name: "", classroom: "", slot: 1, span: 2, weekday: 1, weekType: "all" })
    setAddOpen(false)
  }

  function deleteCourse(id: string) {
    setCourses((prev) => prev.filter((c) => c.id !== id))
  }

  function saveSemesterConfig() {
    setSemester(cfgDraft)
    setCfgOpen(false)
  }

  function coursesForDaySlot(weekday: number, slotIndex: number): Course[] {
    return courses.filter((c) => {
      if (c.weekday !== weekday) return false
      if (c.slot !== slotIndex) return false
      // Show only courses that apply to the current week type
      return c.weekType === "all" || c.weekType === currentWeekType
    })
  }

  const today = new Date().getDay()
  const todayWeekday = today === 0 ? 7 : today

  const weekTypeBadgeLabel: Record<WeekType, string | null> = {
    all: null,
    odd: t.daily.schedule.oddWeek,
    even: t.daily.schedule.evenWeek,
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-medium">{t.daily.schedule.title}</CardTitle>
            <span className="text-xs text-muted-foreground">{weekLabel}</span>
          </div>

          <div className="flex items-center gap-1">
            {/* Semester config */}
            <Dialog open={cfgOpen} onOpenChange={(o) => { setCfgOpen(o); if (o) setCfgDraft(semester) }}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Settings2 className="h-4 w-4" />
                  <span className="sr-only">{t.daily.schedule.semesterConfig}</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
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
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Plus className="h-4 w-4" />
                  <span className="sr-only">{t.daily.schedule.addCourse}</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
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
                  <div className="grid grid-cols-2 gap-4">
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
                              {t.daily.schedule.slotLabel} {i + 1}（{s.time}）
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
                  <div className="grid grid-cols-2 gap-4">
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
        {/*
          Responsive square-cell grid.
          cellSize = floor(containerWidth / 8) — 1 time col + 7 day cols.
          Every cell is exactly cellSize × cellSize px.
          The header row is half a cell tall.
        */}
        <div
          ref={containerRef}
          className="border-t overflow-x-auto"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(8, ${cellSize}px)`,
            gridTemplateRows: `${Math.floor(cellSize / 2)}px repeat(12, ${cellSize}px)`,
          }}
        >
          {/* ── Header row (row 1) ── */}

          {/* top-left corner cell */}
          <div className="border-r border-b" />

          {/* day name cells */}
          {t.daily.schedule.weekdays.map((dayLabel, i) => {
            const weekday = i + 1
            const isToday = weekday === todayWeekday
            return (
              <div
                key={weekday}
                className={`border-r border-b last:border-r-0 flex items-center justify-center text-xs font-medium ${
                  isToday ? "bg-muted/50 text-foreground" : "text-muted-foreground"
                }`}
              >
                <span className="hidden sm:inline">{dayLabel}</span>
                <span className="sm:hidden">{t.daily.schedule.weekdaysShort[i]}</span>
              </div>
            )
          })}

          {/* ── Slot rows (rows 2 – 13) ── */}
          {SLOTS.map((slot, slotIdx) => {
            const slotIndex = slotIdx + 1
            const isCurrent = isCurrentSlot(slotIndex)
            const [startTime, endTime] = slot.time.split("–")

            return (
              <>
                {/* Time-label cell */}
                <div
                  key={`time-${slotIndex}`}
                  className={`border-r border-b flex flex-col items-center justify-center gap-0.5 ${
                    isCurrent ? "bg-muted/50" : ""
                  }`}
                  style={{ height: cellSize, width: cellSize }}
                >
                  <span
                    className={`text-xs font-bold leading-none ${
                      isCurrent ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {slot.label}
                  </span>
                  <span className="text-[10px] leading-tight text-muted-foreground">
                    {startTime}
                  </span>
                  <span className="text-[10px] leading-tight text-muted-foreground">
                    {endTime}
                  </span>
                </div>

                {/* 7 day cells */}
                {Array.from({ length: 7 }, (_, i) => {
                  const weekday = i + 1
                  const isToday = weekday === todayWeekday
                  const cellCourses = coursesForDaySlot(weekday, slotIndex)

                  return (
                    <div
                      key={`cell-${slotIndex}-${weekday}`}
                      className={`border-r border-b last:border-r-0 flex items-center justify-center overflow-hidden ${
                        isToday ? "bg-muted/25" : ""
                      }`}
                      style={{ height: cellSize, width: cellSize }}
                    >
                      {cellCourses.map((course) => (
                        <div
                          key={course.id}
                          className={`group relative rounded px-1 py-1 border flex flex-col items-center justify-center gap-0.5 transition-colors text-center overflow-hidden ${
                            isCurrent && isToday
                              ? "border-foreground/40 bg-foreground/5"
                              : "border-border bg-background"
                          }`}
                          style={{
                            height: cellSize * course.span - 4,
                            width: cellSize - 4,
                          }}
                        >
                          <button
                            className="absolute right-0.5 top-0.5 hidden group-hover:flex h-4 w-4 items-center justify-center rounded opacity-50 hover:opacity-100"
                            onClick={() => deleteCourse(course.id)}
                            aria-label="delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                          <p className="text-xs font-semibold leading-tight line-clamp-2 w-full">
                            {course.name}
                          </p>
                          {course.classroom && (
                            <p className="text-[11px] text-muted-foreground leading-tight truncate flex items-center justify-center gap-0.5 w-full">
                              <MapPin className="h-2.5 w-2.5 shrink-0" />
                              {course.classroom}
                            </p>
                          )}
                          {course.weekType !== "all" && (
                            <Badge
                              variant="outline"
                              className="h-4 px-1 text-[10px] border-muted-foreground/30 leading-none"
                            >
                              {weekTypeBadgeLabel[course.weekType]}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
