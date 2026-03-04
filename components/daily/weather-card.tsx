"use client"

import { useEffect, useMemo, useState } from "react"
import { Cloud, CloudRain, Droplets, Sun, Thermometer, Wind } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useLocale } from "@/lib/i18n"
import { useLocalStorage } from "@/hooks/use-local-storage"

type ConditionKey = "sunny" | "cloudy" | "rainy" | "snowy" | "overcast" | "partlyCloudy"

interface WeatherData {
  city: { name: string; country?: string }
  current: {
    temp: number
    feelsLike: number
    high?: number
    low?: number
    humidity: number
    wind: number
    condition: ConditionKey
  }
  forecast: Array<{
    date?: string
    high: number
    low: number
    condition: ConditionKey
  }>
}

interface UserPreferences {
  username?: string
  email?: string
  defaultCity?: string
}

const conditionIcons: Record<ConditionKey, typeof Sun> = {
  sunny: Sun,
  cloudy: Cloud,
  rainy: CloudRain,
  partlyCloudy: Cloud,
  overcast: Cloud,
  snowy: Cloud,
}

const dayLabelsZh = ["今天", "明天", "后天", "第4天", "第5天"]
const dayLabelsEn = ["Today", "Tmrw", "Day 3", "Day 4", "Day 5"]

const defaultPrefs: UserPreferences = {
  defaultCity: "Beijing",
}

export function WeatherCard() {
  const { t, locale } = useLocale()
  const [prefs] = useLocalStorage<UserPreferences>("allin1_preferences", defaultPrefs)
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const city = (prefs.defaultCity || "Beijing").trim() || "Beijing"

  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false

    async function loadWeather() {
      setIsLoading(true)
      try {
        const query = new URLSearchParams({
          city,
          locale,
        })
        const response = await fetch(`/api/weather?${query.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        })

        if (!response.ok) {
          if (!cancelled) setWeather(null)
          return
        }
        const data = (await response.json()) as WeatherData
        if (!data?.current || !Array.isArray(data.forecast)) {
          if (!cancelled) setWeather(null)
          return
        }
        if (!cancelled) setWeather(data)
      } catch {
        if (!cancelled) setWeather(null)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadWeather()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [city, locale])

  const dayLabels = useMemo(
    () => (locale === "zh" ? dayLabelsZh : dayLabelsEn),
    [locale],
  )

  if (isLoading) {
    return (
      <Card className="gap-3 py-4">
        <CardHeader className="pb-1">
          <CardTitle className="text-sm font-medium">{t.daily.weather.title}</CardTitle>
        </CardHeader>
        <CardContent className="min-h-[160px] pt-0 flex items-center justify-center text-sm text-muted-foreground">
          {t.common.loading}
        </CardContent>
      </Card>
    )
  }

  if (!weather) {
    return (
      <Card className="gap-3 py-4">
        <CardHeader className="pb-1">
          <CardTitle className="text-sm font-medium">{t.daily.weather.title}</CardTitle>
        </CardHeader>
        <CardContent className="min-h-[160px] pt-0 flex items-center justify-center text-sm text-muted-foreground">
          {t.common.noData}
        </CardContent>
      </Card>
    )
  }

  const ConditionIcon = conditionIcons[weather.current.condition] || Cloud
  const conditionKey = weather.current.condition as keyof typeof t.daily.weather
  const conditionText = t.daily.weather[conditionKey] || weather.current.condition

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="pb-1">
        <CardTitle className="text-sm font-medium">{t.daily.weather.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ConditionIcon className="h-10 w-10 text-muted-foreground" strokeWidth={1.5} />
            <div>
              <div className="text-3xl font-semibold tracking-tight">{weather.current.temp}°C</div>
              <div className="text-xs text-muted-foreground">
                {weather.city.name} · {conditionText}
              </div>
            </div>
          </div>
          <div className="text-right text-xs text-muted-foreground space-y-1">
            <div className="flex items-center justify-end gap-1">
              <Thermometer className="h-3 w-3" />
              {t.daily.weather.feelsLike} {weather.current.feelsLike}°
            </div>
            <div className="flex items-center justify-end gap-1">
              <Droplets className="h-3 w-3" />
              {t.daily.weather.humidity} {weather.current.humidity}%
            </div>
            <div className="flex items-center justify-end gap-1">
              <Wind className="h-3 w-3" />
              {t.daily.weather.wind} {weather.current.wind}km/h
            </div>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-2 border-t pt-3">
          {weather.forecast.slice(0, 5).map((day, i) => {
            const Icon = conditionIcons[day.condition] || Cloud
            return (
              <div key={`${day.date ?? "d"}-${i}`} className="flex flex-col items-center gap-1 text-center">
                <span className="text-[11px] text-muted-foreground">{dayLabels[i] || `${i + 1}`}</span>
                <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                <span className="text-[11px]">
                  {day.high}° / {day.low}°
                </span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
