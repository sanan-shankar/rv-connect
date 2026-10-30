"use client";

/* ------------------------------------------------------------------ *
 *  Who is in this Catch-up: a dialog on a laptop, a sheet on a phone,
 *  behind the People door on the picture.
 *
 *  This replaces `home/people-panel.tsx`, 733 lines in a sticky rail,
 *  which he called "done so badly" (brief 12, 37).
 *
 *  NAMES, WITH BIRDS BESIDE THEM, AND NEVER A BIRD ALONE. His, brief 23:
 *  "a row of birds with this plus icon ... I am not identifying the
 *  birds or the people." The Keeper's sprout follows the name rather
 *  than sitting at the far end of the row, which stranded a single mark
 *  180px from the person it belongs to.
 *
 *  EVERY ROW IS A LINK TO THAT PERSON. His: "under people all the
 *  profiles should be clickable and take you to their profile." A name
 *  and a face go to the person everywhere else in this app -- the feed's
 *  byline, the directory's card, an answer's author -- and this roster
 *  was the one place they did not, which made it a dead end you had to
 *  back out of to find anybody.
 *
 *  MOVING THEM OFF THE SIDEBAR ALSO RETIRES F40. At the app's
 *  hundred-person cap the roster laid a sticky 300px column out 4,974px
 *  tall inside a 982px window, so everything past the first screen could
 *  not be reached at any scroll depth. The fix is not a scroller inside
 *  a scroller; it is that an unbounded list does not belong in a fixed
 *  column.
 *
 *  THE THREE VERBS THAT CAME WITH IT. Architecture 6 files "add people",
 *  "remove a member" and "make a Keeper" under the Catch-up, and they are
 *  ABOUT a person, so they live on that person's row rather than behind
 *  Settings with the Catch-up's own descriptions. Dropping them was a
 *  real loss and `people-search-rule.test.mjs` caught it: a Keeper had no
 *  way left to add anybody, or to undo adding the wrong body.
 *
 *  None of them appears on a batch Catch-up. Nobody keeps one and the
 *  membership is the batch, so `addCatchupMembers`, `removeCatchupMember`
 *  and `setCatchupKeeper` all refuse it server-side before they ask who
 *  the Keeper is; offering them would only be a way to be told no.
 *
 *  THE FOURTH THING THE OLD PANEL HELD came back on 2026-10-29: the invite
 *  link (bug audit 3, T3-17, his Q11). The transplant had dropped it, so a
 *  Keeper could add only people who already had accounts while every people
 *  Catch-up still minted a link and the join page still honoured one.
 *
 *  AND THE FIFTH, its confirmation before Remove (bug audit 3, T3-23). The
 *  old panel put Remove behind one; the transplant made it a single tap on a
 *  26px control a phone always shows 2px from the Keeper sprout. A
 *  confirmation rather than an undo, because a removal is not one act an
 *  undo can reverse: it changes the invite link, clears their bells, and
 *  takes what they wrote for an Edition still running (C8-04), none of which
 *  adding them back restores.
 * ------------------------------------------------------------------ */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "@/components/common/link";
import { Check, Link2, Plus, Sprout, UserMinus, X } from "lucide-react";
import { toast } from "sonner";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { useUserSearch } from "@/components/common/use-user-search";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BottomSheet } from "@/components/ui/sheet";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { callAction } from "@/lib/call-action";
import {
  addCatchupMembers,
  removeCatchupMember,
  setCatchupKeeper,
} from "@/app/(main)/catchups/actions";
import { cn } from "@/lib/utils";
import { NO_CAPTURE } from "@/lib/posthog-privacy";
import type { HomePersonRef } from "./types";

