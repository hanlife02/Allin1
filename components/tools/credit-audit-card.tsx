"use client"

import { GraduationCap, Check, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useLocale } from "@/lib/i18n"

interface CreditCategory {
  key: string
  total: number
  earned: number
}

const mockCredits: CreditCategory[] = [
  { key: "required", total: 80, earned: 62 },
  { key: "elective", total: 30, earned: 18 },
  { key: "general", total: 20, earned: 16 },
  { key: "practice", total: 10, earned: 6 },
]

export function CreditAuditCard() {
  const { t } = useLocale()

  const totalRequired = mockCredits.reduce((sum, c) => sum + c.total, 0)
  const totalEarned = mockCredits.reduce((sum, c) => sum + c.earned, 0)
  const overallProgress = Math.round((totalEarned / totalRequired) * 100)

  const categoryLabels: Record<string, string> = {
    required: t.tools.creditAudit.required,
    elective: t.tools.creditAudit.elective,
    general: t.tools.creditAudit.general,
    practice: t.tools.creditAudit.practice,
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">{t.tools.creditAudit.title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-semibold">{totalEarned}</span>
            <span className="text-sm text-muted-foreground">
              / {totalRequired} {t.tools.creditAudit.credits}
            </span>
          </div>
          <Progress value={overallProgress} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {t.tools.creditAudit.remainingCredits}: {totalRequired - totalEarned}
          </p>
        </div>

        <div className="space-y-3">
          {mockCredits.map((cat) => {
            const pct = Math.round((cat.earned / cat.total) * 100)
            const fulfilled = cat.earned >= cat.total
            return (
              <div key={cat.key} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{categoryLabels[cat.key]}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {cat.earned}/{cat.total}
                    </span>
                    {fulfilled ? (
                      <Check className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <X className="h-3.5 w-3.5 text-muted-foreground/50" />
                    )}
                  </div>
                </div>
                <Progress value={pct} className="h-1.5" />
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
