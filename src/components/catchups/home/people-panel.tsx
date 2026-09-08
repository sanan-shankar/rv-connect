"use client";

/* ------------------------------------------------------------------ *
 *  <PeoplePanel> - who is in this Catch-up, and everything you do
 *  about it.
 *
 *  Owner, 2026-08-05: "Can't control who's in the catch up once the
 *  question round has started. Might still want to add and remove and
 *  just see who all are part of it while it's going on. Also the ability
 *  to make other people the keeper as well. Have a very pleasant and
 *  lovely way to see everyone involved. Tie that in with the inviting."
 *
 *  So three things that used to be scattered or missing are one surface:
 *  seeing the roster, changing it, and the invite link (which was its own
 *  rail card, `invite-link-card.tsx`, now folded in here).
 *
 *  It sits in the rail at EVERY Edition status, which is the "consistent
 *  thing throughout questions and answers and reading" part: the same
 *  faces in the same place whether the group is asking, answering or
 *  reading. What changes with the phase is one line of truth about them,
 *  never the shape: during answering it says who has written in, and
 *  those faces come forward while the rest sit back.
 *
 *  Nothing here decides permissions. `isKeeper` chooses what to OFFER;
 *  every action re-derives the caller's power from the database.
 * ------------------------------------------------------------------ */

import { useEffect, useState, useSyncExternalStore } from "react";
import { FIELD_FOCUS } from "@/components/ui/field-focus";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  Copy,
  Link2,
  Loader2,
  LogOut,
  MoreHorizontal,
  Plus,
  Search,
  Sprout,
  UserMinus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { callAction } from "@/lib/call-action";
import { m } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MENU_TRIGGER_HIT } from "@/components/ui/menu-material";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { useUserSearch, type SearchedPerson } from "@/components/common/use-user-search";
import { FadeRise, SPRINGS } from "@/components/common/motion";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import {
  addCatchupMembers,
  leaveCatchup,
  removeCatchupMember,
  setCatchupKeeper,
} from "@/app/(main)/catchups/actions";
import type { CatchupHomeData, HomePersonRef } from "./types";

/** Same tile shape as the rest of the Catch-up home: one token, all four sides. */
const TILE = "card-elevated rounded-[var(--radius)] border border-border bg-card p-[var(--space-m)]";

/**
 * The house shape for a person: the create flow's roster pill, bird and all.
 *
 * `w-full`, not the `inline-flex` these started as. Wrapping auto-width pills
 * is the right call in the create sheet, which is wide; in a 320px rail it
 * fails, because one long name ("Manasvini Malik") eats a whole row while two
 * short ones share the next, and the result is a ragged right edge with holes
 * in it (owner, 2026-08-06: "one name per row and uneven whitespace isn't
 * great ... I can't really ship this"). Same pill, same colours, one per row:
 * the edge goes straight, the rhythm goes even, and no name has to truncate to
 * get there.
 */
const PILL =
  "flex w-full items-center gap-2 rounded-full border py-1 pl-1.5 pr-3 text-[13px] font-medium";

/**
 * How many people the rail card shows before it stops and counts the rest.
 *
 * One per row costs about 40px each, so this is the number that keeps the card
 * a card rather than a column that pushes the reminder and deadline controls
 * off the screen. Seven fits most Catch-ups whole; anything bigger ends in a
 * "+N more" row that opens the full list, so nobody is hidden, only deferred.
 */
const PILLS_SHOWN = 7;

