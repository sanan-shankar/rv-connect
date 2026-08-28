/* ------------------------------------------------------------------ *
 *  What people do, as the directory can browse it.
 *
 *  The one source of the profession vocabulary: the tags themselves,
 *  the rules for creating one, the two caps that keep the filter's list
 *  readable, and the map from every dead value onto a live one.
 *
 *  WHY A DERIVED TAG AND NOT A COLUMN SOMEBODY FILLS IN. Measured on
 *  the live database on 2026-08-28: 63 members, 34 with any work text,
 *  and the answer is only readable from the PAIR -- `workplace` holds
 *  the organisation ("Tufts University", "Marvell") and `jobTitle` the
 *  role ("Student", "Computer Engineer"). Neither column can be
 *  filtered on alone, and the previous attempt (a `contains` over both
 *  against a self-selection list) matched 0 of 63 the day it was
 *  measured. So a session reads the pairs and writes the tags:
 *  .claude/skills/tag-professions/SKILL.md is the procedure.
 *
 *  TAGS, PLURAL, AND NEVER A BOOLEAN. The owner, 2026-08-28: "student
 *  boolean isn't scalable." A person holds several, so the medical
 *  student is ["student", "healthcare"] -- the field and the status in
 *  one column, with no second axis and no schema change when a third
 *  kind of thing turns up. Anything the vocabulary needs to say later
 *  is another string in this array.
 * ------------------------------------------------------------------ */

/**
 * The vocabulary.
 *
 * `parent` is what makes this list able to change without breaking a
 * link somebody bookmarked: when Healthcare eventually splits into
 * Doctors and the rest, the doctor is tagged ["healthcare", "doctors"]
 * and `?profession=healthcare` goes on returning them. See `withParents`,
 * which is what guarantees it rather than the session remembering.
 *
 * `hint` is for the tagging session, not for the UI -- it is the line
 * that decides a borderline pair, and it is kept beside the value so
 * the two cannot drift.
 */
export const PROFESSION_TAGS = [
  { value: "technology", label: "Technology", parent: null,
    hint: "Software, data, product, IT. The computer engineer at a chip company is here, not Engineering." },
  { value: "engineering", label: "Engineering", parent: null,
    hint: "Engineering that is not software: civil, mechanical, electrical, manufacturing." },
  { value: "healthcare", label: "Healthcare", parent: null,
    hint: "Medicine, nursing, public health, veterinary, mental health. Practising or training for it." },
  { value: "law", label: "Law", parent: null,
    hint: "Practice, judiciary, legal academia. A law school reads as Law and Student both." },
  { value: "finance", label: "Finance", parent: null,
    hint: "Banking, investing, accountancy, insurance, financial research." },
  { value: "business", label: "Business", parent: null,
    hint: "Running or managing a company: founders, family business, management, sales, operations." },
  { value: "education", label: "Education", parent: null,
    hint: "Teaching and running schools. The teaching side of a university; Research is the other." },
  { value: "research", label: "Research", parent: null,
    hint: "Academia and research science, in a university, an institute or a lab." },
  { value: "design", label: "Design", parent: null,
    hint: "Architecture, graphic, product, fashion, interiors." },
  { value: "arts", label: "Arts", parent: null,
    hint: "Making the work itself: music, theatre, film, fine art, dance, writing as an art." },
  { value: "media", label: "Media", parent: null,
    hint: "Journalism, publishing, broadcast, film production, communications." },
  { value: "government", label: "Government", parent: null,
    hint: "Civil service, policy, diplomacy, armed forces, elected office." },
  { value: "social impact", label: "Social impact", parent: null,
    hint: "Non-profits, development, activism, philanthropy. Two words because neither alone is the field." },
  { value: "hospitality", label: "Hospitality", parent: null,
    hint: "Food, restaurants, hotels, travel." },
  { value: "farming", label: "Farming", parent: null,
    hint: "Agriculture and the business of growing things." },
  { value: "environment", label: "Environment", parent: null,
    hint: "Conservation, ecology, climate. A valley with a bird sanctuary will fill this one." },
  /* A status, in the same column as the fields, on purpose (rule 9). It
     is 25 of the 34 people who have said anything at all, so a "student"
     boolean would have been the largest and least useful fact in the
     directory; as a tag it combines -- ["student", "law"] is the GNLU
     student, and ["student"] alone is the honest answer for somebody at
     a general university whose field nothing has said yet.

     It was "studying" for one evening. The owner: "why is it studying. it
     should be student." He is right, and the reason generalises: every
     other value here is a field, so a gerund is the one odd word in the
     list -- and when Retired arrives it will sit beside Student naturally
     and beside Studying awkwardly. Renamed properly rather than relabelled,
     see LEGACY_TAGS. */
  { value: "student", label: "Student", parent: null,
    hint: "Still in full-time education. Combine with the field where the course or institution names one." },
] as const;

