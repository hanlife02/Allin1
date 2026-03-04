"use client"

import { useState, useMemo } from "react"
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

// 鈹€鈹€鈹€ Helpers 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

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

function getCurrentSlotIndex(): number | null {
  const now = new Date()
  const cur = now.getHours() * 60 + now.getMinutes()
  const idx = SLOT_RANGES.findIndex(([start, end]) => cur >= start && cur <= end)
  return idx === -1 ? null : idx + 1
}

// 鈹€鈹€鈹€ Component 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

export function ScheduleCard() {
  const { t } = useLocale()

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
  const semesterConfigDialogId = "daily-schedule-semester-config-dialog"
  const addCourseDialogId = "daily-schedule-add-course-dialog"

  // 鈹€鈹€ Computed week info 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
  const { weekNo, isOdd } = getSemesterWeek(semester.startDate)
  const currentWeekType: "odd" | "even" = isOdd ? "odd" : "even"
  const inSemester = weekNo >= 1 && weekNo <= semester.totalWeeks

  const weekLabel = inSemester
    ? `${t.daily.schedule.weekLabel} ${weekNo} 周 ${isOdd ? t.daily.schedule.oddWeek : t.daily.schedule.evenWeek}`
    : weekNo === 0
    ? t.daily.schedule.beforeSemester
    : t.daily.schedule.afterSemester

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
    setSemester(cfgDraft)
    setCfgOpen(false)
  }

  const visibleCourses = useMemo<VisibleCourse[]>(() => {
    return courses
      .filter((c) => c.weekType === "all" || c.weekType === currentWeekType)
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
  }, [courses, currentWeekType])

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
  const currentSlotIndex = getCurrentSlotIndex()

  const weekTypeBadgeLabel: Record<WeekType, string | null> = {
    all: null,
    odd: t.daily.schedule.oddWeek,
    even: t.daily.schedule.evenWeek,
  }

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
    day: "clamp(0.72rem, 0.35rem + 0.6vw, 1rem)",
    slotLabel: "clamp(0.68rem, 0.3rem + 0.55vw, 0.95rem)",
    slotTime: "clamp(0.58rem, 0.25rem + 0.45vw, 0.8rem)",
    courseTitle: "clamp(0.7rem, 0.35rem + 0.55vw, 1rem)",
    courseMeta: "clamp(0.62rem, 0.3rem + 0.45vw, 0.85rem)",
    badge: "clamp(0.55rem, 0.25rem + 0.35vw, 0.75rem)",
  } as const

  // 鈹€鈹€ Render 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
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
        <div className="border-t">
          <div
            className="grid w-full"
            style={{
              aspectRatio: "8 / 8.5",
              gridTemplateColumns: "minmax(0, 1fr) minmax(0, 7fr)",
              gridTemplateRows: "0.4fr minmax(0, 12fr)",
            }}
          >
            <div />

            <div className="relative grid grid-cols-7">
              <div
                className="pointer-events-none absolute inset-y-0 rounded-lg bg-muted/10"
                style={{
                  left: `${((todayWeekday - 1) / 7) * 100}%`,
                  width: `${100 / 7}%`,
                }}
              />
              {t.daily.schedule.weekdays.map((dayLabel, i) => {
                const weekday = i + 1
                const isToday = weekday === todayWeekday
                return (
                  <div
                    key={`weekday-${weekday}`}
                    className={`z-10 flex items-center justify-center font-medium ${
                      isToday ? "text-foreground" : "text-muted-foreground"
                    }`}
                    style={{ fontSize: fontScale.day }}
                  >
                    <span className="hidden sm:inline">{dayLabel}</span>
                    <span className="sm:hidden">{t.daily.schedule.weekdaysShort[i]}</span>
                  </div>
                )
              })}
            </div>

            <div
              className="grid"
              style={{ gridTemplateRows: "repeat(12, minmax(0, 1fr))" }}
            >
              {SLOTS.map((slot, slotIdx) => {
                const slotIndex = slotIdx + 1
                const isCurrent = isCurrentSlot(slotIndex)
                const timeParts = slot.time.match(/\d{1,2}:\d{2}/g) ?? []
                const startTime = timeParts[0] ?? ""
                const endTime = timeParts[1] ?? ""

                return (
                  <div
                    key={`slot-row-${slotIndex}`}
                    className="z-10 flex flex-col items-center justify-center gap-0 px-0.5"
                  >
                    <span
                      className={`font-bold leading-none ${
                        isCurrent ? "text-foreground" : "text-muted-foreground"
                      }`}
                      style={{ fontSize: fontScale.slotLabel }}
                    >
                      {slot.label}
                    </span>
                    <span
                      className="leading-tight text-muted-foreground whitespace-nowrap"
                      style={{ fontSize: fontScale.slotTime }}
                    >
                      {startTime}
                    </span>
                    <span
                      className="leading-tight text-muted-foreground whitespace-nowrap"
                      style={{ fontSize: fontScale.slotTime }}
                    >
                      {endTime}
                    </span>
                  </div>
                )
              })}
            </div>

            <div
              className="relative grid"
              style={{
                gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                gridTemplateRows: "repeat(12, minmax(0, 1fr))",
              }}
            >
              <div
                className="pointer-events-none rounded-lg bg-muted/10"
                style={{
                  gridColumn: todayWeekday,
                  gridRow: "1 / span 12",
                }}
              />

              {courseBlocks.map((block) => {
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
                      gridColumn: block.weekday,
                      gridRow: `${block.slot} / span ${block.span}`,
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
                           className="group relative h-full flex flex-col items-center justify-center gap-0 text-center overflow-hidden"
                        >
                          <button
                            className="absolute right-0.5 top-0.5 hidden group-hover:flex h-4 w-4 items-center justify-center rounded opacity-50 hover:opacity-100"
                            onClick={() => deleteCourse(course.id)}
                            aria-label="delete"
                          >
                            <Trash2 className="h-3 w-3 md:h-3.5 md:w-3.5" />
                          </button>
                          <p
                            className="font-semibold leading-tight line-clamp-2 w-full"
                            style={{ fontSize: fontScale.courseTitle }}
                          >
                            {course.name}
                          </p>
                          {course.classroom && (
                            <p
                              className="text-muted-foreground leading-tight truncate flex items-center justify-center gap-0.5 w-full"
                              style={{ fontSize: fontScale.courseMeta }}
                            >
                              <MapPin className="h-2.5 w-2.5 md:h-3 md:w-3 shrink-0" />
                              {course.classroom}
                            </p>
                          )}
                          {course.weekType !== "all" && (
                            <Badge
                              variant="outline"
                              className="h-auto px-1 py-0.5 border-muted-foreground/30 leading-none"
                              style={{ fontSize: fontScale.badge }}
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
        </div>
      </CardContent>
    </Card>
  )
}