export function PeoplePanel({
  data,
  /** Ids of everyone who has written in, during the answering window only. */
  answeredIds,
  onChanged,
}: {
  data: CatchupHomeData;
  answeredIds?: Set<string>;
  onChanged: () => void;
}) {
  const { members, viewer } = data;
  const [open, setOpen] = useState(false);
  /* The leave confirmation lives out here, not in the dialog whose row opens
     it: a confirmation stacked inside the roster dialog left the roster's own
     title peeking out above it, two panels deep on one scrim. Hoisting it lets
     the roster close first, so the question is asked on its own. */
  const [leaving, setLeaving] = useState(false);
  const answering = !!answeredIds;
  const answeredCount = answeredIds ? members.filter((m) => answeredIds.has(m.id)).length : 0;
  const shown = members.slice(0, PILLS_SHOWN);
  const hidden = members.length - shown.length;

  return (
    <FadeRise delay={0.03}>
      <div className={TILE}>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-leaf" aria-hidden />
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            In this catch-up
          </p>
          <span className="ml-auto text-[13px] font-semibold tabular-nums text-foreground">
            {members.length}
          </span>
        </div>

        {/* The one line that changes with the phase. During answering it is a
            real number people care about; otherwise there is nothing to say
            here that the faces below do not already say, so nothing is said. */}
        {answering && (
          <p className="mt-[var(--space-s)] text-[13px] text-muted-foreground">
            {answeredCount} of {members.length} have written in
          </p>
        )}

        <ul className="mt-[var(--space-s)] space-y-1.5">
          {shown.map((person) => (
            <li key={person.id}>
              <PersonPill
                person={person}
                you={person.id === viewer.id}
                dim={answering && !answeredIds?.has(person.id)}
              />
            </li>
          ))}
          {hidden > 0 && (
            // Deliberately NOT a pill and NOT a button. As a bordered row it
            // was a second button stacked on the real one directly below,
            // doing the same thing in the same shape. This is the tail of the
            // list saying the list keeps going; the button underneath is the
            // one thing to press.
            <li className="pt-0.5 text-center text-[12.5px] text-muted-foreground">
              and {hidden} more
            </li>
          )}
        </ul>

        <PeopleDialog
          data={data}
          answeredIds={answeredIds}
          onChanged={onChanged}
          open={open}
          onOpenChange={setOpen}
          onLeave={() => {
            setOpen(false);
            setLeaving(true);
          }}
        />
        <LeaveCatchupDialog
          data={data}
          open={leaving}
          onClose={() => setLeaving(false)}
        />
      </div>
    </FadeRise>
  );
}

/**
 * Leaf tint from the protocol's chip trio (people = leaf). A Keeper's pill is
 * cinnamon, the secondary accent, so the two roles are told apart by hue before
 * anything is read.
 *
 * The Keeper mark is the sprout, kept on the owner's say-so (2026-08-06: "I
 * liked the symbol for the keeper") over the spelled-out word that briefly
 * replaced it. Full-width rows put it at the far end rather than trailing the
 * name, so on a roster the sprouts line up in their own column instead of
 * landing at a different offset behind every name. The word is still in the
 * pill's title, and in the dialog, for anyone the symbol does not tell.
 */
function PersonPill({
  person,
  you,
  dim,
}: {
  person: HomePersonRef;
  you: boolean;
  dim: boolean;
}) {
  const label = person.isKeeper ? `${person.name} (Keeper)` : person.name;
  return (
    <m.span
      title={you ? `${label} - you` : label}
      // Presence, not achievement: a name only ever eases back, never out of
      // the list, so nobody is removed from the roster for being slow.
      animate={{ opacity: dim ? 0.45 : 1 }}
      transition={SPRINGS.gentle}
      className={cn(
        PILL,
        person.isKeeper
          ? "border-cinnamon/30 bg-cinnamon/[0.07] text-cinnamon"
          : "border-leaf/30 bg-leaf/[0.07] text-leaf",
        dim && "grayscale-[0.35]"
      )}
    >
      {/* The identity half of the pill is a link to the person; the Keeper
          mark stays outside it so its own title keeps working. */}
      <Link
        href={`/profile/${person.id}`}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-full transition-opacity duration-150 hover:opacity-80 active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <BirdAvatar user={person} size="xs" />
        <span className="min-w-0 flex-1 truncate">{person.name}</span>
      </Link>
      {person.isKeeper && (
        // Its own title, so hovering the symbol itself says the word (owner,
        // 2026-08-06). The pill's outer title still covers the rest of the row.
        // A hover label that faded in beside the sprout would have pushed it
        // left, and hover never moves a control.
        <span title="Keeper" role="img" aria-label="Keeper" className="flex shrink-0">
          <Sprout className="h-3.5 w-3.5" aria-hidden />
        </span>
      )}
    </m.span>
  );
}

/* ------------------------------------------------------------------ *
 *  The dialog: the full roster, plus (for a Keeper) the controls.
 * ------------------------------------------------------------------ */

