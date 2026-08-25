"use server";

import { createId } from "@paralleldrive/cuid2";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { hasBudget, consume, rateLimit } from "@/lib/rate-limit";
import { DELETION_GRACE_DAYS } from "@/lib/account-purge";
import { enqueueMail } from "@/lib/email-queue";
import { IS_DEMO } from "@/lib/demo";
import { prisma } from "@/lib/prisma";
import { putImage, ownerPrefix } from "@/lib/storage";
import { purgeImageUrls } from "@/lib/image-purge";
import { swapPhotoUrl } from "@/lib/avatar-swap";
import { sharpImage } from "@/lib/image";
import {sniffImageType, describeProcessingError, isImageFile} from "@/lib/upload-shared";
import { valleyDayKey, VALLEY_TIME_ZONE } from "@/lib/utils";
import { titleCase } from "@/lib/normalize";
import { writeAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { legacyCityColumns, parsePlaces, resolvePlaces } from "@/lib/place-input";
import { lookupGazetteerPlaces } from "@/lib/place-lookup";

const MAX_AVATAR_INPUT = 15 * 1024 * 1024; // 15MB input; output is tightly compressed

/**
 * Persist a member's ordered city list (the "Where you are" section). Writes
 * the `UserPlace` rows wholesale (delete + recreate in order) and syncs the
 * legacy `User.currentCity` to the first city label so old read paths that
 * still reference it keep working during the migration.
 */
export async function updateUserPlaces(
  places: unknown
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  // Validated before anything is touched: these two actions took the array on
  // faith, so an oversized label, a non-finite coordinate or a non-object
  // element all reached the database or threw a raw TypeError (audit B-111).
  const parsed = parsePlaces(places);
  if (!parsed.ok) return { error: parsed.error };
  const cleaned = await resolvePlaces(parsed.places, titleCase, lookupGazetteerPlaces);

  const userId = session.user.id;
  await prisma.$transaction([
    prisma.userPlace.deleteMany({ where: { userId } }),
    ...cleaned.map((p, i) =>
      prisma.userPlace.create({
        data: {
          userId,
          placeId: p.placeId ?? null,
          label: p.label,
          city: p.city,
          lat: p.lat,
          lng: p.lng,
          position: i,
        },
      })
    ),
    prisma.user.update({
      where: { id: userId },
      // Both legacy columns, from one place. Mirroring only the first left a
      // pre-migration secondaryCity behind for the profile's fallback to
      // resurrect the moment the member cleared their places (audit C-101).
      data: legacyCityColumns(cleaned),
    }),
  ]);

  revalidatePath(`/profile/${userId}`);
  return { success: true };
}

export async function updateAvatar(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };
  // Used to point visitors at the species picker as the alternative. It is
  // not one: /pick-bird is a paid supporter perk (chooseBird in
  // src/app/(main)/support/actions.ts requires a real Razorpay contribution
  // and refuses outright in demo mode), so a demo visitor who followed that
  // sentence would land on a page that sends them straight back to /support
  // for a payment the demo cannot take either (bug audit M62).
  if (IS_DEMO)
    return {
      error:
        "This is a demo, so photo uploads are switched off, and so is picking a different bird: that is a paid perk the demo cannot offer. You keep the bird your account was given.",
    };

  /* Deliberately NOT behind requireVerifiedMember, unlike every other image
     write (Phase 3 review, 2026-08-20). Three reasons, all load-bearing:
     the owner's capability table grants "own profile" at Stage 0 and the
     onboarding wizard's photo step calls this before an email could possibly
     be confirmed; the abuse is bounded in a way the open upload routes are
     not (one 512px WebP per account, the previous object deleted on
     replace); and the image is only ever shown to Stage 1+ viewers, since a
     Stage 0 account cannot post and the directory is gated. Revisit if
     avatars ever render anywhere unauthenticated. */

  // The one upload path that was missing the shared hourly ceiling every other
  // image write already has: each call reads up to 15MB, runs sharp, and does a
  // PUT + DELETE against R2, so an unthrottled loop is a compute/cost amplifier
  // even though storage never grows (the prior avatar is deleted on replace).
  const limited = await rateLimit("uploads", session.user.id);
  if (!limited.ok) return { error: limited.error };

  const file = formData.get("file") as File | null;
  if (!file) return { error: "No photo provided" };
  if (!isImageFile(file)) return { error: "Only image files are allowed" };
  if (file.type === "image/heic" || file.type === "image/heif")
    return { error: "HEIC is not supported yet. Please export as JPG or PNG." };
  if (file.size > MAX_AVATAR_INPUT) return { error: "Photo must be under 15MB" };

  let url: string;
  try {
    const input = Buffer.from(await file.arrayBuffer());
    // The bytes, not the client MIME string, decide it is an image (M13).
    if (!sniffImageType(input)) {
      return { error: "That file doesn't look like a JPG, PNG, GIF or WebP image." };
    }
    const id = createId();
    // Square crop to a compact WebP; avatars never need more than ~512px. The
    // key is scoped to the owner (`avatars/<their id>/...`) like every other
    // upload root (audit C2).
    const webp = await sharpImage(input)
      .rotate()
      .resize(512, 512, { fit: "cover", position: "centre" })
      .webp({ quality: 82 })
      .toBuffer();
    url = await putImage(webp, ownerPrefix("avatars", session.user.id), `${id}.webp`);
  } catch (e) {
    // Log the real cause server-side; hand the client a mapped, path-free
    // sentence (describeProcessingError) rather than the raw libvips string.
    console.error("Avatar processing error:", e);
    return { error: describeProcessingError(e) };
  }

  const swap = await swapPhotoUrl(session.user.id, url);
  if (!swap.ok) {
    // Nothing points at what we just stored, so it goes back rather than
    // sitting in a bucket nothing can list.
    await purgeImageUrls([url], "avatar");
    return { error: "That did not save. Try it once more." };
  }
  if (swap.previous && swap.previous !== url) {
    await purgeImageUrls([swap.previous], "avatar");
  }

  revalidatePath(`/profile/${session.user.id}`);
  return { success: true, photoUrl: url };
}

