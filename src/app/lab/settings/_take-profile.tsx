"use client";

/* ------------------------------------------------------------------ *
 *  TAKE B: the profile, with the pen in it.
 *
 *  Owner, 2026-08-07:
 *
 *  > Another version which is basically, when you click Edit profile on
 *  > the profile, it turns the profile into an editable thing. It would
 *  > look like you are just in My profile. Your name becomes an editable
 *  > box, your admission number, Student and Imperial College London,
 *  > 2023 and 2014 and the year you leave, cities. The houses are
 *  > already a chain, so maybe change the outline of something to show
 *  > it's clickable. And below, where it shows All posts, Letters,
 *  > Saved, fade all that out and put the stuff that isn't above:
 *  > emails, phone numbers, links. Now that we already have a really
 *  > pretty UI for profiles, might as well use that for the settings.
 *
 *  So there is no settings page. There is a sheet you already know, and
 *  a button that hands you a pen for it. Everything keeps its place:
 *  the name stays the name, the three facts stay the three facts, the
 *  chain stays the chain. The only thing that changes is that the ink
 *  is now yours.
 *
 *  Two things the reading sheet does not have, and gains here:
 *   - The tab strip under the sheet is the wrong furniture in edit mode.
 *     Your own posts are not something you edit, so the strip fades back
 *     and the contact rows take the space it was holding.
 *   - Every editable spot gets the same quiet dotted underline at rest.
 *     One mark, used once, is how you tell somebody what is live without
 *     drawing fourteen boxes.
 * ------------------------------------------------------------------ */

import { useState, type CSSProperties, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SPRINGS } from "@/components/common/motion";
import { PeaksMark } from "@/components/layout/peaks-mark";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { LocationPicker } from "@/components/common/location-picker";
import { Button } from "@/components/ui/button";
import { HouseChainEditor } from "@/components/profile/house-chain-editor";
import { AddContact, AutoInput, ContactIcon, PenTitle, useAutoGrow } from "./_bits";
import { newContact, usePerson, type Person } from "./_data";
import type { HouseYearEntry } from "@/lib/houses";

/* Copied from the shipped letterhead so the specimen is the real sheet and
   not a lookalike. If those numbers move, this room is wrong and should be
   told so by looking wrong. */
const PAPER_GRAIN =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'>" +
      "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/>" +
      "<feColorMatrix type='matrix' values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0'/></filter>" +
      "<rect width='100%' height='100%' filter='url(#n)'/></svg>"
  );

const IDENTITY_VARS = {
  "--lh-colophon": "1rem",
  "--lh-gap": "0.5rem",
  "--lh-name": "clamp(1.9rem, 7vw, 2.6rem)",
} as CSSProperties;

/**
 * The one mark that says "this is yours to change".
 *
 * A dotted underline in canopy at rest, the box only on hover and focus.
 * Fourteen outlined boxes would turn the sheet back into a form, which is
 * the thing this take exists to avoid; fourteen dotted underlines read as
 * one convention, the way a filled-in certificate does.
 */
const PEN =
  "rounded-[var(--radius-sm)] border border-transparent bg-transparent underline decoration-canopy/35 decoration-dotted decoration-2 underline-offset-[5px] outline-none transition-[background-color,border-color] duration-150 hover:border-border hover:bg-float/70 focus:border-canopy/45 focus:bg-float focus:decoration-transparent";

