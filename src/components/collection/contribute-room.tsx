"use client";

/* ------------------------------------------------------------------ *
 *  Adding photographs to the valley's memory.
 *
 *  The owner asked for this twice and the second time was blunt: "the
 *  contribute panel is still not nice at all. like when you click on it
 *  it's very unappealing. let's think of something totally different and
 *  just dopamine inducing when you look at it."
 *
 *  ONE IDEA CARRIES THE WHOLE ROOM: the photographs are the interface,
 *  from the first instant. They do not become a list of filenames with
 *  progress bars. They land straight into the justified rows they will
 *  live in on /collection, at full size, and then they DEVELOP -- each
 *  one sits half-faded until its bytes are in the bucket and comes up to
 *  full as it lands. For a photograph archive that is the right
 *  metaphor, and it is the difference between watching a queue drain and
 *  watching your own pictures arrive.
 *
 *  Everything else follows from that:
 *
 *  - Every photograph is selected when it lands, so the school
 *    photographer's hundred are one caption and one bucket press away
 *    from being filed. That press is the difference between his hundred
 *    photographs being a chore and being a five-minute job, and it is
 *    the thing to get right before anything decorative.
 *  - The questions are asked in plain words beside the wall, not under
 *    it: "What is this photograph?", not "Caption". One field, six tiles,
 *    and when.
 *  - Nothing is required. A contribution refused for want of a tag is a
 *    contribution that does not happen, and the owner has said plainly
 *    he cannot expect people to fill anything in.
 *
 *  IT IS A POP-UP, and that reverses spec sec. 8.2, which argued a modal
 *  is the wrong container for something you might spend twenty minutes on
 *  with two hundred photographs. The owner looked at both and chose:
 *  "i'm not sure I like the contribute being a separate page. I feel like
 *  it should a pop up but can be prettier and we have to say the pste,
 *  drop and browse thing." So it is a large one -- most of the glass, its
 *  own scroll -- and it keeps everything the room had. The three ways in
 *  are named because he asked for them by name: paste, drop, browse.
 *
 *  Spec sec. 8. Revised 2026-08-28 against the owner's own read of the
 *  shipped room, and every one of those changes is annotated where it
 *  lives: the invitation is smaller and names the clipboard only on a
 *  machine that has one, the two overlapping prose fields are one
 *  description on the signup's float-label material, "when" is one box
 *  of digits instead of two dropdowns, and nothing at rest is filled with
 *  cream -- "I don't like the yellowing when it's not selecting."
 * ------------------------------------------------------------------ */

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { m, AnimatePresence } from "motion/react";
import { Images } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { useLeaveGuard } from "@/components/common/use-leave-guard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EASE_OUT_SMOOTH, SPRINGS, SpringPress } from "@/components/common/motion";
import { wellClass, WELL_PRESS, usePointerFine } from "@/components/common/attach-image-dialog";
import { ContributedHoopoe } from "@/components/mascot/moments/contributed-hoopoe";
import { useEmailGate } from "@/components/auth/verify-email-dialog";
import { HALVES, photoDate, yearUnreadable } from "@/lib/collection";
import { contributePhoto, contributePhotoDirect } from "@/app/(main)/collection/actions";
import type { PhotoScope } from "@/lib/photo-visibility-rule";
import { directUploadPut } from "@/lib/upload-client";
import { shrinkForUpload } from "@/lib/image-downscale";
import { takenDateOfFile } from "@/lib/file-taken-date";
import type { ExifDate } from "@/lib/taken-date";
import {
  MAX_PHOTOS_PER_DROP,
  MAX_UPLOAD_BYTES,
  heicBatchRefusal,
  heicRefusal,
  isImageFile,
  isUnsupportedHeic,
} from "@/lib/upload-shared";
import { valleyYear } from "@/lib/utils";
import { ContributeStage } from "./contribute-stage";
import {
  EMPTY_ANSWERS,
  PhotoQuestions,
  type PhotoAnswers,
} from "./photo-questions";
import { FileSays } from "./file-says";
import { cn } from "@/lib/utils";

/** How many files climb to the bucket at once. Three, because a browser gives
 *  six connections per origin and the rest of the page still has to load its
 *  own thumbnails while this runs. */
const LANES = 3;

/** How long one file may spend climbing before the lane gives up on the
 *  direct path and lets the proxied one have it at Add time. Generous and
 *  proportional, because a 20MB photograph on a hotel connection is slow
 *  rather than stuck: twenty seconds, and twenty more per megabyte. */
const putDeadline = (bytes: number) =>
  Math.min(240_000, 20_000 + (bytes / 1_000_000) * 20_000);

type Staged = {
  id: string;
  file: File;
  /** The object URL the wall draws. Revoked when the room lets the file go. */
  preview: string;
  width: number;
  height: number;
  /** "reading" before its shape is known, then the bucket journey. */
  state: "waiting" | "lifting" | "here" | "failed";
  /** The staged key from the presigned PUT, when that path was available. */
  key?: string;
  /** When the file says it was taken, judged in the browser before a byte
   *  leaves (src/lib/taken-date.ts). Offered beside the date question, never
   *  written into it. */
  taken: ExifDate | null;
};

/** Read a file's own shape, which is what the justified rows are solved from.
 *  Resolves to null for anything the browser will not decode, so one bad file
 *  cannot take a whole drop down with it. */
function measure(file: File): Promise<{ preview: string; width: number; height: number } | null> {
  return new Promise((resolve) => {
    const preview = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ preview, width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => {
      URL.revokeObjectURL(preview);
      resolve(null);
    };
    img.src = preview;
  });
}

