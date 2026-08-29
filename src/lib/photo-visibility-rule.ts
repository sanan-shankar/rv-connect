/* ------------------------------------------------------------------ *
 *  Who may see a photograph, as a pure function.
 *
 *  The Collection has two halves: the Valley Collection, which every member
 *  sees, and the Class Collection, which only one class sees
 *  (docs/planning/class-collection/spec.md). This file is the whole of the
 *  decision that separates them.
 *
 *  Its own module, with NO IMPORTS AT ALL, for the reason
 *  post-visibility-rule.ts gives about itself: this is a security decision,
 *  and a security decision that cannot be tested is a security decision
 *  nobody will notice breaking. No relative imports means a plain .mjs test
 *  can load it under `node --test` and try every case, including the ones
 *  that would be laborious to set up against a real database.
 *
 *  It takes no facts it cannot derive. Unlike a post -- which needs group
 *  membership and a city match fetched for it -- everything a photograph's
 *  audience depends on is already on the two rows.
 * ------------------------------------------------------------------ */

/** The two halves. `scope` is a plain column and anything unrecognised is
 *  treated as class-scoped with no audience, i.e. refused: see `isValley`. */
export const PHOTO_SCOPES = ["valley", "class"] as const;
export type PhotoScope = (typeof PHOTO_SCOPES)[number];

export type PhotoViewer = {
  id: string;
  role?: string | null;
  /** "unverified" | "pending" | "verified" | "flagged". Class access needs
   *  "verified" exactly (spec sec. 2.4). */
  verifyState?: string | null;
  batchYear?: number | null;
};

export type GuardedPhoto = {
  id: string;
  uploaderId: string;
  scope: string;
  classYears: string | null;
  approved: boolean;
  isHidden: boolean;
};

type DenialReason =
  | "not-found"
  | "hidden"
  | "unapproved"
  | "other-class"
  | "unverified";

export type PhotoVisibility =
  | { ok: true; photo: GuardedPhoto }
  | { ok: false; reason: DenialReason };

/* ------------------------------------------------------------------ *
 *  The audience list.
 *
 *  `Photo.classYears` is a comma list of batch years ("2004"). Exactly one is
 *  ever written today; it is a list so that widening the audience later is a
 *  flag flip rather than a migration (spec sec. 2.2). The reader lives here,
 *  beside the rule, so the write path and the read path agree by construction
 *  rather than by two people remembering.
 * ------------------------------------------------------------------ */

/** How many classes one photograph may be shown to.
 *
 *  A member belongs to exactly one class, so a list longer than this is not an
 *  audience, it is somebody filling a column. Server actions are public HTTP
 *  endpoints; this is the same lesson as `MAX_BATCH_TARGETS` (audit M43). */
export const MAX_CLASS_YEARS = 8;

/** The key identifying one viewer's class, or null if they have no class.
 *
 *  `batchYear` ALONE, never the "ISC-2004"-shaped composite that
 *  post-visibility-rule.ts targets posts with. That composite splits one
 *  cohort in two: a member who left after 10th carries batchType "ICSE" and
 *  sat beside the ISC leavers for six years. They are the same class, and a
 *  page titled "The Class Collection" may not disagree (spec sec. 2.1). */
export function classKey(batchYear: number | null | undefined): string | null {
  /* Exactly four digits, and the shape IS the cap: no token can outgrow it,
     and no stored key can be a strict prefix of a longer one. */
  return typeof batchYear === "number" && /^\d{4}$/.test(String(batchYear))
    ? String(batchYear)
    : null;
}

/**
 * Read an audience list. Returns the normalised years, or null if the text is
 * not an audience list at all -- the answer that lets a write path REFUSE
 * instead of storing something no reader can act on.
 *
 * Empty text parses to an empty list, which for a class photograph means
 * NOBODY (see the rule below); it is not the "everyone" that an empty post
 * target list means, because the scope column already said who this is for.
 */
export function classYearsOf(raw: string | null | undefined): string[] | null {
  if (raw === null || raw === undefined) return [];
  const text = raw.trim();
  if (!text) return [];

  const out: string[] = [];
  const seen = new Set<string>();
  for (const part of text.split(",")) {
    const token = part.trim();
    if (!token) continue;
    if (!/^\d{4}$/.test(token)) return null;
    if (seen.has(token)) continue;
    seen.add(token);
    out.push(token);
    if (out.length > MAX_CLASS_YEARS) return null;
  }
  return out;
}

/** The value to STORE for an audience, or null when there is none. */
export function storedClassYears(raw: string | null | undefined): string | null {
  const years = classYearsOf(raw);
  return years && years.length > 0 ? years.join(",") : null;
}

/**
 * Is this viewer's class in this photograph's audience? Token-exact.
 *
 * A plain `stored.includes(key)` also matches a stored "20111" against a
 * viewer whose key is "2011", showing a photograph to a class it was never
 * meant for. post-visibility-rule.ts carries the same warning because the same
 * bug was found there first.
 */
