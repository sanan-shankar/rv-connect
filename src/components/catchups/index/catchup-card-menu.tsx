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
 *  section down the same page. Delete asks, because a bin that quietly
 *  takes you out of the group in thirty days is not what "delete"
 *  usually promises, and the dialog is where that gets said.
 * ------------------------------------------------------------------ */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, Loader2, MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { callAction } from "@/lib/call-action";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RECENTLY_DELETED_DAYS } from "@/lib/catchup-shelf";
import { setCatchupArchived, setCatchupDeleted } from "@/app/(main)/catchups/actions";

export function CatchupCardMenu({
  catchupId,
  groupName,
  canDelete,
}: {
  catchupId: string;
  groupName: string;
  /**
   * False for whoever started this Catch-up. The action refuses them anyway
   * (the sweep would strip the founder's membership row and leave a Catch-up
   * whose Keeper cannot open it), and this page's house rule is that an action
   * refused server-side is not shown as a way to be told no. Archive still is:
   * tidying a list is not the same as leaving.
   */
  canDelete: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  /* router.refresh(), not local state: which of the three sections a card
     belongs in is the server's answer, computed from the same pref row the
     action just wrote. Mirroring that decision on the client would be a second
     copy of the rule, free to disagree with the first. */

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
          className="state-layer pointer-events-auto shrink-0 rounded-full p-2.5 text-muted-foreground transition-colors duration-150 hover:text-foreground active:scale-95 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
          {canDelete && (
            <DropdownMenuItem onClick={() => setConfirming(true)} variant="destructive">
              <Trash2 className="mr-2 size-4" aria-hidden />
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={`Delete ${groupName}?`}
        description={
          <>
            This removes it from your Catch-ups and stops its notifications to you. Nobody else&apos;s
            list changes, and anything you have already shared stays in the Rounds it was published
            in. You can put it back for {RECENTLY_DELETED_DAYS} days; after that you are out of this
            Catch-up for good.
          </>
        }
        actionLabel="Delete"
        onConfirm={async () => {
          const result = await setCatchupDeleted(catchupId, true);
          if (result && "error" in result) return result;
          router.refresh();
          return;
        }}
      />
    </>
  );
}
