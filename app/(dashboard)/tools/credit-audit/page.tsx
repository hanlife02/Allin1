"use client"

import { PageHeader } from "@/components/page-header"
import { CreditAuditCard } from "@/components/tools/credit-audit-card"
import { useLocale } from "@/lib/i18n"

export default function CreditAuditPage() {
  const { t } = useLocale()

  return (
    <>
      <PageHeader title={t.tools.creditAudit.title} />
      <div className="flex-1 p-4 md:p-6">
        <CreditAuditCard />
      </div>
    </>
  )
}