export function classYearsInclude(
  stored: string | null | undefined,
  key: string | null
): boolean {
  if (!key) return false;
  const years = classYearsOf(stored);
  /* Unparseable text names nobody. A stored value this rule cannot read is not
     a value an audience should be derived from. */
  if (years === null) return false;
  return years.includes(key);
}

/** Valley-scoped, read strictly. Anything that is not the literal "valley" --
 *  a typo, a value from a future vocabulary, a column somebody widened -- is
 *  NOT public. Failing closed is the only safe direction here. */
export function isValley(scope: string | null | undefined): boolean {
  return scope === "valley";
}

/* ONE message for every refusal, including "no such photograph". Distinguishing
   them would turn any caller into an oracle: "not your class" confirms both
   that the photograph exists and which class it belongs to, which is exactly
   the fact being protected. The specific reason stays server-side. */
export const PHOTO_NOT_VISIBLE = "That photo is not available.";

export function decidePhotoVisibility(
  photo: GuardedPhoto,
  viewer: PhotoViewer
): PhotoVisibility {
  /* Admins see everything, matching decidePostVisibility's own exemption.
     A DECISION, not an oversight (spec sec. 0): it means the owner can reach
     any class's photographs. The alternative -- reported photographs only --
     was considered and declined, because moderation that cannot open the thing
     it is moderating is not moderation. */
  if (viewer.role === "admin") return { ok: true, photo };

  /* Your own upload is always yours, including one still awaiting review.
     Checked BEFORE isHidden on purpose: an uploader whose photograph an admin
     has hidden can still reach it to delete it, which is the only way they
     could respond to the moderation at all. This mirrors the post rule. */
  if (photo.uploaderId === viewer.id) return { ok: true, photo };

  if (photo.isHidden) return { ok: false, reason: "hidden" };
  if (!photo.approved) return { ok: false, reason: "unapproved" };

  if (isValley(photo.scope)) return { ok: true, photo };

  /* Class-scoped from here down -- including any scope value this rule does
     not recognise, which `isValley` deliberately did not wave through.

     Verification first. Editing `batchYear` in the profile is how somebody
     would reach another class's photographs, and requiring a verified account
     is one of the two mitigations (spec sec. 2.4; the other is the AuditLog
     row written at the point of change). It does not close the hole -- a
     member who is ALREADY verified keeps their verification across a batchYear
     edit, because roster.ts never demotes -- and that residual is documented
     and accepted rather than hidden. */
  if (viewer.verifyState !== "verified") return { ok: false, reason: "unverified" };

  return classYearsInclude(photo.classYears, classKey(viewer.batchYear))
    ? { ok: true, photo }
    : { ok: false, reason: "other-class" };
}

/* ------------------------------------------------------------------ *
 *  The same decision, as a query fragment.
 *
 *  It lives in THIS file and not beside the query, for the reason
 *  post-visibility-rule.ts keeps `parseBatchTargets` next to its rule: the
 *  list that decides what a reader may load and the rule that decides what a
 *  reader may open have to agree by construction, not because two people
 *  remembered. `decidePhotoVisibility` is the belt; this is the braces, and
 *  the river wears both -- rows are filtered here and the permalink is
 *  re-checked there.
 *
 *  Returns a `where` fragment, or NULL meaning "this viewer may not see this
 *  scope at all", which a caller answers with an empty page rather than an
 *  unscoped query. Never returns `{}`: a fragment that names no scope would
 *  merge into a river query and quietly widen it to both halves, which is the
 *  exact failure this column exists to prevent.
 * ------------------------------------------------------------------ */
export function photoScopeWhere(
  scope: PhotoScope,
  viewer: PhotoViewer
): { scope: string; classYears?: string } | null {
  if (scope === "valley") return { scope: "valley" };

  /* Class-scoped. Both conditions are the rule's, restated: verified, and a
     four-digit batch year. An admin is NOT exempted here even though
     `decidePhotoVisibility` exempts them -- an admin browsing /collection sees
     their OWN class, the same as everybody else, and reaches another class's
     photograph through its permalink or the moderation queue rather than by
     having every class silently merged into their river. */
  if (viewer.verifyState !== "verified") return null;
  const key = classKey(viewer.batchYear);
  if (!key) return null;

  /* Exact equality on the whole column, which is correct while exactly one
     year is ever written (spec sec. 2.2) and which can only ever fail CLOSED:
     it is a strict subset of the token-exact match `classYearsInclude` does,
     so a row it misses is a row nobody is shown, never a row shown to the
     wrong class. It is also the only form the Photo_class_river_idx index can
     use.

     THE DAY AN AUDIENCE HOLDS TWO YEARS, THIS LINE IS WRONG and a row would
     simply stop appearing in its own river. Widening it means an OR over
     `key`, `startsWith(key + ",")`, `endsWith("," + key)` and
     `contains("," + key + ",")` -- token-exact, and only the first two of
     those can use the index. `photo-visibility-rule.test.mjs` pins that this
     is understood. */
  return { scope: "class", classYears: key };
}
