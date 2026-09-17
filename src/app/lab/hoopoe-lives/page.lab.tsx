"use client";

/* ------------------------------------------------------------------ *
 *  The thank-you after an upload, played on demand.
 *
 *  The real screen (`Finish` from contribute-room.tsx) with five sample
 *  photographs standing in for a real upload, because the only other way
 *  to see it is to add photographs to the live Collection. The pile, the
 *  peck, the resting bird, the tap reactions and the fly-away are all the
 *  shipped code. Only the photographs and the pop-up's glass are stand-ins.
 * ------------------------------------------------------------------ */

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Finish } from "@/components/collection/contribute-room";
import { FlyAwayHoopoe } from "@/components/mascot/moments/fly-away-hoopoe";

const SAMPLES = [
  { src: "/images/collection/c1.webp", width: 900, height: 900 },
  { src: "/images/landing.jpeg", width: 1680, height: 1260 },
  { src: "/images/collection/demo-assembly-wide.webp", width: 760, height: 1140 },
  { src: "/images/collection/c3.webp", width: 900, height: 900 },
  { src: "/images/collection/demo-banyan-arch.webp", width: 760, height: 1140 },
];

export default function HoopoeLives() {
  const [take, setTake] = useState(0);
  const [count, setCount] = useState(5);
  const [flight, setFlight] = useState<{ from: DOMRect; size: number } | null>(null);

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Link href="/lab" className="text-sm text-muted-foreground hover:text-foreground">
        Lab
      </Link>
      <h1 className="mt-3 font-heading text-3xl tracking-[-0.02em]">The thank-you after an upload</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
        What you see after adding photographs to the Collection. They drop into a pile, the bird
        cheers and pecks at them, then keeps pottering about. Tap the bird once, a few times, then
        five times fast. Hover a button and it looks at it. Press the green one and it flies off.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Button variant="outline" className="rounded-full" onClick={() => setTake((t) => t + 1)}>
          Play it again
        </Button>
        {[1, 3, 5].map((n) => (
          <Button
            key={n}
            variant={count === n ? "primary" : "outline"}
            className="rounded-full"
            onClick={() => {
              setCount(n);
              setTake((t) => t + 1);
            }}
          >
            {n === 1 ? "One photograph" : `${n} photographs`}
          </Button>
        ))}
      </div>

      {/* Stand-in glass, the same width the pop-up shrinks to once the
          photographs are filed. */}
      <div className="mt-6 w-full max-w-[512px] rounded-xl border border-border bg-float px-5 pt-3 pb-5 shadow-[0_1px_2px_rgba(30,28,22,0.06),0_24px_48px_-24px_rgba(30,28,22,0.55)]">
        <Finish
          key={take}
          count={count}
          autoApproved
          pile={SAMPLES.slice(0, count)}
          onFlyAway={(from, size) => setFlight({ from, size })}
          onAgain={() => setTake((t) => t + 1)}
        />
      </div>

      {flight && (
        <FlyAwayHoopoe
          from={flight.from}
          size={flight.size}
          onGone={() => {
            setFlight(null);
            // There is no pop-up here to close, so the scene resets instead.
            setTake((t) => t + 1);
          }}
        />
      )}
    </main>
  );
}
