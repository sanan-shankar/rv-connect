import Link from "next/link";
import { BirdAvatar } from "@/components/common/bird-avatar";
import type { HomePromptView } from "./types";

/**
 * One question in a Catch-up's list of them: whose it is, what it asks.
 *
 * Shared by the collecting console (where the Keeper can still curate, hence
 * the `actions` slot) and the answering console (where the list is frozen and
 * passes none). The answering console used to draw its own, identical down to
 * the class names, with a different vocabulary for the same four cases -- so
 * the same question was labelled "asked by you" one week and "You" the next,
 * on the same page, one status apart.
 *
 * This is the collecting console's wording, kept because it says more: it is
 * the only one of the two that tells you whether the question you asked is
 * showing your name. `isOwn` and `showAsker` come down for exactly that
 * purpose (see the anonymity note in types.ts); `author` is already null for
 * anybody else's anonymous question, so there is nothing here to leak.
 */
export function QuestionRow({
  prompt,
  actions,
}: {
  prompt: HomePromptView;
  actions?: React.ReactNode;
}) {
  const askerLabel = prompt.isOwn
    ? prompt.showAsker
      ? "You"
      : "You (anonymous)"
    : prompt.author
      ? prompt.author.name
      : "Someone in the group";

  return (
    <div className="flex items-start justify-between gap-[var(--space-s)] rounded-[var(--radius-md)] border border-border/70 bg-background/40 p-[var(--space-s)]">
      <div className="flex min-w-0 items-start gap-2.5">
        {prompt.author ? (
          <Link
            href={`/profile/${prompt.author.id}`}
            aria-label={prompt.author.name}
            className="shrink-0 rounded-full transition-opacity duration-150 hover:opacity-80 active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <BirdAvatar user={prompt.author} size={28} />
          </Link>
        ) : (
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
            ?
          </span>
        )}
        <div className="min-w-0">
          <p className="text-sm leading-snug text-foreground">{prompt.text}</p>
          <p className="mt-1 text-[11px] font-medium text-muted-foreground">{askerLabel}</p>
        </div>
      </div>
      {actions}
    </div>
  );
}
