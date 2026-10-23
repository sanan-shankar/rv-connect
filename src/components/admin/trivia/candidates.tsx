"use client";

import { Check, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { Chip } from "@/components/admin/admin-chip";
import { useAdminAct } from "@/components/admin/use-admin-act";
import { acceptTriviaAnswer, unacceptTriviaAnswer } from "@/app/(main)/admin/trivia/actions";
import { formatTimeAgo, metaLine } from "@/lib/utils";
import type { Candidate } from "@/lib/trivia-report";
import { Typed } from "./parts";

const quoted = (w: string) => `“${w}”`;
const NEAR = {
  spelling: (e: string) => `spelt close to ${quoted(e)}`,
  contains: (e: string) => `has ${quoted(e)} in it`,
  part: (e: string) => `part of ${quoted(e)}`,
};

/* ------------------------------------------------------------------ *
 *  Answers the gate turned away that look like a real alumnus's.
 *
 *  Each row says WHY it is here, in chips, because "accept this?" is a
 *  judgement and the evidence is the whole of it: how many different
 *  people typed it, whether any of them got in on another question anyway
 *  (they knew enough to pass, and believed this), and whether it is a
 *  letter or two from something already accepted. Then one press.
 *
 *  `readOnly` is the lab's: its rows are invented, and a press there would
 *  accept an invented answer at the real gate.
 * ------------------------------------------------------------------ */

export function Candidates({
  items,
  readOnly = false,
  showQuestion = true,
}: {
  items: Candidate[];
  readOnly?: boolean;
  /** Off on a question's own page, where every row is that question. */
  showQuestion?: boolean;
}) {
  const { busy, act } = useAdminAct();

  return (
    <ul className="divide-y divide-border">
      {items.map((c) => {
        const key = `${c.questionId}:${c.norm}`;
        const others = c.variants.slice(1, 4);
        const settled = c.acceptedSince || c.refused;
        return (
          <li key={key} className="flex items-start gap-3 px-3.5 py-3">
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-baseline gap-x-2 text-[15px] leading-snug">
                <Typed className="font-semibold">{c.typed}</Typed>
                {showQuestion && (
                  <span className="text-[12.5px] text-muted-foreground">for {c.label}</span>
                )}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <Chip
                  label={`${c.people} ${c.people === 1 ? "person" : "people"}`}
                  tone={c.people >= 2 ? "info" : "idle"}
                />
                {c.gotInElsewhere > 0 && (
                  <Chip
                    label={`${c.gotInElsewhere} got in on another question`}
                    tone="good"
                  />
                )}
                {c.near && <Chip label={NEAR[c.near.how](c.near.entry)} tone="warn" />}
                {c.correctedTo && (
                  <span className="text-[12px] text-muted-foreground">
                    then got it with <Typed>{c.correctedTo}</Typed>
                  </span>
                )}
                {c.refused && <Chip label="The question's own word, refused by design" tone="idle" />}
                {c.acceptedSince && <Chip label="Accepted since" tone="good" />}
              </div>
              {(others.length > 0 || c.members.length > 0) && (
                <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted-foreground">
                  {c.members.length > 0 && (
                    <span className="flex items-center gap-1.5">
                      <span className="flex -space-x-1.5">
                        {c.members.slice(0, 4).map((m) => (
                          <BirdAvatar key={m.id} user={m} size={20} ring />
                        ))}
                      </span>
                      <span className="text-foreground">
                        {c.members.length === 1
                          ? c.members[0].name
                          : `${c.members[0].name} and ${c.members.length - 1} more`}
                      </span>
                    </span>
                  )}
                  {metaLine(
                    others.length > 0 ? `also typed ${others.map((o) => `“${o}”`).join(", ")}` : null,
                    formatTimeAgo(new Date(c.lastAt)),
                  )}
                </p>
              )}
            </div>
            {!readOnly && !settled && (
              <Button
                size="sm"
                variant="primary"
                className="shrink-0"
                disabled={busy !== null}
                onClick={() =>
                  act(
                    key,
                    () => acceptTriviaAnswer(c.questionId, c.typed),
                    `Accepted. “${c.typed}” now gets in.`,
                  )
                }
              >
                <Check aria-hidden />
                {busy === key ? "Accepting..." : "Accept"}
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** A panel-accepted answer's undo, on a question's own page. */
export function StopAccepting({ id, typed }: { id: string; typed: string }) {
  const { busy, act } = useAdminAct();
  return (
    <Button
      size="xs"
      variant="outline"
      disabled={busy !== null}
      onClick={() => act(id, () => unacceptTriviaAnswer(id), `“${typed}” no longer gets in.`)}
    >
      <Undo2 aria-hidden />
      {busy ? "Undoing..." : "Stop accepting"}
    </Button>
  );
}
