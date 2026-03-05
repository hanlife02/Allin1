"use client"

import { PageHeader } from "@/components/page-header"
import { WeatherCard } from "@/components/daily/weather-card"
import { ScheduleCard } from "@/components/daily/schedule-card"
import { RemindersCard } from "@/components/daily/reminders-card"
import { useLocale } from "@/lib/i18n"

export default function DailyPage() {
  const { t } = useLocale()

  return (
    <>
      <PageHeader title={t.daily.title} />
      <div className="flex-1 p-4 md:p-5 lg:p-6">
        <div className="grid gap-4 md:gap-5 lg:gap-6">
          {/* Top row: weather + reminders side by side */}
          <div className="grid gap-4 md:grid-cols-2 md:gap-5 lg:gap-6">
            <WeatherCard />
            <RemindersCard />
          </div>
          {/* Schedule takes full width */}
          <ScheduleCard />
        </div>
      </div>
    </>
  )
}
