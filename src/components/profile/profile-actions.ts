"use server";

/* ------------------------------------------------------------------ *
 *  Writes for the editable letterhead.
 *
 *  Its own file rather than more of src/components/settings/actions.ts,
 *  because the two answer to different shapes. That module wrote a
 *  whole FORM: `updateUserProfile` read fourteen names off one FormData
 *  and set all of them, which is right when a Save button posted the
 *  lot and catastrophic when a single blur did, since the fields that
 *  were not on the form arrive as undefined and clear. (It was deleted
 *  unused in the 2026-08-25 refactor audit, having been superseded by
 *  everything below; the shape lesson is why this file exists.)
 *
 *  The profile has no Save button (owner, 2026-08-07: "let the profile
 *  automatically save"), so every field commits on its own. That means
 *  one write per field, and validation per field rather than through
 *  profileSchema, which describes a whole form and would reject a lone
 *  value for arriving without its neighbours.
 * ------------------------------------------------------------------ */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FULL_NAME_MAX, batchTypeFromLeaving } from "@/lib/utils";
import { titleCase, normalizePhone, instagramHandle } from "@/lib/normalize";
import { tryRosterAutoVerifyQuietly } from "@/lib/roster";
import { syncBatchGroupQuietly } from "@/lib/batch-catchups";
import { contactMethodsSchema, profileSchema } from "@/lib/validators";
import type { ZodTypeAny } from "zod/v4";
import { yearClashMessage } from "@/lib/batch-year";

import { revalidatePath } from "next/cache";

const YEAR_MIN = 1926;

/**
 * Whether a value this action has already converted clears the bound the
 * SHARED schema sets for that column.
 *
 * Every bound here used to be typed out locally, and all three had drifted
 * from the schema every other writer of the same columns uses: jobTitle and
 * workplace at 120 against its 100, admissionNumber at 100000 against its
 * 10000, and a flat year ceiling of 2100 against `yearField`'s per-parse
 * valleyYear()+ahead (audits C-047, C-048, C-172). This is the ONLY live
 * editor of these columns, so its numbers were the ones that shipped and the
 * schema's were the ones nobody reached -- the same shape as Low 84, where a
 * local 80 refused a name signup had already accepted.
 *
 * The schema decides; this file keeps the sentence. Zod's own message ("Too
 * big: expected string to have <=100 characters") is not how anything else
 * here talks to a member.
 */
function outsideSchemaBound(field: ProfileField, value: string | number): boolean {
  const shape = (profileSchema.shape as Record<string, ZodTypeAny | undefined>)[field];
  if (!shape) return false;
  return !shape.safeParse(value).success;
}

/* The only columns this action may touch. A "use server" export is a
   network-callable POST and the `field: ProfileField` type is erased at
   runtime, so `field` can arrive as ANY string. Without this guard the
   `default:` branch below would run `data[field] = ...` for a column it was
   never meant to: nulling `password` (leaving the account with no working
   login, reset, or delete-reauth path), wiping the `adminNote` an admin keeps
   about this member, or clearing `deletionRequestedAt` without the password
   re-auth requestAccountDeletion deliberately requires. The where-clause pins
   the row to the caller so this was never IDOR or a role change -- role,
   verifyState, accountType, isBlocked are all non-nullable -- but it was
   arbitrary tampering with the caller's own row. Every other profile writer
   whitelists (an explicit `data` literal after a zod parse); this one now does
   too. Kept in step with the ProfileField union above by hand: a member added
   there but not here simply cannot be edited, which fails safe. */
const EDITABLE_FIELDS = new Set<string>([
  "name",
  "about",
  "jobTitle",
  "workplace",
  "batchYear",
  "yearJoined",
  "yearLeft",
  "admissionNumber",
  "subjects",
  "taughtFrom",
  "taughtUntil",
]);

export type ProfileField =
  | "name"
  | "about"
  | "jobTitle"
  | "workplace"
  | "batchYear"
  | "yearJoined"
  | "yearLeft"
  | "admissionNumber"
  | "subjects"
  | "taughtFrom"
  | "taughtUntil";

