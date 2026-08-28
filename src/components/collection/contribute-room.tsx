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
 *    it: "What is this?", not "Caption". One field, six tiles, when, and
 *    where.
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
 *  Spec sec. 8. The parts still owed after this are sec. 8.3 (the LLM
 *  suggestion pass), sec. 9's crop handle, and the trusted-contributor
 *  admin control.
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PhotoStream } from "@/components/common/photo-rows";
import { EASE_OUT_SMOOTH, SPRINGS } from "@/components/common/motion";
import { ContributedHoopoe } from "@/components/mascot/moments/contributed-hoopoe";
import { useEmailGate } from "@/components/auth/verify-email-dialog";
import { ERAS, PHOTO_YEAR_MIN, eraLabel } from "@/lib/collection";
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

const NOT_SURE = "not-sure";
const NO_MONTH = "no-month";

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

/** What the questions answer, per photograph. */
type Meta = {
  caption: string;
  area: string;
  buckets: string[];
  year: string;
  month: string;
  decade: string;
};

const EMPTY_META: Meta = {
  caption: "",
  area: "",
  buckets: [],
  year: NOT_SURE,
  month: NO_MONTH,
  decade: "unknown",
};

/** The date fields exactly as both contribute paths encode them. */
function dateMeta(meta: Meta) {
  if (meta.year !== NOT_SURE) {
    const monthIndex = MONTHS.indexOf(meta.month); // -1 when NO_MONTH
    return monthIndex >= 0
      ? { photoYear: Number(meta.year), photoMonth: monthIndex + 1, datePrecision: "month" }
      : { photoYear: Number(meta.year), datePrecision: "year" };
  }
  return {
    era: meta.decade,
    datePrecision: meta.decade === "unknown" ? "unknown" : "decade",
  };
}

