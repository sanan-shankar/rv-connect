"use client";

import { useState } from "react";
import { LocationPicker, type PlaceSelection } from "@/components/common/location-picker";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Dev harness for <LocationPicker> -- demonstrates both `mode="single"` and
 * `mode="multi"` against the live GeoNames search endpoint, with a raw JSON
 * dump of the controlled state so behaviour (placeId, lat/lng, the
 * free-text fallback) is visible while testing, not just the rendered chips.
 *
 * Try: "madan" (Madanapalle), "nellore", "northfield" (several US states),
 * "bengal" / "bangalore" (altNames match on Bengaluru), or gibberish to
 * trigger the "use it as typed" fallback.
 */
export default function LocationPickerPreviewPage() {
  const [single, setSingle] = useState<PlaceSelection | null>(null);
  const [multi, setMulti] = useState<PlaceSelection[]>([]);

  return (
    <main className="min-h-screen bg-background px-6 py-16">
      <div className="mx-auto flex max-w-2xl flex-col gap-10">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold tracking-[0.12em] text-sky uppercase">
            Component preview
          </span>
          <h1 className="text-3xl font-medium tracking-tight text-foreground">Location picker</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Gazetteer-backed search over 234,934 GeoNames places, with disambiguation for
            homonyms and a free-text fallback for anything not in the list.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Single</CardTitle>
            <CardDescription>Returns one selection. The input shows the chosen label.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <LocationPicker mode="single" value={single} onChange={setSingle} />
            <pre className="overflow-x-auto rounded-[10px] bg-mist p-3 text-xs text-foreground/80">
              {JSON.stringify(single, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Multi</CardTitle>
            <CardDescription>
              An ordered, unlimited, removable chip list -- a person&apos;s cities.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <LocationPicker mode="multi" value={multi} onChange={setMulti} />
            <pre className="overflow-x-auto rounded-[10px] bg-mist p-3 text-xs text-foreground/80">
              {JSON.stringify(multi, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
