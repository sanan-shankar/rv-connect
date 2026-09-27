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
import { findGuideArea, nextGuideArea, WELCOME } from "@/lib/guide-areas";
import { openGuide } from "@/lib/guide-open";
import { CHAPTERS } from "./chapters";
import { GuideLink, P, Section } from "./guide-kit";
import { GuideCover } from "./guide-cover";
import { GuideOverlay } from "./guide-overlay";
import { GUIDE_PHOTOS } from "./guide-photos";
import { DoorHint } from "./tap";

export function GuideBody({
  slug,
  title,
  chain,
  tour,
  isAdmin,
}: {
  slug: string;
  title: string;
  chain: string[];
  tour: boolean;
  isAdmin: boolean;
}) {
  /* On the tour's welcome page the first chapter is laid out beneath the
     cover, so Next only has to lift the cover away (guide-cover.tsx). */
  const welcome = slug === WELCOME.slug;
  const shown = welcome ? chain[1] : slug;
  const Chapter = CHAPTERS[shown];
  if (!Chapter) return null;
  const shownTitle = welcome ? (findGuideArea(shown)?.title ?? title) : title;
  const next = nextGuideArea(shown, chain);
  const at = chain.indexOf(shown);

  return (
    <GuideOverlay
      slug={shown}
      title={shownTitle}
      photo={GUIDE_PHOTOS[shown]}
      nextPhoto={next ? GUIDE_PHOTOS[next.slug] : undefined}
      cover={
        welcome
          ? (close) => (
              <GuideCover
                photo={GUIDE_PHOTOS[WELCOME.slug]}
                title={title}
                steps={chain.length}
                nextShort={findGuideArea(shown)?.short ?? ""}
                onNext={() => openGuide(shown)}
                close={close}
              />
            )
          : undefined
      }
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
      <Chapter bare />
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
      {!tour && isAdmin && (
        /* Owner, 2026-09-27: "there should be a way for me as admin to
           trigger [...] the guide pop up [...] I went through it once [and]
           can't go through it again". A full load of the Feed rather than a
           client hop, so it rises exactly as it does for a new member.
           Only the tour is replayed; his own "seen" stamp is left alone. */
        <p className="mt-10 text-sm text-muted-foreground">
          Only admins see this:{" "}
          <a
            href="/feed?tour=replay"
            className="rounded-sm font-medium text-leaf underline decoration-leaf/40 underline-offset-[3px] outline-none transition-colors duration-150 hover:decoration-leaf active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
          >
            play the first-run tour again
          </a>
          .
        </p>
      )}
    </GuideOverlay>
  );
}