export type TagValue = (typeof PROFESSION_TAGS)[number]["value"];

export const TAG_VALUES: readonly string[] = PROFESSION_TAGS.map((t) => t.value);

/**
 * How many people a tag needs before the filter OFFERS it.
 *
 * Its whole job is excluding a tag that describes ONE person: "is this a
 * category, or is it somebody?" Nothing more. Keeping the list short is
 * TAG_VISIBLE_MAX's job, below, and splitting the two is what lets this one
 * be small enough to be honest at 63 members and still be right at 2,000.
 *
 * IT WAS FIVE FIRST, and five was wrong -- worth recording because the
 * reasoning sounded fine and the data settled it. Measured on the live
 * database the day the tags landed: Student 25, then Education, Healthcare
 * and Law on 2 each and six tags on 1. A floor of five admitted exactly one
 * option, so the Profession control was a dropdown with nothing to choose
 * between, and the owner came back the same evening: "there's no real filters
 * for profession now." Two is the literal reading of what he actually asked
 * for at the start -- "we don't want to have a bunch of buckets with just one
 * person" -- and it admits four.
 *
 * This is a DISPLAY rule and assignment never bends to it (rule 2). The lone
 * doctor is tagged Healthcare on the day they join and the tag appears by
 * itself when the second arrives.
 */
export const TAG_FLOOR = 2;

/**
 * How many tags the filter will offer at once, largest first.
 *
 * The owner, 2026-08-28: "we need to make sure we don't have 100 tags
 * for people to wade through." This is the "is this list readable"
 * gate, and it is the one that survives growth -- the two hand off, so
 * at 63 members the floor does all the work and this does none, and at
 * 2,000 it is the other way round.
 *
 * Twelve because that is a list you take in as a column without
 * scrolling. FacetSelect has a search box, but a filter you have to
 * SEARCH has already failed at being browsable, and browsing is this
 * control's whole job.
 *
 * A tag past the twelfth still filters from a URL and still draws its
 * chip -- exactly what the removed House filter's arm does.
 */
export const TAG_VISIBLE_MAX = 12;

/**
 * The most tags one person can be given.
 *
 * The owner's number. Note this is the OPPOSITE instinct to the
 * Collection's buckets, which ask for as many as genuinely apply:
 * over-filing a photograph costs nothing, but over-tagging a person
 * makes every filtered result the whole directory, which is the one way
 * this feature fails silently.
 *
 * Parents added by `withParents` do not count against it. They are not
 * a judgement -- they are the mechanism of rule 6 -- and charging for
 * them would make a child tag quietly cost two of these four.
 */
export const TAG_MAX_PER_PERSON = 4;

/**
 * The most tags the vocabulary may hold. Held by
 * profession-tags.test.mjs, not by anything at runtime.
 *
 * TAG_FLOOR and TAG_VISIBLE_MAX cap what is SHOWN; this caps what
 * EXISTS, so the list cannot grow by drift. It is the rule that makes
 * "merge upward" and "split only when crowded" bite instead of being
 * advice: past eighteen, adding a tag has to be an argument about which
 * one it replaces. Six clear of TAG_VISIBLE_MAX so a new or thin tag
 * can exist and mature without immediately fighting for a slot.
 */
