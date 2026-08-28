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
 *  description on the signup's float-label material, "when" is decade
 *  pills instead of two dropdowns, and nothing at rest is filled with
 *  cream -- "I don't like the yellowing when it's not selecting."
 * ------------------------------------------------------------------ */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { m, AnimatePresence } from "motion/react";
import { CaretDown, Images } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FIELD_PAD,
  FLOAT_LABEL_BASE,
  FLOAT_LABEL_REST,
  FLOAT_LABEL_UP,
  FloatArea,
} from "@/components/common/float-field";
import { EASE_OUT_SMOOTH, SPRINGS } from "@/components/common/motion";
import { ContributedHoopoe } from "@/components/mascot/moments/contributed-hoopoe";
import { useEmailGate } from "@/components/auth/verify-email-dialog";
import { eraFromPartial, eraSaid, MONTHS, photoDate, yearGiven } from "@/lib/collection";
import { contributePhoto, contributePhotoDirect } from "@/app/(main)/collection/actions";
import { directUploadPut } from "@/lib/upload-client";
import { shrinkForUpload } from "@/lib/image-downscale";
import { MAX_UPLOAD_BYTES, isImageFile } from "@/lib/upload-shared";
import { valleyYear } from "@/lib/utils";
import { BucketTiles } from "./bucket-tiles";
import { ContributeStage } from "./contribute-stage";
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
};

/** What the questions answer, per photograph.
 *
 *  `area` used to be here as a third field, "Where in the valley?". The
 *  owner deleted it: "remove where in the valley. we should prompt them to
 *  include that in the description." Two boxes asking for prose about one
 *  photograph is how you get one of them left blank; search cannot tell the
 *  two columns apart anyway (spec §7.2), so the place is now something the
 *  description's own hint asks for. Existing rows keep whatever they were
 *  given, and the viewer still prints it.
 *
 *  The date is three fields because a contributor may know any amount:
 *  nothing (leave it), a decade (one press), a year, a month. `decade` is ""
 *  for "nobody said", never "unknown" -- nothing lit is the resting state,
 *  and a lit "Not sure" pill that meant exactly the same thing was the one
 *  cruelty in the old two-dropdown version. */
type Meta = {
  caption: string;
  buckets: string[];
  /** Digits as typed, up to four. THE ONLY DATE FIELD THERE IS NOW.
   *
   *  There used to be a `decade` beside it, holding one of ten pills or the
   *  word "unknown". The owner scrapped the pills outright (2026-08-28) and
   *  the field absorbed what they did: three digits is a decade, four is a
   *  year, nothing is nothing. So a contributor stops typing when they run
   *  out of certainty rather than choosing which of two controls matches how
   *  much they know. See `dateMeta`. */
  year: string;
  /** A month name from MONTHS, or "" -- and only ever alongside a real year,
   *  because a month with no year is not something the archive can file. */
  month: string;
};

const EMPTY_META: Meta = {
  caption: "",
  buckets: [],
  year: "",
  month: "",
};

/* The date rule -- what one box of digits means to the archive -- lives in
   `lib/collection.ts` beside the eras themselves, because it is a fact about
   what gets stored rather than a detail of this screen, and because it is
   pure there and pinned by `collection-date.test.mjs`. */

/** Whether this is a machine with a cursor and a clipboard you can paste
 *  from -- which is the honest test for "should the invitation say the word
 *  clipboard". Not a width: a 1024px iPad has neither, and a small laptop
 *  window has both.
 *
 *  False until the first effect runs, so the server and the first client
 *  frame agree and the heading never swaps under a reader. The safe default
 *  is the shorter sentence: a phone that briefly reads "drag and drop or
 *  browse" is right, a desktop that briefly omits paste loses nothing. */
