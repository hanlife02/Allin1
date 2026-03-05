"use client"

import { Bell, CalendarClock, BookMarked, Activity } from "lucide-react"
import { useLocale } from "@/lib/i18n"
import { useLocalStorage } from "@/hooks/use-local-storage"

export function DashboardOverview() {
  const { t } = useLocale()
  const [reminders] = useLocalStorage<unknown[]>("allin1_reminders", [])
  const [deadlines] = useLocalStorage<unknown[]>("allin1_deadlines", [])
  const [literature] = useLocalStorage<unknown[]>("allin1_literature", [])
  const [monitors] = useLocalStorage<unknown[]>("allin1_monitors", [])

  const stats = [
    {
      label: t.settings.dashboard.totalReminders,
      value: reminders.length,
      icon: Bell,
    },
    {
      label: t.settings.dashboard.pendingDeadlines,
      value: deadlines.length,
      icon: CalendarClock,
    },
    {
      label: t.settings.dashboard.totalLiterature,
      value: literature.length,
      icon: BookMarked,
    },
    {
      label: t.settings.dashboard.monitorTargets,
      value: monitors.length,
      icon: Activity,
    },
  ]

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium">{t.settings.dashboard.title}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center gap-3 rounded-md border p-3">
            <stat.icon className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-xl font-semibold">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
