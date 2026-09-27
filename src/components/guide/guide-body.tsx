"use client";

/* ------------------------------------------------------------------ *
 *  <GuideBody> — the lazy half of the guide sheet: the overlay and the
 *  six chapters behind it.
 *
 *  It exists to be a chunk boundary. <GuideLayer> is mounted once in the
 *  (main) layout and renders null until somebody presses a page title,
 *  but a static import ships the module however the branch goes, so the
 *  overlay and all six chapters were in the first load of every member
 *  route for a sheet most visits never open. <GuideDoor> prefetches this
 *  module on pointer-enter and on focus, and the Feed's tour fetches it
 *  before it starts, so the sheet's entrance is never waiting on it.
 *
 *  Opened from a title, a chapter ends with the next one: an outline
 *  "Next: Directory" that swaps the chapter inside the same sheet. "Go to
 *  the Feed" is gone (owner, 2026-09-27: "I don't know if you need a go to
 *  feed. Because you could just swipe down or click the x. [...] maybe we
 *  need, like, a secondary CTA to just go into the next session of the
 *  guide"). The last chapter in the chain has none.
 *
 *  In the first-run tour (docs/spec/guide.md 5.2) Next moves to a footer
 *  with the step dots, the way the setup wizard shows its steps, and the
 *  tour says what it is before the first chapter and how to find it again
 *  after the last. That opening is the answer to his "this is not the
 *  feed. This is the guide": the sheet says so before anything else.
 * ------------------------------------------------------------------ */

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StepDots } from "@/components/common/step-dots";
import { findGuideArea, nextGuideArea } from "@/lib/guide-areas";
import { openGuide } from "@/lib/guide-open";
import { CHAPTERS } from "./chapters";
import { GuideLink, P, Section } from "./guide-kit";
import { GuideOverlay } from "./guide-overlay";
import { DoorHint } from "./tap";

export function GuideBody({
  slug,
  title,
  chain,
  tour,
}: {
  slug: string;
  title: string;
  chain: string[];
  tour: boolean;
}) {
  const Chapter = CHAPTERS[slug];
  if (!Chapter) return null;
  const next = nextGuideArea(slug, chain);
  const at = chain.indexOf(slug);

  return (
    <GuideOverlay
      slug={slug}
      title={title}
      footer={
        tour
          ? (close) => (
              <>
                <StepDots
                  count={chain.length}
                  current={at}
                  onPick={(i) => openGuide(chain[i])}
                  labelFor={(i) => `Back to ${findGuideArea(chain[i])?.short ?? "the start"}`}
                />
                {next ? (
                  <Button className="ml-auto" onClick={() => openGuide(next.slug)}>
                    Next: {next.short}
                    <ArrowRight aria-hidden="true" />
                  </Button>
                ) : (
                  <Button className="ml-auto" onClick={close}>
                    Done
                  </Button>
                )}
              </>
            )
          : undefined
      }
    >
      {tour && at === 0 && (
        <div className="mb-10">
          <P>
            This is a short guide to the site, with a page for each part of it. It opens by
            itself just this once; after that, <DoorHint /> to see that page&rsquo;s guide again.
          </P>
        </div>
      )}
      <Chapter />
      {tour && !next && (
        <Section title="Finding this again">
          <P>
            To see any of this again, <DoorHint />. If you have a question the guide does not
            answer, or anything else to tell us, write to us from{" "}
            <GuideLink href="/messages">Reach out</GuideLink>.
          </P>
        </Section>
      )}
      {!tour && next && (
        <div className="mt-10">
          <Button variant="outline" onClick={() => openGuide(next.slug)}>
            Next: {next.short}
            <ArrowRight aria-hidden="true" />
          </Button>
        </div>
      )}
    </GuideOverlay>
  );
}