function PeopleDialog({
  data,
  answeredIds,
  onChanged,
  open,
  onOpenChange,
  onLeave,
}: {
  data: CatchupHomeData;
  answeredIds?: Set<string>;
  onChanged: () => void;
  /** Controlled by the panel, so the "+N more" chip opens this same dialog. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Closes this dialog and asks the panel's confirmation instead. */
  onLeave: () => void;
}) {
  const { members, viewer } = data;
  const canManage = viewer.isKeeper && data.catchupStatus !== "ended";
  // Read off the roster rather than threaded through `viewer`: the server
  // already stamps `isCreator` on every person, and one fact should not
  // travel down twice with two chances to disagree.
  const isCreator = !!members.find((m) => m.id === viewer.id)?.isCreator;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger
        render={<Button variant="outline" size="sm" className="mt-[var(--space-s)] w-full" />}
      >
        {canManage ? "See and add people" : "See everyone"}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          {/* The count sits ON the title line, not under it as a subtitle: the
              heading says who this is, the number says how many, and the two
              together are the only cue that the list below scrolls rather than
              ending where it is cut off. */}
          <div className="flex items-baseline justify-between gap-3 pr-6">
            <DialogTitle className="font-heading tracking-tight">
              Everyone in this catch-up
            </DialogTitle>
            <span className="shrink-0 text-[13px] tabular-nums text-muted-foreground">
              {members.length}
            </span>
          </div>
        </DialogHeader>

        <ul className="max-h-[50vh] space-y-0.5 overflow-y-auto">
          {members.map((person) => (
            <PersonRow
              key={person.id}
              person={person}
              you={person.id === viewer.id}
              answered={answeredIds?.has(person.id)}
              catchupId={data.catchupId}
              canManage={canManage}
              onChanged={onChanged}
            />
          ))}
        </ul>

        {canManage && (
          <AddPeople
            catchupId={data.catchupId}
            existingIds={new Set(members.map((m) => m.id))}
            onChanged={onChanged}
          />
        )}

        {/* The invite link lives here now, next to the roster it changes,
            rather than as a rail card of its own. Hidden on an ended
            Catch-up, where joining refuses anyway, so the link is never
            offered as a door into a room that is shut. */}
        {data.inviteToken && data.catchupStatus !== "ended" && (
          <InviteLink token={data.inviteToken} />
        )}

        {/* The way out, next to the roster that put you in. Nobody accepts an
            invitation to a Catch-up -- creating one enrols up to a hundred
            people directly -- so until this existed the only exit was asking a
            Keeper (bug audit B-063).

            In the dialog rather than on the rail tile: the tile is seven pills
            and one button, and a second button stacked directly under the real
            one is exactly what the "+N more" row was demoted for. It is also
            not a thing to do by accident on the way past.

            Absent for whoever started it: they hold Keeper power through the
            Catch-up rather than through their membership row, so leaving would
            leave a Catch-up nobody can tend. The action refuses them anyway;
            not offering it is the honest half. */}
        {!isCreator && (
          <div className="border-t border-border pt-[var(--space-m)]">
            <button
              type="button"
              onClick={onLeave}
              className="state-layer flex w-full items-center gap-2 rounded-[var(--radius-md)] px-2 py-2 text-left text-[13px] font-medium text-destructive transition-colors duration-150 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <LogOut className="size-4 shrink-0" aria-hidden />
              Leave this catch-up
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PersonRow({
  person,
  you,
  answered,
  catchupId,
  canManage,
  onChanged,
}: {
  person: HomePersonRef;
  you: boolean;
  /** undefined outside the answering window, where "has written in" means nothing yet. */
  answered?: boolean;
  catchupId: string;
  canManage: boolean;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);

  // A Keeper may not act on themselves or on the founder: both are refused
  // server-side, so offering the menu would only be a way to be told no.
  const actionable = canManage && !you && !person.isCreator;

  async function handleKeeper() {
    setBusy(true);
    try {
      const result = await callAction(() =>
        setCatchupKeeper(catchupId, person.id, !person.isKeeper)
      );
      if (result && "error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(
        person.isKeeper ? `${person.name} is no longer a Keeper.` : `${person.name} is now a Keeper.`
      );
      onChanged();
    } finally {
      // finally, not a trailing statement: a rejected call used to leave the
      // menu trigger stuck spinning for the rest of the session (audit B-042).
      setBusy(false);
    }
  }

  const [confirmingRemove, setConfirmingRemove] = useState(false);

  async function handleRemove() {
    setBusy(true);
    try {
      const result = await callAction(() => removeCatchupMember(catchupId, person.id));
      if (result && "error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(`${person.name} was removed.`);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex items-center gap-[var(--space-s)] rounded-[var(--radius-md)] px-1.5 py-1.5">
      <Link
        href={`/profile/${person.id}`}
        aria-label={person.name}
        className="shrink-0 rounded-full transition-opacity duration-150 hover:opacity-80 active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <BirdAvatar user={person} size="xs" />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-medium text-foreground">
          <Link
            href={`/profile/${person.id}`}
            className="rounded-sm transition-opacity duration-150 hover:underline active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {person.name}
          </Link>
          {you && <span className="ml-1.5 text-[12px] text-muted-foreground">you</span>}
        </p>
        {person.isKeeper && (
          <p className="text-[12px] text-cinnamon">{person.isCreator ? "Started it" : "Keeper"}</p>
        )}
      </div>

      {/* Only during answering, and only as a tick on the people who HAVE:
          nobody gets a cross for not having answered yet (spec 3.6, do not
          shame non-answerers). */}
      {answered && (
        <span
          title="Has written in"
          className="grid size-5 shrink-0 place-items-center rounded-full bg-leaf/12 text-leaf"
        >
          <Check className="size-3" strokeWidth={3} aria-hidden />
        </span>
      )}

      {actionable && (
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`Options for ${person.name}`}
            disabled={busy}
            className={`${MENU_TRIGGER_HIT} state-layer shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors duration-150 hover:text-foreground active:scale-95 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring`}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MoreHorizontal className="h-4 w-4" />
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleKeeper}>
              <Sprout className="mr-2 h-4 w-4" />
              {person.isKeeper ? "Remove as Keeper" : "Make a Keeper"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setConfirmingRemove(true)} variant="destructive">
              <UserMinus className="mr-2 h-4 w-4" />
              Remove from catch-up
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <ConfirmDialog
        open={confirmingRemove}
        onClose={() => setConfirmingRemove(false)}
        title={`Remove ${person.name}`}
        description="Anything they have written stays."
        actionLabel="Remove"
        onConfirm={handleRemove}
      />
    </li>
  );
}

/**
 * Search-and-add. One tap adds one person, rather than building a basket and
 * submitting it: there is no draft state to lose, and the roster above updates
 * as you go, which is the confirmation.
 */
function AddPeople({
  catchupId,
  existingIds,
  onChanged,
}: {
  catchupId: string;
  existingIds: Set<string>;
  onChanged: () => void;
}) {
  const [query, setQuery] = useState("");
  const [addingId, setAddingId] = useState<string | null>(null);
  const { results, searching, reset } = useUserSearch(query, { alumniOnly: true });

  async function add(person: SearchedPerson) {
    setAddingId(person.id);
    try {
      const result = await callAction(() => addCatchupMembers(catchupId, [person.id]));
      if (result && "error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(`${person.name} was added.`);
      setQuery("");
      reset();
      onChanged();
    } finally {
      // finally, not a trailing statement: a rejected call used to leave
      // this row stuck spinning, unable to try again (audit B-042).
      setAddingId(null);
    }
  }

  const unpicked = results.filter((r) => !existingIds.has(r.id));

  return (
    <div className="border-t border-border pt-[var(--space-m)]">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Add someone by name"
          aria-label="Add someone by name"
          className="pl-9"
        />
        {searching && (
          <Loader2
            className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
            aria-hidden
          />
        )}
      </div>

      {query.trim() && !searching && unpicked.length === 0 && (
        <p className="mt-[var(--space-s)] text-[13px] text-muted-foreground">
          {results.length > 0 ? "They are already here." : "No one found by that name."}
        </p>
      )}

      {unpicked.length > 0 && (
        <ul className="mt-[var(--space-s)] max-h-48 space-y-1 overflow-y-auto">
          {unpicked.map((person) => (
            <li key={person.id}>
              <button
                type="button"
                disabled={addingId !== null}
                onClick={() => add(person)}
                // Neutral row: canopy is the app's SELECTION green, and a
                // search result under the cursor is not a selected one.
                className="state-layer flex w-full items-center gap-[var(--space-s)] rounded-[var(--radius-md)] border border-transparent px-2.5 py-2 text-left transition-colors duration-150 hover:border-canopy/40 active:scale-[0.99] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <BirdAvatar user={person} size="xs" />
                <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-foreground">
                  {person.name}
                </span>
                {person.batchYear != null && (
                  <span className="shrink-0 text-[12px] tabular-nums text-muted-foreground">
                    {person.batchYear}
                  </span>
                )}
                {addingId === person.id ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-canopy" aria-hidden />
                ) : (
                  <Plus className="h-4 w-4 shrink-0 text-canopy" aria-hidden />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * The shareable link. Origin is read on the client rather than passed from the
 * server, so the copied link always matches the host the Keeper is actually on:
 * rendering it server-side would have to guess between localhost, the
 * vercel.app host and rishivalley.space, and would guess wrong in at least one.
 * Until it hydrates the field shows the path alone, which is still true.
 *
 * Shown to every member, not only Keepers. Holding the token IS the
 * authorisation (as with any share link), the server does not check who sent
 * it, and pretending otherwise in the UI only stopped members passing on a link
 * they were welcome to pass on.
 */
function InviteLink({ token }: { token: string }) {
  const path = `/catchups/join/${token}`;
  const [copied, setCopied] = useState(false);

  /* useSyncExternalStore, not a setState in an effect: this is exactly the
     "one value on the server, another on the client" case it exists for, and
     it lands the origin during hydration instead of scheduling a second
     render. The subscribe callback is a no-op because window.location.origin
     cannot change without a navigation. */
  const origin = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => ""
  );
  // Reset the tick a moment after a copy, so a second copy still reads as one.
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(t);
  }, [copied]);

  const url = origin ? `${origin}${path}` : path;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied.");
    } catch {
      // Clipboard is blocked on insecure origins and in some in-app browsers.
      // The field is selectable, so say that rather than failing mutely.
      toast.error("Could not copy. Select the link and copy it by hand.");
    }
  }

  return (
    <div className="border-t border-border pt-[var(--space-m)]">
      <div className="flex items-center gap-2">
        <Link2 className="size-4 shrink-0 text-muted-foreground" strokeWidth={2} aria-hidden />
        <h3 className="text-[13px] font-semibold text-foreground">Or send a link</h3>
      </div>
      <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
        Anyone with this link can join.
      </p>

      {/* A read-only input, not a <p>: it gives select-all on focus and a
          native long-press "copy" on a phone, which is the fallback for every
          browser where the clipboard API is unavailable. --radius-input (12px)
          is one rung inside the 16px card. */}
      <div className="mt-[var(--space-s)] flex items-center gap-1.5">
        <input
          type="text"
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          aria-label="Invite link"
          className={`min-w-0 flex-1 rounded-[var(--radius-input)] border border-border bg-muted px-3 py-2 text-[12.5px] text-muted-foreground outline-none ${FIELD_FOCUS}`}
        />
        <Button variant="outline" size="sm" className="shrink-0" onClick={copy}>
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}

/**
 * Leave this Catch-up.
 *
 * Immediate, confirmed and permanent, and the copy says all three. What you
 * have already written stays where it is: a published Edition is a keepsake the
 * whole group has read, and pulling one person's answers out of it afterwards
 * would put holes in something other people remember (owner's decision,
 * 2026-08-21). Rejoining is only possible by invitation, which is the part
 * that makes this worth an "are you sure".
 *
 * The gentler version of this is on `/catchups`: deleting your copy stops the
 * notifications now and takes thirty days to become this.
 */
function LeaveCatchupDialog({
  data,
  open,
  onClose,
}: {
  data: CatchupHomeData;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      title="Leave this catch-up?"
      description={
        <>
          You will stop hearing from {data.groupName} and lose access to its Editions. Anything you
          have already shared stays in the Editions it was published in. Getting back in needs an
          invitation.
        </>
      }
      actionLabel="Leave"
      onConfirm={async () => {
        const result = await leaveCatchup(data.catchupId);
        if (result && "error" in result) return result;
        toast.success(`You have left ${data.groupName}.`);
        // Out of the Catch-up means out of its home page, which now answers
        // "you are not a member". Back to the list rather than a refresh into
        // a wall.
        router.push("/catchups");
        return;
      }}
    />
  );
}