function PersonRow({
  p,
  catchupId,
  canManage,
  isYou,
  busy,
  onBusy,
  onChanged,
  onRemove,
}: {
  p: HomePersonRef;
  catchupId: string;
  canManage: boolean;
  isYou: boolean;
  busy: boolean;
  onBusy: (v: boolean) => void;
  onChanged: () => void;
  /** Opens the confirmation; nothing is removed from the row itself (T3-23). */
  onRemove: (p: HomePersonRef) => void;
}) {
  /* A Keeper may not act on themselves or on the founder: both are refused
     server-side, so offering the control would only be a way to be told no. */
  const actionable = canManage && !isYou && !p.isCreator;

  async function run(work: () => Promise<unknown>, said: string) {
    onBusy(true);
    try {
      const result = await callAction(work);
      if (result && typeof result === "object" && "error" in result && result.error) {
        toast.error(String(result.error));
        return;
      }
      toast.success(said);
      onChanged();
    } finally {
      /* finally, not a trailing statement: a rejected call used to leave the
         trigger stuck spinning for the rest of the session (audit B-042). */
      onBusy(false);
    }
  }

  return (
    /* NO_CAPTURE on the whole row: the link is the person's name and bird, and
       the hat and Remove carry the name in their labels, so a tap anywhere on
       it told PostHog who (bug audit 3, T7b-22's Catch-ups half). */
    <div className={`${NO_CAPTURE} group/row flex min-w-0 items-center gap-1`}>
      {/* The link is a CHILD of the row rather than the row itself, because a
          button inside an anchor is not a thing. It still takes the whole
          width the controls leave, so the tap target is the row. */}
      <Link
        href={`/profile/${p.id}`}
        className="state-layer -mx-2 flex min-w-0 flex-1 items-center gap-2.5 rounded-full px-2 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <BirdAvatar user={p} size={32} />
        <span className="min-w-0 truncate text-[14.5px] text-foreground">{p.name}</span>
        {p.isKeeper && <Sprout className="h-3.5 w-3.5 shrink-0 text-cinnamon" aria-label="Keeper" />}
      </Link>
      {actionable && (
        <span className="flex shrink-0 items-center gap-0.5">
          <RowButton
            label={p.isKeeper ? `Take the Keeper hat from ${p.name}` : `Make ${p.name} a Keeper`}
            disabled={busy}
            onClick={() =>
              run(
                () => setCatchupKeeper(catchupId, p.id, !p.isKeeper),
                p.isKeeper ? `${p.name} is no longer a Keeper.` : `${p.name} is now a Keeper.`
              )
            }
          >
            <Sprout className={cn("h-3.5 w-3.5", p.isKeeper && "text-cinnamon")} />
          </RowButton>
          <RowButton label={`Remove ${p.name}`} destructive disabled={busy} onClick={() => onRemove(p)}>
            <UserMinus className="h-3.5 w-3.5" />
          </RowButton>
        </span>
      )}
    </div>
  );
}

