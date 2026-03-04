import { NextRequest, NextResponse } from "next/server"

type ConditionKey = "sunny" | "cloudy" | "rainy" | "snowy" | "overcast" | "partlyCloudy"

interface OpenWeatherCurrent {
  cod: number
  timezone: number
  dt: number
  name: string
  sys?: { country?: string }
  main: {
    temp: number
    feels_like: number
    humidity: number
    temp_min: number
    temp_max: number
  }
  wind?: { speed?: number }
  weather?: Array<{ main?: string; icon?: string }>
  message?: string
}

interface OpenWeatherForecast {
  cod: string
  city?: { timezone?: number }
  list?: Array<{
    dt: number
    main: { temp_min: number; temp_max: number }
    weather?: Array<{ main?: string; icon?: string }>
  }>
  message?: string
}

interface DailyForecast {
  date: string
  high: number
  low: number
  condition: ConditionKey
}

function mapCondition(main?: string, icon?: string): ConditionKey {
  switch ((main ?? "").toLowerCase()) {
    case "clear":
      return "sunny"
    case "rain":
    case "drizzle":
    case "thunderstorm":
      return "rainy"
    case "snow":
      return "snowy"
    case "mist":
    case "smoke":
    case "haze":
    case "dust":
    case "fog":
    case "sand":
    case "ash":
    case "squall":
    case "tornado":
      return "overcast"
    case "clouds":
      if (icon?.startsWith("02")) return "partlyCloudy"
      if (icon?.startsWith("04")) return "overcast"
      return "cloudy"
    default:
      return "cloudy"
  }
}

function toDateKey(unixSeconds: number, timezoneOffset: number): string {
  return new Date((unixSeconds + timezoneOffset) * 1000).toISOString().slice(0, 10)
}

function toLocalHour(unixSeconds: number, timezoneOffset: number): number {
  return new Date((unixSeconds + timezoneOffset) * 1000).getUTCHours()
}

export async function GET(request: NextRequest) {
  const apiKey =
    process.env.OPENWEATHER_API_KEY ||
    process.env.OPENWEATHER_API_TOKEN ||
    process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing OpenWeather API key in env." },
      { status: 500 },
    )
  }

  const city = request.nextUrl.searchParams.get("city")?.trim() || "Beijing"
  const locale = request.nextUrl.searchParams.get("locale") === "zh" ? "zh_cn" : "en"
  const base = "https://api.openweathermap.org/data/2.5"

  try {
    const [currentRes, forecastRes] = await Promise.all([
      fetch(
        `${base}/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric&lang=${locale}`,
        { cache: "no-store" },
      ),
      fetch(
        `${base}/forecast?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric&lang=${locale}`,
        { cache: "no-store" },
      ),
    ])

    const currentJson = (await currentRes.json()) as OpenWeatherCurrent
    const forecastJson = (await forecastRes.json()) as OpenWeatherForecast

    if (!currentRes.ok) {
      return NextResponse.json(
        { error: currentJson.message || "OpenWeather current weather request failed." },
        { status: currentRes.status },
      )
    }

    if (!forecastRes.ok) {
      return NextResponse.json(
        { error: forecastJson.message || "OpenWeather forecast request failed." },
        { status: forecastRes.status },
      )
    }

    const timezoneOffset = currentJson.timezone ?? forecastJson.city?.timezone ?? 0
    const grouped = new Map<
      string,
      {
        low: number
        high: number
        condition: ConditionKey
        score: number
      }
    >()

    for (const item of forecastJson.list ?? []) {
      const dateKey = toDateKey(item.dt, timezoneOffset)
      const localHour = toLocalHour(item.dt, timezoneOffset)
      const score = Math.abs(localHour - 12)
      const condition = mapCondition(item.weather?.[0]?.main, item.weather?.[0]?.icon)
      const existing = grouped.get(dateKey)

      if (!existing) {
        grouped.set(dateKey, {
          low: item.main.temp_min,
          high: item.main.temp_max,
          condition,
          score,
        })
        continue
      }

      existing.low = Math.min(existing.low, item.main.temp_min)
      existing.high = Math.max(existing.high, item.main.temp_max)
      if (score < existing.score) {
        existing.score = score
        existing.condition = condition
      }
    }

    const todayKey = toDateKey(currentJson.dt, timezoneOffset)
    const todayCondition = mapCondition(
      currentJson.weather?.[0]?.main,
      currentJson.weather?.[0]?.icon,
    )
    grouped.set(todayKey, {
      low: currentJson.main.temp_min,
      high: currentJson.main.temp_max,
      condition: todayCondition,
      score: 0,
    })

    const forecast: DailyForecast[] = Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, 5)
      .map(([date, value]) => ({
        date,
        high: Math.round(value.high),
        low: Math.round(value.low),
        condition: value.condition,
      }))

    return NextResponse.json({
      city: {
        name: currentJson.name,
        country: currentJson.sys?.country ?? "",
      },
      current: {
        temp: Math.round(currentJson.main.temp),
        feelsLike: Math.round(currentJson.main.feels_like),
        humidity: currentJson.main.humidity,
        wind: Math.round((currentJson.wind?.speed ?? 0) * 3.6),
        condition: todayCondition,
      },
      forecast,
    })
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch weather from OpenWeather." },
      { status: 502 },
    )
  }
}

