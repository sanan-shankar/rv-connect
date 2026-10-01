/* ------------------------------------------------------------------ *
 *  The part of the profession pass that has to be RIGHT.
 *
 *  scripts/dev/tag-professions-apply.mjs reads and writes; this decides.
 *  What a well-formed answer is, what a tidied job title may be, when a
 *  row may be written at all, and the one statement that writes them.
 *  Apart from the applier for the reason photo-suggest.ts sits apart from
 *  its own: a script that connects to Postgres at its top level cannot be
 *  loaded by a test, and since 2026-10-01 these rules guard words that
 *  members typed (the owner's request is on TIDY_RULES in
 *  profession-tags.ts). The vocabulary itself stays in profession-tags.ts,
 *  which the directory imports; nothing in the app imports this.
 * ------------------------------------------------------------------ */

/* `.ts` extensions and relative paths, because the applier and this
   module's test run under bare node -- the same note as photo-suggest.ts. */
import { TAG_MAX_PER_PERSON, TAG_VALUES, sourceOf, withParents, type TagValue } from "./profession-tags.ts";
import { occupationCase } from "./normalize.ts";
import { OCCUPATION_MAX } from "./utils.ts";

/** The two words a member typed about their work. */
export type Pair = { jobTitle: string | null; workplace: string | null };

/** Everything the pass writes on one row. */
export type Columns = Pair & { tags: string[]; source: string | null };

/** One member's answer, checked. Tags carry their parents. A half of the
 *  pair that is absent is left as it is; `null` empties it; a string is
 *  what the profile should print. */
export type Verdict = { id: string; tags: TagValue[]; jobTitle?: string | null; workplace?: string | null };

export type VerdictProblem = { at: string; why: string };

/** The two halves compared as stored: NULL is not "", exactly as the
 *  write's own `IS NOT DISTINCT FROM` guard compares them. (sourceOf folds
 *  the two together, which is right for a source and wrong here.) */
export function sameText(a: Pair, b: Pair): boolean {
  return a.jobTitle === b.jobTitle && a.workplace === b.workplace;
}

export function sameTags(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((t) => b.includes(t));
}

/**
 * Every answer in a verdicts file, checked, and everything wrong with it.
 * The applier refuses the whole batch on a single problem: the two that
 * matter most -- an id outside the batch, an id answered twice -- are the
 * ways an answer lands on the wrong person, and a closed vocabulary is only
 * worth having if nothing outside it can be written.
 */
export function readVerdicts(
  raw: unknown,
  known: ReadonlySet<string>
): { verdicts: Verdict[]; problems: VerdictProblem[] } {
  /* A bare array instead of { people: [...] } is accepted, as the
     photograph applier accepts one: it is the shape a session reaches for
     first and refusing it teaches nothing. */
  const entries = Array.isArray(raw) ? raw : (raw as { people?: unknown } | null)?.people;
  if (!Array.isArray(entries)) {
    return { verdicts: [], problems: [{ at: "verdicts.json", why: 'should be { "people": [...] } or a bare array' }] };
  }

  const verdicts: Verdict[] = [];
  const problems: VerdictProblem[] = [];
  const seen = new Set<string>();
  for (const [i, entry] of entries.entries()) {
    const e = (entry ?? {}) as Record<string, unknown>;
    const id = typeof e.id === "string" ? e.id : null;
    const at = `people[${i}]${id ? ` (${id})` : ""}`;
    const fail = (why: string) => problems.push({ at, why });

    if (!id) { fail("no id"); continue; }
    if (!known.has(id)) { fail("not in this batch -- the verdicts file and the manifest have come apart"); continue; }
    if (seen.has(id)) { fail("answered twice"); continue; }
    seen.add(id);

    if (!Array.isArray(e.tags)) { fail("`tags` must be an array (use [] to say the text names no field)"); continue; }
    const tags = [...new Set(e.tags.map((t) => String(t).trim()).filter(Boolean))];
    const unknown = tags.filter((t) => !TAG_VALUES.includes(t));
    if (unknown.length > 0) {
      fail(
        `not in the vocabulary: ${unknown.join(", ")}. Do not invent one -- leave the person ` +
          `untagged and the pile is the evidence for adding it properly (rule 8).`
      );
      continue;
    }
    if (tags.length > TAG_MAX_PER_PERSON) {
      fail(
        `${tags.length} tags, and ${TAG_MAX_PER_PERSON} is the ceiling (rule 7). ` +
          `Most people want one or two -- keep the ones that name what they DO.`
      );
      continue;
    }

    const jobTitle = tidied(e, "jobTitle", fail);
    const workplace = tidied(e, "workplace", fail);
    verdicts.push({
      id,
      /* Rule 6, here rather than trusted to the session: forgetting a parent
         is invisible at the time, and the day a tag splits every saved link
         to the parent would return an empty page. */
      tags: withParents(tags as TagValue[]),
      ...(jobTitle !== undefined && { jobTitle }),
      ...(workplace !== undefined && { workplace }),
    });
  }
  return { verdicts, problems };
}

