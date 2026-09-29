"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "@/components/common/link";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Trash2, Flag, ShieldAlert } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MENU_TRIGGER_HIT } from "@/components/ui/menu-material";
import { callAction } from "@/lib/call-action";
import { adminRemovePost, deletePost } from "@/app/(main)/feed/actions";

/* ------------------------------------------------------------------ *
 *  The reading page's overflow menu (owner, 2026-09-07, campaign Q15:
 *  "add all three" -- Report, Edit and Delete).
 *
 *  A letter is a Post row with kind "letter", so all three server actions
 *  already accepted one and had done since the day letters shipped; the only
 *  thing missing was a way to reach them from /letters/[id]. Nothing new is
 *  written here, and nothing new decides who may act: `deletePost` is the
 *  author or an admin, `editPost` is the author, `reportPost` is anybody
 *  signed in (and refuses in the demo, in its own words).
 *
 *  It is deliberately the SAME object as post-card.tsx's header menu, item
 *  for item, label for label -- the bare "..." trigger with MENU_TRIGGER_HIT,
 *  Edit above a separator above Delete for the author, Report (plus an
 *  admin's Remove) for everybody else. A member who has used the menu on a
 *  post has already learned this one. That is also why it sits on the byline
 *  row rather than in the action row at the foot: on a card the byline is
 *  where the menu lives, and a reading page whose whole point is the measure
 *  should not grow a fourth control next to the heart.
 *
 *  The admin's "Remove letter" MOVED here from the action row inside
 *  letter-engagement.tsx, where it was a bare ShieldAlert labelled "Remove
 *  letter (admin)". That parenthetical is the exact shape DESIGN-SYSTEM.md's
 *  menu-item rule was written to replace ("never a parenthetical role note"),
 *  and leaving it there would have put Remove on this page twice.
 * ------------------------------------------------------------------ */

/* Deferred exactly as post-card defers them, and for the same reason: a
   report form's Select and Textarea, an edit dialog's rich-text surface and
   the moderation dialog are all things that open on a press, so none of them
   belongs in the reading page's first load.
   ConfirmDialog is deferred here where post-card imports it statically, and
   that is not an inconsistency: /feed already carries ui/dialog for four
   other reasons, /letters/[id] carried none of it until this menu existed,
   and Phase B spent real effort taking 132 KB off this exact route. */
const ConfirmDialog = dynamic(
  () => import("@/components/common/confirm-dialog").then((m) => m.ConfirmDialog),
  { ssr: false }
);
const ReportDialog = dynamic(
  () => import("@/components/posts/report-dialog").then((m) => m.ReportDialog),
  { ssr: false }
);
const EditPostDialog = dynamic(
  () => import("@/components/posts/edit-post-dialog").then((m) => m.EditPostDialog),
  { ssr: false }
);
const ModerationDialog = dynamic(
  () => import("@/components/admin/moderation-dialog").then((m) => m.ModerationDialog),
  { ssr: false }
);