/* ------------------------------------------------------------------ *
 *  The pop-up. Most of the glass ONCE THERE IS SOMETHING TO SHOW: a wall
 *  of two hundred photographs needs room, and its own scroll so the Add
 *  button and the questions never leave the screen while you are looking
 *  at them. Everything inside is the same room; only its container
 *  changed.
 *
 *  It opens small. A 1150px pop-up holding one sentence and one button is
 *  a letterbox, and the invitation shrank on the owner's instruction
 *  ("make the box smaller it's unnecessarily big") only for the glass
 *  around it to keep the same emptiness. So the dialog is a normal small
 *  dialog until photographs land and then it takes the room it needs --
 *  which reads as the space opening up for your pictures, not as a jump.
 *  Not animated: width is neither transform nor opacity.
 * ------------------------------------------------------------------ */
/** How much glass the room needs. TWO RUNGS NOW, where there were four.
 *
 *  The ladder used to climb with the number of photographs, because the wall
 *  did: one picture wanted a column and a hundred wanted a contact sheet. The
 *  carousel shows exactly one photograph whatever the count, beside exactly
 *  one column of questions, so twelve photographs and two need the same glass
 *  and there is nothing left for the middle rungs to describe. */
const GLASS_WIDTH = (wall: number) => (wall === 0 ? 512 : 940);

