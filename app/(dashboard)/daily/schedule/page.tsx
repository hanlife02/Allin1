"use client"

import { PageHeader } from "@/components/page-header"
import { ScheduleCard } from "@/components/daily/schedule-card"
import { useLocale } from "@/lib/i18n"

export default function DailySchedulePage() {
  const { t } = useLocale()

  return (
    <>
      <PageHeader title={t.daily.schedule.title} />
      <div className="flex-1 p-4 md:p-6">
        <ScheduleCard />
      </div>
    </>
  )
}