function usePointerFine(): boolean {
  const [fine, setFine] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setFine(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return fine;
}

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
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  autoApproved: boolean;
  roomLeft: number;
}) {
  const [wall, setWall] = useState(0);
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
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
          className={cn(
            "shrink-0 text-left",
            /* ONE HEADING ON SCREEN AT A TIME, and which one depends on
               what the room is doing.

               With photographs on the wall this is the room's name and it
               sits where a dialog title belongs. With nothing dropped yet
               the invitation below owns the words -- the owner asked for
               "drag and drop, browse or paste from your clipboard" to be
               THE heading -- and a second, smaller heading above it read
               as a mistake rather than a hierarchy: "the title small than
               the rest it looks so ruined". So the title goes to the
               screen readers only, and the sentence he asked for is the
               only thing set large. */
            /* TIGHTER. Between the title and the first picture sat the
               header's 20px, the scroller's 16px and a 13px meta row with
               12px under it -- about 55px of nothing, on the screen whose
               whole problem is height. The owner: "there's a big gap between
               the title and the first picture." The meta row is deleted
               outright (see the stage) and these two are trimmed. */
            wall > 0 ? "px-5 pt-4 sm:px-6 sm:pt-5" : "sr-only"
          )}
        >
          {/* pr-10 clears the close button, which sits inside the panel at
              the top right: at 390px the title ran straight into it. */}
          {/* 20px on a phone: at 23px "Add to the valley's memory" wraps to two
              lines inside 326px of Libre Baskerville, which is 30px of exactly
              the height this pass exists to give back. */}
          <DialogTitle className="pr-10 font-heading text-[20px] leading-tight tracking-[-0.02em] sm:text-[23px]">
            Add to the valley&rsquo;s memory
          </DialogTitle>
          {/* No description under the title. It said "Paste, drop or browse.
              As many photographs as you like, all at once" -- the same
              sentence the invitation below says in larger type, six
              centimetres lower, which is where the eye actually is. Two
              copies of one instruction is one too many (owner, 2026-08-28).
              A DialogTitle carries the accessible name on its own. */}
        </DialogHeader>
        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto px-5 pb-5 sm:px-6 sm:pb-6",
            // With the title hidden, the close button has nothing above the
            // content to sit beside, so the room makes room for it itself.
            wall > 0 ? "pt-3" : "pt-11 sm:pt-12"
          )}
        >
          <ContributeRoom
            autoApproved={autoApproved}
            roomLeft={roomLeft}
            active={open}
            onWall={setWall}
            onDone={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ContributeRoom({
  autoApproved,
  roomLeft,
  active = true,
  onWall,
  onDone,
}: {
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
  const [meta, setMeta] = useState<Record<string, Meta>>({});
  const [reading, setReading] = useState(0);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

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
      const heic = incoming.filter(
        (f) => f.type === "image/heic" || f.type === "image/heif" || /\.hei[cf]$/i.test(f.name)
      );
      const heavy = images.filter((f) => f.size > MAX_UPLOAD_BYTES);
      const ok = images.filter((f) => f.size <= MAX_UPLOAD_BYTES);

      if (heic.length) {
        toast.error(
          heic.length === 1
            ? "HEIC photos aren't supported yet. Export it as JPG and try again."
            : `${heic.length} HEIC photos were left out. Export them as JPG and try again.`
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

      /* The quota is the server's rule, checked per contribution. Saying it
         here means nobody drops two hundred photographs and finds out at the
         end that only forty could go. */
      const room = Math.max(0, roomLeft - photos.length);
      const taking = ok.slice(0, room);
      if (taking.length < ok.length) {
        toast.error(
          room === 0
            ? "This account has reached the number of photographs it can add. Message the admins if you have more to share."
            : `Only ${room} more photographs will fit on this account, so that many were taken.`
        );
      }
      if (!taking.length) return;

      setReading((n) => n + taking.length);
      /* Measured before anything is drawn. The rows are justified from the
         real shapes, so a wall that rendered each photograph as its dimensions
         arrived would relayout under the reader once per file -- which is the
         page-jump this whole campaign exists to end. */
      const measured = await Promise.all(taking.map(measure));
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
        for (const f of fresh) next[f.id] = { ...EMPTY_META };
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
  useEffect(() => {
    if (added !== null) return;
    let gone = false;

    const pump = async () => {
      if (gone || lifting.current >= LANES) return;
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
        if (!gone) {
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
        if (!gone) {
          setPhotos((prev) => prev.map((p) => (p.id === next.id ? { ...p, state: "failed" } : p)));
        }
      } finally {
        lifting.current -= 1;
        void pump();
      }
    };
    for (let lane = 0; lane < LANES; lane++) void pump();
    return () => {
      gone = true;
    };
  }, [photos.length, added]);

  /* ---------------- what the questions are answering ---------------- */

  /** The photograph in view. Clamped rather than trusted: a removal shortens
   *  the drop before the stage's scroll handler has said so. */
  const viewing = photos.length ? photos[Math.min(at, photos.length - 1)] : undefined;

  /** The value the questions show. One photograph, so there is nothing to
   *  reconcile -- the old room had to work out what a multi-selection agreed
   *  on and draw the rest half-lit, and that whole apparatus went with it. */
  const shown: Meta = (viewing && meta[viewing.id]) || EMPTY_META;

  /** Write an answer onto the photograph in view. */
  const answer = useCallback(
    (patch: Partial<Meta>) => {
      if (!viewing) return;
      setMeta((prev) => ({
        ...prev,
        [viewing.id]: { ...(prev[viewing.id] ?? EMPTY_META), ...patch },
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
      const one = prev[viewing.id] ?? EMPTY_META;
      const next: Record<string, Meta> = {};
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

  async function fileOne(p: Staged): Promise<boolean> {
    const m0 = meta[p.id] ?? EMPTY_META;
    const common = {
      caption: m0.caption.trim() || undefined,
      buckets: m0.buckets,
      ...photoDate(m0, valleyYear()),
    };

    if (p.key) {
      const res = await contributePhotoDirect({ key: p.key, ...common });
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
    let done = 0;
    const failures: string[] = [];

    /* One at a time, deliberately. Each of these is a re-encode and two
       objects written, and the per-account rate limiter counts them; racing
       twenty of them at the server buys nothing the reader can see and is how
       a batch half-lands. */
    for (const p of photos) {
      try {
        await fileOne(p);
        done += 1;
      } catch (err) {
        const message = err instanceof Error ? err.message : "That one did not go through.";
        if (emailGate.handled(message)) break;
        failures.push(message);
      }
    }

    setAdding(false);
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
            {/* 15px, not 13.5. These three headings are the questions
                themselves, and the owner's read of the type across this
                flow was that it had stopped respecting the reader: "we have
                to make sure we don't use fonts that are too small on mobile,
                because this is getting to become a bad accessibility
                thing." */}
            <p className="mb-2 text-[15px] font-semibold text-foreground">What is it of?</p>
            <BucketTiles
              value={shown.buckets}
              onChange={(next) => answer({ buckets: next })}
            />

            {/* ONE CARD, TWO ROWS, ONE FRAME. These were two separately
                bordered boxes under a heading each, which is four shapes
                where the eye wants one: "an excess of elements and border...
                overcrowded and disgusting" (owner, 2026-08-28). Grouped, they
                read as a single form the way an inset list does, and the
                float labels are the headings -- so two headings went too.

                `overflow-hidden` is what lets the group's radius clip rows
                that draw no radius of their own. */}
            <div className="mt-5 overflow-hidden rounded-[var(--radius-input)] border border-border">
              <WhenField meta={shown} onAnswer={answer} />

              {/* THE DESCRIPTION, and it is the one prose field left.

                  The label was "What is this photograph?" and the owner cut
                  it back: "don't say what is this photograph, we can just say
                  add a description." A question mark on a form is a thing you
                  owe an answer to; a label is a box you may use.

                  The hint behind the (i) lost three things and kept one.
                  Gone: the bolding on what/where/who ("I don't want to bold
                  this"), "if you know", and "a line is plenty, and nothing is
                  required" -- two hedges apologising for a question that had
                  already been asked gently. Kept: the three prompts
                  themselves, because where-in-the-valley used to be a second
                  box and this sentence is now the only place it is asked for. */}
              <div className="border-t border-border">
                <FloatArea
                  id="contribute-caption"
                  label="Add a description"
                  bare
                  /* ONE row, not two. It grows from there, so the box is the
                     size of what you have written rather than the size of
                     what you might write -- and an empty one now matches the
                     date row above it instead of towering over it. */
                  rows={1}
                  maxLength={300}
                  value={shown.caption}
                  onChange={(e) => answer({ caption: e.target.value.slice(0, 300) })}
                  hint="Anything you remember. What is happening, where in the valley it was, and who is in it."
                />
              </div>
            </div>

            <ApplyToAll
              count={photos.length}
              ready={photos.length > 1 && answered}
              onApply={applyToAll}
            />

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
        <m.div
          key="all"
          /* Height, for the same reason WhenAsked's finer row uses it: the
             block genuinely takes up space it did not before, and sliding it
             in would put it over the button underneath instead of making
             room. One 40px block, animated on a press. */
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.24, ease: EASE_OUT_SMOOTH }}
          className="overflow-hidden"
        >
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
        </m.div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ *
 *  WHEN WAS IT TAKEN -- one box, and you stop typing when you run out
 *  of certainty.
 *
 *  What this replaces: ten decade pills, an "I don't know" pill, and a
 *  grow-in row holding a bordered year input and a bordered month
 *  dropdown. Thirteen controls to answer one question. The owner:
 *  "looking at that box I'm seeing it just has an excess of elements and
 *  border, it's not smart and sleek at all, it's just overcrowded and
 *  disgusting. we need to hold ourselves to a higher standard."
 *
 *  THE IDEA IS THAT THE FIELD UNDERSTANDS A PARTIAL ANSWER. Nobody
 *  chooses between "a decade" and "a year" any more, because that was
 *  never a choice about the photograph -- it was a choice about which of
 *  our controls matched how much they remembered. Here there is one
 *  numeric box, and how much you type IS the precision:
 *
 *      (blank)  nothing said, which the archive files as unknown
 *      197      the 1970s
 *      1978     1978, and only now does a month exist
 *      1978 + March
 *
 *  AND THE LABEL SAYS WHAT IT UNDERSTOOD, but only when it has something
 *  to add. At three digits it reads "Filed under the 1970s", because
 *  "197" is not self-evidently an answer and a person needs to know they
 *  can stop. At four it goes back to the question, because the year is
 *  sitting right there and a label repeating it is one more thing to
 *  read. That is the whole of the cleverness and it costs no elements:
 *  the floating label was already there.
 *
 *  MONTH ONLY EXISTS ONCE A YEAR DOES. The owner asked the question
 *  himself and left it open -- "do we show year and month or show month
 *  only after they put year? idk." The answer is in `dateMeta`: a month
 *  without a year is not something the archive can store, so a Month
 *  control sitting beside an empty box would be a permanently dead
 *  element, which is the exact complaint above. It fades in on opacity
 *  when the year becomes real, and it is text and a caret rather than a
 *  fourth bordered box.
 *
 *  The material is the signup's, not a copy of the signup: FIELD_PAD,
 *  FLOAT_LABEL_* and the JS-tracked focus are the shared primitives
 *  <PhoneField> is built from (float-field.tsx says so in as many
 *  words). What is different is everything the job is: no mist fill,
 *  because this floats on a white pop-up where a warm fill is the
 *  "yellowing"; no frame of its own, because it is the top row of a
 *  grouped card; and a label that reports rather than only names.
 * ------------------------------------------------------------------ */
function WhenField({
  meta,
  onAnswer,
}: {
  meta: Meta;
  onAnswer: (patch: Partial<Meta>) => void;
}) {
  const [focused, setFocused] = useState(false);
  const yearRef = useRef<HTMLInputElement>(null);
  const exact = yearGiven(meta.year, valleyYear());
  const era = eraFromPartial(meta.year);
  const active = focused || meta.year !== "";

  /* The label reports only when it can say something the box does not
     already show. See the note above. */
  const says = era ? `Filed under ${eraSaid(era)}` : "When was it taken?";

  return (
    <div
      className="relative h-14 w-full"
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setFocused(false);
      }}
      /* The whole row is one target: a press on the padding, or on the empty
         middle, lands in the year rather than on nothing. Same call
         <PhoneField> makes. */
      onClick={(e) => {
        if (!(e.target instanceof HTMLInputElement) && !(e.target as HTMLElement).closest("button")) {
          yearRef.current?.focus();
        }
      }}
    >
      <div className={cn("flex h-full items-center", FIELD_PAD)}>
        <input
          ref={yearRef}
          id="contribute-year"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          maxLength={4}
          /* Revealed on focus only, so the resting box holds one piece of
             text and not two -- FloatField's `focusHint` rule. */
          placeholder="1978"
          value={meta.year}
          onChange={(e) => {
            const year = e.target.value.replace(/\D/g, "").slice(0, 4);
            /* A month cannot outlive the year it belonged to. */
            onAnswer(yearGiven(year, valleyYear()) ? { year } : { year, month: "" });
          }}
          className={cn(
            "w-[4.25rem] shrink-0 bg-transparent text-base tabular-nums text-foreground outline-none",
            "placeholder:text-muted-foreground/60 placeholder:opacity-0 placeholder:transition-opacity placeholder:duration-200 focus:placeholder:opacity-100"
          )}
        />

        {/* Opacity only, and it never moves the row: the year is a fixed
            width, so the month has always had its place whether or not it is
            drawn yet. */}
        <div
          className={cn(
            "ml-auto transition-opacity duration-200",
            exact ? "opacity-100" : "pointer-events-none opacity-0"
          )}
        >
          <DropdownMenu>
            <DropdownMenuTrigger
              tabIndex={exact ? 0 : -1}
              aria-label={meta.month ? `Month: ${meta.month}. Change` : "Add a month"}
              className={cn(
                "state-layer -mx-1 inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-1 py-0.5",
                "text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                meta.month ? "font-medium text-foreground" : "text-muted-foreground"
              )}
            >
              {meta.month || "Month"}
              <CaretDown size={11} weight="bold" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-64 w-auto min-w-36 overflow-y-auto">
              {/* First, and unlabelled as a clearing action, because taking
                  the month back off is the same gesture as choosing one. */}
              <DropdownMenuItem
                onClick={() => onAnswer({ month: "" })}
                className="px-2 py-2"
              >
                <span className={cn("text-[14px]", !meta.month && "font-semibold text-canopy")}>
                  No month
                </span>
              </DropdownMenuItem>
              {MONTHS.map((mo) => (
                <DropdownMenuItem key={mo} onClick={() => onAnswer({ month: mo })} className="px-2 py-2">
                  <span className={cn("text-[14px]", meta.month === mo && "font-semibold text-canopy")}>
                    {mo}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <label
        htmlFor="contribute-year"
        className={cn(FLOAT_LABEL_BASE, active ? FLOAT_LABEL_UP : FLOAT_LABEL_REST)}
      >
        {/* The float itself is transform-only, per the material's own rule;
            the TEXT swap is a crossfade, so "When was it taken?" becoming
            "Filed under the 1970s" reads as the field answering rather than
            as a word replaced. */}
        <AnimatePresence mode="wait" initial={false}>
          <m.span
            key={says}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14, ease: EASE_OUT_SMOOTH }}
            className="block whitespace-nowrap"
          >
            {says}
          </m.span>
        </AnimatePresence>
      </label>
    </div>
  );
}

/** Before anything has been dropped.
 *
 *  Three things the owner changed on 2026-08-28, and each is visible here:
 *
 *  1. IT IS SMALLER. It used to reserve `min-h-[54vh]` and 64px of vertical
 *     padding around a 64px glyph -- "make the box smaller it's
 *     unnecessarily big" -- for a screen whose whole job is one sentence and
 *     one button.
 *  2. IT IS NOT CREAM. `bg-card` on a pure-white pop-up is the "yellowing"
 *     he asked to be rid of. The box keeps its border, which is what tells
 *     you where to drop; there is nothing else it needs.
 *  3. THE HEADING NAMES THE THREE WAYS IN, and names the clipboard only
 *     where there is one. A phone has no paste, and offering it there is a
 *     door painted on a wall.
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
  const canPaste = usePointerFine();
  return (
    /* No box. There used to be a bordered card here holding the invitation,
       inside a bordered white pop-up holding the card -- two frames around
       one sentence, and the inner one was the "unnecessarily big" thing.
       The pop-up is small now and IS the place to aim; the moment a file is
       actually over the window, the canopy frame that spans the whole
       viewport says so far more clearly than a rectangle could. No dashes
       anywhere either: a dashed rectangle is the one shape that would make
       this look like the file manager the owner said it must not be. */
    <div className="flex flex-col items-center justify-center px-2 pb-8 text-center">
      <m.span
        aria-hidden
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={SPRINGS.gentle}
        className="mb-4 text-canopy"
      >
        <Images size={44} weight="duotone" />
      </m.span>
      <p className="max-w-xl font-heading text-[22px] leading-snug tracking-[-0.015em] text-foreground">
        {reading > 0
          ? `Reading ${reading} photographs...`
          : canPaste
            ? "Drag and drop, browse or paste from your clipboard"
            : /* A phone has neither a cursor to drag with nor a paste this
                 room can hear, so it is told what it can actually do. */
              "Add your photographs"}
      </p>
      <p className="mt-2 max-w-md text-[14.5px] leading-relaxed text-muted-foreground">
        As many photos as you like. Please provide descriptions if possible!
      </p>
      <Button variant="primary" className="mt-6 rounded-full px-6" onClick={onChoose}>
        Browse your photographs
      </Button>
      {/* Only the half of this that is news. "Yours go straight into the
          Collection" told a trusted contributor the default, which is not
          worth a line; that an admin will look first genuinely changes what
          the next screen means, so that one stays. */}
      {!autoApproved && (
        <p className="mt-4 text-[12px] text-muted-foreground">
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
  return (
    <div className="flex min-h-[58vh] flex-col items-center justify-center px-6 text-center">
      <ContributedHoopoe className="mb-1" />
      <p className="max-w-lg font-heading text-[26px] leading-snug tracking-[-0.02em] text-foreground">
        {said} {count === 1 ? "photograph" : "photographs"}, added to the valley&rsquo;s memory.
      </p>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {autoApproved
          ? "They are in the Collection now."
          : "An admin will look at them shortly, and then they are in the Collection."}
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
