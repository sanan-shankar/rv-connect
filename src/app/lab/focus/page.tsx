"use client";

/* ------------------------------------------------------------------ *
 *  Eleven rings, and the five worth choosing between.
 *
 *  On 2026-08-29 the app had eleven different answers to "what happens
 *  when a text box gets focus". The owner clicked two boxes at random and
 *  they differed. This room is the choice, live: the same four kinds of
 *  field in every column, one focus treatment per column. Click into a
 *  field, then Tab through the column. Pick one; field-focus.ts becomes
 *  that, and focus-recipe.test.mjs holds every field to it.
 *
 *  Column A is the only one that behaves differently by how you arrived:
 *  a tiny tracker on the room sets data-modality to "pointer" on
 *  pointerdown and "keyboard" on Tab, and the field reads it. That is the
 *  15 lines the real thing would need in the root layout.
 * ------------------------------------------------------------------ */

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { DelightShell } from "../_kit";

type Modality = "pointer" | "keyboard";

/** The tracker Column A needs: how did focus last move? */
function useModality(): Modality {
  const [mode, setMode] = useState<Modality>("pointer");
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Tab" || e.key.startsWith("Arrow")) setMode("keyboard");
    };
    const onPointer = () => setMode("pointer");
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("pointerdown", onPointer, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("pointerdown", onPointer, true);
    };
  }, []);
  return mode;
}

const FORCED = "focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-transparent";

/* The five treatments. `boxed` is for a field with a visible border,
   `shell` for the mist floating-label shell that has none at rest. */
const VARIANTS: {
  key: string;
  name: string;
  who: string;
  what: string;
  boxed: (m: Modality) => string;
  shell: (m: Modality) => string;
}[] = [
  {
    key: "hybrid",
    name: "Keyboard gets the ring, the pointer gets a whisper",
    who: "iOS on tap, WCAG on Tab",
    what: "Click: a bordered box tints its border, the mist shell only floats its label. Tab: one 2px leaf edge on anything.",
    boxed: (m) =>
      m === "keyboard"
        ? `focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring ${FORCED}`
        : "focus-visible:border-ring",
    shell: (m) =>
      m === "keyboard"
        ? `focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring ${FORCED}`
        : "",
  },
  {
    key: "edge",
    name: "One solid 2px edge, always",
    who: "Material (3px), GOV.UK (doubled border)",
    what: "The border turns leaf and thickens to 2px, hugging the box. Same on click and on Tab.",
    boxed: () => `focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring ${FORCED}`,
    shell: () => `focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring ${FORCED}`,
  },
  {
    key: "tint",
    name: "The border tints, 1px, always",
    who: "the old FloatArea; many quiet apps",
    what: "The quietest. A 1px colour change and nothing else. Weak for keyboard users.",
    boxed: () => "focus-visible:border-ring",
    shell: () => "focus-visible:border-ring",
  },
  {
    key: "halo",
    name: "Border plus a soft halo",
    who: "macOS, shadcn; what Input shipped for two weeks",
    what: "Solid leaf border with a 3px half-alpha halo outside it. The one that read as a thin ring and a thick ring.",
    boxed: () => `focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 ${FORCED}`,
    shell: () => `focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 ${FORCED}`,
  },
  {
    key: "offset",
    name: "An outline 2px clear of the box",
    who: "what Textarea and Select shipped; the button ring",
    what: "The keyboard ring buttons use, put on a field. The one that read as separated from the text box.",
    boxed: () => "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    shell: () => "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
  },
];

function Column({ v, mode }: { v: (typeof VARIANTS)[number]; mode: Modality }) {
  const boxed = v.boxed(mode);
  const shell = v.shell(mode);
  return (
    <section className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-card p-4">
      <header className="min-h-[5.5rem]">
        <h2 className="font-heading text-[17px] leading-snug text-foreground">{v.name}</h2>
        <p className="mt-1 text-[12.5px] text-muted-foreground">{v.who}</p>
      </header>

      {/* 1. a plain boxed input, the ui/Input shape */}
      <input
        type="text"
        placeholder="A plain box"
        className={cn(
          "h-10 w-full rounded-[var(--radius-input)] border border-input bg-transparent px-3 text-base outline-none placeholder:text-muted-foreground",
          boxed
        )}
      />

      {/* 2. the mist floating-label shell, the auth and profile family */}
      <div className="relative">
        <input
          type="text"
          placeholder=" "
          className={cn(
            "peer h-14 w-full rounded-[var(--radius-input)] border border-transparent bg-mist px-4 pt-5 text-base text-foreground outline-none",
            shell
          )}
        />
        <label className="pointer-events-none absolute left-4 top-1/2 origin-left -translate-y-1/2 text-base text-muted-foreground transition-transform duration-200 ease-out peer-focus:-translate-y-[1.35rem] peer-focus:scale-[0.72] peer-[:not(:placeholder-shown)]:-translate-y-[1.35rem] peer-[:not(:placeholder-shown)]:scale-[0.72]">
          Email
        </label>
      </div>

      {/* 3. the comment pill */}
      <input
        type="text"
        placeholder="Write a comment..."
        className={cn(
          "h-9 w-full rounded-full border border-border bg-card px-4 text-sm outline-none placeholder:text-muted-foreground",
          boxed
        )}
      />

      {/* 4. the composer box */}
      <textarea
        rows={3}
        placeholder="Share a memory or a note with the community..."
        className={cn(
          "w-full resize-none rounded-[var(--radius-input)] border border-border bg-card px-3.5 py-3 text-base leading-[1.7] outline-none placeholder:text-muted-foreground",
          boxed
        )}
      />

      <p className="mt-1 text-[13px] leading-snug text-muted-foreground">{v.what}</p>
    </section>
  );
}

export default function FocusRoom() {
  const mode = useModality();
  return (
    <DelightShell
      title="Eleven rings, and the five worth choosing between"
      lede="Click into a field, then Tab down its column. Every box in the app will do what the column you pick does."
    >
      <div data-modality={mode}>
        <p className="mb-4 text-[13px] text-muted-foreground">
          Last focus moved by: <strong className="text-foreground">{mode}</strong>. Column A watches this; the others do not care.
          {" "}<strong className="text-foreground">A is what shipped</strong> (owner, 2026-08-29).
        </p>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {VARIANTS.map((v, i) => (
            <div key={v.key} className="flex flex-col gap-2">
              <span className="font-heading text-[13px] tracking-[0.12em] text-muted-foreground uppercase">
                {String.fromCharCode(65 + i)}
              </span>
              <Column v={v} mode={mode} />
            </div>
          ))}
        </div>
      </div>
    </DelightShell>
  );
}
