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
 * ------------------------------------------------------------------ */

import { useRef, useState } from "react";
import Link from "next/link";
import { Plus, Sprout, UserMinus, X } from "lucide-react";
import { toast } from "sonner";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { useUserSearch } from "@/components/common/use-user-search";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BottomSheet } from "@/components/ui/sheet";
import { callAction } from "@/lib/call-action";
import {
  addCatchupMembers,
  removeCatchupMember,
  setCatchupKeeper,
} from "@/app/(main)/catchups/actions";
import { cn } from "@/lib/utils";
import type { HomePersonRef } from "./types";

function PersonRow({
  p,
  catchupId,
  canManage,
  isYou,
  busy,
  onBusy,
  onChanged,
}: {
  p: HomePersonRef;
  catchupId: string;
  canManage: boolean;
  isYou: boolean;
  busy: boolean;
  onBusy: (v: boolean) => void;
  onChanged: () => void;
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
    <div className="group/row flex min-w-0 items-center gap-1">
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
          <RowButton
            label={`Remove ${p.name}`}
            destructive
            disabled={busy}
            onClick={() =>
              run(() => removeCatchupMember(catchupId, p.id), `${p.name} was removed.`)
            }
          >
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
 *  `alumniOnly`, because Catch-ups is an alumni feature and the endpoint
 *  is shared with the composer's @-mention list, which is allowed to find
 *  a teacher. The flag lives with the surface that has the rule
 *  (bug-report-2 C-006), and `people-search-rule.test.mjs` fails the
 *  build for a caller that forgets it. */
function AddSomeone({ catchupId, onChanged }: { catchupId: string; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const { results, searching, reset } = useUserSearch(query, { alumniOnly: true });

  async function add(id: string, name: string) {
    setBusy(true);
    try {
      const result = await callAction(() => addCatchupMembers(catchupId, [id]));
      if (result && "error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`${name} is in.`);
      setQuery("");
      reset();
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" className="mt-3" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5" />
        Add someone
      </Button>
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
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                disabled={busy}
                onClick={() => add(r.id, r.name)}
                className="state-layer flex w-full min-w-0 items-center gap-2.5 rounded-[10px] px-2 py-1.5 text-left disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
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
          {!searching && results.length === 0 && (
            <li className="px-2 py-1.5 font-sans text-[13px] text-muted-foreground">
              Nobody by that name.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

export function PeoplePanel({
  people,
  catchupId,
  viewerId,
  canManage,
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
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
  /** Which frame the roster is in. Decided by the page, once, so the two
   *  never both mount and draw the same list twice. */
  phone: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

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
          />
        </li>
      ))}
    </ul>
  );

  const body = (
    <>
      {list}
      {canManage && <AddSomeone catchupId={catchupId} onChanged={onChanged} />}
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
