"use client"

import { useState } from "react"
import { CalendarClock, Plus, Trash2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useLocale } from "@/lib/i18n"
import { useLocalStorage } from "@/hooks/use-local-storage"

interface Deadline {
  id: string
  courseName: string
  assignmentName: string
  dueDate: string
}

const defaultDeadlines: Deadline[] = [
  { id: "1", courseName: "高等数学", assignmentName: "第三章习题", dueDate: "2026-03-03" },
  { id: "2", courseName: "线性代数", assignmentName: "矩阵运算作业", dueDate: "2026-03-05" },
  { id: "3", courseName: "大学物理", assignmentName: "实验报告 #2", dueDate: "2026-03-02" },
  { id: "4", courseName: "数据结构", assignmentName: "链表实现", dueDate: "2026-03-10" },
]

function getDaysLeft(dueDate: string) {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function formatDueDate(dueDate: string) {
  const parsed = new Date(dueDate)
  if (Number.isNaN(parsed.getTime())) return dueDate
  const y = parsed.getFullYear()
  const m = String(parsed.getMonth() + 1).padStart(2, "0")
  const d = String(parsed.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function DeadlinesCard() {
  const { t } = useLocale()
  const [deadlines, setDeadlines] = useLocalStorage<Deadline[]>("allin1_deadlines", defaultDeadlines)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newDeadline, setNewDeadline] = useState<Omit<Deadline, "id">>({
    courseName: "",
    assignmentName: "",
    dueDate: "",
  })

  const sorted = [...deadlines].sort((a, b) => getDaysLeft(a.dueDate) - getDaysLeft(b.dueDate))

  function addDeadline() {
    if (!newDeadline.courseName.trim() || !newDeadline.assignmentName.trim() || !newDeadline.dueDate) return
    setDeadlines((prev) => [...prev, { ...newDeadline, id: Date.now().toString() }])
    setNewDeadline({ courseName: "", assignmentName: "", dueDate: "" })
    setDialogOpen(false)
  }

  function deleteDeadline(id: string) {
    setDeadlines((prev) => prev.filter((d) => d.id !== id))
  }

  function getStatusBadge(daysLeft: number) {
    if (daysLeft < 0)
      return (
        <Badge variant="destructive" className="text-[10px] h-4 px-1.5">
          {t.daily.deadlines.overdue}
        </Badge>
      )
    if (daysLeft === 0)
      return (
        <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-foreground/30">
          {t.daily.deadlines.dueToday}
        </Badge>
      )
    if (daysLeft <= 3)
      return (
        <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
          {t.daily.deadlines.urgent}
        </Badge>
      )
    return null
  }

  function getDaysText(daysLeft: number) {
    if (daysLeft < 0) return `${Math.abs(daysLeft)} ${t.daily.deadlines.daysOverdue}`
    if (daysLeft === 0) return t.daily.deadlines.dueToday
    return `${daysLeft} ${t.daily.deadlines.daysLeft}`
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{t.daily.deadlines.title}</CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Plus className="h-4 w-4" />
                <span className="sr-only">{t.daily.deadlines.addDeadline}</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t.daily.deadlines.addDeadline}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>{t.daily.deadlines.courseName}</Label>
                  <Input
                    value={newDeadline.courseName}
                    onChange={(e) => setNewDeadline((p) => ({ ...p, courseName: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t.daily.deadlines.assignmentName}</Label>
                  <Input
                    value={newDeadline.assignmentName}
                    onChange={(e) => setNewDeadline((p) => ({ ...p, assignmentName: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t.daily.deadlines.dueDate}</Label>
                  <Input
                    type="date"
                    value={newDeadline.dueDate}
                    onChange={(e) => setNewDeadline((p) => ({ ...p, dueDate: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  {t.common.cancel}
                </Button>
                <Button onClick={addDeadline}>{t.common.add}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t.daily.deadlines.noDeadlines}</p>
        ) : (
          <div className="space-y-2">
            {sorted.map((deadline) => {
              const daysLeft = getDaysLeft(deadline.dueDate)
              return (
                <div
                  key={deadline.id}
                  className="group flex items-center gap-3 rounded-md border p-3 transition-colors"
                >
                  <CalendarClock className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{deadline.assignmentName}</span>
                      {getStatusBadge(daysLeft)}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{deadline.courseName}</span>
                      <span className="opacity-60">|</span>
                      <span>
                        {formatDueDate(deadline.dueDate)}
                      </span>
                      <span className="opacity-60">|</span>
                      <span>{getDaysText(daysLeft)}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={() => deleteDeadline(deadline.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
