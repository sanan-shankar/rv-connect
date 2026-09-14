"use client";

/* ------------------------------------------------------------------ *
 *  The room: a time capsule.
 *
 *  Three things, in the order a member meets them: the sealed Edition
 *  while it waits (drawn three ways, in four places, against seven
 *  cases), the morning it opens, and marking one in settings.
 *
 *  Nothing is scaled (campaign finding F34): the phone is a real 390
 *  and the laptop is this window.
 * ------------------------------------------------------------------ */

import { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, SlidersHorizontal, Users } from "lucide-react";
import { PeaksMark } from "@/components/layout/peaks-mark";
import { m } from "motion/react";
import { SpringPress, SPRINGS } from "@/components/common/motion";
import { Button } from "@/components/ui/button";
import { CardCaption, CardScrim } from "@/components/catchups/index/picture-door";
import { PictureDoor } from "@/components/catchups/settings/settings-surface";
import { PICTURE_SCRIM } from "@/lib/catchup-pictures";
import { cn } from "@/lib/utils";
import { PhoneBar, PhoneShell, DesktopShell } from "../sketches/_shell";
import { CASES, OPENS_AT, caseOf, type CapsuleCase } from "./_cases";
import { SealedCover, SealedTile, type DrawingKey } from "./_sealed";
import { CapsuleAnswerCard, MARK_PRESETS, MarkPanel, type MarkPreset } from "./_mark";
import { formatDisplayDateLong } from "@/lib/utils";

const GUTTER = 20;

const DRAWINGS: Array<{ key: DrawingKey; label: string; says: string[] }> = [
  {
    key: "line",
    label: "The year line",
    says: [
      "The day it opens is the Edition's name, so it is the biggest thing on it.",
      "The cinnamon line is the reader's reading line, stretched to a year. The dot is today.",
      "When it opens the line reaches the end and the photographs come through.",
    ],
  },
  {
    key: "asleep",
    label: "Asleep",
    says: [
      "The birds of everyone who wrote in, asleep. They breathe, slowly.",
      "When it opens they wake one after another, and the photographs come through.",
      "It is the only one that shows who is inside. Not a word anyone wrote, but more than the other two say, so it is your call whether that is allowed.",
    ],
  },
  {
    key: "morning",
    label: "Waiting for morning",
    says: [
      "The Catch-up's own photograph at night. Nothing from inside the Edition.",
      "The dark lifts a little as the year goes, so the last weeks look like dawn.",
      "It opens at seven in the morning, so it opens into the day.",
    ],
  },
];

type Place = "home" | "later" | "list" | "link";
const PLACES: Array<{ key: Place; label: string }> = [
  { key: "home", label: "Home, just sealed" },
  { key: "later", label: "Home, a month on" },
  { key: "list", label: "The list" },
  { key: "link", label: "A shared link" },
];

const MARK_SAYS = [
  "It is a row under This Edition, and it unfolds where it stands, like Rhythm.",
  "It only presses while the Edition is taking questions. Once answering opens it is fixed either way.",
  "On a batch it is the only row there, and anyone in the batch can press it.",
  "Whoever writes sees it on the answering card before they write a word.",
];

const PILL =
  "shrink-0 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const ON = "border-transparent bg-canopy text-white shadow-[0_5px_13px_-12px_var(--color-canopy)]";
const OFF = "border-border bg-card text-muted-foreground transition-colors duration-150 hover:text-foreground";
const CINNAMON_ON = "border-transparent bg-cinnamon text-white shadow-[0_5px_13px_-12px_var(--color-cinnamon)]";

function Pills<K extends string>({
  label,
  items,
  value,
  onPick,
  on = ON,
}: {
  label: string;
  items: Array<{ key: K; label: string }>;
  value: K;
  onPick: (k: K) => void;
  on?: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex items-center gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:px-6 [&::-webkit-scrollbar]:hidden">
      {items.map((item) => (
        <SpringPress
          key={item.key}
          as="button"
          onClick={() => onPick(item.key)}
          aria-pressed={value === item.key}
          className={`${PILL} ${value === item.key ? on : OFF}`}
        >
          {item.label}
        </SpringPress>
      ))}
    </div>
  );
}

function Frame({ phone, title, children }: { phone: boolean; title?: string; children: React.ReactNode }) {
  return phone ? (
    <div className="mx-auto w-full max-w-[430px]">
      <PhoneShell>
        <PhoneBar title={title} position="sticky" />
        <div className="pb-14 pt-5" style={{ paddingLeft: GUTTER, paddingRight: GUTTER }}>
          {children}
        </div>
      </PhoneShell>
    </div>
  ) : (
    <DesktopShell>{children}</DesktopShell>
  );
}