export async function removeAvatar() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  /* Said in words, like updateAvatar above. `photoUrl` is deliberately not a
     field the demo may write -- it is an upload output, and the demo takes no
     uploads -- so without this the Prisma layer refused the write and the
     visitor was told to check their connection (bug-report-2 C-044). */
  if (IS_DEMO)
    return {
      error:
        "This is a demo, so the photo on this profile is part of the exhibit and stays put.",
    };

  const swap = await swapPhotoUrl(session.user.id, null);
  if (!swap.ok) return { error: "That did not save. Try it once more." };
  if (swap.previous) await purgeImageUrls([swap.previous], "avatar");

  revalidatePath(`/profile/${session.user.id}`);
  return { success: true };
}

/**
 * A member deleting their own account (audit M35, replacing the old one-call
 * `deleteAccount`). Nothing is destroyed here: the request is recorded, every
 * session ends, and the retention sweep purges the row and its R2 objects
 * once the 60-day grace window has passed (src/lib/retention.ts, audit H9).
 * Signing in again inside the window cancels it — authorize() in auth.ts.
 *
 * Re-auth is the password, not the session: a stolen cookie must not be
 * enough to schedule someone's history for destruction. That makes this a
 * second door where passwords can be guessed, which the login limiter never
 * sees — so wrong guesses here spend their own budget ("reauth").
 */
export async function requestAccountDeletion(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };
  if (IS_DEMO) return { error: "This is a demo account, so it stays put." };

  const userId = session.user.id;
  /* `formData.get` returns `File | string | null`, and the cast is erased: a
     crafted multipart body sends a File, every string method below throws, and
     the member gets a 500 digest where a refusal belongs (audit C-174). */
  const passwordRaw = formData.get("password");
  const password = typeof passwordRaw === "string" ? passwordRaw : "";

  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, password: true },
  });
  if (!me) return { error: "Not authenticated" };
  if (!me.password) {
    // An account with no password cannot prove itself here. Rare (nothing
    // mints these today), but honest beats a dead button.
    return { error: "This account has no password to confirm with. Please message the admin instead." };
  }

  if (!(await hasBudget("reauth", userId))) {
    return { error: "Too many password attempts. Try again in a little while." };
  }
  if (!password || !(await bcrypt.compare(password, me.password))) {
    await consume("reauth", userId);
    return { error: "That password isn't right." };
  }

  const purgeAt = new Date(Date.now() + DELETION_GRACE_DAYS * 86_400_000);
  await prisma.user.update({
    where: { id: userId },
    data: {
      deletionRequestedAt: new Date(),
      /* Ends every session this account holds, everywhere, right now — the
         same epoch bump a block uses (audit M4). The person confirming just
         proved the password, so THEY can sign straight back in (which is
         also the cancel gesture); a thief holding only a cookie cannot. */
      credentialVersion: { increment: 1 },
    },
  });

  await writeAudit({
    actorId: userId,
    action: "account.delete_request",
    targetType: "user",
    targetId: userId,
    /* The VALLEY's day, the same one the member's email names twenty lines
       below (audit C-146). This line was formatted in UTC, so a request made
       between midnight and 05:30 IST wrote one date into the audit log and
       posted a different one to the member -- and an admin cross-checking the
       two would find them a day apart with nothing to say which was right. */
    detail: `${me.name} <${me.email}> — purge due ${valleyDayKey(purgeAt)}`,
  });

  // The written confirmation, and the takeover alarm: if somebody else did
  // this, the mail says how to undo it while the window is still open.
  await enqueueMail({
    kind: "deletion-scheduled",
    to: me.email,
    userId,
    payload: {
      name: me.name,
      // The purge happens on a valley day, so the member is told a valley
      // date. Formatted in UTC it named the day BEFORE for anyone who asked
      // between midnight and 05:30 IST (audit Lows 19/47/91/94).
      purgeDate: purgeAt.toLocaleDateString("en-GB", {
        timeZone: VALLEY_TIME_ZONE,
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    },
  });

  return { success: true };
}
