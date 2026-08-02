"use client";

/* ------------------------------------------------------------------ *
 *  Landing page concepts — five full-page directions for the public
 *  landing redesign, reviewed side by side. This file is the harness
 *  only: the sticky top bar and the tab-to-variant wiring. Each
 *  concept's actual layout lives in its own ./_variant-<key>.tsx and
 *  takes no props (unlike the profile concepts, there is no mock
 *  payload to thread through — every variant pulls the same approved
 *  copy + screenshot assets straight from ./_shared); building a
 *  concept never requires touching this file.
 *
 *  Deep links for screenshot agents: append ?v=<key> to load a concept
 *  directly, e.g.
 *    http://localhost:3000/lab/landings?v=noticeboard
 *  Valid keys: postcard | noticeboard | editorial | livingvalley | clarity.
 *  Omitting ?v=, or passing an unknown key, falls back to the first tab
 *  (postcard). Clicking a tab in the browser rewrites ?v= to match, so
 *  the address bar always reflects what's on screen and can be copied
 *  straight into `node scripts/qa/screenshot.mjs <url> <label>`.
 * ------------------------------------------------------------------ */

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PeaksMark } from "@/components/layout/peaks-mark";
import { SpringPress } from "@/components/common/motion";
import PostcardVariant from "./_variant-postcard";
import NoticeboardVariant from "./_variant-noticeboard";
import EditorialVariant from "./_variant-editorial";
import LivingValleyVariant from "./_variant-livingvalley";
import ClarityVariant from "./_variant-clarity";

const CONCEPTS = [
  { key: "postcard", label: "Postcard", Component: PostcardVariant },
  { key: "noticeboard", label: "Notice Board", Component: NoticeboardVariant },
  { key: "editorial", label: "Prospectus", Component: EditorialVariant },
  { key: "livingvalley", label: "Living Valley", Component: LivingValleyVariant },
  { key: "clarity", label: "Clarity", Component: ClarityVariant },
] as const;

type ConceptKey = (typeof CONCEPTS)[number]["key"];

function isConceptKey(value: string | null): value is ConceptKey {
  return !!value && CONCEPTS.some((c) => c.key === value);
}

function LandingConceptsHarness() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requested = searchParams.get("v");
  const active: ConceptKey = isConceptKey(requested) ? requested : CONCEPTS[0].key;
  const Active = CONCEPTS.find((c) => c.key === active)!.Component;

  function selectConcept(key: ConceptKey) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("v", key);
    router.replace(`/lab/landings?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="glass sticky top-0 z-[var(--z-elevated)] flex flex-wrap items-center gap-4 border-b border-border px-6 py-3">
        <Link
          href="/lab"
          className="state-layer inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-[12.5px] font-semibold text-muted-foreground transition-[color,transform] duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.97]"
        >
          <PeaksMark size={16} />
          Lab
        </Link>

        <nav className="flex flex-1 flex-wrap items-center gap-2" aria-label="Landing concept">
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
        <Active />
      </main>
    </div>
  );
}

export default function LandingConceptsPage() {
  // useSearchParams needs a Suspense boundary (Next.js app-router requirement
  // for client components) — see node_modules/next/dist/docs/01-app/03-api-
  // reference/04-functions/use-search-params.md.
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LandingConceptsHarness />
    </Suspense>
  );
}
