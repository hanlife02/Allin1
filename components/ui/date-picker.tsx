"use client"

import { useState } from "react"
import { CalendarIcon } from "lucide-react"
import { format, parse, isValid } from "date-fns"
import { zhCN, enUS } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useLocale } from "@/lib/i18n"
import { cn } from "@/lib/utils"

interface DatePickerProps {
  /** ISO date string yyyy-MM-dd */
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function DatePicker({ value, onChange, placeholder, className }: DatePickerProps) {
  const { locale } = useLocale()
  const [open, setOpen] = useState(false)

  const dateFnsLocale = locale === "zh" ? zhCN : enUS

  const selected: Date | undefined = value
    ? (() => {
        const d = parse(value, "yyyy-MM-dd", new Date())
        return isValid(d) ? d : undefined
      })()
    : undefined

  function handleSelect(day: Date | undefined) {
    if (day) {
      onChange(format(day, "yyyy-MM-dd"))
    } else {
      onChange("")
    }
    setOpen(false)
  }

  const displayValue = selected
    ? format(selected, locale === "zh" ? "yyyy年MM月dd日" : "MMM d, yyyy", { locale: dateFnsLocale })
    : placeholder ?? (locale === "zh" ? "选择日期" : "Pick a date")

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !selected && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          <span>{displayValue}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          locale={dateFnsLocale}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
