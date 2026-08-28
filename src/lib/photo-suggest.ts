/* ------------------------------------------------------------------ *
 *  Filling the taxonomy in, for photographs nobody tagged.
 *
 *  Spec sec. 8.3 asked for this and drew it as a paid API call: send each
 *  480px thumbnail to the Claude API, get a closed classification back,
 *  run the Batch API over twenty thousand for about $29. The owner
 *  redirected it on 2026-08-28, and his shape is better:
 *
 *    "I wasn't actually gonna do it through API. I was gonna orchestrate
 *     it through my regular Claude Max subscription on a session in VS
 *     Code. It can access all the photos and that should be more than
 *     enough."
 *
 *  So there is no API key, no runtime dependency, no per-photograph bill
 *  and nothing new in the deployed bundle. A session in this repo looks
 *  at the photographs on disk and writes down what it sees; two scripts
 *  put them there and take the answers back (scripts/dev/tag-photos-*).
 *  This module is the part that has to be RIGHT rather than convenient:
 *  what the vocabulary is, what counts as a well-formed answer, and what
 *  may be written over.
 *
 *  ONE RULE CARRIES THE WHOLE THING: a suggestion only ever fills a
 *  field that is EMPTY. Spec sec. 8.3's own line is "suggestions are
 *  never silent -- they arrive as prefilled fields the contributor can
 *  change", and in a backfill there is no contributor in the room to
 *  change them. The honest equivalent of asking is not asking for
 *  anything a person has already answered. So a caption somebody wrote
 *  is never touched, a bucket somebody chose is never removed, and a
 *  date somebody gave is never overruled. What is left is the enormous
 *  common case this exists for: the field is blank.
 * ------------------------------------------------------------------ */

/* A `.ts` extension, and a relative path, because this module's own unit test
   runs under bare node, which resolves neither the "@/" alias nor an
   extensionless specifier. tsconfig's `allowImportingTsExtensions` exists for
   exactly this (see the comment there). */
import { BUCKET_VALUES, ERA_VALUES, bucketsOf, type BucketValue } from "./collection.ts";

/** The longest caption the Collection accepts, matching `photoSchema`. */
export const SUGGEST_CAPTION_MAX = 300;

/**
 * What a classifier cannot know about this place, written down.
 *
 * `prior-art.md` is blunt about the limit of every automated tagger sold
 * for this job, and it is the one line worth carrying into the prompt:
 * "It will know 'tree' and 'building'. It will not know 'the banyan' or
 * 'Rishi Konda' unless we teach it those words explicitly."
 *
 * Deliberately short, and deliberately only things this repo already
 * says elsewhere -- the bucket hints in `collection.ts`, the house list,
 * the guide's chapter on the birds. A glossary that invents detail about
 * a real school would be worse than none: it would be repeated back in
 * captions, in the school's own archive, as fact.
 */
export const VALLEY_GLOSSARY = `Rishi Valley School sits in a valley in Andhra Pradesh and is a
bird sanctuary as well as a school, which is why Birds is a bucket of its own however few
photographs are in it.

Names that will appear and that a general classifier will not know:
  - "the banyan" -- a very large old banyan whose dropped roots have become trunks. The school
    assembles under it, so the tree standing alone is Nature and the courtyard, lawn or
    amphitheatre under it is Campus.
  - "Rishi Konda" -- the hill above the valley. A hill, so Nature.
  - "the study", "junior school", "the dining hall" -- buildings, so Campus.
  - "assembly", "Founders' Week", "sports day", "the choir" -- things that happen, so School life.
  - House names (Golden, Silver, Neem, Raavi, Palm, Meru, Nilgiri, Amaltash, Gulmohar and others)
    are groups of children, not places.

Do not write a name into a caption unless it is already in what the contributor typed. You cannot
tell one person, one house or one year from another by looking, and this is a real school's
archive: a confident wrong name is worse than no caption at all.`;

/**
 * How to choose between the six. Written here rather than in the session
 * prompt because it is the part that decides what the archive looks like,
 * and a rule kept beside the vocabulary cannot drift from it.
 */
export const BUCKET_RULES = `Give every photograph at least one bucket and as many as genuinely
apply -- the banyan with children under it is Campus and People and School life, and filing it
under one of the three makes it unfindable under the other two.

  People       any photograph whose subject is a person or people: portraits, class photographs,
               groups, faces. A crowd at a distance where nobody is legible is not People.
  Birds        a bird, anywhere in the frame as its subject.
  Nature       the land itself: trees, the hills, weather, flowers, animals that are not birds.
  Campus       the built valley: buildings, rooms, the study, the dining hall, the banyan courtyard.
  School life  what happens here: assembly, sport, plays, music, dining, work, reunions.
  Other        genuinely nowhere else. Use it rather than forcing a fit -- Other is read, and a
               run of photographs landing in it is the evidence for a seventh bucket.`;

/** One photograph's answer, as a tagging session writes it down. */
export type Verdict = {
  id: string;
  buckets: BucketValue[];
  /** A plain sentence, only where the photograph really says one. */
  caption?: string;
  /** A decade, only when the photograph itself dates it. */
  era?: string;
};

export type VerdictProblem = { at: string; why: string };

/** Collapse a suggested caption to the one line the column will take. */
export function tidyCaption(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, SUGGEST_CAPTION_MAX);
}