export const VOCAB_MAX = 18;

/**
 * Every value a dead vocabulary could have written, onto live ones.
 *
 * An ARRAY on the right, unlike the Collection's one-to-one
 * LEGACY_BUCKETS: a tag that was split maps onto several, a tag that
 * was merged maps several onto one, and a tag that simply went away
 * maps onto nothing. That is the whole "no migration to change the
 * vocabulary" promise -- a rename or a removal is an entry here plus a
 * deletion above, and rows carrying the old string keep working until
 * somebody re-judges them at leisure.
 *
 * Empty today because this is the first vocabulary. The fourteen-item
 * list it replaces (src/lib/professions.ts) is NOT mapped in: nothing
 * was ever stored from it -- it was a filter vocabulary matched against
 * free text, never written to a column -- so there is nothing to carry
 * over.
 */
const LEGACY_TAGS: Record<string, TagValue[]> = {
  // "Studying" for one evening, 2026-08-28 -- see the note on the Student
  // entry above. Kept although the rows were rewritten by
  // prisma/migrations-manual/2026-08-28-profession-student-rename.sql,
  // because the demo database seeds its own people and a browser can hold a
  // page built before the deploy.
  studying: ["student"],
};

/* WHAT LEGACY_TAGS DOES NOT COVER, learned by renaming one value.
 *
 * `tagsOf` maps a dead value on READ, and the directory's filter arm matches
 * the stored string directly, so both survive a rename. The FACET OPTIONS do
 * not: the histogram behind them is `unnest("professionTags")` in raw SQL
 * (directory/page.tsx), which never passes through this file -- so a renamed
 * value goes on being counted, and labelled, under its old name until the
 * rows themselves are rewritten.
 *
 * So: ADDING, REMOVING or SPLITTING a tag needs no SQL, which is the promise
 * this design was built on. RENAMING a stored value needs a migration as
 * well, and it is worth doing properly rather than leaving the label and the
 * value saying two different words. */

const TAG_LABELS: Record<string, string> = Object.fromEntries(
  PROFESSION_TAGS.map((t) => [t.value, t.label])
);

const TAG_PARENTS: Record<string, TagValue | null> = Object.fromEntries(
  PROFESSION_TAGS.map((t) => [t.value, t.parent])
);

/** One stored value as a person reads it. Unknown values read as themselves,
 *  capitalised, rather than vanishing -- a label is never a filter. */
export function tagLabel(v: string): string {
  return TAG_LABELS[v] ?? v.charAt(0).toUpperCase() + v.slice(1);
}

/**
 * A stored array as the tags it means: legacy values mapped, duplicates
 * dropped, anything from neither vocabulary DROPPED.
 *
 * Dropped rather than kept, and this is the one place this file is
 * stricter than the Collection's `bucketsOf`. A photograph filed under
 * an unrecognised bucket falls to Other, which is a real bucket a person
 * can browse. There is no Other here (rule 8) -- an unrecognised tag has
 * nowhere to go, and keeping it would put a value in the facet histogram
 * that no vocabulary explains and no rule can remove.
 */
export function tagsOf(raw: readonly string[] | null | undefined): TagValue[] {
  if (!raw) return [];
  const seen = new Set<TagValue>();
  for (const value of raw) {
    const v = value.trim();
    if (!v) continue;
    if ((TAG_VALUES as readonly string[]).includes(v)) {
      seen.add(v as TagValue);
      continue;
    }
    for (const mapped of LEGACY_TAGS[v] ?? []) seen.add(mapped);
  }
  return [...seen];
}