export async function updateProfileField(field: ProfileField, raw: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  /* `raw` is typed a string and that type is ERASED at runtime: a "use server"
     export is a network-callable POST, so a crafted call can send a number, an
     object or null, and `raw.trim()` below then threw a TypeError out of the
     action -- a 500 digest in the logs instead of a refusal (audit C-174, the
     class Low 83 already fixed once in updateContactMethods). */
  if (typeof raw !== "string") return { error: "That value cannot be saved." };

  // Refuse any column not in the edit set before a single write is composed
  // (mass-assignment guard -- see EDITABLE_FIELDS above).
  if (!EDITABLE_FIELDS.has(field)) return { error: "That field cannot be edited here." };

  const value = raw.trim();
  const data: Record<string, string | number | null> = {};

  switch (field) {
    case "name": {
      if (value.length < 2) return { error: "Your name needs at least two letters." };
      /* FULL_NAME_MAX, not a hand-typed 80. Signup accepts up to a hundred
         characters, so a member with a longer name than this local number
         allowed could never edit their own name here -- the field refused the
         value it was already holding (audit Low 84). */
      if (value.length > FULL_NAME_MAX) return { error: "That name is too long." };
      data.name = titleCase(value);
      break;
    }
    case "about": {
      if (outsideSchemaBound(field, value)) return { error: "That is longer than About allows." };
      data.about = value || null;
      break;
    }
    case "jobTitle":
    case "workplace": {
      if (outsideSchemaBound(field, value)) return { error: "That is too long." };
      data[field] = value ? titleCase(value) : null;
      break;
    }
    case "admissionNumber": {
      if (!value) {
        data.admissionNumber = null;
        break;
      }
      const n = Number(value);
      if (!Number.isInteger(n) || n < 0 || outsideSchemaBound("admissionNumber", n))
        return { error: "That is not an admission number." };
      data.admissionNumber = n;
      break;
    }
    case "subjects": {
      // A teacher's comma list ("Physics, Astronomy Club"), each entry
      // title-cased on its own, same as the onboarding save.
      if (outsideSchemaBound("subjects", value))
        return { error: "That is longer than Subjects allows." };
      data.subjects = value
        ? value.split(",").map((s) => titleCase(s)).filter(Boolean).join(", ") || null
        : null;
      break;
    }
    default: {
      // The year fields, student and teacher tenure alike. An empty field
      // clears it rather than failing: people delete a wrong year before
      // typing the right one, and an empty taughtUntil MEANS still teaching
      // ("to present" on the sheet).
      if (!value) {
        data[field] = null;
        break;
      }
      const n = Number(value);
      /* The ceiling comes from `yearField`'s per-parse refine, not from a flat
         2100: a batch year may run to valleyYear()+7 and a teacher's tenure to
         this year, and the pen was the one door accepting "2099" for all of
         them (audit C-048). YEAR_MIN stays local because it is the same 1926
         everywhere and reads better in the sentence below. */
      if (!Number.isInteger(n) || n < YEAR_MIN || outsideSchemaBound(field, n))
        return { error: `That year is not one this can be. A year from ${YEAR_MIN}, please.` };

      /* Cross-field sanity (audit Low 96). Each year was checked only against
         the calendar, never against the others, so "joined 2020, left 2010"
         saved happily and the profile then printed "2020-2010" and derived a
         board credential from a pair of years that cannot both be true. The
         other years have to be read to check that, since this action writes
         one field at a time.
         
         Refused rather than corrected: which of the two is wrong is the
         member's to say. The message names the other field so it is clear
         which one to fix first. */
      const years = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          batchYear: true,
          yearJoined: true,
          yearLeft: true,
          taughtFrom: true,
          taughtUntil: true,
        },
      });
      const clash = years && yearClashMessage({ ...years, [field]: n });
      if (clash) return { error: clash };

      data[field] = n;
    }
  }

  /* The three teacher-only fields are gated by the ROW's account type, the
     same rule the UI renders by, so a hand-crafted call from an alumnus
     session cannot leave stray tenure data on a student profile. For
     taughtUntil, the teacher/ex_teacher split is then derived the same way
     it is at signup: the "until" year IS the "I'm done teaching" control.
     Typing one flips the byline to "Former teacher"; clearing it flips back
     to "Teacher" and the sheet reads "to present" again. */
  if (field === "subjects" || field === "taughtFrom" || field === "taughtUntil") {
    const current = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { accountType: true },
    });
    const rowIsTeacher =
      current?.accountType === "teacher" || current?.accountType === "ex_teacher";
    if (!rowIsTeacher) return { error: "That field belongs to teacher accounts." };
    if (field === "taughtUntil") {
      data.accountType = data.taughtUntil != null ? "ex_teacher" : "teacher";
    }
  }

  /* batchType is derived, never typed, and it depends on two fields at once.
     Whichever of the pair moved, re-derive from the stored value of the other
     so the credential can never drift out of step with the years. */
  if (field === "batchYear" || field === "yearLeft") {
    const current = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { batchYear: true, yearLeft: true },
    });
    const batchYear = field === "batchYear" ? (data.batchYear as number | null) : current?.batchYear;
    const yearLeft = field === "yearLeft" ? (data.yearLeft as number | null) : current?.yearLeft;
    if (batchYear != null && yearLeft != null) {
      data.batchType = batchTypeFromLeaving(yearLeft, batchYear);
    }
  }

  await prisma.user.update({ where: { id: session.user.id }, data });

  /* The fields the office roster matches on. Someone who signed up with no
     batch year, confirmed their email, and only now fills the year in has
     just become matchable -- this is that moment's hook (trust model,
     Phase 3). Best-effort, like every roster call. */
  if (field === "name" || field === "batchYear" || field === "yearLeft") {
    await tryRosterAutoVerifyQuietly(session.user.id);
  }

  // A corrected batch year moves them between batch groups, out of the old
  // batch's Catch-up as well as into the new one's.
  if (field === "batchYear") await syncBatchGroupQuietly(session.user.id);

  revalidatePath(`/profile/${session.user.id}`);
  return { success: true };
}