export function ContributeDialog({
  open,
  onOpenChange,
  autoApproved,
  roomLeft,
  scope = "valley",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  autoApproved: boolean;
  roomLeft: number;
  /** Which half of the Collection this contribution is going into, fixed by
   *  the side Contribute was pressed from and NOT switchable in here: a
   *  switchable destination is a second way to get it wrong. The audience is
   *  still derived server-side; this only says which half to ask for. */
  scope?: PhotoScope;
}) {
  const [wall, setWall] = useState(0);
  const [leaving, setLeaving] = useState(false);
  return (
    <>
    <Dialog
      open={open}
      onOpenChange={(v) => {
        /* ASK FIRST. The room lives inside the pop-up and goes with it, so a
           close on photographs not yet added throws them away, climbing or
           not, with no word said. `wall` is exactly that count: it drops to
           zero the moment a contribution is filed. */
        if (!v && wall > 0) {
          setLeaving(true);
          return;
        }
        onOpenChange(v);
        // So a room reopened after a contribution starts small again.
        if (!v) setWall(0);
      }}
    >
      <DialogContent
        className="flex max-h-[90vh] w-full flex-col overflow-hidden p-0"
        /* THE GLASS IS AS WIDE AS WHAT IS IN IT. Nothing dropped yet is one
           sentence and one button; one photograph is a picture with its
           questions under it; a hundred is a wall with a panel beside it.
           A pop-up that opens at 1152px for all three is a letterbox twice.

           An inline style rather than a `sm:max-w-*` class, and that is the
           one thing here worth remembering. A width ladder needs a class per
           rung, and a class this codebase has never written before is a
           BRAND-NEW rule in the generated stylesheet -- so a browser holding
           a cached sheet from before the edit matches nothing and falls back
           to full width. That is exactly what the owner saw the first time
           this grew a rung: "why tf is this full screen now". A style
           attribute is in the markup, so it cannot be missing, and the
           `min()` carries the small-screen inset that `max-w-[calc(100%-
           1.5rem)]` used to, at every width, with no breakpoint. */
        style={{ maxWidth: `min(100% - 1.5rem, ${GLASS_WIDTH(wall)}px)` }}
      >
        <DialogHeader
          /* The title is visible in BOTH states now. On 2026-08-28 the empty
             state hid it (sr-only) and let a 22px "Drag and drop, browse or
             paste from your clipboard" line stand in as the heading; a day
             later the owner named that inversion as the thing he could feel
             but not place -- the loudest element was a list of input methods
             while the dialog's actual subject was hidden. Today's shape is
             the one every design system's dialog anatomy describes: the
             title says what the room is FOR, and the well below shows the
             ways in. The 2026-08-28 "small title looks so ruined" complaint
             was about the title fighting that larger line, which no longer
             exists -- nothing below the title is set bigger than 14px. */
          /* TIGHTER (kept from the carousel pass): the meta row is deleted
             and the paddings trimmed, because the wall screen's whole
             problem is height. */
          className="shrink-0 px-5 pt-4 text-left sm:px-6 sm:pt-5"
        >
          {/* pr-10 clears the close button, which sits inside the panel at
              the top right: at 390px the title ran straight into it. */}
          {/* 20px on a phone: at 23px "Add to the valley's memory" wraps to two
              lines inside 326px of Libre Baskerville, which is 30px of exactly
              the height this pass exists to give back. */}
          {/* THE DESTINATION IS THE TITLE, not a line added under it. With no
              way to move a photograph between the halves afterwards, this is
              the whole of what stops a misfile, and it is the first thing
              read. Why each half words it as it does is beside the words
              themselves, in `HALVES` (src/lib/collection.ts). */}
          <DialogTitle className="pr-10 font-heading text-[20px] leading-tight tracking-[-0.02em] sm:text-[23px]">
            {HALVES[scope].contributeTitle}
          </DialogTitle>
          {/* No description under the title. It said "Paste, drop or browse.
              As many photographs as you like, all at once" -- the same
              sentence the invitation below says in larger type, six
              centimetres lower, which is where the eye actually is. Two
              copies of one instruction is one too many (owner, 2026-08-28).
              A DialogTitle carries the accessible name on its own. */}
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-3 pb-5 sm:px-6 sm:pb-6">
          <ContributeRoom
            scope={scope}
            autoApproved={autoApproved}
            roomLeft={roomLeft}
            active={open}
            onWall={setWall}
            onDone={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
    <ConfirmDialog
      open={leaving}
      onClose={() => setLeaving(false)}
      title={wall === 1 ? "Discard this photograph?" : `Discard ${wall} photographs?`}
      description="They have not been added to the Collection yet."
      actionLabel="Discard"
      onConfirm={async () => {
        onOpenChange(false);
        setWall(0);
      }}
    />
    </>
  );
}

export function ContributeRoom({
  autoApproved,
  roomLeft,
  active = true,
  scope = "valley",
  onWall,
  onDone,
}: {
  /** Which half this contribution is going into. See ContributeDialog. */
  scope?: PhotoScope;
  /** How many photographs are on the wall right now. The pop-up around this
   *  sizes itself from it; the standalone lab room ignores it. */
  onWall?: (count: number) => void;
  /** Close the pop-up. Seeing what was just added IS closing it: the
   *  Collection is the page behind, and it refreshed as they landed. */
  onDone?: () => void;
  /** False while the pop-up is closed but still mounted, so the window-wide
   *  paste and drop listeners are not live under a page nobody is adding
   *  to -- pasting a screenshot into the composer must not open a wall of
   *  photographs behind it. */
  active?: boolean;
  /** Whether this member's photographs go straight in, or wait for review.
   *  Said before a file is chosen, never after: it changes what the room
   *  promises. */
  autoApproved: boolean;
  /** How many more photographs this account may add (audit M17's quota). */
  roomLeft: number;
}) {
  const router = useRouter();
  const emailGate = useEmailGate();
  const [photos, setPhotos] = useState<Staged[]>([]);
  /** Which photograph the questions are answering for: a POSITION in the
   *  carousel, not a selection. Reported up from the stage's scroll offset. */
  const [at, setAt] = useState(0);
  const [meta, setMeta] = useState<Record<string, PhotoAnswers>>({});
  const [reading, setReading] = useState(0);
  const [adding, setAdding] = useState(false);
  /** How far the filing has got, once every photograph has landed. */
  const [filing, setFiling] = useState<{ done: number; total: number } | null>(null);
  const [added, setAdded] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  /* Anything on the wall is only in this tab until it is added. */
  useLeaveGuard(photos.length > 0);

  /* Told, not read: the pop-up around this owns its own width and this is
     the only thing it needs from the room. */
  useEffect(() => {
    onWall?.(photos.length);
  }, [photos.length, onWall]);

  /* Object URLs are a real allocation, not a string: a hundred photographs at
     five megabytes is half a gigabyte the tab keeps until it is told
     otherwise. Released when the room unmounts, and individually whenever a
     photograph is taken back out of the drop. */
  const live = useRef<string[]>([]);
  useEffect(() => {
    const urls = live.current;
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  /* ---------------- taking the files in ---------------- */

  const accept = useCallback(
    async (incoming: File[]) => {
      const images = incoming.filter((f) => isImageFile(f));
      const heic = incoming.filter((f) => isUnsupportedHeic(f));
      const heavy = images.filter((f) => f.size > MAX_UPLOAD_BYTES);
      const ok = images.filter((f) => f.size <= MAX_UPLOAD_BYTES);

      if (heic.length) {
        toast.error(
          heic.length === 1 ? heicRefusal(heic[0].name) : heicBatchRefusal(heic.length)
        );
      }
      if (heavy.length) {
        toast.error(
          heavy.length === 1
            ? "One photo is over the 20MB limit and was left out."
            : `${heavy.length} photos are over the 20MB limit and were left out.`
        );
      }
      if (!ok.length) return;

      /* TWO ceilings, and the tighter one wins.

         The quota is the server's rule, checked per contribution, and saying
         it here means nobody drops two hundred photographs and finds out at
         the end that only forty could go.

         The DROP ceiling is this room's own, and it is not about storage: a
         drop is two tokens of the hourly meter per photograph (the presign and
         the contribution), so an unbounded drop can exhaust its own allowance
         part-way through and strand the tail -- the worst possible failure,
         because it happens after the member has waited. Refusing the surplus
         up front, with the number said out loud, is the honest version. */
      const room = Math.min(
        Math.max(0, roomLeft - photos.length),
        Math.max(0, MAX_PHOTOS_PER_DROP - photos.length)
      );
      const taking = ok.slice(0, room);
      if (taking.length < ok.length) {
        toast.error(
          room === 0
            ? photos.length >= MAX_PHOTOS_PER_DROP
              ? `${MAX_PHOTOS_PER_DROP} photographs is as many as one go can take. Add these, then start another.`
              : "This account has reached the number of photographs it can add. Message the admins if you have more to share."
            : `Only ${room} more photographs will fit, so that many were taken.`
        );
      }
      if (!taking.length) return;

      setReading((n) => n + taking.length);
      /* Measured before anything is drawn. The rows are justified from the
         real shapes, so a wall that rendered each photograph as its dimensions
         arrived would relayout under the reader once per file -- which is the
         page-jump this whole campaign exists to end. */
      const measured = await Promise.all(
        taking.map(async (file) => {
          /* The date is read alongside the shape, so a photograph arrives
             already knowing it and the suggestion never pops in under
             somebody who has started answering. It reads a few kilobytes. */
          const [shape, taken] = await Promise.all([measure(file), takenDateOfFile(file)]);
          return shape && { ...shape, taken };
        })
      );
      const fresh: Staged[] = [];
      measured.forEach((m0, i) => {
        if (!m0) return;
        live.current.push(m0.preview);
        fresh.push({
          id: `${Date.now()}-${i}-${taking[i].name}`,
          file: taking[i],
          preview: m0.preview,
          width: m0.width,
          height: m0.height,
          taken: m0.taken,
          state: "waiting",
        });
      });
      setReading((n) => Math.max(0, n - taking.length));
      if (!fresh.length) {
        toast.error("None of those files could be read as photographs.");
        return;
      }
      setPhotos((prev) => [...prev, ...fresh]);
      setMeta((prev) => {
        const next = { ...prev };
        for (const f of fresh) next[f.id] = { ...EMPTY_ANSWERS };
        return next;
      });
    },
    [photos.length, roomLeft]
  );

  /* Paste. The third way in, and the one nobody builds: a screenshot, a
     photograph copied out of Messages or a mail client, or a file copied in
     Finder all arrive on the clipboard, and every one of them is otherwise a
     round trip through Save As before it can be uploaded at all. */
  useEffect(() => {
    if (added !== null || !active) return;
    const onPaste = (e: ClipboardEvent) => {
      const files = [...(e.clipboardData?.files ?? [])];
      if (!files.length) return;
      // Only when the clipboard actually held a file: pasting text into the
      // caption must go on being pasting text into the caption.
      e.preventDefault();
      void accept(files);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [accept, added, active]);

  /* The whole window is the target, so there is nothing to aim at. */
  useEffect(() => {
    if (added !== null || !active) return;
    let depth = 0;
    const over = (e: DragEvent) => {
      if (!e.dataTransfer?.types?.includes("Files")) return;
      e.preventDefault();
      depth += 1;
      setDragging(true);
    };
    const move = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes("Files")) e.preventDefault();
    };
    const leave = () => {
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    };
    const drop = (e: DragEvent) => {
      if (!e.dataTransfer?.files?.length) return;
      e.preventDefault();
      depth = 0;
      setDragging(false);
      void accept([...e.dataTransfer.files]);
    };
    window.addEventListener("dragenter", over);
    window.addEventListener("dragover", move);
    window.addEventListener("dragleave", leave);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", over);
      window.removeEventListener("dragover", move);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("drop", drop);
    };
  }, [accept, added, active]);

  /* ---------------- the climb to the bucket ---------------- */

  /* Files go up while the reader is still typing, which is what makes a drop
     of a hundred feel instant: by the time the questions are answered the
     bytes are already there and "Add" is only the rows. A photograph whose
     presigned PUT is unavailable (no R2 locally, an origin the bucket's CORS
     rule does not name) simply stays `waiting` and travels the proxied path
     when Add is pressed instead -- slower, and never a lost contribution. */
  const lifting = useRef(0);
  /** Which photographs a lane has already taken. See `pump`. */
  const claimed = useRef<Set<string>>(new Set());
  /* The pump reads the wall through a ref, and the effect that starts it
     depends only on how MANY photographs there are.
     
     Both halves of that are the fix for a bug this had on its first run:
     with `photos` in the deps, every `setPhotos` the pump itself made
     re-ran the effect, whose cleanup cancelled the upload already in
     flight -- so the result was discarded, the state never reached
     "here", and not one photograph ever developed. A ref reads the
     current wall without making the effect depend on it, and the only
     thing that cancels now is the room being left. */
  const wall = useRef(photos);
  wall.current = photos;
  const answers = useRef(meta);
  answers.current = meta;
  /* ONLY LEAVING THE ROOM CANCELS, and that is now literally true. This used
     to be a `gone` flag set by the pump effect's own cleanup -- which runs on
     every change of `photos.length`, not just on unmount. So adding more
     photographs, or taking one out, while three were climbing threw away
     those three results: they sat half-faded for good, and Add sent each one
     a second time through the server, shrunk. A flag owned by the mount is
     the only thing that means "the room has gone". */
  const left = useRef(false);
  useEffect(() => {
    left.current = false;
    return () => {
      left.current = true;
    };
  }, []);
  useEffect(() => {
    if (added !== null) return;

    const pump = async () => {
      if (left.current || lifting.current >= LANES) return;
      /* Claimed in a ref, not in state, and that is the whole reason `claimed`
         exists. Three lanes start in the same tick; `setPhotos` has not
         committed by the time the second one reads the wall, so all three
         found the SAME photograph and uploaded it three times over. A Set
         written synchronously is the only thing that is true immediately. */
      const next = wall.current.find((p) => p.state === "waiting" && !claimed.current.has(p.id));
      if (!next) return;
      claimed.current.add(next.id);
      lifting.current += 1;
      setPhotos((prev) => prev.map((p) => (p.id === next.id ? { ...p, state: "lifting" } : p)));
      try {
        const staged = await directUploadPut(next.file, "collection", {
          signal: AbortSignal.timeout(putDeadline(next.file.size)),
        });
        if (!left.current) {
          setPhotos((prev) =>
            prev.map((p) =>
              p.id === next.id
                ? /* A null staging is not a failure: no R2 locally, or an
                     origin the bucket's CORS rule does not name. The proxied
                     path picks the file up when Add is pressed. */
                  { ...p, state: "here", ...(staged ? { key: staged.key } : {}) }
                : p
            )
          );
        }
      } catch {
        // A definitive verdict about the file (bad format, over the limit).
        // The photograph stays on the wall, marked, so it can be removed.
        if (!left.current) {
          setPhotos((prev) => prev.map((p) => (p.id === next.id ? { ...p, state: "failed" } : p)));
        }
      } finally {
        lifting.current -= 1;
        void pump();
      }
    };
    for (let lane = 0; lane < LANES; lane++) void pump();
  }, [photos.length, added]);

  /* ---------------- what the questions are answering ---------------- */

  /** The photograph in view. Clamped rather than trusted: a removal shortens
   *  the drop before the stage's scroll handler has said so. */
  const viewing = photos.length ? photos[Math.min(at, photos.length - 1)] : undefined;

  /** Photographs whose climb is over, landed or refused. */
  const landed = photos.filter((p) => p.state === "here" || p.state === "failed").length;

  /** The value the questions show. One photograph, so there is nothing to
   *  reconcile -- the old room had to work out what a multi-selection agreed
   *  on and draw the rest half-lit, and that whole apparatus went with it. */
  const shown: PhotoAnswers = (viewing && meta[viewing.id]) || EMPTY_ANSWERS;

  /** Write an answer onto the photograph in view. */
  const answer = useCallback(
    (patch: Partial<PhotoAnswers>) => {
      if (!viewing) return;
      setMeta((prev) => ({
        ...prev,
        [viewing.id]: { ...(prev[viewing.id] ?? EMPTY_ANSWERS), ...patch },
      }));
    },
    [viewing]
  );

  /** Copy the photograph in view's answers onto every photograph in the drop.
   *
   *  The one concession to the school photographer's hundred, and it is a
   *  press he asks for rather than a default he has to undo. Select-all-by-
   *  default was the old room's answer to the same problem and it was the
   *  wrong shape: it promised that one set of tags fits a drop nobody had
   *  looked through yet. */
  const applyToAll = useCallback(() => {
    if (!viewing) return;
    setMeta((prev) => {
      const one = prev[viewing.id] ?? EMPTY_ANSWERS;
      const next: Record<string, PhotoAnswers> = {};
      for (const p of photos) next[p.id] = { ...one };
      return next;
    });
  }, [viewing, photos]);

  /** Whether there is anything worth copying. The apply-to-all does not
   *  appear over six blank answers, so it cannot be pressed before it means
   *  anything. */
  const answered =
    shown.buckets.length > 0 || shown.caption.trim().length > 0 || shown.year !== "";

  function remove(id: string) {
    const going = photos.find((p) => p.id === id);
    if (going) {
      URL.revokeObjectURL(going.preview);
      live.current = live.current.filter((u) => u !== going.preview);
    }
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }

  /* ---------------- filing them ---------------- */

  /** Anything the server CHANGED about a photograph, said out loud: an
   *  animated GIF has just been flattened to its first frame (audit C-073).
   *  Collected across the batch and said once at the end rather than once per
   *  file, because forty toasts is not telling somebody something. */
  const notices = useRef<Set<string>>(new Set());

  async function fileOne(p: Staged, m0: PhotoAnswers = EMPTY_ANSWERS): Promise<boolean> {

    /* REFUSE RATHER THAN DROP IT. `photoDate` is total: it files anything it
       cannot read as "unknown", which is right for an empty box and silently
       wrong for a full one. Fifteen photographs went into the archive undated
       this way while the contributor watched her years sit in the field --
       see `yearUnreadable` in lib/collection.ts. This turns that into one
       sentence she can act on. */
    if (yearUnreadable(m0, valleyYear())) {
      throw new Error(
        `"${m0.year}" is not a year we can file. Use four digits for a year, or three for a decade.`
      );
    }

    const common = {
      caption: m0.caption.trim() || undefined,
      buckets: m0.buckets,
      ...photoDate(m0, valleyYear()),
    };

    if (p.key) {
      /* WHICH HALF only. The server derives whose class from the caller's own
         row, so naming a scope is not a way into somebody else's. */
      const res = await contributePhotoDirect({ key: p.key, scope, ...common });
      if (res.error) throw new Error(res.error);
      if (res.notice) notices.current.add(res.notice);
      return true;
    }

    /* The proxied fallback. Vercel refuses a body over about 4.5MB before the
       action runs, so a full-resolution original cannot go this way; shrinking
       loses something a heritage archive would rather keep, which is why it is
       the fallback and not the path. */
    const ready = await shrinkForUpload([p.file]);
    if (!ready.ok) throw new Error(ready.error);
    const fd = new FormData();
    fd.set("file", ready.files[0]);
    fd.set("scope", scope);
    if (common.caption) fd.set("caption", common.caption);
    for (const b of m0.buckets) fd.append("buckets", b);
    if (common.photoYear !== undefined) fd.set("photoYear", String(common.photoYear));
    if (common.photoMonth !== undefined) fd.set("photoMonth", String(common.photoMonth));
    if (common.era) fd.set("era", common.era);
    if (common.datePrecision) fd.set("datePrecision", common.datePrecision);
    const res = await contributePhoto(fd);
    if (res.error) throw new Error(res.error);
    if (res.notice) notices.current.add(res.notice);
    return true;
  }

  async function fileAll() {
    if (!photos.length || adding) return;
    setAdding(true);

    /* WAIT FOR THE CLIMB FIRST. Add used to file the wall as it stood at the
       press, so every photograph still on its way up had no key yet and was
       shrunk and sent AGAIN through the server while its full-resolution copy
       was still climbing -- twice the waiting, for a worse file. Every PUT
       carries its own deadline (`putDeadline`), so this always settles. The
       progress bar says how far it has got meanwhile. */
    await new Promise<void>((resolve) => {
      const settled = () =>
        left.current || !wall.current.some((p) => p.state === "waiting" || p.state === "lifting");
      if (settled()) return resolve();
      const t = setInterval(() => {
        if (!settled()) return;
        clearInterval(t);
        resolve();
      }, 200);
    });
    if (left.current) return;

    const batch = wall.current;
    const asked = answers.current;
    let done = 0;
    const failures: string[] = [];
    setFiling({ done: 0, total: batch.length });

    /* One at a time, deliberately. Each of these is a re-encode and two
       objects written, and the per-account rate limiter counts them; racing
       twenty of them at the server buys nothing the reader can see and is how
       a batch half-lands. */
    for (const p of batch) {
      // Discarded mid-way: stop, rather than go on filing what was thrown out.
      if (left.current) return;
      try {
        await fileOne(p, asked[p.id]);
        done += 1;
      } catch (err) {
        const message = err instanceof Error ? err.message : "That one did not go through.";
        if (emailGate.handled(message)) break;
        failures.push(message);
      }
      setFiling({ done: done + failures.length, total: batch.length });
    }

    setAdding(false);
    setFiling(null);
    if (notices.current.size) {
      toast.info(
        notices.current.size === 1
          ? [...notices.current][0]
          : `${notices.current.size} animated photographs were saved as their first frame.`
      );
      notices.current = new Set();
    }
    if (done === 0) {
      toast.error(failures[0] ?? "Nothing could be added just now. Try again in a moment.");
      return;
    }
    if (failures.length) {
      toast.error(
        failures.length === 1
          ? failures[0]
          : `${failures.length} photographs did not go through. ${failures[0]}`
      );
    }
    live.current.forEach((u) => URL.revokeObjectURL(u));
    live.current = [];
    setPhotos([]);
    setMeta({});
    setAt(0);
    setAdded(done);
    // So the Collection behind this room already holds them when it is opened.
    router.refresh();
  }

  /* ---------------- what to draw ---------------- */

  if (added !== null) {
    return (
      <Finish
        count={added}
        autoApproved={autoApproved}
        onDone={onDone}
        onAgain={() => {
          setAdded(null);
          claimed.current = new Set();
        }}
      />
    );
  }

  return (
    <>
      {emailGate.dialog}
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          void accept([...(e.target.files ?? [])]);
          // So choosing the same file twice in a row still fires.
          e.target.value = "";
        }}
      />

      {/* The drop. There is nothing to aim at, so the whole window takes it,
          and the frame is the only thing that says so -- a scrim would hide
          the photographs already on the wall behind it. */}
      <AnimatePresence>
        {dragging && (
          <m.div
            key="drop"
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: EASE_OUT_SMOOTH }}
            className="pointer-events-none fixed inset-4 z-[var(--z-overlay)] rounded-[var(--radius-xl)] border-2 border-canopy bg-canopy/[0.06]"
          >
            <span className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-canopy px-4 py-2 text-[13.5px] font-semibold text-white shadow-[0_6px_20px_rgba(30,28,22,0.18)]">
              Let them go
            </span>
          </m.div>
        )}
      </AnimatePresence>


      {photos.length === 0 ? (
        <Invitation
          reading={reading}
          autoApproved={autoApproved}
          onChoose={() => fileInput.current?.click()}
        />
      ) : (
        /* ONE SHAPE, whatever the count -- which is the whole point of the
           carousel. The room used to branch: a column for one photograph, a
           wall with a panel beside it for several, and a glass ladder to fit
           both. The stage shows one picture either way, so the layout is the
           same two columns for one photograph as for a hundred, and the only
           thing the count changes is whether the stage draws its arrows.

           Stacked on a phone, side by side from `lg`. Side by side is what
           keeps the pop-up short on a laptop: the questions are about 500px
           of column, and putting them UNDER a 380px stage would be a dialog
           you scroll to reach the button. */
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-8">
          <div className="min-w-0 lg:flex-1">
            <ContributeStage
              /* The stage is told about pictures, not about files: it has no
                 business knowing what an upload key is. */
              photos={photos.map((p) => ({
                id: p.id,
                preview: p.preview,
                name: p.file.name,
                width: p.width,
                height: p.height,
                landed: p.state === "here",
                failed: p.state === "failed",
              }))}
              at={at}
              onAt={setAt}
              onRemove={remove}
            />
          </div>

          {/* The asking. In the owner's order (2026-08-28): what it is of
              first, then when, then the description -- which is roughly the
              order somebody knows those three things about an old
              photograph, and it puts the one-tap question at the top where
              the answer rate is highest. */}
          <aside className="w-full lg:w-[360px] lg:shrink-0">
            <PhotoQuestions idPrefix="contribute" value={shown} onAnswer={answer} />

            {/* WHAT THE FILE SAYS, straight under the questions' card and not
                inside it: the card is one grouped form, and a filled strip
                among its rows would be a second material in it. The review
                room draws the same strip higher in its own panel. */}
            <AnimatePresence initial={false}>
              {viewing?.taken && (
                <Grow key="file-says">
                  <FileSays date={viewing.taken} answers={shown} onAnswer={answer} className="mt-3" />
                </Grow>
              )}
            </AnimatePresence>

            <ApplyToAll
              count={photos.length}
              ready={photos.length > 1 && answered}
              onApply={applyToAll}
            />

            {/* HOW FAR IT HAS GOT. The photograph in view develops as it lands,
                but that is one photograph of a hundred, and "Adding..." on a
                button for three minutes reads as hung (owner, 2026-09-15:
                "don't know if it's working or it's hung or how long"). One
                count and one bar for the whole drop, through both halves of
                the wait, and the one thing not to do said beside it. Gone
                again the moment there is nothing left to wait for. */}
            <AnimatePresence initial={false}>
              {(adding || landed < photos.length) && (
                <Grow key="climb">
                  <Climb
                    verb={filing ? "Adding" : "Uploading"}
                    done={filing ? filing.done : landed}
                    total={filing ? filing.total : photos.length}
                  />
                </Grow>
              )}
            </AnimatePresence>

            {/* ONE FOOTER ROW, and "Add more" lives in it now. It used to be
                the third item in a meta line above the wall -- which is what
                put a gap between the title and it, and the owner asked for
                it to go somewhere else. Here it is the secondary half of the
                one decision left to make about this drop, beside the
                primary. */}
            <div className="mt-4 flex items-center gap-2">
              <Button
                variant="outline"
                className="shrink-0 rounded-full"
                onClick={() => fileInput.current?.click()}
              >
                Add more
              </Button>
              <Button
                variant="primary"
                className="min-w-0 flex-1 rounded-full"
                disabled={adding}
                onClick={fileAll}
              >
                {adding
                  ? "Adding..."
                  : `Add ${photos.length} ${photos.length === 1 ? "photograph" : "photographs"}`}
              </Button>
            </div>
            {reading > 0 && (
              <p className="mt-2 text-center text-[14px] text-muted-foreground">
                Reading {reading}...
              </p>
            )}
            {/* Same as the invitation: only the half that is news. */}
            {!autoApproved && (
              <p className="mt-2 text-center text-[13px] leading-relaxed text-muted-foreground">
                An admin looks at new photographs before they appear.
              </p>
            )}
          </aside>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ *
 *  USE THESE ANSWERS FOR ALL OF THEM.
 *
 *  The carousel's one concession to somebody holding a hundred
 *  photographs, and the shape of it is the argument. The room used to
 *  select everything on arrival, so one caption and one bucket press
 *  filed a whole drop -- fast, and quietly wrong, because it assumed a
 *  drop is one subject. The owner: "when people upload photos they're
 *  generally not going to upload all bird photos, so it's not like the
 *  tags will carry on for each batch."
 *
 *  So the same power is here, but as something you reach for rather than
 *  something you have to undo, and it is held to three rules:
 *
 *  - IT IS NOT THERE UNTIL IT CAN DO ANYTHING. One photograph has no
 *    "all" to apply to, and blank answers have nothing to copy, so it
 *    grows in only once the current photograph has been given a bucket,
 *    a decade or a word.
 *  - IT CONFIRMS IN PLACE. A toast for something you did to the panel
 *    you are looking at is a notification about the room you are in.
 *  - IT IS AN OUTLINE, NOT A FILL. The one filled pill in this column is
 *    the one that ends the task.
 * ------------------------------------------------------------------ */
function ApplyToAll({
  count,
  ready,
  onApply,
}: {
  count: number;
  ready: boolean;
  onApply: () => void;
}) {
  const [done, setDone] = useState(false);

  /* The confirmation is temporary, and deliberately so: change an answer
     after applying and the offer comes back, because it now means something
     different from what was applied. */
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(false), 2400);
    return () => clearTimeout(t);
  }, [done]);

  return (
    <AnimatePresence initial={false}>
      {ready && (
        <Grow key="all">
          <div className="pt-4">
            <m.button
              type="button"
              onClick={() => {
                onApply();
                setDone(true);
              }}
              whileTap={{ scale: 0.98 }}
              transition={SPRINGS.snappy}
              className={cn(
                "w-full rounded-full border px-4 py-2.5 text-[14px] font-semibold",
                "transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-canopy",
                done
                  ? "border-canopy bg-canopy/[0.08] text-canopy"
                  : "state-layer border-border text-canopy"
              )}
            >
              {done ? `Applied to all ${count}` : `Use these answers for all ${count}`}
            </m.button>
          </div>
        </Grow>
      )}
    </AnimatePresence>
  );
}

