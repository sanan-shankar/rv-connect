"use client";

/* ------------------------------------------------------------------ *
 *  <CatchupCardMenu> - the two things a member can do about their OWN
 *  copy of a Catch-up, from the list (bug audit B-063).
 *
 *  Both are personal by construction: the state is a column on
 *  `CatchupPref`, unique on (catchupId, userId), so nothing here can
 *  move a card on anyone else's screen. The owner was offered the
 *  Keeper-only variant that would hide the Catch-up for everybody and
 *  declined it (2026-08-21): no member action may destroy something
 *  another member relies on.
 *
 *  Archive asks nothing, because it is instantly reversible and one
 *  section down the same page. Leave asks, because it is not: you are
 *  out of the Catch-up the moment you confirm, and only a fresh
 *  invitation brings you back.
 *
 *  The second verb was DELETE until build phase 5, and it opened a
 *  thirty-day bin whose last night removed you from the group. It is
 *  one word of his (N18): "defaults, except deleting becomes leaving."
 *  What you already published stays where it is either way.
 * ------------------------------------------------------------------ */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, Loader2, LogOut, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { callAction } from "@/lib/call-action";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MENU_TRIGGER_HIT } from "@/components/ui/menu-material";
import { leaveCatchup, setCatchupArchived } from "@/app/(main)/catchups/actions";

export function CatchupCardMenu({
  catchupId,
  groupName,
  canLeave,
}: {
  catchupId: string;
  groupName: string;
  /**
   * False for whoever started this Catch-up, and false on a batch Catch-up.
   * The action refuses both anyway (a founder who left would be a Keeper that
   * every Keeper-scoped action calls a stranger; a batch is your year, and the
   * nightly membership heal would put you straight back), and this page's
   * house rule is that an action refused server-side is not shown as a way to
   * be told no. Archive still is: tidying a list is not the same as leaving,
   * and on a batch Catch-up it is the only exit there is.
   */
  canLeave: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  /* router.refresh(), not local state: whether a card is on the list or on
     the Archived shelf is the server's answer, computed from the same pref row
     the action just wrote. Mirroring that decision on the client would be a
     second copy of the rule, free to disagree with the first. */

  function archive() {
    start(async () => {
      const result = await callAction(() => setCatchupArchived(catchupId, true));
      if (result && "error" in result) {
        toast.error(result.error);
        return;
      }
      // The undo is the point: archiving is a tidying gesture, and the
      // "Archived" section it lands in is below the fold on a long list.
      toast.success(`${groupName} was archived.`, {
        action: {
          label: "Undo",
          onClick: () => {
            start(async () => {
              await callAction(() => setCatchupArchived(catchupId, false));
              router.refresh();
            });
          },
        },
      });
      router.refresh();
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Options for ${groupName}`}
          disabled={pending}
          // pointer-events-auto: its row is pointer-events-none so that the
          // card's stretched anchor keeps every click that is not this button.
          // p-2.5, not the p-1.5 the roster dialog's identical trigger uses:
          // that one sits in a list of 28px rows, this one sits beside a 36px
          // pill on a phone, where a 28px square is a small thing to hit. The
          // design system's rule for a target that has to grow is to grow the
          // PADDING, which also lands it on the pill's own height.
          className={`${MENU_TRIGGER_HIT} state-layer pointer-events-auto shrink-0 rounded-full p-2.5 text-muted-foreground transition-colors duration-150 hover:text-foreground active:scale-95 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring`}
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <MoreHorizontal className="size-4" aria-hidden />
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={archive}>
            <Archive className="mr-2 size-4" aria-hidden />
            Archive
          </DropdownMenuItem>
          {canLeave && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setConfirming(true)} variant="destructive">
                <LogOut className="mr-2 size-4" aria-hidden />
                Leave
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={`Leave ${groupName}?`}
        description={
          <>
            You come out of this Catch-up now, and it stops sending you anything. Anything you have
            already shared stays in the Editions it was published in, and nobody else&apos;s list
            changes. Coming back needs a fresh invitation.
          </>
        }
        actionLabel="Leave"
        onConfirm={async () => {
          const result = await leaveCatchup(catchupId);
          if (result && "error" in result) return result;
          router.refresh();
          return;
        }}
      />
    </>
  );
}
