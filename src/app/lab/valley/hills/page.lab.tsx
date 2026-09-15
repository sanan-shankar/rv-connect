/* /lab/valley/hills: the ground under the school, lit by this minute's sun. */

import { fetchValleyWeather, requestTime } from "../_weather";
import { HillsRoom } from "./_hills-room";

export const dynamic = "force-dynamic";

export default async function HillsPage() {
  const weather = await fetchValleyWeather();
  return <HillsRoom weather={weather} serverNow={requestTime()} />;
}
