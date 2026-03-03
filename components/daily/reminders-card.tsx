"use client"

import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DatePicker } from "@/components/ui/date-picker"
import { useLocale } from "@/lib/i18n"
import { useLocalStorage } from "@/hooks/use-local-storage"

interface Reminder {
  id: string
  content: string
  completed: boolean
  createdAt: string
  dueDate?: string
}

const defaultReminders: Reminder[] = [
  { id: "1", content: "提交物理实验报告", completed: false, createdAt: "2026-03-01", dueDate: "2026-03-05" },
  { id: "2", content: "预约图书馆自习室", completed: true, createdAt: "2026-02-28" },
  { id: "3", content: "回复导师邮件", completed: false, createdAt: "2026-03-01", dueDate: "2026-03-04" },
]

type Filter = "all" | "pending" | "completed"

function getDaysLeft(dueDate: string): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function RemindersCard() {
  const { t } = useLocale()
  const [reminders, setReminders] = useLocalStorage<Reminder[]>("allin1_reminders", defaultReminders)
  const [filter, setFilter] = useState<Filter>("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newContent, setNewContent] = useState("")
  const [newDueDate, setNewDueDate] = useState("")

  const filtered = reminders.filter((r) => {
    if (filter === "pending") return !r.completed
    if (filter === "completed") return r.completed
    return true
  })

  function toggleReminder(id: string) {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, completed: !r.completed } : r))
    )
  }

  function deleteReminder(id: string) {
    setReminders((prev) => prev.filter((r) => r.id !== id))
  }

  function addReminder() {
    if (!newContent.trim()) return
    setReminders((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        content: newContent,
        completed: false,
        createdAt: new Date().toISOString().split("T")[0],
        ...(newDueDate ? { dueDate: newDueDate } : {}),
      },
    ])
    setNewContent("")
    setNewDueDate("")
    setDialogOpen(false)
  }

  const filterButtons: { key: Filter; label: string }[] = [
    { key: "all", label: t.daily.reminders.all },
    { key: "pending", label: t.daily.reminders.pending },
    { key: "completed", label: t.daily.reminders.completed },
  ]

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{t.daily.reminders.title}</CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Plus className="h-4 w-4" />
                <span className="sr-only">{t.daily.reminders.addReminder}</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t.daily.reminders.addReminder}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>{t.daily.reminders.content}</Label>
                  <Input
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addReminder()}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>
                    {t.daily.reminders.dueDate}
                    <span className="ml-1 text-muted-foreground text-xs">({t.common.optional})</span>
                  </Label>
                  <DatePicker value={newDueDate} onChange={setNewDueDate} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  {t.common.cancel}
                </Button>
                <Button onClick={addReminder}>{t.common.add}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-1">
          {filterButtons.map((fb) => (
            <Button
              key={fb.key}
              variant={filter === fb.key ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2.5 text-xs"
              onClick={() => setFilter(fb.key)}
            >
              {fb.label}
            </Button>
          ))}
        </div>
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t.daily.reminders.noReminders}</p>
        ) : (
          <div className="space-y-1">
            {filtered.map((reminder) => (
              <div
                key={reminder.id}
                className="group flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted"
              >
                <Checkbox
                  checked={reminder.completed}
                  onCheckedChange={() => toggleReminder(reminder.id)}
                />
                <div className="flex-1 min-w-0">
                  <span
                    className={`block text-sm ${
                      reminder.completed ? "text-muted-foreground line-through" : ""
                    }`}
                  >
                    {reminder.content}
                  </span>
                  {reminder.dueDate && !reminder.completed && (() => {
                    const d = getDaysLeft(reminder.dueDate)
                    return (
                      <span
                        className={`text-xs ${
                          d < 0
                            ? "text-destructive"
                            : d <= 2
                            ? "text-muted-foreground font-medium"
                            : "text-muted-foreground"
                        }`}
                      >
                        {d < 0
                          ? `${t.daily.reminders.overdue} ${Math.abs(d)} ${t.daily.reminders.days}`
                          : d === 0
                          ? t.daily.reminders.dueToday
                          : `${t.daily.reminders.dueIn} ${d} ${t.daily.reminders.days}`}
                      </span>
                    )
                  })()}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => deleteReminder(reminder.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