/** The drop's progress: a count, the one instruction, and a bar.
 *
 *  A count and not a percentage, because photographs are the unit somebody
 *  dropped. The bar is a `scaleX` on a full-width fill, so only a transform
 *  animates. Not a live region: a hundred announcements is not telling
 *  anybody anything, so it is a progressbar that is read when asked. */
function Climb({
  verb,
  done,
  total,
}: {
  verb: "Uploading" | "Adding";
  done: number;
  total: number;
}) {
  return (
    <div className="pt-4">
      <div className="flex items-baseline justify-between gap-3 text-[13px]">
        <span className="font-semibold tabular-nums text-foreground">
          {verb} {done} of {total}
        </span>
        <span className="text-muted-foreground">Keep this tab open</span>
      </div>
      <div
        role="progressbar"
        aria-label={`${verb} photographs`}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <m.div
          className="h-full origin-left bg-canopy"
          initial={false}
          animate={{ scaleX: total ? done / total : 0 }}
          transition={{ duration: 0.4, ease: EASE_OUT_SMOOTH }}
        />
      </div>
    </div>
  );
}

/** A block that grows into the column rather than sliding over it.
 *
 *  Height, not transform, and on purpose: the two things that use it -- the
 *  file's date strip and "Use these answers for all" -- genuinely take up
 *  room they did not have, and sliding one in would lay it over the buttons
 *  underneath instead of making space. Both come and go as the carousel
 *  moves, so they share one curve. */
