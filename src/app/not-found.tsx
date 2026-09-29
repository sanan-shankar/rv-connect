"use client";

import Link from "@/components/common/link";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { useSoloHoopoe } from "@/components/mascot/moments/one-hoopoe-guard";

/* THIS FILE IS IN EVERY ROUTE'S CLIENT GRAPH. Next includes the root
 * not-found boundary in each route's client bundle, which is correct and
 * unavoidable for the BOUNDARY -- but a boundary only owes anyone the copy
 * block. Until 2026-09-05 the 404's entire flight director lived here too:
 * the token kit, the rig metrics, the smoothstep, the idle loop and the
 * pointer handler, ~6 KB raw riding the first load of all 51 routes for a
 * page almost nobody reaches. It is in not-found-stage.tsx now.
 *
 * A 404 is an apology screen, so the bird arriving a beat late is invisible;
 * this is the one page where that is true. Do NOT copy this to login, signup
 * or the landing -- all three show the bird at first paint by design
 * (mascot.md). The SIDEBAR was named here too until 2026-09-05, and that was
 * wrong: its bird cannot appear for ninety seconds and never appears below
 * 768px, so it takes the same deferral, and now has it.
 *
 * `solo` gates the import, not just the render: `notFound()` thrown from a
 * nested (main) route keeps that layout and its resident sidebar hoopoe
 * mounted underneath, and in that case the stage is never fetched. */
const NotFoundStage = dynamic(
  () => import("@/components/mascot/moments/not-found-stage"),
  { ssr: false }
);

export default function NotFound() {
  const solo = useSoloHoopoe();

  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center bg-background px-6 text-center">
      <h1 className="font-heading text-[clamp(4.25rem,13vw,6.5rem)] font-bold leading-[0.85] tracking-[-0.03em] text-leaf">
        404
      </h1>
      <h2 className="mt-[var(--space-s)] font-heading text-2xl font-bold tracking-[-0.01em] text-foreground">
        Page not found
      </h2>
      <p className="mt-[var(--space-xs)] leading-[1.7] text-muted-foreground sm:whitespace-nowrap">
        Looks like you wandered off the path. This page doesn&apos;t exist.
      </p>
      <Link href="/" className="mt-[var(--space-l)] inline-block">
        <Button variant="primary">Back to home</Button>
      </Link>

      {solo && <NotFoundStage />}
    </main>
  );
}