function Says({ lines }: { lines: string[] }) {
  return (
    <div className="mx-auto max-w-[74ch] px-4 pt-6 sm:px-6">
      {lines.map((line) => (
        <p key={line} className="mt-3 text-[14.5px] leading-[1.62] text-foreground/85">
          {line}
        </p>
      ))}
    </div>
  );
}

/** The home's head, as drawn: the picture, the name, the two doors. */
function Head({ c, wide }: { c: CapsuleCase; wide: boolean }) {
  return (
    <div className={cn("relative w-full overflow-hidden rounded-[var(--radius)] bg-muted", wide ? "h-[240px]" : "h-[172px]")}>
      <Image src={c.picture.src} alt="" fill sizes="1180px" style={{ objectPosition: c.picture.focus }} className="object-cover" />
      <span aria-hidden className="absolute inset-0" style={{ background: PICTURE_SCRIM }} />
      <div className={cn("absolute inset-x-0 bottom-0 flex items-end justify-between gap-3", wide ? "p-5" : "p-4")}>
        <h2
          className={cn(
            "min-w-0 font-heading leading-[1.2] tracking-[-0.02em] text-white [text-shadow:0_1px_12px_rgb(0_0_0/0.4)]",
            wide ? "text-[30px]" : "text-[24px]"
          )}
        >
          {c.catchupName}
        </h2>
        <span className="flex shrink-0 items-center gap-2">
          <PictureDoor label="People" icon={Users} onClick={() => {}} />
          <PictureDoor label="Settings" icon={SlidersHorizontal} onClick={() => {}} />
        </span>
      </div>
    </div>
  );
}

/** A published back number, for the sealed cover to sit beside. */
function BackNumber({ c, wide }: { c: CapsuleCase; wide: boolean }) {
  return (
    <article className="card-elevated overflow-hidden rounded-[var(--radius)] border border-border bg-card">
      <span className={cn("flex w-full flex-col", wide ? "aspect-[5/2]" : "aspect-[16/9]")}>
        <span className="relative block min-h-0 flex-1 overflow-hidden bg-muted">
          <Image src={c.picture.src} alt="" fill sizes="540px" style={{ objectPosition: c.picture.focus }} className="object-cover" />
        </span>
        <span className="flex h-[42px] shrink-0 items-center gap-2.5 border-t border-border bg-card px-4">
          <span aria-hidden className="h-[17px] w-[2px] shrink-0 rounded-full bg-cinnamon" />
          <span className="truncate font-heading text-[15px] tracking-[-0.01em] text-foreground">14 August 2026</span>
        </span>
      </span>
    </article>
  );
}

function AskStub() {
  return (
    <div className="card-elevated rounded-[var(--radius)] border border-border bg-card px-5 py-4">
      <p className="font-heading text-[19px] leading-snug text-foreground">What should everyone answer this time?</p>
      <p className="mt-3 rounded-[var(--radius-md)] border border-border px-3.5 py-2.5 text-[15px] text-muted-foreground">Ask a question</p>
    </div>
  );
}

function Note({ c }: { c: CapsuleCase }) {
  if (!c.note) return null;
  return <p className="mt-3.5 font-sans text-[13.5px] text-muted-foreground">{c.note}</p>;
}

