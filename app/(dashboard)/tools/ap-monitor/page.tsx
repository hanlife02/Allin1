"use client"

import { PageHeader } from "@/components/page-header"
import { ApiMonitorCard } from "@/components/tools/ap-monitor-card"
import { useLocale } from "@/lib/i18n"

export default function ApiMonitorPage() {
  const { t } = useLocale()

  return (
    <>
      <PageHeader title={t.tools.apMonitor.title} />
      <div className="flex-1 p-4 md:p-6">
        <ApiMonitorCard />
      </div>
    </>
  )
}