/**
 * Read a verdicts file, refusing anything malformed rather than coercing it.
 *
 * A seventh bucket is the failure this is really guarding: the whole value of
 * a closed vocabulary is that nothing outside it can be written, and the
 * moment an unrecognised value is quietly mapped to Other, "Other is a sensor"
 * (collection.ts) stops being true -- the sensor reads the mapping rather than
 * the archive. So an unknown bucket is a PROBLEM the person running this has
 * to look at, not a value silently corrected.
 *
 * `known` is the set of ids the picker actually exported. An id outside it
 * means the file and the batch have come apart, which is the one way this
 * could write an answer onto the wrong photograph.
 */
export function readVerdicts(
  raw: unknown,
  known: Set<string>
): { verdicts: Verdict[]; problems: VerdictProblem[] } {
  const problems: VerdictProblem[] = [];
  const verdicts: Verdict[] = [];

  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as { photos?: unknown[] }).photos)
      ? (raw as { photos: unknown[] }).photos
      : null;
  if (!list) {
    return { verdicts, problems: [{ at: "(file)", why: "expected an array, or { photos: [...] }" }] };
  }

  const seen = new Set<string>();
  list.forEach((entry, i) => {
    const where = `#${i + 1}`;
    if (!entry || typeof entry !== "object") {
      problems.push({ at: where, why: "not an object" });
      return;
    }
    const e = entry as Record<string, unknown>;
    const id = typeof e.id === "string" ? e.id : "";
    if (!id) {
      problems.push({ at: where, why: "no id" });
      return;
    }
    if (!known.has(id)) {
      problems.push({ at: id, why: "not one of the photographs this batch exported" });
      return;
    }
    if (seen.has(id)) {
      problems.push({ at: id, why: "answered twice" });
      return;
    }
    seen.add(id);

    if (!Array.isArray(e.buckets)) {
      problems.push({ at: id, why: "buckets is not a list" });
      return;
    }
    const buckets: BucketValue[] = [];
    let bad = false;
    for (const b of e.buckets) {
      if (typeof b !== "string" || !(BUCKET_VALUES as readonly string[]).includes(b)) {
        problems.push({ at: id, why: `"${String(b)}" is not one of the six buckets` });
        bad = true;
        continue;
      }
      if (!buckets.includes(b as BucketValue)) buckets.push(b as BucketValue);
    }
    if (bad) return;
    if (buckets.length === 0) {
      problems.push({ at: id, why: "no buckets; use \"other\" rather than none" });
      return;
    }

    const verdict: Verdict = { id, buckets };

    if (e.caption !== undefined && e.caption !== null && e.caption !== "") {
      if (typeof e.caption !== "string") {
        problems.push({ at: id, why: "caption is not a string" });
        return;
      }
      const caption = tidyCaption(e.caption);
      if (caption) verdict.caption = caption;
    }

    if (e.era !== undefined && e.era !== null && e.era !== "" && e.era !== "unknown") {
      if (typeof e.era !== "string" || !(ERA_VALUES as readonly string[]).includes(e.era)) {
        problems.push({ at: id, why: `"${String(e.era)}" is not one of the decades` });
        return;
      }
      verdict.era = e.era;
    }

    verdicts.push(verdict);
  });

  return { verdicts, problems };
}

/** The Photo columns this decides about. */
export type TaggableRow = {
  id: string;
  subject: string | null;
  caption: string | null;
  era: string | null;
  datePrecision: string | null;
};

/** What one row would be changed to, and what was left alone and why. */
export type Change = {
  id: string;
  /** The columns to write. Empty is impossible: `planChange` returns null. */
  set: { subject?: string; caption?: string; era?: string; datePrecision?: string };
  /** The same columns as they are now, so the write can be undone exactly. */
  was: { subject?: string | null; caption?: string | null; era?: string | null; datePrecision?: string | null };
  /** Human-readable notes on what the suggestion offered and this refused. */
  kept: string[];
};

/**
 * What may be written onto one row, given one verdict.
 *
 * Every branch here is the same rule said three times: fill what is empty,
 * leave what a person answered. Returns null when there is nothing left to
 * fill, which is the ordinary outcome for a photograph somebody filed
 * properly and is not worth reporting as a failure.
 */
export function planChange(row: TaggableRow, v: Verdict): Change | null {
  const set: Change["set"] = {};
  const was: Change["was"] = {};
  const kept: string[] = [];

  if (bucketsOf(row.subject).length > 0) {
    kept.push("already filed under a bucket");
  } else {
    set.subject = v.buckets.join(",");
    was.subject = row.subject;
  }

  if (v.caption) {
    if (row.caption && row.caption.trim()) {
      kept.push("already has a caption");
    } else {
      set.caption = v.caption;
      was.caption = row.caption;
    }
  }

  /* A decade is only offered where the photograph has NO date at all. A
     contributor who picked "the 1970s" has answered the question, and a
     contributor who gave a year has answered it better than a photograph can
     be read -- `era` is derived from that year (collection-photo.ts), so
     writing a decade over it would put the two columns into disagreement. */
  if (v.era) {
    const dated = (row.datePrecision ?? "unknown") !== "unknown";
    const hasEra = !!row.era && row.era !== "unknown";
    if (dated || hasEra) {
      kept.push("already dated");
    } else {
      set.era = v.era;
      set.datePrecision = "decade";
      was.era = row.era;
      was.datePrecision = row.datePrecision;
    }
  }

  if (Object.keys(set).length === 0) return null;
  return { id: row.id, set, was, kept };
}
