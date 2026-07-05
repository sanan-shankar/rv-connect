"use client";

/* ------------------------------------------------------------------ *
 *  Profile page concepts — five directions for the profile redesign,
 *  reviewed side by side against one realistic mock alumnus (see
 *  ./_data.ts). This file is the harness only: the sticky top bar and
 *  the tab-to-variant wiring. Each concept's actual layout lives in its
 *  own ./_variant-<key>.tsx and gets a `{ profile }` prop; building a
 *  concept never requires touching this file.
 *
 *  Deep links for screenshot agents: append ?v=<key> to load a concept
 *  directly, e.g.
 *    http://localhost:3000/preview/delight/profiles?v=field-guide
 *  Valid keys: letterhead | field-guide | editorial | valley-terrain | dossier.
 *  Omitting ?v=, or passing an unknown key, falls back to the first tab
 *  (letterhead). Clicking a tab in the browser rewrites ?v= to match, so
 *  the address bar always reflects what's on screen and can be copied
 *  straight into `node scripts/qa/screenshot.mjs <url> <label>`.
 * ------------------------------------------------------------------ */

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PeaksMark } from "@/components/layout/peaks-mark";
import { SpringPress } from "@/components/common/motion";
import { PROFILE } from "./_data";
import LetterheadVariant from "./_variant-letterhead";
import FieldGuideVariant from "./_variant-field-guide";
import EditorialVariant from "./_variant-editorial";
import ValleyTerrainVariant from "./_variant-valley-terrain";
import DossierVariant from "./_variant-dossier";

const CONCEPTS = [
  { key: "letterhead", label: "Letterhead", Component: LetterheadVariant },
  { key: "field-guide", label: "Field guide", Component: FieldGuideVariant },
  { key: "editorial", label: "Editorial", Component: EditorialVariant },
  { key: "valley-terrain", label: "Valley terrain", Component: ValleyTerrainVariant },
  { key: "dossier", label: "Dossier", Component: DossierVariant },
] as const;

type ConceptKey = (typeof CONCEPTS)[number]["key"];

function isConceptKey(value: string | null): value is ConceptKey {
  return !!value && CONCEPTS.some((c) => c.key === value);
}

function ProfileConceptsHarness() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requested = searchParams.get("v");
  const active: ConceptKey = isConceptKey(requested) ? requested : CONCEPTS[0].key;
  const Active = CONCEPTS.find((c) => c.key === active)!.Component;

  function selectConcept(key: ConceptKey) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("v", key);
    router.replace(`/preview/delight/profiles?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="glass sticky top-0 z-[var(--z-elevated)] flex flex-wrap items-center gap-4 border-b border-border px-6 py-3">
        <Link
          href="/preview/delight"
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-[12.5px] font-semibold text-muted-foreground transition-transform duration-150 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-px hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:translate-y-0 active:scale-[0.97]"
        >
          <PeaksMark size={16} />
          Delight
        </Link>

        <nav className="flex flex-1 flex-wrap items-center gap-2" aria-label="Profile concept">
          {CONCEPTS.map((c) => {
            const isActive = c.key === active;
            return (
              <SpringPress
                key={c.key}
                as="button"
                onClick={() => selectConcept(c.key)}
                aria-pressed={isActive}
                className={`rounded-full border px-4 py-1.5 text-[13px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
                  isActive
                    ? "border-transparent bg-canopy text-white shadow-[0_5px_13px_-12px_var(--color-canopy)]"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {c.label}
              </SpringPress>
            );
          })}
        </nav>
      </header>

      <main>
        <Active profile={PROFILE} />
      </main>
    </div>
  );
}

export default function ProfileConceptsPage() {
  // useSearchParams needs a Suspense boundary (Next.js app-router requirement
  // for client components) — see node_modules/next/dist/docs/01-app/03-api-
  // reference/04-functions/use-search-params.md.
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <ProfileConceptsHarness />
    </Suspense>
  );
}
