export type KosovoCity =
  | "Mitrovica"
  | "Prishtina"
  | "Peja"
  | "Prizren"
  | "Gjakova"
  | "Ferizaj"
  | "Gjilan"
  | "Vushtrri"
  | "Podujeva"
  | "Suhareka";

export type WeatherForecast = {
  city: KosovoCity;
  date: string;
  maxTemperature: number;
  minTemperature: number;
  precipitationProbability: number;
  precipitationSum: number;
  weatherCode: number;
  weatherCondition: string;
  windSpeedMax: number;
};

export const kosovoCityCoordinates: Record<KosovoCity, { latitude: number; longitude: number }> = {
  Mitrovica: { latitude: 42.8914, longitude: 20.866 },
  Prishtina: { latitude: 42.6629, longitude: 21.1655 },
  Peja: { latitude: 42.6591, longitude: 20.2883 },
  Prizren: { latitude: 42.2139, longitude: 20.7397 },
  Gjakova: { latitude: 42.3803, longitude: 20.4308 },
  Ferizaj: { latitude: 42.3706, longitude: 21.1553 },
  Gjilan: { latitude: 42.4635, longitude: 21.4699 },
  Vushtrri: { latitude: 42.8231, longitude: 20.9675 },
  Podujeva: { latitude: 42.91, longitude: 21.1931 },
  Suhareka: { latitude: 42.3586, longitude: 20.825 },
};

export function isKosovoCity(value: string): value is KosovoCity {
  return value in kosovoCityCoordinates;
}

export function getWeatherCondition(code: number) {
  if (code === 0) return "Sunny";
  if ([1, 2, 3].includes(code)) return "Partly cloudy";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";

  return "Weather unavailable";
}
