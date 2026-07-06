"use server";

import { z } from "zod/v4";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { HOUSES } from "@/lib/houses";
import type { HouseYearEntry } from "@/lib/houses";

/**
 * "The register" step: admission number, current city, profession + org.
 * A small subset of the shared profileSchema fields, kept as its own schema
 * here because onboarding never touches `name` (unlike /settings) and every
 * field is optional (this step is skippable, per the onboarding brief).
 */
const registerStepSchema = z.object({
  admissionNumber: z.number().int().min(0).max(10000).optional(),
  currentCity: z.string().trim().max(100).optional(),
  workplace: z.string().trim().max(100).optional(),
  jobTitle: z.string().trim().max(100).optional(),
});

export async function saveOnboardingRegister(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const raw = {
    admissionNumber: formData.get("admissionNumber")
      ? Number(formData.get("admissionNumber"))
      : undefined,
    currentCity: (formData.get("currentCity") as string) || undefined,
    workplace: (formData.get("workplace") as string) || undefined,
    jobTitle: (formData.get("jobTitle") as string) || undefined,
  };

  const parsed = registerStepSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      admissionNumber: parsed.data.admissionNumber ?? null,
      currentCity: parsed.data.currentCity || null,
      workplace: parsed.data.workplace || null,
      jobTitle: parsed.data.jobTitle || null,
    },
  });

  // Deliberately NOT revalidatePath("/welcome"): this action is called FROM
  // the /welcome wizard while the person is still mid-flow, and admission
  // number is exactly the field the page's own "already onboarded" guard
  // (src/app/(main)/welcome/page.tsx) checks. Revalidating that path here
  // would refetch the page's server data on the spot with the number now
  // set, tripping the guard and bouncing straight to /feed before the
  // Houses/Photo/Done steps ever show. The wizard holds its own step state
  // client-side and does not need this route's cache invalidated; /feed and
  // the profile (read by other pages) still get it.
  revalidatePath("/feed");
  revalidatePath(`/profile/${session.user.id}`);
  return { success: true };
}

const houseYearSchema = z.object({
  year: z.number().int().min(1900).max(2100),
  house: z.enum(HOUSES as unknown as [string, ...string[]]),
});
const housesPayloadSchema = z.array(houseYearSchema).max(30);

export type SaveHousesResult =
  | { success: true; stored: "db" }
  | { success: true; stored: "pending-migration" }
  | { error: string };

/**
 * Houses step. There is no `houses` column in prisma/schema.prisma or the
 * live database yet (see prisma/pending-migration.sql section 1 for the
 * one-liner ALTER TABLE the owner will run). Rather than add the column to
 * schema.prisma ahead of that migration — which the working agreement for
 * this shared database asks us to avoid — we probe with a raw, parameterised
 * query. If the column exists (post-migration) the write lands for real; if
 * it does not yet exist, Postgres throws (undefined column, 42703) and we
 * tell the caller to park the payload in localStorage instead. Either way
 * the user sees a normal "saved" confirmation; only the copy differs.
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

  const json = JSON.stringify(parsed.data);

  try {
    await prisma.$executeRaw`UPDATE "User" SET "houses" = ${json} WHERE id = ${session.user.id}`;
    // Same reasoning as saveOnboardingRegister above: no revalidatePath("/welcome").
    revalidatePath(`/profile/${session.user.id}`);
    return { success: true, stored: "db" };
  } catch {
    // Column not there yet — not an error the user needs to see as one.
    return { success: true, stored: "pending-migration" };
  }
}

export type GetHousesResult =
  | { houses: HouseYearEntry[] | null; stored: "db" }
  | { houses: null; stored: "pending-migration" }
  | { houses: null; stored: "unauthenticated" };

/** Mirror probe for prefilling the step with whatever is already saved. */
export async function getOnboardingHouses(): Promise<GetHousesResult> {
  const session = await auth();
  if (!session?.user?.id) return { houses: null, stored: "unauthenticated" };

  try {
    const rows = await prisma.$queryRaw<
      { houses: string | null }[]
    >`SELECT "houses" FROM "User" WHERE id = ${session.user.id} LIMIT 1`;
    const raw = rows[0]?.houses ?? null;
    if (!raw) return { houses: null, stored: "db" };
    try {
      const parsedJson = JSON.parse(raw);
      return { houses: Array.isArray(parsedJson) ? parsedJson : null, stored: "db" };
    } catch {
      return { houses: null, stored: "db" };
    }
  } catch {
    return { houses: null, stored: "pending-migration" };
  }
}
