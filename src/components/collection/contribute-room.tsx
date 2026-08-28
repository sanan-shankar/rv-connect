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

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { m, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { Images } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PhotoStream } from "@/components/common/photo-rows";
import { FloatArea } from "@/components/common/float-field";
import { EASE_OUT_SMOOTH, SPRINGS } from "@/components/common/motion";
import { ContributedHoopoe } from "@/components/mascot/moments/contributed-hoopoe";
import { useEmailGate } from "@/components/auth/verify-email-dialog";
import { ERAS, PHOTO_YEAR_MIN } from "@/lib/collection";
import { contributePhoto, contributePhotoDirect } from "@/app/(main)/collection/actions";
import { directUploadPut } from "@/lib/upload-client";
import { shrinkForUpload } from "@/lib/image-downscale";
import { MAX_UPLOAD_BYTES, isImageFile } from "@/lib/upload-shared";
import { valleyYear } from "@/lib/utils";
import { BucketTiles } from "./bucket-tiles";
import { cn } from "@/lib/utils";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** How many files climb to the bucket at once. Three, because a browser gives
 *  six connections per origin and the rest of the page still has to load its
 *  own thumbnails while this runs. */
const LANES = 3;

/** How many photographs stagger their entrance. Past this they all arrive
 *  together: a 40ms step across two hundred tiles is eight seconds of waiting
 *  for the last one, which is a queue again. */
const STAGGER_CAP = 18;

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
  /** An ERAS value, or "" when nobody has said. */
  decade: string;
  /** Digits as typed. Only counts once it is a real four-digit year. */
  year: string;
  /** A month name from MONTHS, or "" -- and only ever alongside a year. */
  month: string;
};

const EMPTY_META: Meta = {
  caption: "",
  buckets: [],
  decade: "",
  year: "",
  month: "",
};

/** Is what has been typed into the year box actually a year? The valley's own
 *  year at the top, matching the server validator that will judge it. */
const yearGiven = (typed: string) => {
  const n = Number(typed);
  return typed.length === 4 && n >= PHOTO_YEAR_MIN && n <= valleyYear();
};

/** The date fields exactly as both contribute paths encode them.
 *
 *  A half-typed year degrades to the decade rather than being refused: "197"
 *  in the box with 1970s lit files under the 1970s, which is true, instead
 *  of failing validation on the way to the server. */
function dateMeta(meta: Meta) {
  if (yearGiven(meta.year)) {
    const monthIndex = MONTHS.indexOf(meta.month);
    return monthIndex >= 0
      ? { photoYear: Number(meta.year), photoMonth: monthIndex + 1, datePrecision: "month" }
      : { photoYear: Number(meta.year), datePrecision: "year" };
  }
  return {
    era: meta.decade || "unknown",
    datePrecision: meta.decade ? "decade" : "unknown",
  };
}

/** The decades as pills: newest first, matching the Collection's own decade
 *  rail, and without the "Not sure" entry -- here, nothing pressed IS not
 *  sure. */
