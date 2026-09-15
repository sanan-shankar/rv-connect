import "server-only";
import { VALLEY, type ValleyWeather } from "./_sun";

/* ------------------------------------------------------------------ *
 *  What the sky over the school is doing right now.
 *
 *  Open-Meteo, which needs no key and answers for any coordinate. Fetched
 *  on the server so the browser never talks to a third host (the CSP's
 *  connect-src names hosts by test), and cached for fifteen minutes, which
 *  is how often the feed itself updates. A failure is a null, and the room
 *  says so in one small line rather than inventing a clear day.
 * ------------------------------------------------------------------ */

const URL_ =
  `https://api.open-meteo.com/v1/forecast?latitude=${VALLEY.lat}&longitude=${VALLEY.lon}` +
  `&current=temperature_2m,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m&timezone=Asia%2FKolkata`;

/** The request's own clock, read here rather than in a component body: a page
 *  stamps the moment it was rendered so the client's first frame agrees with
 *  the server's, and the purity lint rightly refuses Date.now() inside render. */
export function requestTime(): number {
  return Date.now();
}

export async function fetchValleyWeather(): Promise<ValleyWeather | null> {
  try {
    const res = await fetch(URL_, { next: { revalidate: 900 } });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      current?: {
        time: string;
        temperature_2m: number;
        precipitation: number;
        weather_code: number;
        cloud_cover: number;
        wind_speed_10m: number;
        wind_direction_10m: number;
      };
    };
    const c = json.current;
    if (!c) return null;
    return {
      temperatureC: c.temperature_2m,
      precipitationMm: c.precipitation,
      cloud: Math.min(1, Math.max(0, c.cloud_cover / 100)),
      windKmh: c.wind_speed_10m,
      windDirDeg: c.wind_direction_10m,
      code: c.weather_code,
      observedAt: c.time,
    };
  } catch {
    return null;
  }
}

/** One plain phrase for the readout, from the WMO code. */
export function weatherPhrase(w: ValleyWeather): string {
  const c = w.code;
  if (c === 0) return "clear";
  if (c <= 2) return "a few clouds";
  if (c === 3) return "overcast";
  if (c <= 48) return "fog";
  if (c <= 57) return "drizzle";
  if (c <= 67) return "rain";
  if (c <= 82) return "showers";
  if (c >= 95) return "a thunderstorm";
  return "cloud";
}
