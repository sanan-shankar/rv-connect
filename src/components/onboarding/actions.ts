"use server";

import { z } from "zod/v4";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { occupationCase, titleCase } from "@/lib/normalize";
import { placesSchema, resolvePlaces } from "@/lib/place-input";
import { replaceUserPlaces } from "@/lib/place-write";
import { lookupGazetteerPlaces } from "@/lib/place-lookup";
import { normalizeHouse } from "@/lib/houses";
import type { HouseYearEntry } from "@/lib/houses";

/**
 * "The register" step: current city (or cities), admission number, occupation
 * and organisation. Every field is optional (the step is skippable). Text
 * fields are silently title-cased on save so a name typed in a hurry
 * ("apple", "TATA") still reads right on the profile.
 *
 * Cities are the gazetteer-backed <LocationPicker> selections, written as
 * UserPlace rows (the ordered, unlimited city list). The legacy
 * User.currentCity is kept in sync with the first city's label so older read
 * paths that still read that single column keep working.
 */
/* The shared definition, not a fourth copy of it. This step had its own
   placeSchema and its own cleaning loop, which meant it also had its own
   omissions: no bounds on lat/lng, no check that placeId named a real
   gazetteer row, and -- the one that showed -- no canonical city rule, so the
   people most likely to be caught by it were exactly the ones typing their
   city for the first time (owner, 2026-08-22: "now few new people joined and
   they're showing up under delhi"). Three writers, one gate. */
const registerStepSchema = z.object({
  admissionNumber: z.number().int().min(0).max(10000).optional(),
  workplace: z.string().trim().max(100).optional(),
  jobTitle: z.string().trim().max(100).optional(),
  // Teacher accounts only; the comma list the schema already stores
  // ("Physics, Astronomy Club"). Omitted entirely (undefined) by alumni
  // saves, which must not touch the column. 200 matches the settings
  // validator's ceiling for the same field.
  subjects: z.string().trim().max(200).optional(),
  places: placesSchema.default([]),
});

export type RegisterStepInput = z.input<typeof registerStepSchema>;

export async function saveOnboardingRegister(input: RegisterStepInput) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };
  const userId = session.user.id;

  const parsed = registerStepSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { admissionNumber, places } = parsed.data;
  const workplace = parsed.data.workplace ? occupationCase(parsed.data.workplace) : null;
  const jobTitle = parsed.data.jobTitle ? occupationCase(parsed.data.jobTitle) : null;
  // undefined = field not shown (alumni), leave the column alone; "" = teacher
  // cleared it. Each comma-separated entry is title-cased on its own so
  // "physics, nature club" stores as "Physics, Nature Club".
  const subjects =
    parsed.data.subjects === undefined
      ? undefined
      : parsed.data.subjects
          .split(",")
          .map((s) => titleCase(s))
          .filter(Boolean)
          .join(", ") || null;

  /* resolvePlaces, not a local map(): it title-cases free text the same way
     this used to, and then does the three things this step never did --
     verifies every placeId against the gazetteer before the transaction that
     would otherwise abort on the foreign key, collapses an aliased city onto
     its canonical row (Delhi -> New Delhi, see place-aliases.ts), and drops
     the duplicate that collapse can leave behind. */
  const cleanedPlaces = await resolvePlaces(places, titleCase, lookupGazetteerPlaces);

  /* The shared transaction, not a third copy of it. This step wrote its own
     wipe-and-recreate for so long that place-write.ts's header still said
     "exactly two writers" -- and the register step's four profile columns go
     in the same transaction, so a save is still all-or-nothing. The legacy
     city mirror comes from the helper now (audit C-101); this step used to
     spread it here, which is how it mirrored only the first city for a while. */
  await replaceUserPlaces(userId, cleanedPlaces, {
    admissionNumber: admissionNumber ?? null,
    workplace,
    jobTitle,
    subjects,
  });

  // Deliberately NOT revalidatePath("/welcome"): this action is called FROM the
  // /welcome wizard while the person is still mid-flow, and admission number is
  // exactly the field the page's own "already onboarded" guard checks.
  // Revalidating that path here would refetch the page's server data on the
  // spot with the number now set, tripping the guard and bouncing straight to
  // /feed before the Houses/Photo/Done steps ever show.
  revalidatePath("/feed");
  revalidatePath(`/profile/${userId}`);
  return { success: true };
}

const houseYearSchema = z.object({
  year: z.number().int().min(1900).max(2100),
  house: z.string().trim().min(1).max(60),
});
// Stints are stored expanded to one row per year; a full school career is at
// most ~14 years, so 60 is a generous ceiling that never rejects a real answer.
const housesPayloadSchema = z.array(houseYearSchema).max(60);

export type SaveHousesResult = { success: true } | { error: string };

/**
 * Houses step. The `houses` column is live (JSON string of [{year, house}]),
 * so this writes straight to it via Prisma. Each incoming entry's house name
 * is normalized (canonical spelling, or the free-typed "Other" kept as-is).
 */
export async function saveOnboardingHouses(
  rows: HouseYearEntry[]
): Promise<SaveHousesResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const parsed = housesPayloadSchema.safeParse(rows);
  if (!parsed.success) {
    return { error: "That doesn't look like a valid set of years and houses." };
  }

  const normalized = parsed.data
    .map((r) => ({ year: r.year, house: normalizeHouse(r.house) }))
    .filter((r) => r.house.length > 0);
  const json = JSON.stringify(normalized);

  await prisma.user.update({
    where: { id: session.user.id },
    data: { houses: json },
  });

  // Same reasoning as saveOnboardingRegister above: no revalidatePath("/welcome").
  revalidatePath(`/profile/${session.user.id}`);
  return { success: true };
}

