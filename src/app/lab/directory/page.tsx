import type { Metadata } from "next";
import DirectoryRoom, { type Density } from "./_room";
// STRESS and SCALES come from _data (a plain module), NOT from _chrome
// ("use client"): a client module imported into a server component yields a
// reference proxy, and calling .some() on it threw at request time.
import { SCALES, STRESS, type StressKey } from "./_data";

export const metadata: Metadata = {
  title: "The directory, reconsidered",
};

const DENSITIES: Density[] = ["shipped", "compact", "row", "ruled"];

/**
 * Server shell. Its only job is to read the room's three deep-link knobs off
 * the request, so the first server render and the first client render agree
 * and the client component never has to touch `window`.
 *
 * Every value is validated against the list it belongs to rather than cast,
 * so `?n=99999` or a hand-edited `?stress=` falls back to the default instead
 * of rendering an undefined scale.
 */
export default async function DirectoryRoomPage({
  searchParams,
}: {
  searchParams: Promise<{ n?: string; stress?: string; density?: string }>;
}) {
  const q = await searchParams;

  const n = Number(q.n);
  const initialScale = SCALES.some((s) => s.n === n) ? n : 120;
  const initialStress = STRESS.some((s) => s.k === q.stress) ? (q.stress as StressKey) : "two";
  const initialDensity = DENSITIES.includes(q.density as Density) ? (q.density as Density) : "row";

  return (
    <DirectoryRoom
      initialScale={initialScale}
      initialStress={initialStress}
      initialDensity={initialDensity}
    />
  );
}