function yearOptions(): number[] {
  const out: number[] = [];
  // The valley's year, matching the server validator that will judge it.
  for (let y = valleyYear(); y >= PHOTO_YEAR_MIN; y--) out.push(y);
  return out;
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
 *  The pop-up. Most of the glass, because a wall of two hundred
 *  photographs needs room, and its own scroll so the Add button and the
 *  questions never leave the screen while you are looking at them.
 *  Everything inside is the same room; only its container changed.
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-full max-w-[calc(100%-1.5rem)] flex-col overflow-hidden p-0 sm:max-w-6xl">
        <DialogHeader className="shrink-0 px-5 pt-5 text-left sm:px-6 sm:pt-6">
          {/* pr-10 clears the close button, which sits inside the panel at
              the top right: at 390px the title ran straight into it. */}
          <DialogTitle className="pr-10 font-heading text-[23px] leading-tight tracking-[-0.02em]">
            Add to the valley&rsquo;s memory
          </DialogTitle>
          <DialogDescription className="mt-1.5">
            Paste, drop or browse. As many photographs as you like, all at once.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
          <ContributeRoom
            autoApproved={autoApproved}
            roomLeft={roomLeft}
            active={open}
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
  onDone,
}: {
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
      area: agree("area"),
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
      area: m0.area.trim() || undefined,
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
    if (common.area) fd.set("area", common.area);
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

              <label className="sr-only" htmlFor="contribute-caption">
                What is this?
              </label>
              <textarea
                id="contribute-caption"
                rows={2}
                value={shown.caption}
                disabled={!selected.length}
                onChange={(e) => answer({ caption: e.target.value.slice(0, 300) })}
                placeholder="What is this? A word or two is plenty."
                /* No border and no label. It is the first thing in the panel
                   and the placeholder says what it wants, so a box around it
                   would only make it look like a form. */
                className="w-full resize-none bg-transparent text-[16.5px] leading-snug text-foreground outline-none placeholder:text-muted-foreground/70 disabled:opacity-50"
              />

              <div className="my-3 h-px bg-border" aria-hidden />

              <BucketTiles
                value={shown.buckets}
                mixed={mixedBuckets}
                onChange={(next) => answer({ buckets: next })}
                className={cn(!selected.length && "pointer-events-none opacity-50")}
              />

              <div className="mt-4 space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={shown.year}
                    onValueChange={(v) => answer({ year: v ?? NOT_SURE, month: NO_MONTH })}
                    disabled={!selected.length}
                  >
                    <SelectTrigger className="bg-card">
                      {/* Explicit label render: the Select only learns an
                          item's label once its content has mounted, so the
                          sentinel would show its raw value on first paint. */}
                      <SelectValue placeholder="Year">
                        {(v: string) => (v === NOT_SURE ? "Year unknown" : v)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NOT_SURE}>Year unknown</SelectItem>
                      {yearOptions().map((y) => (
                        <SelectItem key={y} value={String(y)}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {shown.year !== NOT_SURE ? (
                    <Select
                      value={shown.month}
                      onValueChange={(v) => answer({ month: v ?? NO_MONTH })}
                      disabled={!selected.length}
                    >
                      <SelectTrigger className="bg-card">
                        <SelectValue placeholder="Month">
                          {(v: string) => (v === NO_MONTH ? "Month" : v)}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_MONTH}>Month</SelectItem>
                        {MONTHS.map((mo) => (
                          <SelectItem key={mo} value={mo}>
                            {mo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Select
                      value={shown.decade}
                      onValueChange={(v) => answer({ decade: v ?? "unknown" })}
                      disabled={!selected.length}
                    >
                      <SelectTrigger className="bg-card">
                        <SelectValue placeholder="Decade">
                          {(v: string) => eraLabel(v)}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {ERAS.map((e) => (
                          <SelectItem key={e.value} value={e.value}>
                            {e.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <Input
                  value={shown.area}
                  disabled={!selected.length}
                  onChange={(e) => answer({ area: e.target.value.slice(0, 100) })}
                  placeholder="Where in the valley?"
                  className="bg-card"
                />
              </div>
            </div>

            <Button
              variant="primary"
              className="mt-3 w-full rounded-full"
              disabled={adding || !photos.length}
              onClick={fileAll}
            >
              {adding
                ? "Adding..."
                : `Add ${photos.length} ${photos.length === 1 ? "photograph" : "photographs"}`}
            </Button>
            <p className="mt-2 text-center text-[12px] leading-relaxed text-muted-foreground">
              {autoApproved
                ? "Yours go straight into the Collection."
                : "An admin looks at new photographs before they appear."}
            </p>
          </aside>
        </div>
      )}
    </>
  );
}

/** Before anything has been dropped. */
function Invitation({
  reading,
  autoApproved,
  onChoose,
}: {
  reading: number;
  autoApproved: boolean;
  onChoose: () => void;
}) {
  return (
    /* One warm place to put things, rather than a line of text floating on
       the page wash. The whole window takes a drop, but the eye needs
       somewhere to aim, and a drop target is a box that has earned its border.
       No dashes anywhere on it: a dashed rectangle is the one shape that would
       make this look like the file manager the owner said it must not be. */
    <div className="card-elevated flex min-h-[54vh] flex-col items-center justify-center rounded-[var(--radius-xl)] border border-border bg-card px-6 py-16 text-center">
      <m.span
        aria-hidden
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={SPRINGS.gentle}
        className="mb-6 text-canopy"
      >
        <Images size={64} weight="duotone" />
      </m.span>
      <p className="max-w-xl font-heading text-[25px] leading-snug tracking-[-0.015em] text-foreground">
        {reading > 0 ? `Reading ${reading} photographs...` : "Paste, drop, or browse"}
      </p>
      <p className="mt-2.5 max-w-md text-[14.5px] leading-relaxed text-muted-foreground">
        As many photographs as you like, all at once. You can say what they are afterwards,
        and you do not have to say much.
      </p>
      <Button variant="primary" className="mt-7 rounded-full px-6" onClick={onChoose}>
        Browse your photographs
      </Button>
      <p className="mt-4 text-[12px] text-muted-foreground">
        {autoApproved
          ? "Yours go straight into the Collection."
          : "An admin looks at new photographs before they appear."}
      </p>
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