/** A trimmed string, or "" for anything that is not one. */
function text(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** The value as an array, or an empty one. */
function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

/**
 * The contact block: phones, the three socials, the display email and the
 * labelled links, all of which the editable profile edits as one list.
 * Written together because they are one list on screen; splitting them into
 * eight actions would only mean eight round trips for one drag of the mouse.
 */
export async function updateContactMethods(input: {
  displayEmail: string | null;
  /** Whether the profile offers an email at all. See the write below. */
  showEmail?: boolean;
  phones: string[];
  instagram: string | null;
  linkedin: string | null;
  facebook: string | null;
  links: { label: string; url: string }[];
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  // Blank rows are how the repeater says "nothing here yet"; drop them before
  // validation so an empty row is not an error, then run the rest through the
  // same rules profileSchema applies to these columns (audit M18): length
  // caps, an email format on displayEmail, and https-only on every link.
  /* Every read below is defensive, because this shaping happens BEFORE
     validation. A server action is a public HTTP endpoint and its argument
     arrives as whatever the caller serialized, so `input.phones.map(...)` on a
     crafted payload carrying a string, or `l.label.trim()` on an array of
     numbers, threw a raw TypeError straight out of the action -- a 500 and a
     stack trace where a refusal belonged (audit Low 83). Anything that is not
     the shape this expects becomes empty here and is then judged by the schema
     on its merits. */
  const cleaned = {
    displayEmail: text(input.displayEmail) || null,
    phones: asArray(input.phones)
      .map((p) => text(p))
      .filter((p) => p.length > 0),
    instagram: text(input.instagram) || null,
    linkedin: text(input.linkedin) || null,
    facebook: text(input.facebook) || null,
    links: asArray(input.links)
      .map((l) => {
        const row = l && typeof l === "object" ? (l as { label?: unknown; url?: unknown }) : {};
        return { label: text(row.label), url: text(row.url) };
      })
      .filter((l) => l.label && l.url),
  };
  const parsed = contactMethodsSchema.safeParse(cleaned);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const phoneArr = Array.from(
    new Set(parsed.data.phones.map(normalizePhone).filter((p) => p.length > 0))
  ).slice(0, 5);

  const links = parsed.data.links.slice(0, 10);

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      displayEmail: parsed.data.displayEmail || null,
      /* Two columns, because one cannot hold two facts. `displayEmail` says
       * WHICH address; `showEmail` says whether to offer one at all. A member
       * who removes the email row sends showEmail: false and gets a profile
       * with no email on it -- which used to be impossible, because a null
       * displayEmail was read as "fall back to the sign-in address" and
       * published their private login email instead (audit B-050).
       *
       * Defaulted rather than required so an older client, or any other caller
       * of this action, keeps the previous behaviour of showing an address.
       */
      showEmail: input.showEmail ?? true,
      // The mirror is the contract: legacy `phone` always holds the FIRST
      // number, so every reader that predates the list keeps working.
      phone: phoneArr[0] ?? null,
      phones: phoneArr.length > 0 ? JSON.stringify(phoneArr) : null,
      /* Stored as the bare handle whatever they pasted, so the column holds
         one shape and the profile's link is built from a handle rather than
         from an address that has already been prefixed once (C-040). */
      instagram: parsed.data.instagram ? instagramHandle(parsed.data.instagram) || null : null,
      linkedin: parsed.data.linkedin || null,
      facebook: parsed.data.facebook || null,
      links: links.length > 0 ? JSON.stringify(links) : null,
    },
  });

  revalidatePath(`/profile/${session.user.id}`);
  return { success: true };
}
