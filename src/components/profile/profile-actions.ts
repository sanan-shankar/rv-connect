"use server";

/* ------------------------------------------------------------------ *
 *  Writes for the editable letterhead.
 *
 *  Its own file rather than more of src/components/settings/actions.ts,
 *  because the two answer to different shapes. That module writes a
 *  whole FORM: updateUserProfile reads fourteen names off one FormData
 *  and sets all of them, which is right when a Save button posted the
 *  lot and catastrophic when a single blur did, since the fields that
 *  were not on the form arrive as undefined and clear.
 *
 *  The profile has no Save button (owner, 2026-08-07: "let the profile
 *  automatically save"), so every field commits on its own. That means
 *  one write per field, and validation per field rather than through
 *  profileSchema, which describes a whole form and would reject a lone
 *  value for arriving without its neighbours.
 * ------------------------------------------------------------------ */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { batchTypeFromLeaving } from "@/lib/utils";
import { titleCase, normalizePhone } from "@/lib/normalize";
import { tryRosterAutoVerifyQuietly } from "@/lib/roster";
import { contactMethodsSchema } from "@/lib/validators";
import { revalidatePath } from "next/cache";

const YEAR_MIN = 1926;
const YEAR_MAX = 2100;

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

  const value = raw.trim();
  const data: Record<string, string | number | null> = {};

  switch (field) {
    case "name": {
      if (value.length < 2) return { error: "Your name needs at least two letters." };
      if (value.length > 80) return { error: "That name is too long." };
      data.name = titleCase(value);
      break;
    }
    case "about": {
      if (value.length > 4000) return { error: "That is longer than About allows." };
      data.about = value || null;
      break;
    }
    case "jobTitle":
    case "workplace": {
      if (value.length > 120) return { error: "That is too long." };
      data[field] = value ? titleCase(value) : null;
      break;
    }
    case "admissionNumber": {
      if (!value) {
        data.admissionNumber = null;
        break;
      }
      const n = Number(value);
      if (!Number.isInteger(n) || n < 0 || n > 100000)
        return { error: "That is not an admission number." };
      data.admissionNumber = n;
      break;
    }
    case "subjects": {
      // A teacher's comma list ("Physics, Astronomy Club"), each entry
      // title-cased on its own, same as the onboarding save.
      if (value.length > 200) return { error: "That is longer than Subjects allows." };
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
      if (!Number.isInteger(n) || n < YEAR_MIN || n > YEAR_MAX)
        return { error: `A year between ${YEAR_MIN} and ${YEAR_MAX}, please.` };
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

  revalidatePath(`/profile/${session.user.id}`);
  return { success: true };
}

/**
 * The contact block: phones, the three socials, the display email and the
 * labelled links, all of which the editable profile edits as one list.
 * Written together because they are one list on screen; splitting them into
 * eight actions would only mean eight round trips for one drag of the mouse.
 */
export async function updateContactMethods(input: {
  displayEmail: string | null;
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
  const cleaned = {
    displayEmail: input.displayEmail?.trim() || null,
    phones: input.phones.map((p) => p.trim()).filter((p) => p.length > 0),
    instagram: input.instagram?.trim() || null,
    linkedin: input.linkedin?.trim() || null,
    facebook: input.facebook?.trim() || null,
    links: input.links
      .map((l) => ({ label: l.label.trim(), url: l.url.trim() }))
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
      // The mirror is the contract: legacy `phone` always holds the FIRST
      // number, so every reader that predates the list keeps working.
      phone: phoneArr[0] ?? null,
      phones: phoneArr.length > 0 ? JSON.stringify(phoneArr) : null,
      instagram: parsed.data.instagram || null,
      linkedin: parsed.data.linkedin || null,
      facebook: parsed.data.facebook || null,
      links: links.length > 0 ? JSON.stringify(links) : null,
    },
  });

  revalidatePath(`/profile/${session.user.id}`);
  return { success: true };
}
