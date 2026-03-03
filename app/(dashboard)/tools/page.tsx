"use client"

import { PageHeader } from "@/components/page-header"
import { CreditAuditCard } from "@/components/tools/credit-audit-card"
import { ApMonitorCard } from "@/components/tools/ap-monitor-card"
import { useLocale } from "@/lib/i18n"

export default function ToolsPage() {
  const { t } = useLocale()

  return (
    <>
      <PageHeader title={t.tools.title} />
      <div className="flex-1 p-4 md:p-6">
        <div className="grid gap-4 md:grid-cols-2 md:gap-6">
          <CreditAuditCard />
          <ApMonitorCard />
        </div>
      </div>
    </>
  )
}
