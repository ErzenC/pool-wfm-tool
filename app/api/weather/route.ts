import { NextResponse } from "next/server";
import {
  getWeatherCondition,
  isKosovoCity,
  kosovoCityCoordinates,
  type WeatherForecast,
} from "@/lib/weather";

type OpenMeteoDailyResponse = {
  daily?: {
    time?: string[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: number[];
    precipitation_sum?: number[];
    weather_code?: number[];
    wind_speed_10m_max?: number[];
  };
};

const cache = new Map<string, { expiresAt: number; forecast: WeatherForecast }>();
const cacheTtlMs = 10 * 60 * 1000;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city") ?? "";
  const date = searchParams.get("date") ?? "";

  if (!isKosovoCity(city)) {
    return NextResponse.json({ error: "Unknown Kosovo city." }, { status: 400 });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Date must use YYYY-MM-DD format." }, { status: 400 });
  }

  const cacheKey = `${city}:${date}`;
  const cached = cache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.forecast);
  }

  const coordinates = kosovoCityCoordinates[city];
  const params = new URLSearchParams({
    latitude: coordinates.latitude.toString(),
    longitude: coordinates.longitude.toString(),
    daily: [
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_probability_max",
      "precipitation_sum",
      "weather_code",
      "wind_speed_10m_max",
    ].join(","),
    timezone: "auto",
    start_date: date,
    end_date: date,
  });

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
    next: { revalidate: 600 },
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: "Weather forecast is not available for this date." },
      { status: 502 },
    );
  }

  const data = (await response.json()) as OpenMeteoDailyResponse;
  const time = data.daily?.time ?? [];
  const index = time.findIndex((item) => item === date);

  if (index === -1) {
    return NextResponse.json(
      { error: "Weather forecast is not available for this date." },
      { status: 404 },
    );
  }

  const weatherCode = data.daily?.weather_code?.[index];
  const maxTemperature = data.daily?.temperature_2m_max?.[index];
  const minTemperature = data.daily?.temperature_2m_min?.[index];
  const precipitationProbability = data.daily?.precipitation_probability_max?.[index];
  const precipitationSum = data.daily?.precipitation_sum?.[index];
  const windSpeedMax = data.daily?.wind_speed_10m_max?.[index];

  if (
    weatherCode === undefined ||
    maxTemperature === undefined ||
    minTemperature === undefined ||
    precipitationProbability === undefined ||
    precipitationSum === undefined ||
    windSpeedMax === undefined
  ) {
    return NextResponse.json(
      { error: "Weather forecast is not available for this date." },
      { status: 404 },
    );
  }

  const forecast: WeatherForecast = {
    city,
    date,
    maxTemperature,
    minTemperature,
    precipitationProbability,
    precipitationSum,
    weatherCode,
    weatherCondition: getWeatherCondition(weatherCode),
    windSpeedMax,
  };

  cache.set(cacheKey, { expiresAt: Date.now() + cacheTtlMs, forecast });

  return NextResponse.json(forecast);
}
