"use client"

import { PageHeader } from "@/components/page-header"
import { WeatherCard } from "@/components/daily/weather-card"
import { RemindersCard } from "@/components/daily/reminders-card"
import { useLocale } from "@/lib/i18n"

export default function DailyDashboardPage() {
  const { t } = useLocale()

  return (
    <>
      <PageHeader title={t.daily.dashboard.title} />
      <div className="flex-1 p-4 md:p-6">
        <div className="grid gap-4 md:grid-cols-2 md:gap-6">
          <WeatherCard />
          <RemindersCard />
        </div>
      </div>
    </>
  )
}