function RowButton({
  label,
  onClick,
  disabled,
  destructive,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        /* Always reachable on a coarse pointer: half the people opening this
           are on a phone, where there is no hover and a control that only
           appears on one does not exist. On a fine pointer it fades in with
           the row, so a roster of forty is names rather than eighty glyphs. */
        "rounded-md p-1.5 text-muted-foreground transition-[color,opacity] duration-150 active:scale-95 disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        "[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/row:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100",
        destructive
          ? "hover:bg-destructive/10 hover:text-destructive"
          : "state-layer hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

/* ── adding somebody ───────────────────────────────────────────────── *
 *  `forCatchup`, because a Catch-up holds verified alumni only and the
 *  endpoint is shared with the composer's @-mention list, which is allowed
 *  to find anyone. The flag lives with the surface that has the rule
 *  (bug-report-2 C-006), and `people-search-rule.test.mjs` fails the
 *  build for a caller that forgets it.
 *
 *  `inIds` is the roster, so nobody already in is offered, the Keeper
 *  included. The panel this replaced passed it, and the transplant dropped
 *  it, so the door offered existing members and answered "X is in." when
 *  nothing had changed (bug audit 3, T3-22). The toast now says what the
 *  server did. */
function AddSomeone({
  catchupId,
  inIds,
  onChanged,
  beside,
}: {
  catchupId: string;
  inIds: ReadonlySet<string>;
  onChanged: () => void;
  /** The door's other way in, on the same line while nobody is searching. */
  beside?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const { results, searching, reset } = useUserSearch(query, { forCatchup: true });
  const offered = results.filter((r) => !inIds.has(r.id));

  async function add(id: string, name: string) {
    setBusy(true);
    try {
      const result = await callAction(() => addCatchupMembers(catchupId, [id]));
      if (result && "error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      const already = result && "added" in result && result.added === 0;
      toast.success(already ? `${name} is already in.` : `${name} is in.`);
      setQuery("");
      reset();
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          Add someone
        </Button>
        {beside}
      </div>
    );
  }

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name"
          aria-label="Search for someone to add"
          autoComplete="off"
        />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Stop adding"
          onClick={() => {
            setOpen(false);
            setQuery("");
            reset();
          }}
        >
          <X />
        </Button>
      </div>
      {query.trim().length > 0 && (
        <ul className="mt-2 space-y-1">
          {offered.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                disabled={busy}
                onClick={() => add(r.id, r.name)}
                className={`${NO_CAPTURE} state-layer flex w-full min-w-0 items-center gap-2.5 rounded-[10px] px-2 py-1.5 text-left disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring`}
              >
                <BirdAvatar user={r} size={28} />
                <span className="min-w-0 truncate text-[14.5px] text-foreground">{r.name}</span>
                {r.batchYear && (
                  <span className="ml-auto shrink-0 font-sans text-[12.5px] text-muted-foreground">
                    {r.batchYear}
                  </span>
                )}
              </button>
            </li>
          ))}
          {!searching && offered.length === 0 && (
            <li className="px-2 py-1.5 font-sans text-[13px] text-muted-foreground">
              {results.length > 0
                ? "They are already in."
                : "Nobody by that name. Only verified members can be added."}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

/* ── inviting somebody not on the site yet ──────────────────────────── *
 *  A pill beside "Add someone", the door's one shape for a Keeper's verb,
 *  rather than the old panel's "Or send a link" section with the address in
 *  a field: an address is noise until it is pasted somewhere. The home sends
 *  the token to a Keeper of a Catch-up that has not ended and to nobody else
 *  (L12-09), and a batch Catch-up has none, so having one is the whole test.
 *
 *  The origin is read at the press, so the copied link is the host the
 *  Keeper is on. The clipboard is refused in some in-app browsers; then the
 *  address appears in a field to copy by hand, the job the old field did. */
function InviteLink({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const [byHand, setByHand] = useState<string | null>(null);
  // The same beat the share button holds its tick for.
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1400);
    return () => clearTimeout(t);
  }, [copied]);

  async function copy() {
    const url = `${window.location.origin}/catchups/join/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setByHand(null);
      toast.success("Link copied. Anyone with it can join.");
    } catch {
      setByHand(url);
      toast.error("Could not copy. Select the link and copy it by hand.");
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={copy}>
        {copied ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
        {copied ? "Copied" : "Copy invite link"}
      </Button>
      {byHand && (
        <Input
          readOnly
          value={byHand}
          onFocus={(e) => e.currentTarget.select()}
          aria-label="Invite link"
          className="basis-full text-[13px] text-muted-foreground"
        />
      )}
    </>
  );
}

/** What a removal does, in the confirmation's one line. The first half only
 *  while an Edition is running, the only time anything of theirs goes; the
 *  link only when there is one (an ended Catch-up's page carries none). */
function removalLine(running: boolean, hasLink: boolean): string {
  const link = hasLink ? ", and the invite link changes" : "";
  return running
    ? `Anything they wrote for this Edition goes with them${link}. Editions already out keep their words.`
    : `What they wrote stays${link}.`;
}

export function PeoplePanel({
  people,
  catchupId,
  viewerId,
  canManage,
  inviteToken,
  running,
  open,
  onClose,
  onChanged,
  phone,
}: {
  people: HomePersonRef[];
  catchupId: string;
  viewerId: string;
  /** Keeper of a PEOPLE Catch-up. False on every batch one, where the
   *  membership is the batch and all three verbs are refused server-side. */
  canManage: boolean;
  /** The invite link's token, on a Keeper's page of a Catch-up that has not
   *  ended, and null everywhere else (the home's view model, L12-09). */
  inviteToken: string | null;
  /** An Edition is collecting or answering, so a removal takes what the
   *  person wrote for it (C8-04). The confirmation says so. */
  running: boolean;
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
  /** Which frame the roster is in. Decided by the page, once, so the two
   *  never both mount and draw the same list twice. */
  phone: boolean;
}) {
  const [busy, setBusy] = useState(false);
  /* Who the confirmation is about, kept while it closes so its title does
     not change under the exit animation; `asking` is whether it is open. */
  const [removing, setRemoving] = useState<HomePersonRef | null>(null);
  const [asking, setAsking] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const inIds = useMemo(() => new Set(people.map((p) => p.id)), [people]);

  /* Asked first, over the door (T3-23). The dialog shows its own refusal and
     closes itself; the toast is the removal's. */
  async function remove(p: HomePersonRef): Promise<{ error?: string } | void> {
    const result = await removeCatchupMember(catchupId, p.id);
    if (result && "error" in result && result.error) return { error: result.error };
    /* The removal changed the link, so any copy the Keeper sent before now
       opens on "expired". Said here as well, once it has happened. */
    toast.success(inviteToken ? `${p.name} was removed. The invite link has changed.` : `${p.name} was removed.`);
    onChanged();
  }

  const list = (
    <ul className={cn("gap-x-6 gap-y-3", phone ? "space-y-3" : "grid grid-cols-2")}>
      {people.map((p) => (
        <li key={p.id}>
          <PersonRow
            p={p}
            catchupId={catchupId}
            canManage={canManage}
            isYou={p.id === viewerId}
            busy={busy}
            onBusy={setBusy}
            onChanged={onChanged}
            onRemove={(person) => {
              setRemoving(person);
              setAsking(true);
            }}
          />
        </li>
      ))}
    </ul>
  );

  const body = (
    <>
      {list}
      {canManage && (
        <AddSomeone
          catchupId={catchupId}
          inIds={inIds}
          onChanged={onChanged}
          beside={inviteToken ? <InviteLink token={inviteToken} /> : null}
        />
      )}
      {/* Mounted with the list, over whichever frame holds it: a dialog over
          the laptop's dialog or the phone's sheet, the way Settings opens its
          own confirmations over its list. */}
      <ConfirmDialog
        open={asking}
        onClose={() => setAsking(false)}
        title={removing ? `Remove ${removing.name}` : "Remove"}
        description={removalLine(running, !!inviteToken)}
        actionLabel="Remove"
        onConfirm={() => (removing ? remove(removing) : Promise.resolve())}
      />
    </>
  );

  if (phone) {
    return (
      <BottomSheet open={open} onOpenChange={(o) => !o && onClose()} title="People">
        <div className="pb-3">{body}</div>
      </BottomSheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      {/* `initialFocus` on the panel. Base UI otherwise focuses the first
          focusable CHILD, which here is the first person's row -- so the
          roster opened with a green ring drawn round whoever happened to sort
          first, reading as though they were selected. Seen at 1440, not
          reasoned about; the settings dialog had the same fault. */}
      <DialogContent className="sm:max-w-lg" initialFocus={panel} ref={panel} tabIndex={-1}>
        <DialogHeader>
          {/* No per-dialog title size: the material's DialogTitle is 16px
              medium and DESIGN-SYSTEM.md forbids overriding it. */}
          <DialogTitle>People</DialogTitle>
        </DialogHeader>
        <div className="max-h-[52dvh] overflow-y-auto pr-1">{body}</div>
      </DialogContent>
    </Dialog>
  );
}
