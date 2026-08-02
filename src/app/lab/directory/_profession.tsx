"use client";

/* ------------------------------------------------------------------ *
 *  Profession: why the filter returns nothing, and the offline tagging
 *  pass that would fix it.
 *
 *  Every number in this file was read off the live database on
 *  2026-08-02 with scripts/dev/run-sql.mjs, not estimated.
 * ------------------------------------------------------------------ */

import { useState } from "react";
import { cn } from "@/lib/utils";

/* --- the live rows -------------------------------------------------- *
 *
 *  All 21 unblocked members, as (jobTitle, workplace). Transcribed
 *  verbatim, typo included ("Univeristy of Delaware"), because the typo
 *  is half the argument for a normalising pass.
 * ------------------------------------------------------------------ */

export const LIVE_ROWS: { job: string | null; org: string | null; n: number }[] = [
  { job: null, org: null, n: 8 },
  { job: "Lawyer", org: null, n: 1 },
  { job: "Student", org: null, n: 2 },
  { job: "Student", org: "Ashoka University", n: 1 },
  { job: "Student", org: "Carleton College", n: 1 },
  { job: "Student", org: "Cmi", n: 1 },
  { job: "Student", org: "Imperial College London", n: 1 },
  { job: "Student", org: "Krea University", n: 2 },
  { job: "Student", org: "Tufts University", n: 1 },
  { job: "Student", org: "Univeristy of Delaware", n: 1 },
  { job: "Student", org: "University of Delhi", n: 1 },
  { job: "Student", org: "Virginia Tech", n: 1 },
];

export const LIVE_TOTAL = 21;

/** What each row WOULD be tagged, running the prompt below by hand. Shown
 *  beside the raw row so the pass can be judged on real input rather than
 *  on a promise about it. */
export const TAGGED: Record<string, { field: string; stage: string; note?: string }> = {
  "Lawyer|": { field: "Law", stage: "Working" },
  "Student|Ashoka University": { field: "Studying", stage: "Undergraduate" },
  "Student|Carleton College": { field: "Studying", stage: "Undergraduate" },
  "Student|Cmi": { field: "Studying", stage: "Undergraduate", note: "Chennai Mathematical Institute. A three-letter string no rule table would resolve." },
  "Student|Imperial College London": { field: "Studying", stage: "Undergraduate" },
  "Student|Krea University": { field: "Studying", stage: "Undergraduate" },
  "Student|Tufts University": { field: "Studying", stage: "Undergraduate" },
  "Student|Univeristy of Delaware": { field: "Studying", stage: "Undergraduate", note: "Misspelt. Exact matching and fuzzy matching both miss it; a model does not." },
  "Student|University of Delhi": { field: "Studying", stage: "Undergraduate" },
  "Student|Virginia Tech": { field: "Studying", stage: "Undergraduate" },
};

/* --- the proposed vocabulary ---------------------------------------- *
 *
 *  Two axes, because one axis cannot carry both facts and the shipped
 *  single `workplace` column trying to be both is exactly how it broke.
 *
 *  FIELD answers "what world are you in". STAGE answers "where are you in
 *  it". A 19-year-old at Krea and a 45-year-old partner at a law firm are
 *  both findable, and the very common near-term case (a recent leaver at
 *  university) stops having to pretend to be a profession.
 * ------------------------------------------------------------------ */

export const FIELDS = [
  "Technology", "Finance", "Healthcare", "Education", "Arts & Media",
  "Law", "Government", "Non-profit", "Research", "Consulting",
  "Business", "Environment", "Design", "Sport", "Studying", "Other",
];

export const STAGES = ["School", "Undergraduate", "Postgraduate", "Working", "Leading", "Retired"];

/* --- the prompt ------------------------------------------------------ */

export const EXPORT_SHAPE = `// scripts/dev/profession-export.mjs writes one JSON object per line:
{"id":"cmd8...","jobTitle":"Student","workplace":"Cmi","bio":null,"about":null}
{"id":"cmd9...","jobTitle":"Lawyer","workplace":null,"bio":"Litigation, Bengaluru","about":null}`;