export function LetterMenu({
  postId,
  isOwn,
  isDraft,
  viewerIsAdmin = false,
  content,
  title,
}: {
  postId: string;
  /** The signed-in member wrote this letter: Edit and Delete instead of Report. */
  isOwn: boolean;
  /** An unpublished draft, which edits on the whole-page desk rather than in a dialog. */
  isDraft: boolean;
  /** Site admin, so the moderation (soft-hide) row shows on somebody else's letter. */
  viewerIsAdmin?: boolean;
  content: string;
  title: string | null;
}) {
  const router = useRouter();
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showModeration, setShowModeration] = useState(false);
  const [showReport, setShowReport] = useState(false);
  /* post-card's latch, for post-card's reason: a deferred dialog has to STAY
     mounted once opened so its own exit animation has something to play out
     of, but mounting it up front would fetch the chunk for a reader who never
     presses either row. True once, then true forever. */
  const [reportMounted, setReportMounted] = useState(false);
  const [deleteMounted, setDeleteMounted] = useState(false);
  const openReport = () => {
    setReportMounted(true);
    setShowReport(true);
  };
  const openDelete = () => {
    setDeleteMounted(true);
    setShowDelete(true);
  };

  async function handleDelete() {
    const result = await callAction(() => deletePost(postId));
    if (result.error) return result;
    /* There is no letter left to stand on, so the reader goes back to the
       index they arrived from. refresh() after the push because deletePost
       revalidates /feed and not /letters, and the index is server-rendered:
       without it the row for a letter that no longer exists can still be
       served out of the client router cache. */
    router.push("/letters");
    router.refresh();
  }

  async function handleModerationConfirm(note: string) {
    const result = await callAction(() => adminRemovePost(postId, note || undefined));
    if (!result.error) {
      router.push("/letters");
      router.refresh();
    }
    return result;
  }

  return (
    <>
      <DropdownMenu>
        {/* -mr-2 pulls the trigger's padding plus MoreHorizontal's own viewBox
            inset outward so the dots land flush on the reading column's right
            edge, level with the title above them. Same trigger material as
            the feed's card: state-layer rather than an opaque hover token, and
            MENU_TRIGGER_HIT for the 44px thumb target. */}
        <DropdownMenuTrigger
          aria-label="More actions for this letter"
          className={`${MENU_TRIGGER_HIT} state-layer -mr-2 shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-foreground active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        {/* w-auto, because the material's default is `w-(--anchor-width)` and
            the anchor here is a 28px glyph: the panel fell back to its 128px
            floor and broke "Remove letter" over two lines. Sized to its widest
            row instead, with that same floor still under it. (post-card's menu
            carries the same label on the same 128px panel and wraps it too;
            that is the feed's to fix, not this page's.) */}
        <DropdownMenuContent align="end" className="w-auto">
          {isOwn ? (
            <>
              {/* A draft is a letter mid-write, so it opens the whole-page
                  desk; a published letter's quick fix stays in the dialog.
                  Both halves are decisions already written down: the desk
                  route refuses anything but a draft, and edit-post-dialog.tsx
                  carries the owner's "the dialog register is for things that
                  take seconds, never for writing". A link, not a handler, so
                  the desk can be opened in a new tab like any other. */}
              {isDraft ? (
                <DropdownMenuItem render={<Link href={`/letters/${postId}/edit`} />}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => setShowEdit(true)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              )}
              {/* The divider is the warning; the destructive row sits last. */}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={openDelete} variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuItem onClick={openReport}>
                <Flag className="mr-2 h-4 w-4" />
                Report
              </DropdownMenuItem>
              {viewerIsAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setShowModeration(true)}
                    variant="destructive"
                  >
                    <ShieldAlert className="mr-2 h-4 w-4" />
                    Remove letter
                  </DropdownMenuItem>
                </>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {reportMounted && (
        <ReportDialog
          postId={postId}
          itemLabel="letter"
          open={showReport}
          onClose={() => setShowReport(false)}
        />
      )}

      {showEdit && (
        <EditPostDialog
          postId={postId}
          kind="letter"
          initialContent={content}
          initialTitle={title}
          open={showEdit}
          onClose={() => setShowEdit(false)}
          /* This page renders the letter on the server, so the saved words
             arrive by re-rendering it rather than by holding a copy in client
             state the way a feed card has to. editPost already revalidated
             the path; refresh() is what pulls the new tree down. */
          onSaved={() => router.refresh()}
        />
      )}

      {viewerIsAdmin && (
        <ModerationDialog
          open={showModeration}
          onClose={() => setShowModeration(false)}
          itemLabel="letter"
          onConfirm={handleModerationConfirm}
        />
      )}

      {deleteMounted && (
        <ConfirmDialog
          open={showDelete}
          onClose={() => setShowDelete(false)}
          title="Delete letter"
          description="This cannot be undone."
          actionLabel="Delete"
          onConfirm={handleDelete}
        />
      )}
    </>
  );
}
