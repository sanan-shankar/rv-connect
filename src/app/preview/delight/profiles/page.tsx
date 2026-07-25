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
 *  Valid keys: letterhead | field-guide | editorial | valley-terrain | dossier
 *  | broadsheet | passport | terrace.
 *  Omitting ?v=, or passing an unknown key, falls back to the first tab
 *  (letterhead). Clicking a tab in the browser rewrites ?v= to match, so
 *  the address bar always reflects what's on screen and can be copied
 *  straight into `node scripts/qa/screenshot.mjs <url> <label>`.
 * ------------------------------------------------------------------ */

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PeaksMark } from "@/components/layout/peaks-mark";
import { Sidebar } from "@/components/layout/sidebar";
import { SpringPress } from "@/components/common/motion";
import { PROFILE } from "./_data";
import LetterheadVariant from "./_variant-letterhead";
import FieldGuideVariant from "./_variant-field-guide";
import EditorialVariant from "./_variant-editorial";
import ValleyTerrainVariant from "./_variant-valley-terrain";
import DossierVariant from "./_variant-dossier";
import BroadsheetVariant from "./_variant-broadsheet";
import PassportVariant from "./_variant-passport";
import TerraceVariant from "./_variant-terrace";

const CONCEPTS = [
  { key: "letterhead", label: "Letterhead", Component: LetterheadVariant },
  { key: "field-guide", label: "Field guide", Component: FieldGuideVariant },
  { key: "editorial", label: "Editorial", Component: EditorialVariant },
  { key: "valley-terrain", label: "Valley terrain", Component: ValleyTerrainVariant },
  { key: "dossier", label: "Dossier", Component: DossierVariant },
  { key: "broadsheet", label: "Broadsheet", Component: BroadsheetVariant },
  { key: "passport", label: "Passport", Component: PassportVariant },
  { key: "terrace", label: "Terrace", Component: TerraceVariant },
] as const;

type ConceptKey = (typeof CONCEPTS)[number]["key"];

/** Stand-in signed-in viewer, purely so the sidebar's footer chip renders. */
const PREVIEW_VIEWER = {
  id: "preview-viewer",
  name: "Sanan Shankar",
  email: "sanan@example.com",
  role: "member",
  avatarColor: null,
  photoUrl: null,
  birdOverride: null,
};

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
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-[12.5px] font-semibold text-muted-foreground transition-colors duration-150 hover:bg-mist hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.97]"
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

      {/* The concepts are judged INSIDE the app, not on a bare white page:
          same flush green sidebar, same faint valley back-layer, same <main>
          gutter and max width as `AppShell`. Without this the previews looked
          nothing like the thing they are proposals for, and every judgement
          about weight and empty space was being made against the wrong
          background (owner: "have the faint tree background that I have in the
          app so I can see how it actually looks, and have the sidebar there to
          make it more realistic"). */}
      <div className="relative min-h-screen bg-background md:flex">
        <div
          aria-hidden
          className="valley-tree pointer-events-none fixed inset-0 z-0 bg-cover bg-center opacity-[0.11]"
          style={{ backgroundImage: "url(/images/landing.jpeg)" }}
        />
        <Sidebar user={PREVIEW_VIEWER} unreadCount={0} />
        <div className="relative z-10 flex min-w-0 flex-1 flex-col pb-16 md:pb-0">
          <main className="mx-auto w-full max-w-[1280px] flex-1 px-5 py-6 sm:px-7 lg:px-10 lg:py-8">
            <Active profile={PROFILE} />
          </main>
        </div>
      </div>
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