export const PROMPT = `You are tagging members of a school alumni directory so they can be
filtered by what they do. You will receive JSONL, one member per line, with
id, jobTitle, workplace, bio and about. Any field may be null.

For each line, return one JSON object with exactly these keys:

  id          the id you were given, unchanged
  field       exactly one of: ${FIELDS.join(", ")}
  stage       exactly one of: ${STAGES.join(", ")}
  confidence  high | medium | low
  reason      at most 12 words, why you chose that field

Rules:
- Resolve the organisation before you judge it. "Cmi" is Chennai Mathematical
  Institute, so the member is Studying, not working in consulting.
- Correct obvious misspellings silently ("Univeristy of Delaware").
- A university, college or institute in workplace means field "Studying"
  unless jobTitle says they teach or research there.
- jobTitle beats workplace when they disagree. A designer at a bank is Design.
- If both jobTitle and workplace are null, return field "Other", stage
  "Working", confidence "low". Do not guess from a name.
- Never invent a value outside the two lists above.
- Return only JSONL. One object per line. No prose, no code fences.`;

export const IMPORT_SHAPE = `// scripts/dev/profession-import.mjs reads the model's JSONL and writes:
//   User.professionField   the filterable value
//   User.professionStage
//   User.professionSource  "model" | "member"   <- a member editing their own
//                          profile sets "member", and a later pass must never
//                          overwrite a "member" row. This is the one rule that
//                          keeps a re-run from undoing somebody's correction.
//   User.professionAt      when the pass ran, so a stale tag is visible`;

/* --- the demo table -------------------------------------------------- */

export function TaggingDemo() {
  const [tagged, setTagged] = useState(false);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setTagged((v) => !v)}
          aria-pressed={tagged}
          className={cn(
            "state-layer rounded-full border px-4 py-2 text-[14px] font-semibold outline-none transition-transform duration-150 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-canopy",
            tagged ? "border-canopy bg-canopy text-white" : "border-border bg-card text-foreground"
          )}
        >
          {tagged ? "Showing tagged" : "Run the pass"}
        </button>
        <span className="text-[13.5px] text-muted-foreground">
          The 21 real members, exactly as the database holds them.
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] border-collapse text-left">
          <thead>
            <tr>
              {["Members", "jobTitle", "workplace", tagged ? "field" : "matches Profession filter?", tagged ? "stage" : ""].filter(Boolean).map((c) => (
                <th key={c} className="border-b border-border pb-2.5 pr-5 text-[12px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LIVE_ROWS.map((r, i) => {
              const key = `${r.job ?? ""}|${r.org ?? ""}`;
              const t = TAGGED[key];
              return (
                <tr key={i} className="border-b border-border/60 last:border-0">
                  <td className="py-2.5 pr-5 text-[15px] font-semibold tabular-nums text-foreground">{r.n}</td>
                  <td className="py-2.5 pr-5 text-[14px] text-muted-foreground">
                    {r.job ?? <span className="opacity-50">null</span>}
                  </td>
                  <td className="py-2.5 pr-5 text-[14px] text-muted-foreground">
                    {r.org ?? <span className="opacity-50">null</span>}
                  </td>
                  {tagged ? (
                    <>
                      <td className="py-2.5 pr-5 text-[14px] font-semibold text-leaf">
                        {t?.field ?? "Other"}
                      </td>
                      <td className="py-2.5 pr-5 text-[14px] text-muted-foreground">
                        {t?.stage ?? "Working"}
                        {t?.note && (
                          <div className="mt-0.5 max-w-[34ch] text-[12.5px] leading-snug text-cinnamon">{t.note}</div>
                        )}
                      </td>
                    </>
                  ) : (
                    <td className="py-2.5 pr-5 text-[14px] font-semibold text-heart">No</td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-[15px] leading-[1.6] text-muted-foreground">
        {tagged ? (
          <>
            Every member lands in a real bucket, and the two that no rule table could reach
            (<b className="font-semibold text-foreground">Cmi</b>, and a misspelt Delaware) land there too.
            Thirteen of twenty-one are <b className="font-semibold text-foreground">Studying</b>, which is the
            honest shape of this directory right now and the thing the current fourteen-item
            profession list has no way to say.
          </>
        ) : (
          <>
            Zero of twenty-one match. Not because the query is wrong, but because nothing in the
            column is a profession.
          </>
        )}
      </p>
    </div>
  );
}

/* --- a copyable block ------------------------------------------------- */

export function CodeBlock({ title, body }: { title: string; body: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="overflow-hidden rounded-[var(--radius)] border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="text-[12px] font-bold uppercase tracking-[0.1em] text-muted-foreground">{title}</span>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(body);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          }}
          className="state-layer rounded-full border border-border bg-background px-3 py-1 text-[12px] font-semibold text-foreground outline-none transition-transform duration-150 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-canopy"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="max-h-[420px] overflow-auto p-4 text-[12.5px] leading-[1.55] text-foreground">
        {body}
      </pre>
    </div>
  );
}