const DECADE_PILLS = ERAS.filter((e) => e.value !== "unknown").slice().reverse();

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
        className={cn(
          "flex max-h-[90vh] w-full max-w-[calc(100%-1.5rem)] flex-col overflow-hidden p-0",
          /* `sm:max-w-lg` and `sm:max-w-6xl` deliberately, and both are
             classes this codebase already ships (the crop dialog uses the
             first, this room already used the second). An earlier pass here
             reached for `sm:max-w-2xl`, which no other file had ever
             written -- so it was a brand-new rule in the generated
             stylesheet, and a browser holding a cached sheet from before
             the edit fell back to `max-w-[calc(100%-1.5rem)]` and drew the
             pop-up edge to edge. That is what the owner saw: "why tf is
             this full screen now". Picking a utility already in the sheet
             costs nothing and cannot do that. */
          wall > 0 ? "sm:max-w-6xl" : "sm:max-w-lg"
        )}
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
            wall > 0 ? "px-5 pt-5 sm:px-6 sm:pt-6" : "sr-only"
          )}
        >
          {/* pr-10 clears the close button, which sits inside the panel at
              the top right: at 390px the title ran straight into it. */}
          <DialogTitle className="pr-10 font-heading text-[23px] leading-tight tracking-[-0.02em]">
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
            wall > 0 ? "pt-4" : "pt-11 sm:pt-12"
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
  const [chosen, setChosen] = useState<Set<string>>(new Set());
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
      // Everything that lands is selected, so one caption and one bucket press
      // files the whole drop.
      setChosen((prev) => new Set([...prev, ...fresh.map((f) => f.id)]));
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

  const selected = useMemo(() => photos.filter((p) => chosen.has(p.id)), [photos, chosen]);

  /** The value the questions show: what every selected photograph agrees on,
   *  or nothing when they disagree. */
  const shown: Meta = useMemo(() => {
    if (!selected.length) return EMPTY_META;
    const first = meta[selected[0].id] ?? EMPTY_META;
    if (selected.length === 1) return first;
    const agree = <K extends keyof Meta>(k: K): Meta[K] =>
      selected.every((p) => JSON.stringify(meta[p.id]?.[k]) === JSON.stringify(first[k]))
        ? first[k]
        : EMPTY_META[k];
    return {
      caption: agree("caption"),
      buckets: agree("buckets"),
      year: agree("year"),
      month: agree("month"),
      decade: agree("decade"),
    };
  }, [selected, meta]);

  /** Buckets some of the selection carries and some does not. Half-lit, so a
   *  press does not silently look like it did nothing. */
  const mixedBuckets = useMemo(() => {
    if (selected.length < 2) return [];
    const some = new Set<string>();
    for (const p of selected) for (const b of meta[p.id]?.buckets ?? []) some.add(b);
    return [...some].filter((b) => !shown.buckets.includes(b));
  }, [selected, meta, shown.buckets]);

  /** Write one answer onto everything currently selected. */
  const answer = useCallback(
    (patch: Partial<Meta>) => {
      setMeta((prev) => {
        const next = { ...prev };
        for (const p of selected) next[p.id] = { ...(next[p.id] ?? EMPTY_META), ...patch };
        return next;
      });
    },
    [selected]
  );

  /* ---------------- selection ---------------- */

  const lastPressed = useRef<string | null>(null);
  function press(id: string, e: React.MouseEvent) {
    const ids = photos.map((p) => p.id);
    if (e.shiftKey && lastPressed.current) {
      const a = ids.indexOf(lastPressed.current);
      const b = ids.indexOf(id);
      if (a >= 0 && b >= 0) {
        const run = ids.slice(Math.min(a, b), Math.max(a, b) + 1);
        setChosen((prev) => new Set([...prev, ...run]));
        return;
      }
    }
    if (e.metaKey || e.ctrlKey) {
      setChosen((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      lastPressed.current = id;
      return;
    }
    // A plain press narrows to this one, which is how a set of hundreds gets
    // one photograph its own caption without a mode to enter first.
    setChosen(new Set([id]));
    lastPressed.current = id;
  }

  function remove(id: string) {
    const going = photos.find((p) => p.id === id);
    if (going) {
      URL.revokeObjectURL(going.preview);
      live.current = live.current.filter((u) => u !== going.preview);
    }
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    setChosen((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
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
      ...dateMeta(m0),
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
    setChosen(new Set());
    setMeta({});
    setAdded(done);
    // So the Collection behind this room already holds them when it is opened.
    router.refresh();
  }

  /* ---------------- what to draw ---------------- */

  const allSelected = selected.length === photos.length && photos.length > 0;

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
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
          {/* The wall. The same justified rows these photographs will live in
              on /collection, so the first thing a contributor sees is their
              own pictures already looking like the archive. */}
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex items-center gap-3 text-[13px] text-muted-foreground">
              <span className="tabular-nums">
                {photos.length} {photos.length === 1 ? "photograph" : "photographs"}
              </span>
              <span className="dotsep" aria-hidden>
                ·
              </span>
              <button
                type="button"
                onClick={() =>
                  setChosen(allSelected ? new Set() : new Set(photos.map((p) => p.id)))
                }
                className="font-medium text-canopy underline-offset-2 transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-canopy"
              >
                {allSelected ? "Select none" : "Select all"}
              </button>
              <span className="dotsep" aria-hidden>
                ·
              </span>
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="font-medium text-canopy underline-offset-2 transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-canopy"
              >
                Add more
              </button>
              {reading > 0 && <span className="ml-auto">Reading {reading}...</span>}
            </div>

            {/* Tighter than the Collection's own grid, and smaller. This wall
                is a working surface -- you are selecting on it and taking
                things off it -- rather than a gallery, so it wants more
                photographs per row and no single one running away with the
                pop-up. At the archive's own target a 16:9 left alone on a row
                grew to 416px and owned the whole panel. */}
            <PhotoStream
              photos={photos}
              keyOf={(p) => p.id}
              /* A fraction of the WALL, not of the viewport, so a phone gets
                 two or three across at a size worth looking at and a laptop
                 gets four. At 22% a phone packed five, each about 55px wide
                 with a 28px remove button sitting on it. */
              targetHeight="min(150px, 34%)"
              maxScale={1.6}
            >
              {(p, i, cell) => (
                <m.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...SPRINGS.gentle, delay: Math.min(i, STAGGER_CAP) * 0.035 }}
                  className="relative"
                >
                  <button
                    type="button"
                    onClick={(e) => press(p.id, e)}
                    aria-pressed={chosen.has(p.id)}
                    aria-label={p.file.name}
                    className={cn(
                      "block w-full overflow-hidden rounded-[var(--radius-md)] bg-mist",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      chosen.has(p.id)
                        ? "ring-2 ring-canopy ring-offset-2 ring-offset-background"
                        : "opacity-80"
                    )}
                    style={{ aspectRatio: cell.aspectRatio }}
                  >
                    <m.img
                      src={p.preview}
                      alt=""
                      /* It develops. Half-faded while its bytes are still
                         climbing, full once they have landed -- which is the
                         true state of the thing and the right metaphor for a
                         photograph archive. Opacity only. */
                      animate={{ opacity: p.state === "here" ? 1 : 0.42 }}
                      transition={{ duration: 0.55, ease: EASE_OUT_SMOOTH }}
                      className="h-full w-full object-cover"
                    />
                    {p.state === "failed" && (
                      <span className="absolute inset-x-2 bottom-2 rounded-full bg-destructive px-2 py-1 text-center text-[11px] font-semibold text-white">
                        Would not upload
                      </span>
                    )}
                  </button>
                  {/* Always there, never on hover. It used to be
                      `opacity-0 group-hover:opacity-100` on a wrapper with no
                      `group` class on it, so it was invisible at every width
                      and on every device -- the owner, looking at the room:
                      "I should be able to remove a photo. now there's no way I
                      have to add everything." A control for taking something
                      back out has to be visible before you want it. */}
                  <button
                    type="button"
                    onClick={() => remove(p.id)}
                    aria-label={`Take ${p.file.name} back out`}
                    className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-foreground/60 text-background backdrop-blur-sm transition-colors duration-150 hover:bg-destructive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </m.div>
              )}
            </PhotoStream>
          </div>

          {/* The asking. Beside the wall, not under it, and in plain words. */}
          <aside className="w-full shrink-0 lg:sticky lg:top-0 lg:w-[336px]">
            {/* No card around the questions. They used to sit on a paper panel
                inside a Float-white pop-up, with paper bucket tiles on top of
                it -- so the tiles, the one thing here that has to look
                pressable, had nothing to stand against. On the white they
                read. */}
            <div>
              <p className="mb-3 text-[13px] font-semibold text-foreground">
                {selected.length === 0
                  ? "Nothing selected"
                  : selected.length === photos.length
                    ? `All ${photos.length} ${photos.length === 1 ? "photograph" : "photographs"}`
                    : `${selected.length} of ${photos.length} selected`}
              </p>

              {/* THE DESCRIPTION, and it is the one field left.
                  Three things changed here on 2026-08-28, all the owner's:

                  - The floating label, not a grey placeholder. "the grey
                    text placeholder isn't good" -- and it is right, because
                    a placeholder is the question and it leaves the moment
                    you answer it, so a filled box no longer says what it
                    holds. This is the signup's own material (FloatArea, the
                    textarea sibling of the field the Revolut-inspired
                    sign-in uses), which is the standard he asked this whole
                    flow to be held to.
                  - The (i), which is where "what, where, why" now lives.
                    Where-in-the-valley used to be a second box; it is a
                    sentence in the hint instead.
                  - No fill. See the bucket tiles: cream on a white pop-up is
                    the yellowing. The border draws the box. */}
              <FloatArea
                id="contribute-caption"
                label="What is this photograph?"
                rows={3}
                maxLength={300}
                value={shown.caption}
                disabled={!selected.length}
                onChange={(e) => answer({ caption: e.target.value.slice(0, 300) })}
                hint={
                  <>
                    Anything you remember. <strong className="font-semibold">What</strong> is
                    happening, <strong className="font-semibold">where</strong> in the valley it
                    was, and <strong className="font-semibold">who</strong> is in it if you know.
                    A line is plenty, and nothing is required.
                  </>
                }
              />

              <p className="mb-2 mt-5 text-[13px] font-semibold text-foreground">
                What is it of?
              </p>
              <BucketTiles
                value={shown.buckets}
                mixed={mixedBuckets}
                onChange={(next) => answer({ buckets: next })}
                className={cn(!selected.length && "pointer-events-none opacity-50")}
              />

              <WhenAsked
                meta={shown}
                disabled={!selected.length}
                onAnswer={answer}
              />
            </div>

            <Button
              variant="primary"
              className="mt-5 w-full rounded-full"
              disabled={adding || !photos.length}
              onClick={fileAll}
            >
              {adding
                ? "Adding..."
                : `Add ${photos.length} ${photos.length === 1 ? "photograph" : "photographs"}`}
            </Button>
            {/* Same as the invitation: only the half that is news. */}
            {!autoApproved && (
              <p className="mt-2 text-center text-[12px] leading-relaxed text-muted-foreground">
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
 *  WHEN WAS IT TAKEN.
 *
 *  The owner on the version this replaces: "even the year and month and
 *  decade thing could be done in a cuter way. the idea is good but
 *  execution could be improved." What was there: two dropdowns side by
 *  side, resting on the words "Year unknown" and "Not sure" -- so the
 *  commonest answer in a heritage archive (a decade, roughly) cost two
 *  presses and a scroll through ninety-nine years to reach, and the
 *  resting state announced ignorance twice before anybody had said
 *  anything.
 *
 *  This is the same three facts, asked in the order people actually know
 *  them, and it costs one tap for most photographs:
 *
 *    ROUGHLY WHEN?   eight decades as pills, newest first, in the
 *                    Collection's own vocabulary and its own order (the
 *                    decade rail reads top-down from 2020s). One tap. Press
 *                    the lit one again to unsay it.
 *    EXACT YEAR?     appears only once a decade is chosen, because that is
 *                    when the question makes sense, and it is a four-box
 *                    numeric field rather than a hundred-item list.
 *    MONTH?          appears only once the year is a real year. The rarest
 *                    thing anybody knows, so it is last and it is small.
 *
 *  Nothing lit means nobody said, which files under Undated. There is no
 *  "Not sure" pill, on purpose: it would have been a control whose pressed
 *  and unpressed states meant the same thing.
 * ------------------------------------------------------------------ */
function WhenAsked({
  meta,
  disabled,
  onAnswer,
}: {
  meta: Meta;
  disabled: boolean;
  onAnswer: (patch: Partial<Meta>) => void;
}) {
  const hasYear = yearGiven(meta.year);
  return (
    <div className={cn("mt-5", disabled && "pointer-events-none opacity-50")}>
      <p className="mb-2 text-[13px] font-semibold text-foreground">
        When was it taken?{" "}
        <span className="font-normal text-muted-foreground">if you know</span>
      </p>

      <div className="flex flex-wrap gap-1.5">
        {DECADE_PILLS.map((e) => {
          const on = meta.decade === e.value;
          return (
            <m.button
              key={e.value}
              type="button"
              aria-pressed={on}
              whileTap={{ scale: 0.94 }}
              transition={SPRINGS.snappy}
              onClick={() =>
                /* Pressing the lit one unsays it, and takes the year and
                   month with it -- a year inside a decade nobody is
                   claiming any more is a fact with nothing under it. */
                onAnswer(
                  on
                    ? { decade: "", year: "", month: "" }
                    : { decade: e.value, year: "", month: "" }
                )
              }
              className={cn(
                "rounded-full border px-3 py-1.5 text-[13px] font-medium tabular-nums",
                "transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                on
                  ? "border-canopy bg-canopy text-white"
                  : "state-layer border-border text-foreground"
              )}
            >
              {e.label}
            </m.button>
          );
        })}
      </div>

      {/* The finer questions, and they arrive rather than waiting. Height
          and opacity are what an accordion has to animate; this is a small
          block at the bottom of a panel, so nothing below it moves. */}
      <AnimatePresence initial={false}>
        {meta.decade && (
          <m.div
            key="finer"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: EASE_OUT_SMOOTH }}
            className="mt-2.5 flex items-center gap-2"
          >
            <label
              htmlFor="contribute-year"
              className="shrink-0 text-[13px] text-muted-foreground"
            >
              Exact year?
            </label>
            <input
              id="contribute-year"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              maxLength={4}
              placeholder={meta.decade === "pre-1960s" ? "1957" : meta.decade.slice(0, 3) + "4"}
              value={meta.year}
              onChange={(e) =>
                onAnswer({ year: e.target.value.replace(/\D/g, "").slice(0, 4), month: "" })
              }
              className={cn(
                "w-[5.5rem] rounded-[var(--radius-input)] border border-border bg-transparent",
                "px-3 py-1.5 text-[15px] tabular-nums text-foreground outline-none",
                "transition-colors duration-150 focus:border-canopy",
                "placeholder:text-muted-foreground/60"
              )}
            />
            {hasYear && (
              <Select
                value={meta.month}
                onValueChange={(v) => onAnswer({ month: v ?? "" })}
              >
                <SelectTrigger className="h-auto min-w-0 flex-1 py-1.5">
                  <SelectValue placeholder="Month">
                    {(v: string) => v || "Month"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((mo) => (
                    <SelectItem key={mo} value={mo}>
                      {mo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </m.div>
        )}
      </AnimatePresence>
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
