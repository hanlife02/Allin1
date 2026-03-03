"use client"

import { Cloud, CloudRain, Droplets, Sun, Thermometer, Wind } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useLocale } from "@/lib/i18n"

const mockWeather = {
  city: "Beijing",
  cityZh: "北京",
  temp: 22,
  feelsLike: 20,
  high: 26,
  low: 16,
  humidity: 45,
  wind: 12,
  condition: "partlyCloudy" as const,
  forecast: [
    { day: 0, high: 26, low: 16, condition: "partlyCloudy" as const },
    { day: 1, high: 28, low: 18, condition: "sunny" as const },
    { day: 2, high: 24, low: 15, condition: "cloudy" as const },
    { day: 3, high: 20, low: 13, condition: "rainy" as const },
    { day: 4, high: 22, low: 14, condition: "sunny" as const },
  ],
}

const conditionIcons: Record<string, typeof Sun> = {
  sunny: Sun,
  cloudy: Cloud,
  rainy: CloudRain,
  partlyCloudy: Cloud,
  overcast: Cloud,
  snowy: Cloud,
}

const dayLabelsZh = ["今天", "明天", "后天", "大后天", "第五天"]
const dayLabelsEn = ["Today", "Tmrw", "Day 3", "Day 4", "Day 5"]

export function WeatherCard() {
  const { t, locale } = useLocale()
  const ConditionIcon = conditionIcons[mockWeather.condition] || Cloud
  const conditionKey = mockWeather.condition as keyof typeof t.daily.weather
  const conditionText = t.daily.weather[conditionKey] || mockWeather.condition

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">{t.daily.weather.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ConditionIcon className="h-10 w-10 text-muted-foreground" strokeWidth={1.5} />
            <div>
              <div className="text-3xl font-semibold tracking-tight">{mockWeather.temp}°C</div>
              <div className="text-xs text-muted-foreground">
                {locale === "zh" ? mockWeather.cityZh : mockWeather.city} · {conditionText}
              </div>
            </div>
          </div>
          <div className="text-right text-xs text-muted-foreground space-y-1">
            <div className="flex items-center justify-end gap-1">
              <Thermometer className="h-3 w-3" />
              {t.daily.weather.feelsLike} {mockWeather.feelsLike}°
            </div>
            <div className="flex items-center justify-end gap-1">
              <Droplets className="h-3 w-3" />
              {t.daily.weather.humidity} {mockWeather.humidity}%
            </div>
            <div className="flex items-center justify-end gap-1">
              <Wind className="h-3 w-3" />
              {t.daily.weather.wind} {mockWeather.wind}km/h
            </div>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-2 border-t pt-3">
          {mockWeather.forecast.map((day, i) => {
            const Icon = conditionIcons[day.condition] || Cloud
            const dayLabels = locale === "zh" ? dayLabelsZh : dayLabelsEn
            return (
              <div key={i} className="flex flex-col items-center gap-1 text-center">
                <span className="text-[11px] text-muted-foreground">{dayLabels[i]}</span>
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