function Grow({ children }: { children: ReactNode }) {
  return (
    <m.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.24, ease: EASE_OUT_SMOOTH }}
      className="overflow-hidden"
    >
      {children}
    </m.div>
  );
}

/** Before anything has been dropped: the title above says what the room is
 *  for, and this is the one thing under it -- a dashed well you can drop on,
 *  press, or (where a clipboard exists) paste into.
 *
 *  This replaces the 2026-08-28 stack of icon + 22px sentence + subtitle +
 *  "Browse your photographs" pill: four centred elements to say one thing,
 *  with the input methods set as the heading and no drawn target to aim at.
 *  The owner, 2026-08-29: "I like the dotted line and the clear box to drop
 *  in... I don't want a CTA, this is much nicer" -- which also reverses that
 *  pass's "no dashes" call, deliberately. The well wears the same material as
 *  every other drop surface (`wellClass`, the menu-material pattern), so
 *  "dashed box = photographs go here" is now one fact about the whole app.
 *
 *  No drop/paste wiring here -- the room already listens on the WINDOW
 *  (better than any box), and the full-viewport canopy frame answers a drag.
 *  The well stays quiet while that frame is up; two green signals for one
 *  gesture would be noise. It is a button whose look promises what the room
 *  around it delivers.
 */
function Invitation({
  reading,
  autoApproved,
  onChoose,
}: {
  reading: number;
  autoApproved: boolean;
  onChoose: () => void;
}) {
  const canDrag = usePointerFine();
  return (
    /* No bottom padding of its own: the scroller's pb-5/6 already closes the
       panel, and matching the header's 20px keeps the frame symmetric --
       44px under the well against 20px over the title read bottom-heavy. */
    <div className="flex flex-col px-2">
      <SpringPress
        as="button"
        onClick={onChoose}
        {...WELL_PRESS}
        className={cn(
          wellClass(false),
          "py-12 state-layer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        )}
        {...({ type: "button" } as object)}
      >
        <m.span
          aria-hidden
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={SPRINGS.gentle}
          className="text-canopy"
        >
          {/* 36, not the 44 the old stack used: next to a 14px line inside a
              bordered well, 44 dwarfed its own caption; 36 keeps the icon the
              anchor without making it the headline. */}
          <Images size={36} weight="duotone" />
        </m.span>
        <span className="text-sm font-medium">
          {reading > 0
            ? `Reading ${reading} photographs...`
            : canDrag
              ? "Drop photographs here, or click to browse"
              : /* A phone has no cursor to drag with, so it is told the one
                   thing a tap actually does. */
                "Add your photographs"}
        </span>
      </SpringPress>
      {/* Only the half of this that is news. "Yours go straight into the
          Collection" told a trusted contributor the default, which is not
          worth a line; that an admin will look first genuinely changes what
          the next screen means, so that one stays. */}
      {!autoApproved && (
        <p className="mt-3 text-center text-[12px] text-muted-foreground">
          An admin looks at new photographs before they appear.
        </p>
      )}
    </div>
  );
}

/** After. A count in the house voice rather than a toast, and the one
 *  appearance of the bird this flow gets. */
function Finish({
  count,
  autoApproved,
  onAgain,
  onDone,
}: {
  count: number;
  autoApproved: boolean;
  onAgain: () => void;
  onDone?: () => void;
}) {
  const WORDS = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve",
  ];
  const said = count <= 12 ? WORDS[count] : count.toLocaleString();
  const many = count !== 1;
  return (
    <div className="flex min-h-[58vh] flex-col items-center justify-center px-6 text-center">
      {/* `mb-6`, not `mb-1`: the bird was sitting on the heading. It needs
          room to hop in, and a celebration that lands on the words it is
          celebrating reads as a collision (owner, 2026-08-29: "move the
          hoopoe slightly higher, it's sitting too close to the title"). */}
      <ContributedHoopoe className="mb-6" />
      {/* The thanks is the heading now. It used to be "Three photographs,
          added to the valley's memory" -- an accurate receipt, and a receipt
          is not what this screen is for. The count is still said, one line
          down, where it belongs: it is the detail, not the point. */}
      {/* Balanced, both of them. Left alone the count broke as "Three
          photographs are in the Collection / now." -- a two-word runt, which
          is the same ragged wrap the owner threw out of the (i) note. */}
      <p className="max-w-lg text-balance font-heading text-lede leading-snug tracking-[-0.02em] text-foreground">
        Thank you for your contribution.
      </p>
      <p className="mt-2 max-w-sm text-balance text-[15px] leading-relaxed text-muted-foreground">
        {said} {many ? "photographs" : "photograph"}{" "}
        {autoApproved
          ? `${many ? "are" : "is"} in the Collection now.`
          : `${many ? "are" : "is"} with an admin to look at, and then in the Collection.`}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
        {/* Closing the pop-up IS seeing them: the Collection is the page
            behind it, and it already refreshed when they landed. */}
        <Button variant="primary" className="rounded-full" onClick={onDone}>
          See them in the Collection
        </Button>
        <Button variant="outline" className="rounded-full" onClick={onAgain}>
          Add more
        </Button>
      </div>
    </div>
  );
}