/** One half of a tidied pair as it would be stored: whitespace collapsed,
 *  and empty means NULL, as every editor of the column stores it. Absent
 *  stays absent ("leave it"); anything the profile could not hold is a
 *  problem. */
function tidied(
  e: Record<string, unknown>,
  field: "jobTitle" | "workplace",
  fail: (why: string) => void
): string | null | undefined {
  const v = e[field];
  if (v === undefined || v === null) return v;
  if (typeof v !== "string") {
    fail(`\`${field}\` must be a string, or null to empty it`);
    return undefined;
  }
  if (/[\r\n]/.test(v)) {
    fail(`\`${field}\` is broken across lines, which the profile cannot hold`);
    return undefined;
  }
  const t = v.replace(/\s+/g, " ").trim();
  if (t.length > OCCUPATION_MAX) {
    fail(`\`${field}\` is ${t.length} characters, and the profile allows ${OCCUPATION_MAX}`);
    return undefined;
  }
  return t || null;
}

/** What one answer does to one row. */
export type Plan = { kind: "same" } | { kind: "moved" } | { kind: "change"; before: Columns; after: Columns };

/**
 * Decide one row. `live` is the row as re-read at apply time, `picked` the
 * pair the session judged.
 *
 * MOVED is the guard that lets this pass touch typed words at all. An
 * answer is a judgement of the manifest's words, so a member whose words
 * changed since the pick is left alone, tags and all: written over newer
 * words it would be a judgement of text nobody read, and a tidy of the old
 * words would erase what they just typed. Left alone, their stored source no
 * longer matches their text, which is exactly what makes the next default
 * pick take them again. (Before 2026-10-01 the applier recorded the LIVE
 * words as the source instead, so such a member was never re-judged.)
 */
export function planRow(live: Columns, picked: Pair, v: Verdict): Plan {
  if (!sameText(live, picked)) return { kind: "moved" };
  const jobTitle = v.jobTitle === undefined ? live.jobTitle : v.jobTitle;
  const workplace = v.workplace === undefined ? live.workplace : v.workplace;
  const after: Columns = { tags: v.tags, source: sourceOf(jobTitle, workplace), jobTitle, workplace };
  if (sameTags(live.tags, after.tags) && live.source === after.source && sameText(live, after)) {
    return { kind: "same" };
  }
  return { kind: "change", before: live, after };
}

/**
 * Each tidied half the member's next save would rewrite, as a sentence for
 * the dry run. The save path runs occupationCase, so a tidy it disagrees
 * with is undone the first time they touch the field. Reported rather than
 * refused, because sometimes the save path is the one that is wrong:
 * "iOS Developer" comes back "IOS Developer".
 */
export function undoneByNextSave(before: Pair, after: Pair): string[] {
  const notes: string[] = [];
  for (const field of ["jobTitle", "workplace"] as const) {
    const v = after[field];
    if (v === null || v === before[field]) continue;
    const saved = occupationCase(v);
    if (saved !== v) notes.push(`${field} ${JSON.stringify(v)} would become ${JSON.stringify(saved)}`);
  }
  return notes;
}

/**
 * One UPDATE for a whole batch, every row guarded on the words it may be
 * written over. RETURNING names the rows it wrote; an id missing from it is
 * a member who edited in the moment between the re-read and this statement,
 * and was left alone.
 *
 * ONE statement, not one per row. Measured from here on 2026-10-01 a round
 * trip to the pooler is about 186ms, so a per-row loop spent 30s on 164
 * rows and would pass a session's two-minute tool limit near 640 -- a
 * vocabulary round at a thousand tagged members, killed half-applied. As
 * one statement it is one round trip, and all of it lands or none does.
 *
 * Shared by the apply (`after` over `before`) and the undo (`before` back
 * over `after`), so there is one definition of a guarded write.
 */
export const GUARDED_WRITE = `
  UPDATE "User" u
     SET "professionTags" = ARRAY(SELECT jsonb_array_elements_text(r.tags)),
         "professionTagSource" = r.source,
         "jobTitle" = r."jobTitle",
         "workplace" = r.workplace
    FROM jsonb_to_recordset($1::jsonb)
      AS r(id text, tags jsonb, source text, "jobTitle" text, workplace text,
           "overTitle" text, "overPlace" text)
   WHERE u."id" = r.id
     AND u."jobTitle" IS NOT DISTINCT FROM r."overTitle"
     AND u."workplace" IS NOT DISTINCT FROM r."overPlace"
  RETURNING u."id"`;

/** GUARDED_WRITE's one parameter: each row's new columns, and the words it
 *  may only be written over. A missing half reads as NULL in Postgres, so
 *  an entry without words only ever matches a row with none. */
export function guardedWriteRows(rows: readonly { id: string; to: Columns; over: Pair }[]): string {
  return JSON.stringify(
    rows.map(({ id, to, over }) => ({
      id,
      tags: to.tags,
      source: to.source,
      jobTitle: to.jobTitle,
      workplace: to.workplace,
      overTitle: over.jobTitle,
      overPlace: over.workplace,
    }))
  );
}