/**
 * The exact text a set of tags was judged from, as one string.
 *
 * Stored in `User.professionTagSource` so the pick script can find the
 * people whose work text has CHANGED since they were tagged, without
 * re-reading everybody. JSON rather than a delimiter because both halves
 * are free text: any separator character a person could not type is also
 * a character Postgres will not store, and any character they could type
 * is one that makes two different pairs collide.
 *
 * THERE IS DELIBERATELY NO SQL VERSION OF THIS. The pick script's staleness
 * check was written as `json_build_array(...)::text` in the WHERE clause
 * first, and it re-took every tagged member on the very next run: Postgres
 * renders that as `["Businessman", "KSR Group"]` and JSON.stringify renders
 * it as `["Businessman","KSR Group"]`, so every row compared unequal to its
 * own source forever. The comparison happens in JS against this one
 * function. If you are about to write the SQL twin, that is the bug.
 */
export function sourceOf(jobTitle: string | null, workplace: string | null): string {
  return JSON.stringify([jobTitle ?? "", workplace ?? ""]);
}

/**
 * Rule 6: a child tag always carries its parent.
 *
 * Applied by the applier so a tagging session cannot forget it, because
 * forgetting it is invisible at the time and expensive later: the day
 * Healthcare splits, every person moved onto a child tag would silently
 * leave Healthcare, and every `?profession=healthcare` link anybody had
 * saved would return an empty page.
 *
 * Walks up, so a grandchild carries both its parent and its grandparent.
 * Terminates on a cycle rather than hanging -- the test forbids one, but
 * a hand-edited vocabulary is exactly where a cycle would come from and
 * a hang at apply time would be a mystery.
 */
export function withParents(tags: readonly TagValue[]): TagValue[] {
  const out = new Set<TagValue>();
  for (const tag of tags) {
    let cur: TagValue | null = tag;
    while (cur && !out.has(cur)) {
      out.add(cur);
      cur = TAG_PARENTS[cur] ?? null;
    }
  }
  return [...out];
}

/**
 * The rules, in the words the tagging session reads.
 *
 * Kept here rather than only in the skill file for the same reason
 * BUCKET_RULES lives beside BUCKETS: this is the part that decides what
 * the directory looks like, and a rule kept beside the vocabulary cannot
 * drift from it. The skill quotes this; it does not restate it.
 */
export const TAG_RULES = `A tag is a field somebody would browse, not a job title. "Financial
Research" is a title; Finance is a tag. Labels are one word wherever one word is true -- a
compound label ("Agriculture & Environment") is two tags pretending to be one.

Tag honestly, whatever the size. A tag needs a second person before the filter offers it, but that
is a display rule and it is not yours to manage: the lone doctor is Healthcare on the day they
join and the tag appears by itself when the second one arrives. Never choose a tag to make one
show up or stay hidden.

Never invent a tag to fit one person. If the only way to phrase it is by describing the person in
front of you, it is not a tag -- use the nearest broader tag that is true, or none.

Merge upward, never sideways. Two thin candidates resolve to the tag that contains both -- medicine
and public health are Healthcare, never a new "Health & Wellbeing".

Give the fewest tags that are TRUE. Four is the hard ceiling and most people want one or two. A tag
means the person works in that field, not that it is adjacent to it: a doctor at a hospital is
Healthcare, not Healthcare and Research and Social impact. This is the opposite of the photograph
buckets, where as many as apply is right -- over-tagging a person makes every filtered result the
whole directory.

No tags is a legitimate answer, and it is how the vocabulary grows. There is no "Other" here:
someone whose text says nothing gets nothing, and the pick script prints that pile every run. A run
of people landing there with the same kind of work in them is the evidence for the next tag,
arriving without anyone having had to guess in advance.

Status is a tag too. Student belongs in the same column as the fields and combines with them:
["student", "healthcare"] for a medical student, ["student"] alone where the institution is
general and nothing has said the field. Retired and the rest, when they turn up, work the same way.

Work only from what the pair says. "Student" at Ashoka, NYU or Edinburgh names no field -- that is
Student and nothing else, and guessing a field from a general university is the single easiest
mistake to make here.`;
