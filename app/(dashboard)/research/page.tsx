"use client"

import { PageHeader } from "@/components/page-header"
import { LiteratureIndexCard } from "@/components/research/literature-index-card"
import { AiSearchCard } from "@/components/research/ai-search-card"
import { AiSummaryCard } from "@/components/research/ai-summary-card"
import { useLocale } from "@/lib/i18n"

export default function ResearchPage() {
  const { t } = useLocale()

  return (
    <>
      <PageHeader title={t.research.title} />
      <div className="flex-1 p-4 md:p-5 lg:p-6">
        <div className="grid gap-4 md:grid-cols-2 md:gap-5 lg:gap-6">
          <div className="md:col-span-2">
            <LiteratureIndexCard />
          </div>
          <AiSearchCard />
          <AiSummaryCard />
        </div>
      </div>
    </>
  )
}