function Placed({ place, drawing, c, wide, opening }: { place: Place; drawing: DrawingKey; c: CapsuleCase; wide: boolean; opening: boolean }) {
  const drawn = { drawing, c, wide, opening };
  if (place === "link") {
    return (
      <div className={cn("mx-auto", wide ? "max-w-xl py-10" : "py-4")}>
        <div className="card-elevated overflow-hidden rounded-[var(--radius)] border border-border bg-card">
          <SealedTileBare {...drawn} />
          <div className={cn(wide ? "p-[var(--space-l)]" : "p-5")}>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-leaf">{c.catchupName}</p>
            <h1 className="mt-[var(--space-xs)] font-heading text-2xl tracking-[-0.02em] text-foreground">Nobody can read this yet</h1>
            <p className="mt-[var(--space-s)] text-[14.5px] leading-relaxed text-muted-foreground">
              {c.note ?? `Not even the people who wrote it. It opens on ${formatDisplayDateLong(OPENS_AT)}.`}
            </p>
            <Button variant="primary" className="mt-[var(--space-l)]">
              Go to the Catch-up
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (place === "list") {
    return (
      <div className={cn("grid gap-5", wide && "grid-cols-2")}>
        <article className="card-elevated relative overflow-hidden rounded-[var(--radius)] border border-border bg-card">
          <span className={cn("relative block w-full overflow-hidden bg-muted", wide ? "aspect-[5/2]" : "aspect-[16/9]")}>
            <Image src={c.picture.src} alt="" fill sizes="540px" style={{ objectPosition: c.picture.focus }} className="object-cover" />
            <CardScrim />
            <CardCaption title={c.catchupName} line="Open for questions" />
          </span>
        </article>
        <SealedCover {...drawn} />
        <BackNumber c={c} wide={wide} />
      </div>
    );
  }

  const later = place === "later";
  return (
    <div>
      <Head c={c} wide={wide} />
      {/* The rail grid's own numbers (layout/rail-grid.ts), set by the frame
          rather than the window, like everything else in this room. */}
      <div className={wide ? "grid grid-cols-[minmax(0,1fr)_318px] gap-x-[30px]" : undefined}>
        <div className={cn("min-w-0", wide ? "mt-6" : "mt-5")}>
          {later ? <AskStub /> : <SealedTile {...drawn} />}
          {later || !c.note ? null : <Note c={c} />}
          <p className="mt-3.5 text-right font-sans text-[13.5px] text-muted-foreground">
            {later ? null : "The next one opens 14 October 2026"}
          </p>
        </div>
        <aside className={cn("space-y-3 self-start", wide ? "mt-0 pt-6" : "mt-11")}>
          {later && <SealedCover {...drawn} />}
          <BackNumber c={c} wide={false} />
        </aside>
      </div>
    </div>
  );
}

/** The tile without its own card, for the deep link's page card. */
function SealedTileBare(p: { drawing: DrawingKey; c: CapsuleCase; wide: boolean; opening: boolean }) {
  return (
    <div className="[&>article]:rounded-none [&>article]:border-0 [&>article]:shadow-none">
      <SealedTile {...p} />
    </div>
  );
}

function Room() {
  const router = useRouter();
  const params = useSearchParams();
  const phone = params.get("w") !== "laptop";
  const wide = !phone;
  const drawingParam = params.get("d");
  const drawing = DRAWINGS.find((d) => d.key === drawingParam) ?? DRAWINGS[0];
  const placeParam = params.get("at");
  const place: Place = PLACES.some((p) => p.key === placeParam) ? (placeParam as Place) : "home";
  const c = caseOf(params.get("c"));
  const markParam = params.get("mark");
  const mark: MarkPreset = MARK_PRESETS.some((p) => p.key === markParam) ? (markParam as MarkPreset) : "keeper";
  const [opened, setOpened] = useState(0);

  const set = (key: string, value: string) => {
    const q = new URLSearchParams(params.toString());
    q.set(key, value);
    router.replace(`/lab/catchups/capsule?${q.toString()}`, { scroll: false });
  };

  const beforeMorning = CASES.find((k) => k.key === "today") ?? c;

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <header className="border-b border-border py-3">
        <div className="flex items-center gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] sm:px-6 [&::-webkit-scrollbar]:hidden">
          <Link
            href="/lab"
            className="state-layer inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-[12.5px] font-semibold text-muted-foreground transition-colors duration-150 hover:text-foreground active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <PeaksMark size={16} />
            Lab
          </Link>
          <div className="flex shrink-0 gap-1.5" role="group" aria-label="Viewport">
            {(["phone", "laptop"] as const).map((v) => (
              <SpringPress
                key={v}
                as="button"
                onClick={() => set("w", v)}
                aria-pressed={phone === (v === "phone")}
                className={`${PILL} ${phone === (v === "phone") ? ON : OFF}`}
              >
                {v === "phone" ? "Phone" : "Laptop"}
              </SpringPress>
            ))}
          </div>
        </div>
      </header>

      <div className="px-4 pt-4 sm:px-6">
        <h1 className="font-heading text-[1.15rem] leading-tight tracking-[-0.02em] sm:text-[1.35rem]">Sealed for a year</h1>
        <p className="mt-1 text-[13px] text-muted-foreground sm:text-[14px]">
          Pick how a time capsule looks while it waits, and the morning it opens.
        </p>
      </div>

      {/* ── sealed ── */}
      <h2 className="mt-8 px-4 font-heading text-[1.05rem] tracking-[-0.02em] sm:px-6">While it waits</h2>
      <div className="mt-3">
        <Pills label="Drawing" items={DRAWINGS} value={drawing.key} onPick={(k) => set("d", k)} />
      </div>
      <div className="mt-2">
        <Pills label="Where" on={CINNAMON_ON} items={PLACES} value={place} onPick={(k) => set("at", k)} />
      </div>
      <div className="mt-2">
        <Pills
          label="Case"
          on={CINNAMON_ON}
          items={CASES.map((k) => ({ key: k.key, label: k.label }))}
          value={c.key}
          onPick={(k) => set("c", k)}
        />
      </div>
      <div className="mt-5">
        <Frame phone={phone} title={place === "list" ? undefined : c.catchupName}>
          <div data-shot="sealed">
            <Placed key={`${drawing.key}-${place}-${c.key}`} place={place} drawing={drawing.key} c={c} wide={wide} opening={false} />
          </div>
        </Frame>
      </div>
      <Says lines={drawing.says} />

      {/* ── opening ── */}
      <h2 className="mt-12 px-4 font-heading text-[1.05rem] tracking-[-0.02em] sm:px-6">The morning it opens</h2>
      <div className="mt-3 flex items-center gap-2 px-4 sm:px-6">
        <Button size="sm" onClick={() => setOpened((n) => n + 1)}>
          {opened % 2 === 0 ? "Open it" : "Seal it again"}
        </Button>
      </div>
      <div className="mt-5">
        <Frame phone={phone} title={beforeMorning.catchupName}>
          <div data-shot="opening" className="space-y-4">
            {/* The bell arrives with the opening, not before it (round two). */}
            {opened % 2 === 1 && (
              <m.div
                key={opened}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...SPRINGS.snappy, delay: 1.4 }}
                className="flex items-start gap-3 rounded-[var(--radius)] border border-border bg-card px-4 py-3"
              >
                <BookOpen className="mt-0.5 h-[18px] w-[18px] shrink-0 text-muted-foreground" strokeWidth={1.8} />
                <p className="text-[14px] leading-snug text-foreground">The {beforeMorning.catchupName} time capsule is open.</p>
              </m.div>
            )}
            <SealedTile key={`${drawing.key}-${opened}`} drawing={drawing.key} c={beforeMorning} wide={wide} opening={opened % 2 === 1} />
          </div>
        </Frame>
      </div>
      <Says
        lines={[
          "At seven in the morning a year on, everyone in the Catch-up gets that line in their bell, including anyone who joined while it was sealed.",
          "After that it is an ordinary Edition, with hearts and comments, and its cover sits at the top of the sidebar until the next one comes out.",
        ]}
      />

      {/* ── marking ── */}
      <h2 className="mt-12 px-4 font-heading text-[1.05rem] tracking-[-0.02em] sm:px-6">Making one</h2>
      <div className="mt-3">
        <Pills label="Who" on={CINNAMON_ON} items={MARK_PRESETS} value={mark} onPick={(k) => set("mark", k)} />
      </div>
      <div className="mt-5">
        <Frame phone={phone} title="In the loop">
          <div data-shot="mark" className={cn(wide ? "grid max-w-[980px] grid-cols-2 items-start gap-8" : "space-y-8")}>
            <div className={cn("rounded-[var(--radius)] border border-border bg-card", wide ? "p-4" : "p-3")}>
              <MarkPanel key={mark} preset={mark} />
            </div>
            <CapsuleAnswerCard />
          </div>
        </Frame>
      </div>
      <Says lines={MARK_SAYS} />

      <div className="mx-auto max-w-[74ch] px-4 pb-16 pt-10 sm:px-6">
        <h2 className="font-heading text-[1.05rem] tracking-[-0.02em]">Worth knowing before you pick</h2>
        {[
          "Nobody can read anything in a sealed Edition until it opens, including what they wrote. That was your answer to 34.",
          "It opens on the same date a year after answers close, at seven in the morning, and everyone is told.",
          "The next Edition starts on the rhythm as usual. Only the one Edition waits.",
          "It opens on its day even if the Catch-up is on hold or has ended.",
          "Somebody's own download of their data still includes what they wrote in one. Say if it should not.",
          "The questions for it are in the library draft, for you to cut.",
          "The names are made up. The birds are the real ones.",
          "Underneath is built and switched off: the mark, the seal, the date and the opening.",
        ].map((line) => (
          <p key={line} className="mt-3 text-[14.5px] leading-[1.62] text-foreground/85">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

/** `useSearchParams` needs a Suspense boundary inside a client component. */
export function CapsuleRoom() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <Room />
    </Suspense>
  );
}
