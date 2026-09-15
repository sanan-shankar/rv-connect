/* ------------------------------------------------------------------ *
 *  /lab/valley: the site knows where it is.
 *
 *  Reads the weather over the school (server, cached), the cities members
 *  live in (for the day/night map) and who is looking (for the seal's
 *  bird). Admin only through the lab layout; writes nothing.
 * ------------------------------------------------------------------ */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchValleyWeather, requestTime, weatherPhrase } from "./_weather";
import { ValleyRoom } from "./_room";
import type { CityDot } from "./_terminator";

export const dynamic = "force-dynamic";

async function memberCities(): Promise<CityDot[]> {
  const rows = await prisma.userPlace.findMany({
    where: { lat: { not: null }, lng: { not: null } },
    select: { city: true, lat: true, lng: true },
  });
  const seen = new Map<string, CityDot>();
  for (const r of rows) {
    const key = r.city.trim().toLowerCase();
    if (!seen.has(key) && r.lat != null && r.lng != null) seen.set(key, { city: r.city, lat: r.lat, lng: r.lng });
  }
  return Array.from(seen.values());
}

export default async function ValleyPage() {
  const [session, weather, cities] = await Promise.all([auth(), fetchValleyWeather(), memberCities()]);
  return (
    <ValleyRoom
      weather={weather}
      phrase={weather ? weatherPhrase(weather) : null}
      cities={cities}
      serverNow={requestTime()}
      me={{ id: session?.user?.id ?? "valley", name: session?.user?.name ?? "" }}
    />
  );
}
