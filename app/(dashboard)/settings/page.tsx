"use client"

import { PageHeader } from "@/components/page-header"
import { DashboardOverview } from "@/components/settings/dashboard-overview"
import { UserManagement } from "@/components/settings/user-management"
import { useLocale } from "@/lib/i18n"

export default function SettingsPage() {
  const { t } = useLocale()

  return (
    <>
      <PageHeader title={t.settings.title} />
      <div className="flex-1 p-4 md:p-6">
        <div className="grid gap-4 md:grid-cols-2 md:gap-6">
          <DashboardOverview />
          <UserManagement />
        </div>
      </div>
    </>
  )
}
