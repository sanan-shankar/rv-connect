"use client";

/* ------------------------------------------------------------------ *
 *  Bare render target for the settings room's iframes.
 *
 *  No lab chrome, nothing but the take itself on the app's own
 *  background. It exists because a take has to be judged in a real
 *  window: the house panel and the city picker both read the viewport,
 *  and a CSS-narrowed column lies to them. An iframe carries its own
 *  window, so a 390px one is a genuine phone.
 *
 *  Not meant to be browsed on its own. /lab/settings is the room.
 * ------------------------------------------------------------------ */

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { TakeProfile } from "../_take-profile";
import { BLANK } from "../_data";

function Demo() {
  const params = useSearchParams();
  const initial = params.get("state") === "blank" ? BLANK : undefined;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <TakeProfile initial={initial} />
    </div>
  );
}

export default function SettingsDemoPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-background" />}>
      <Demo />
    </Suspense>
  );
}
