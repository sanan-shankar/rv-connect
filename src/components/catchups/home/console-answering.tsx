"use client";

/* ------------------------------------------------------------------ *
 *  <ConsoleAnswering> - the left console while a Round is answering
 *  (spec 3.3): "N of M have shared" + a countdown ring on
 *  answersCloseAt, a big "Answer now" pill, the frozen question list
 *  (read-only - no content is shown for anyone until published), and
 *  a live who-has-answered avatar strip.
 * ------------------------------------------------------------------ */

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { FadeRise } from "@/components/common/motion";
import { MemberStrip } from "./member-strip";
import { ProgressRing } from "./progress-ring";
import type { CatchupHomeData, HomeEditionView } from "./types";

export function ConsoleAnswering({
  data,
  edition,
}: {
  data: CatchupHomeData;
  edition: HomeEditionView;
}) {
  const answeredIds = new Set(edition.answeredAuthorIds);

  return (
    <div className="space-y-5">
      <FadeRise>
        <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-cinnamon">
            Round {edition.number} &middot; Answering
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-5">
            <ProgressRing
              ratio={edition.ringRatio}
              label={`${edition.answeredCount} of ${data.memberCount} have shared`}
              sublabel={edition.statusLabel}
              tone="cinnamon"
            />
            <Link href={`/catchups/${data.catchupId}/answer`}>
              <Button variant="primary" size="lg">
                Answer now
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="mt-5 border-t border-border pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Who has answered
            </p>
            <MemberStrip members={data.members} highlightIds={answeredIds} className="mt-2.5" max={16} />
          </div>
        </div>
      </FadeRise>

      <FadeRise delay={0.05}>
        <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            This Round&apos;s questions
          </p>
          <div className="mt-3 space-y-2">
            {edition.prompts.map((p) => (
              <div
                key={p.id}
                className="flex items-start gap-2.5 rounded-[var(--radius-md)] border border-border/70 bg-background/40 p-3"
              >
                {p.author ? (
                  <BirdAvatar user={p.author} size={28} />
                ) : (
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                    ?
                  </span>
                )}
                <div className="min-w-0">
                  <p className="text-sm leading-snug text-foreground">{p.text}</p>
                  {p.author && (
                    <p className="mt-1 text-[11px] font-medium text-muted-foreground">
                      asked by {p.isOwn ? "you" : p.author.name}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </FadeRise>
    </div>
  );
}