export function TakeProfile({ initial }: { initial?: Person }) {
  const { person, set, save, setAndSave } = usePerson(initial);
  const [editing, setEditing] = useState(true);
  const aboutRef = useAutoGrow(person.about);

  const text = (key: "name" | "about" | "jobTitle" | "workplace") => ({
    value: person[key],
    onChange: (v: string) => set(key, v),
    onBlur: () => save(key),
  });

  const cityLabel = person.cities.length > 1 ? "Cities" : "City";

  return (
    <div className="mx-auto w-full max-w-[720px] px-4 py-8 sm:px-6">
      <div className="relative" style={IDENTITY_VARS}>
        <div
          className="relative overflow-hidden rounded-[var(--radius-2xl)] border border-border bg-card"
          style={{
            boxShadow:
              "0 1px 2px rgba(35,36,30,0.05), 0 24px 48px -32px rgba(35,36,30,0.55), 0 46px 96px -55px color-mix(in srgb, var(--color-cinnamon) 26%, transparent)",
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-multiply"
            style={{ backgroundImage: `url("${PAPER_GRAIN}")` }}
          />
          <div
            className="pointer-events-none absolute -top-16 right-14 h-56 w-56 rounded-full opacity-60"
            style={{
              background:
                "radial-gradient(circle, color-mix(in srgb, var(--color-canopy) 14%, transparent), transparent 70%)",
            }}
          />

          <div className="relative p-6 sm:p-10">
            {/* ---- the colophon: mark, then the admission number ---- */}
            <div className="flex items-start gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex h-[var(--lh-colophon)] w-fit items-center gap-1.5 text-cinnamon">
                  <PeaksMark size={16} />
                  {editing ? (
                    <AutoInput
                      value={person.admissionNumber}
                      onChange={(v) =>
                        set("admissionNumber", v.replace(/\D/g, "").slice(0, 5))
                      }
                      onBlur={() => save("admissionNumber")}
                      // Not "0000": there is no label beside this one, only
                      // the mark, so the placeholder has to say what the field
                      // is rather than what shape it takes.
                      placeholder="adm no"
                      ariaLabel="Admission number"
                      fieldClass={cn(PEN, "px-1 py-0 leading-none")}
                      className="text-[13px] font-bold uppercase tracking-[0.16em]"
                    />
                  ) : (
                    <span className="px-1 text-[13px] font-bold uppercase leading-none tracking-[0.16em]">
                      {person.admissionNumber}
                    </span>
                  )}
                </div>

                {/* ---- the name ---- */}
                <div className="mt-[var(--lh-gap)] -ml-1.5">
                  {editing ? (
                    <PenTitle
                      {...text("name")}
                      placeholder="Your name"
                      className={cn(
                        PEN,
                        "px-1.5 font-heading font-bold tracking-[-0.03em] text-foreground [font-size:var(--lh-name)] [line-height:1.05]"
                      )}
                    />
                  ) : (
                    <h1
                      className="px-1.5 font-heading font-bold tracking-[-0.03em] text-foreground"
                      style={{ fontSize: "var(--lh-name)", lineHeight: 1.05 }}
                    >
                      {person.name}
                    </h1>
                  )}
                </div>
              </div>

              <BirdAvatar
                user={{ id: "lab", name: person.name, photoUrl: null, birdOverride: null }}
                size={68}
                className="shrink-0"
              />
            </div>

            {/* ---- the occupation line ---- */}
            <div className="-ml-1.5 mt-[var(--space-xs)] flex flex-wrap items-center text-[15px] leading-[1.6] text-muted-foreground">
              {editing ? (
                <>
                  <AutoInput
                    {...text("jobTitle")}
                    placeholder="what you do"
                    ariaLabel="What you do"
                    fieldClass={cn(PEN, "px-1.5 py-0.5")}
                    className="text-[15px]"
                  />
                  <span className="px-1">at</span>
                  <AutoInput
                    {...text("workplace")}
                    placeholder="where"
                    ariaLabel="Where you work or study"
                    fieldClass={cn(PEN, "px-1.5 py-0.5")}
                    className="text-[15px]"
                  />
                </>
              ) : (
                <p className="px-1.5">
                  {[person.jobTitle, person.workplace].filter(Boolean).join(" at ")}
                </p>
              )}
            </div>

            {/* ---- the facts, in their shipped places ----
                Reading, this is a three-column row: Batch, In the valley,
                Cities. Editing, Cities drops to its own full-width line,
                because it is the one fact whose editor is a search box with
                chips in it and a 190px column cannot hold that without the
                chips running off the sheet. */}
            <dl
              className={cn(
                "mt-[var(--space-l)] gap-y-[var(--space-m)]",
                // Editing, two short numeric facts side by side: a flex row
                // keeps them adjacent instead of parking "In the valley" in
                // a 275px column half a screen from "Batch".
                editing
                  ? "flex flex-wrap gap-x-10"
                  : "grid grid-cols-2 gap-x-[var(--space-l)] sm:grid-cols-3"
              )}
            >
              <Fact label="Batch">
                {editing ? (
                  <YearPen
                    value={person.batchYear}
                    onChange={(v) => set("batchYear", v)}
                    onBlur={() => save("batchYear")}
                  />
                ) : (
                  <span className="px-1.5">Batch of {person.batchYear}</span>
                )}
              </Fact>

              <Fact label="In the valley">
                {editing ? (
                  <span className="-ml-1.5 inline-flex items-center">
                    <YearPen
                      value={person.yearJoined}
                      onChange={(v) => set("yearJoined", v)}
                      onBlur={() => save("yearJoined")}
                    />
                    <span className="px-0.5 text-muted-foreground">to</span>
                    <YearPen
                      value={person.yearLeft}
                      onChange={(v) => set("yearLeft", v)}
                      onBlur={() => save("yearLeft")}
                    />
                  </span>
                ) : (
                  <span className="px-1.5">
                    {person.yearJoined} to {person.yearLeft}
                  </span>
                )}
              </Fact>

              {!editing && (
                <Fact label={cityLabel} wide>
                  <span className="px-1.5">{person.cities.map((c) => c.city).join(", ")}</span>
                </Fact>
              )}
            </dl>

            {editing && (
              <div className="mt-[var(--space-m)]">
                <dt className="text-[11px] font-bold uppercase tracking-[0.16em] text-canopy">
                  {cityLabel}
                </dt>
                {/* The one control here that cannot become an underline:
                    adding a city is a search, not a typed value. */}
                <div className="mt-[var(--space-xs)] max-w-[420px]">
                  <LocationPicker
                    mode="multi"
                    value={person.cities}
                    onChange={(v) => setAndSave("cities", v)}
                    placeholder="Add a city"
                    aria-label="Your cities"
                  />
                </div>
              </div>
            )}

            {/* ---- About ---- */}
            <section className="mt-[var(--space-l)]">
              <SectionLabel>About</SectionLabel>
              {editing ? (
                <textarea
                  ref={aboutRef}
                  value={person.about}
                  onChange={(e) => set("about", e.target.value)}
                  onBlur={() => save("about")}
                  rows={1}
                  aria-label="About you"
                  placeholder="You haven't written an About yet. A few lines, so people know who you are now."
                  className={cn(
                    PEN,
                    "-ml-1.5 mt-[var(--space-s)] block w-[calc(100%+0.75rem)] resize-none px-1.5 py-0.5 text-[15px] leading-[1.7] text-foreground"
                  )}
                />
              ) : (
                <p className="mt-[var(--space-s)] whitespace-pre-wrap px-1.5 text-[15px] leading-[1.7] text-foreground">
                  {person.about}
                </p>
              )}
            </section>

            {/* ---- Houses ---- */}
            <section className="mt-[var(--space-l)]">
              <SectionLabel>Houses</SectionLabel>
              <div className="mt-[var(--space-s)]">
                <HouseChainEditor
                  entries={person.houses}
                  onChange={(next: HouseYearEntry[]) => setAndSave("houses", next)}
                  yearJoined={Number(person.yearJoined) || null}
                  yearLeft={Number(person.yearLeft) || null}
                />
              </div>
              {/* Everything else on the sheet wears the dotted underline to
                  say it is live. A pill already has a border, so it cannot,
                  and a finished chain has no grey pill left to imply it
                  either. One quiet line instead of a box around the block,
                  and only once there is a house to tap: an empty chain is a
                  single grey pill that needs no caption. */}
              {person.houses.length > 0 && (
                <p className="mt-[var(--space-s)] text-[12px] text-muted-foreground">
                  Tap a house to change it.
                </p>
              )}
            </section>
          </div>
        </div>
      </div>

      {/* ---- what sits under the sheet ----------------------------------
          On the reading profile this band is the tab strip: All, Posts,
          Letters, Photos, Saved. Editing your own posts is not a thing, so
          in edit mode the strip fades back to a caption and the contact
          rows take the space it was holding. */}
      <div className="mt-[var(--space-l)] px-1">
        <AnimatePresence mode="wait" initial={false}>
          {editing ? (
            <motion.div
              key="contacts"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={SPRINGS.gentle}
            >
              <SectionLabel>Reaching you</SectionLabel>
              <div className="mt-[var(--space-s)] space-y-0.5">
                {person.contacts.map((c) => (
                  <div key={c.id} className="group/row flex items-center gap-2.5">
                    <ContactIcon kind={c.kind} />
                    <AutoInput
                      value={c.value}
                      onChange={(v) =>
                        set(
                          "contacts",
                          person.contacts.map((x) => (x.id === c.id ? { ...x, value: v } : x))
                        )
                      }
                      onBlur={() => save(`contact-${c.id}`)}
                      placeholder={PLACEHOLDER[c.kind]}
                      ariaLabel={c.kind}
                      fieldClass={cn(PEN, "px-1.5 py-1")}
                      className="text-[15px]"
                    />
                    <button
                      type="button"
                      aria-label="Remove"
                      onClick={() =>
                        setAndSave("contacts", person.contacts.filter((x) => x.id !== c.id))
                      }
                      className="state-layer shrink-0 rounded-full p-1.5 text-muted-foreground opacity-0 outline-none transition-opacity duration-150 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring group-hover/row:opacity-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <div className="pt-2">
                  <AddContact
                    label={person.contacts.length > 1 ? "Add another" : "Add a way to reach you"}
                    onAdd={(kind) => setAndSave("contacts", [...person.contacts, newContact(kind)])}
                  />
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="tabs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={SPRINGS.gentle}
              className="flex flex-wrap gap-1.5"
            >
              {["All", "Posts", "Letters", "Photos", "Saved"].map((t, i) => (
                <span
                  key={t}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-[13px] font-semibold",
                    i === 0 ? "bg-canopy text-white" : "text-muted-foreground"
                  )}
                >
                  {t}
                </span>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ---- the one button ---- */}
      <div className="mt-[var(--space-l)] flex items-center gap-3 px-1">
        <Button
          variant={editing ? "primary" : "outline"}
          onClick={() => setEditing((e) => !e)}
          className="rounded-full"
        >
          {editing ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
          {editing ? "Done" : "Edit profile"}
        </Button>
        {editing && (
          <span className="text-[12.5px] text-muted-foreground">
            Everything saves as you go.
          </span>
        )}
      </div>
    </div>
  );
}

const PLACEHOLDER: Record<string, string> = {
  email: "you@example.com",
  phone: "+91 ...",
  instagram: "@handle",
  linkedin: "linkedin.com/in/...",
  facebook: "facebook.com/...",
  link: "https://...",
};

function SectionLabel({ children }: { children: string }) {
  return <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-canopy">{children}</p>;
}

function Fact({
  label,
  wide,
  children,
}: {
  label: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={wide ? "col-span-2 sm:col-span-1" : "min-w-0"}>
      <dt className="text-[11px] font-bold uppercase tracking-[0.16em] text-canopy">{label}</dt>
      {/* -ml-1.5 cancels the pen's own padding, so an editable value sits on
          exactly the x its label does. That one negative margin is what keeps
          the sheet from growing a second left edge the moment you pick up
          the pen. */}
      <dd className="-ml-1.5 mt-[var(--space-xs)] text-[15px] font-semibold leading-[1.35] text-foreground">
        {children}
      </dd>
    </div>
  );
}

function YearPen({
  value,
  onChange,
  onBlur,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
}) {
  return (
    <AutoInput
      value={value}
      onChange={(v) => onChange(v.replace(/\D/g, "").slice(0, 4))}
      onBlur={onBlur}
      placeholder="0000"
      ariaLabel="Year"
      fieldClass={cn(PEN, "px-1.5 py-0.5")}
      className="text-[15px] font-semibold tabular-nums"
    />
  );
}
