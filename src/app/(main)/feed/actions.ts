"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { postSchema, commentSchema } from "@/lib/validators";
import { postContentMax } from "@/lib/post-caps";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { drainPendingImagePurges } from "@/lib/account-purge";
import { withPhotoFacts } from "@/lib/image-record";
import { droppedImages } from "@/lib/draft-images";
import { copyPostImagesToCollection } from "@/lib/collection-intake";
import { getViewerCities, cityScopeWhere, ownCity } from "@/lib/city-scope";
import { notifyAdminNote } from "@/lib/admin-note";
import {
  AUTHOR_IN_GOOD_STANDING,
  PUBLISHED_ONLY,
  VISIBLE_COMMENT,
  audienceWhere,
} from "@/lib/posts";
import { requireVerifiedMember } from "@/lib/member-gate";
import { rateLimit } from "@/lib/rate-limit";
import { canViewPost, canViewPostOfComment, POST_NOT_VISIBLE } from "@/lib/post-visibility";
import { storedBatchTargets } from "@/lib/post-visibility-rule";
import { ownedUploadUrls } from "@/lib/upload-ownership";
import { MAX_IMAGES } from "@/lib/upload-ownership-rule";
import { escapeLike, insensitive } from "@/lib/db-text";
import { isUniqueViolation } from "@/lib/prisma-errors";
import { postNotificationLink, postNoun } from "@/lib/notification-links";
import {
  clearPostNotifications,
  notifyMember,
  notifyMemberOnceUnread,
} from "@/lib/post-notifications";
import { parseJsonArray, valleyDayKey, valleyDayStart, valleyMidnight } from "@/lib/utils";
import type { Prisma } from "@/generated/prisma/client";
import { DOUBLE_SUBMIT_MS, isPostTwin } from "@/lib/double-submit";
import { decodeKeyset, encodeKeyset, keysetWhere } from "@/lib/keyset";
import { isLetterDraft } from "@/lib/draft-rule";
import { AUTHOR_CARD_SELECT } from "@/lib/people-select";

/** The author fields a rendered comment needs. The shared byline shape is all
 *  of them now that `avatarColor` is gone; kept as a named const because three
 *  queries reference it and a rename should touch one line. */
const COMMENT_AUTHOR_SELECT = { ...AUTHOR_CARD_SELECT } as const;

/**
 * Delete a post and its stored images, in the order that cannot leave a live
 * post with broken pictures (audit M17).
 *
 * The bytes used to go FIRST. If the row delete then failed -- a dropped
 * connection, a pool timeout, a foreign key nobody expected -- the post
 * stayed on the feed with every image permanently 404ing, and no retry could
 * put them back. That is the exact inversion of the invariant the account
 * purge already states and keeps (B-011): the ROW is the thing whose deletion
 * must be atomic, and the bytes are the thing that may be retried.
 *
 * So the urls are written into `PendingImagePurge` inside the same
 * transaction as the delete. Either the post is gone and its images are
 * queued for removal, or nothing happened at all. The drain immediately after
 * is the common case; anything it cannot reach is retried by the nightly
 * sweep, which is the one path that can still find those bytes once the row
 * naming them is gone.
 */
async function deletePostWithImages(
  postId: string,
  images: string | null,
  /* Only so the notifications can be found: the bell rows about a letter and
     about a feed post carry different links. */
  kind: string | null
): Promise<void> {
  const urls = parseJsonArray(images);
  const orphaned = await prisma.$transaction(async (tx) => {
    /* Only bytes that no surviving row names (audit C-018).
     *
     * `images` is caller-supplied JSON and ownedUploadUrls only checks the
     * prefix and the mint, so nothing stops the same own-upload url being
     * attached to two posts. Purging on the first delete then 404s the
     * second one's photograph -- the same "live post with broken pictures"
     * this function was written to prevent, arrived at from the other side.
     * Three urls at most, matched inside the transaction so a concurrent
     * delete cannot slip between the check and the queue. */
    const stillUsed =
      urls.length > 0
        ? await tx.post.findMany({
            where: {
              id: { not: postId },
              OR: urls.map((url) => ({ images: { contains: url } })),
            },
            select: { images: true },
          })
        : [];
    const kept = new Set(stillUsed.flatMap((row) => parseJsonArray(row.images)));
    const orphaned = urls.filter((url) => !kept.has(url));
    if (orphaned.length > 0) {
      await tx.pendingImagePurge.createMany({
        data: orphaned.map((url) => ({ url, reason: "post" })),
      });
    }
    await tx.post.delete({ where: { id: postId } });
    return orphaned;
  });
  /* The bell rows that pointed at it go with it (C-054). Here rather than at
     each caller, so a third way to delete a post cannot forget: the link is
     dead the moment the row is, and a "X replied to your comment" aimed at a
     deleted letter answers 404 for a year, which is how long notifications
     are kept. */
  await clearPostNotifications({ id: postId, kind });
  // Best-effort and after the commit: a slow R2 must not hold a transaction
  // open, and a failure here is already recorded as work to redo.
  await drainPendingImagePurges(orphaned);
}



// ─── Posts ───────────────────────────────────────────

export async function createPost(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  /* Posts and letters both come through here, and both put something in front
     of the whole community under a name. That waits for a confirmed address.
     The client shows the rule before you hit it (VerifyEmailDialog), but THIS
     is what makes it true: the composer could be bypassed, this cannot.

     A DRAFT is the exception, and `publishDraft` already says why in its own
     words: "writing privately harms nobody, and somebody waiting on a
     confirmation email should not lose what they were working on". That
     intent was written down and then contradicted here, because this gate ran
     before anything looked at `saveAsDraft` -- so an unverified member could
     not save the letter they were told to keep writing, and the only way to
     keep it was to not close the tab (audit M32). The gate that matters is
     the one on publishing, which is untouched.

     Which is exactly why this asks the SAME question the create asks, through
     the same predicate: the gate-skip once read the raw flag alone, so a
     submission with `saveAsDraft=true` and no `kind` skipped the gate here and
     then stored `status: "published"` down at the create (audit C-122). */
  const savingDraft = isLetterDraft({
    kind: formData.get("kind") as string | null,
    saveAsDraft: formData.get("saveAsDraft") === "true",
  });
  if (!savingDraft) {
    const gate = await requireVerifiedMember();
    if (!gate.ok) return { error: gate.error };
  }

  // Verified is not unlimited: creation is metered per account (audit M2).
  const limited = await rateLimit("posts", session.user.id);
  if (!limited.ok) return { error: limited.error };

  // Parse poll options from JSON string if present
  const pollOptionsRaw = formData.get("pollOptions") as string | null;
  let pollOptions: string[] | undefined;
  if (pollOptionsRaw) {
    try {
      const parsed = JSON.parse(pollOptionsRaw);
      if (Array.isArray(parsed)) {
        pollOptions = parsed.filter((o: string) => o.trim().length > 0);
        if (pollOptions.length < 2) pollOptions = undefined;
      }
    } catch {
      // ignore parse errors
    }
  }

  const raw = {
    content: formData.get("content") as string,
    kind: (formData.get("kind") as string) || undefined,
    title: (formData.get("title") as string) || undefined,
    targetBatches: (formData.get("targetBatches") as string) || undefined,
    groupId: (formData.get("groupId") as string) || undefined,
    images: (formData.get("images") as string) || undefined,
    pollOptions,
    cityScope: (formData.get("cityScope") as string) || undefined,
    saveAsDraft: formData.get("saveAsDraft") === "true" ? true : undefined,
    toCollection: formData.get("toCollection") === "true" ? true : undefined,
  };

  const parsed = postSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Every image on the post must be one THIS member uploaded here: app-minted,
  // under their own `uploads/<id>/` prefix, at most three. This is the write
  // that C2 turned catastrophic — the `images` array was stored straight
  // through and later deleted key-by-key, so an unvalidated array let any
  // member wipe every object whose URL they could scrape. `imagesJson` is what
  // gets stored; nothing else reaches the column.
  const ownership = ownedUploadUrls(parseJsonArray(parsed.data.images), session.user.id);
  if (!ownership.ok) return { error: ownership.error };
  const imagesJson = ownership.urls.length ? JSON.stringify(ownership.urls) : null;

  /* Group posts are refused, not created.
   *
   * The Groups feature was removed: there is no /groups route, no composer
   * passes a groupId, and every read path in this file forces `groupId: null`
   * (the main feed AND the profile's author tab, since neither passes the
   * option). So a post written with a groupId was visible on no page in the
   * application -- not even to the person who wrote it -- while looking to them
   * like it had posted. Only a hand-crafted call could reach it, but a write
   * path that silently produces unreachable content should say no instead.
   * Verified live before writing this: zero rows in Post carry a groupId.
   *
   * That separate change has since happened: the group-feed plumbing is gone
   * from the read paths too, so `groupId: null` is now a plain filter rather
   * than one arm of a branch. This refusal stays regardless -- it guards the
   * directly-callable action, which no longer has a UI that could reach it.
   */
  if (parsed.data.groupId) {
    return { error: "Group posts are not available." };
  }

  // City-scope audience control: only allowed to a city the poster themself has
  // listed (an own UserPlace), matched case-insensitively; anything else is
  // silently ignored rather than trusted, so a tampered form field can't scope
  // a post to an arbitrary city.
  let cityScope: string | null = null;
  if (parsed.data.cityScope) {
    cityScope = await ownCity(session.user.id, parsed.data.cityScope);
  }

  // "Save as draft" only exists for letters; a plain post ignores the flag
  // even if a tampered form field sends it.
  const isDraft = isLetterDraft(parsed.data);

  // Poll options are written in the SAME create as the post, as a nested
  // create, so the post and all of its options land in one transaction (audit
  // M32). The old loop issued up to four separate round trips after the post
  // existed, and a failure mid-loop left a post carrying a partial poll.
  // Drafts are letters-only, so a poll never applies to one, but the guard
  // costs nothing.
  const wantedPollOptions =
    !isDraft && parsed.data.pollOptions && parsed.data.pollOptions.length >= 2
      ? parsed.data.pollOptions.map((text) => text.trim())
      : [];
  const withPoll =
    wantedPollOptions.length > 0
      ? {
          pollOptions: {
            create: wantedPollOptions.map((text, i) => ({ text, position: i })),
          },
        }
      : {};
  const wantedTitle = parsed.data.kind === "letter" ? parsed.data.title || null : null;

  /* The server half of the double-submit guard (audit M35).
   *
   * Post is free text, so no unique index can dedupe it, and the composer's
   * in-flight ref cannot see a second tab, a retried request or a hand-made
   * call. The same author publishing the same words seconds apart is a
   * duplicate submission, so the first row is handed back as though this call
   * had made it. Narrow on purpose: same kind, same status, same text, ten
   * seconds. A draft autosave is not affected -- those go through editPost.
   *
   * The columns are only the coarse filter. Title, photographs and poll are
   * part of the post too, and matching on text alone silently dropped a second
   * photograph shared under the same caption (audit C-009), so the shortlist
   * -- one author, ten seconds, so at most a handful of rows -- is settled by
   * `isPostTwin`. */
  const candidates = await prisma.post.findMany({
    where: {
      authorId: session.user.id,
      content: parsed.data.content,
      kind: parsed.data.kind || "post",
      status: isDraft ? "draft" : "published",
      createdAt: { gte: new Date(Date.now() - DOUBLE_SUBMIT_MS) },
    },
    select: {
      id: true,
      title: true,
      images: true,
      pollOptions: { select: { text: true, position: true } },
    },
  });
  const twin = candidates.find((row) =>
    isPostTwin(row, {
      title: wantedTitle,
      images: imagesJson,
      pollOptions: wantedPollOptions,
    })
  );
  if (twin) {
    if (!isDraft) revalidatePath("/feed");
    if (parsed.data.kind === "letter") revalidatePath("/letters");
    return { success: true, postId: twin.id, isDraft };
  }

  const post = await prisma.post.create({
    data: {
      authorId: session.user.id,
      kind: parsed.data.kind || "post",
      title: wantedTitle,
      content: parsed.data.content,
      // Rebuilt from the parse rather than stored through, the same way
      // `images` is rebuilt from ownedUploadUrls above: what lands in the
      // column is a list this app can read back, normalised and de-duplicated,
      // never the client's own text (audit M43).
      targetBatches: storedBatchTargets(parsed.data.targetBatches),
      groupId: null,
      images: imagesJson,
      cityScope,
      status: isDraft ? "draft" : "published",
      ...withPoll,
    },
  });

  /* "Also add to the Collection". Scheduled with `after` so the composer gets
     its response the moment the post exists: copying a photograph costs a
     fetch of the original plus a sharp resize per image, and making someone
     watch a spinner for that is exactly the imposition the tick was meant to
     avoid. A draft is excluded because it is not published yet; if it is later
     published, the author can contribute the photo the ordinary way.

     Errors are swallowed inside the helper. By the time this runs the post is
     committed and the response is gone, so there is nobody to tell. */
  const collectionImages = isDraft ? [] : ownership.urls;
  if (parsed.data.toCollection && collectionImages.length > 0) {
    const userId = session.user.id;
    after(async () => {
      await copyPostImagesToCollection({
        userId,
        imageUrls: collectionImages,
        caption: parsed.data.content,
      });
      revalidatePath("/collection");
    });
  }

  // A draft is never posted anywhere public, so there is nothing to revalidate
  // except the letters page (its own "Your drafts" strip).
  if (!isDraft) revalidatePath("/feed");
  if (parsed.data.kind === "letter") revalidatePath("/letters");
  return { success: true, postId: post.id, isDraft };
}

/**
 * Flips a letter draft to published: only its own author may call this. The
 * draft's createdAt is bumped to now so it enters the feed/letters list at
 * the moment it is actually published, not whenever it was first drafted.
 */
export async function publishDraft(postId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  // The moment a draft letter becomes visible to everyone. Drafts themselves
  // stay ungated on purpose: writing privately harms nobody, and somebody
  // waiting on a confirmation email should not lose what they were working on.
  const gate = await requireVerifiedMember();
  if (!gate.ok) return { error: gate.error };

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorId: true, status: true, kind: true },
  });
  if (!post) return { error: "Draft not found" };
  if (post.authorId !== session.user.id) return { error: "Not authorized" };
  if (post.kind !== "letter" || post.status !== "draft") {
    return { error: "That letter isn't a draft" };
  }

  await prisma.post.update({
    where: { id: postId },
    data: { status: "published", createdAt: new Date() },
  });

  revalidatePath("/feed");
  revalidatePath("/letters");
  revalidatePath(`/letters/${postId}`);
  return { success: true };
}

/**
 * Deletes a letter draft. Author-only: nobody else has a reason to delete
 * somebody's unpublished writing, so there is no group-admin or site-admin
 * bypass here the way deletePost has.
 *
 * This used to justify itself with "a draft is never visible to anyone else,
 * admins included", which is not true (audit C-012). `decidePostVisibility`
 * grants admins their exemption ABOVE its draft refusal, and a test pins that
 * -- so an admin holding a letter id can read an unpublished draft at
 * /letters/<id>. Author-only deletion is still right; the reason given for it
 * was wrong, and worth correcting rather than quietly relying on.
 */
export async function deleteDraft(postId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorId: true, status: true, images: true, kind: true },
  });
  if (!post) return { error: "Draft not found" };
  if (post.authorId !== session.user.id) return { error: "Not authorized" };
  if (post.status !== "draft") return { error: "That letter isn't a draft" };

  await deletePostWithImages(postId, post.images, post.kind);
  revalidatePath("/letters");
  return { success: true };
}

export async function votePoll(postId: string, optionId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  // A vote is a write into the community, so it waits on the member gate like
  // posting does (trust model, Stage 2).
  const gate = await requireVerifiedMember();
  if (!gate.ok) return { error: gate.error };

  /* Voting is a write on somebody's post, so the same visibility the feed
     query enforces applies here (audit H3). Checking that the option belongs
     to the post, below, never established that the VIEWER belongs anywhere
     near it. */
  const visible = await canViewPost(postId, session.user);
  if (!visible.ok) return { error: POST_NOT_VISIBLE };

  // Verify option belongs to post
  const option = await prisma.pollOption.findUnique({
    where: { id: optionId },
    select: { postId: true },
  });

  if (!option || option.postId !== postId) {
    return { error: "Invalid poll option" };
  }

  /* One vote per member per post, settled by the unique index rather than by
   * looking first. A vote is a switch, not a toggle, so this is an upsert --
   * but two rapid taps could both miss the read and both create, and the loser
   * threw P2002 out of the action (audit B-040). The retry answers that: the
   * row the other tap made is the row we wanted to make, so update it to the
   * option this call chose. Last tap wins, which is what a switch means.
   */
  const vote = { userId: session.user.id, postId };
  try {
    await prisma.pollVote.upsert({
      where: { userId_postId: vote },
      update: { pollOptionId: optionId },
      create: { ...vote, pollOptionId: optionId },
    });
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    await prisma.pollVote.updateMany({ where: vote, data: { pollOptionId: optionId } });
  }

  // No revalidatePath: see the note in toggleLike below. PollDisplay applies
  // the vote optimistically and reverts on error, and /feed's server tree
  // renders no poll.
  return { success: true };
}

export async function deletePost(postId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorId: true, images: true, kind: true },
  });

  if (!post) return { error: "Post not found" };

  // The author or an admin. There used to be a third way in -- a group admin
  // removing a post in their group -- which is why this was a `let`.
  const authorized =
    post.authorId === session.user.id || session.user.role === "admin";
  if (!authorized) return { error: "Not authorized" };

  // Delete image files (and, inside, the bell rows that pointed at it).
  await deletePostWithImages(postId, post.images, post.kind);
  revalidatePath("/feed");
  return { success: true };
}

/**
 * Admin-only: soft-hide any post (or letter, same model) from every card/row
 * it appears in, with an optional warm note relayed to the author as a
 * Notification (type "admin_note") that used to open a dedicated /notice/[id]
 * page. Distinct from `deletePost` above (an author's own hard delete): this
 * never deletes the row, so the record and its note survive for the author
 * and for any later audit.
 */
export async function adminRemovePost(postId: string, note?: string) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return { error: "Not authorized" };
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorId: true, kind: true },
  });
  if (!post) return { error: "Post not found" };

  await prisma.post.update({ where: { id: postId }, data: { isHidden: true } });

  /* A hidden post refuses everybody but its author and the admins, so every
     other member's notifications about it now lead to a 404 (C-054). The
     author's are kept: they can still open it, and what they find there is
     the moderation notice, which is the point. */
  await clearPostNotifications({ id: postId, kind: post.kind }, { keepFor: post.authorId });

  const trimmedNote = note?.trim();
  if (trimmedNote) await notifyAdminNote(post.authorId, trimmedNote);

  revalidatePath("/feed");
  if (post.kind === "letter") revalidatePath("/letters");
  revalidatePath("/admin");
  return { success: true };
}

export async function editPost(postId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  // Editing is publishing again: the body, the images and the audience can all
  // change. Gated on the same footing as creating, or an account could write
  // an empty post before confirming and fill it in afterwards.
  const gate = await requireVerifiedMember();
  if (!gate.ok) return { error: gate.error };

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorId: true, kind: true, status: true, images: true },
  });

  if (!post) return { error: "Post not found" };
  if (post.authorId !== session.user.id) return { error: "Not authorized" };

  const content = formData.get("content") as string;
  const title = formData.get("title") as string;
  const isLetter = post.kind === "letter";
  // The same ceiling creation uses, from the same constant, so a post can
  // always be edited back into the shape it was allowed to be posted in
  // (audit B-047).
  const cap = postContentMax(post.kind);

  if (!content || content.length > cap) {
    return { error: `Content must be between 1 and ${cap} characters` };
  }
  if (title && title.length > 160) {
    return { error: "Title must be 160 characters or fewer" };
  }

  // Images may be rewritten ONLY on the author's own letter DRAFT (the
  // immersive /letters/[id]/edit surface adds photos mid-draft). A published
  // row's media never changes through this action, so a tampered field
  // cannot rewrite what readers have already seen.
  let imagesUpdate: { images: string | null } | undefined;
  let imagesError: string | undefined;
  /* Photos the author took OFF the draft. Their bytes are referenced by
     nothing once this update commits, and nothing can list the bucket to find
     them later, so they are queued for deletion in the same transaction --
     the same order deletePostWithImages keeps: the row is what must be atomic,
     the bytes are what may be retried (audit C-064). */
  let removedImages: string[] = [];
  const imagesRaw = formData.get("images");
  if (imagesRaw !== null && isLetter && post.status === "draft") {
    try {
      const arr = JSON.parse(imagesRaw as string);
      // Images ALREADY on this draft are grandfathered: they were the author's
      // own uploads, and a draft written before the owner-scoped key scheme
      // (audit C2) carries legacy `uploads/<year>/...` URLs that predate the
      // per-user prefix and would otherwise fail the ownership check. Only
      // NEWLY-added URLs are gated, and a bad one is now an ERROR rather than a
      // silent no-op, so adding a second photo to an old draft cannot fail
      // invisibly (write-path review, Phase 5).
      const current = new Set(parseJsonArray(post.images));
      const added = (Array.isArray(arr) ? arr : []).filter(
        (u) => typeof u === "string" && !current.has(u)
      );
      const ownership = ownedUploadUrls(added, session.user.id);
      if (!ownership.ok) {
        imagesError = ownership.error;
      } else if (Array.isArray(arr)) {
        // Keep the client's order/selection, but only entries that are either
        // already on the draft or a freshly-validated own upload; cap at 3.
        const allowed = arr.filter(
          (u) => typeof u === "string" && (current.has(u) || ownership.urls.includes(u))
        );
        if (allowed.length > MAX_IMAGES) {
          imagesError = `Up to ${MAX_IMAGES} photos.`;
        } else {
          imagesUpdate = { images: allowed.length > 0 ? JSON.stringify(allowed) : null };
          removedImages = droppedImages([...current], allowed as string[]);
        }
      }
    } catch {
      /* ignore a malformed field; the draft keeps its images */
    }
  }
  if (imagesError) return { error: imagesError };

  /* The audience, on the author's own letter DRAFT only (bug audit B-048).
     editPost used to write nothing but content, title and images, so choosing
     a city -- or choosing "Everyone" -- while resuming a draft was silently
     discarded, and the desk did not show the stored audience either, so a
     letter saved as "Bangalore only" looked like it was going to everybody
     right up until it published to nobody outside Bangalore.

     Sent UNCONDITIONALLY by the desk (an absent field cannot express "clear
     it"), so the presence of the key is what says the author touched the
     control: empty string means Everyone. Re-validated against the author's
     own UserPlace list exactly as createPost does, so a tampered field cannot
     scope a letter to a city they have never lived in. A published row's
     audience never changes here -- readers have already seen it. */
  let cityScopeUpdate: { cityScope: string | null } | undefined;
  const cityScopeRaw = formData.get("cityScope");
  if (cityScopeRaw !== null && isLetter && post.status === "draft") {
    const wanted = String(cityScopeRaw).trim();
    if (!wanted) {
      cityScopeUpdate = { cityScope: null };
    } else {
      const ownPlace = await ownCity(session.user.id, wanted);
      /* A miss is REFUSED, not folded to null (audit C-017).
         "Everyone" and "the city I asked for, which I apparently no longer
         list" are different intentions that both used to store the same
         value. Since the desk autosaves the audience on every keystroke, a
         member who removed that city from their profile in another tab had
         the next keystroke quietly widen their letter to everybody -- the chip
         still said "X only" -- and publishDraft then honoured the widening.
         Refusing keeps the stored audience and tells them why. */
      if (!ownPlace) {
        return { error: `You no longer list ${wanted}, so it cannot be the audience.` };
      }
      cityScopeUpdate = { cityScope: ownPlace };
    }
  }

  /* The lost-update guard, when the caller is holding a version (audit M66).
   *
   * The desk autosaves the WHOLE body 2.5 seconds after any keystroke, and the
   * update had no precondition: a member with the same draft open on a laptop
   * and a phone who wrote three paragraphs on the laptop, then touched one
   * character on the still-open phone, had the phone's stale copy silently
   * overwrite all of it -- and both surfaces said "Saved".
   *
   * `baseUpdatedAt` is the row version the caller last saw. If the row has
   * moved on since, nobody's writing is destroyed: the save is refused and the
   * stale surface is told to reload. Callers that send no token (the
   * published-post edit dialog, which is one surface with one window) keep the
   * unconditional write they had.
   */
  const baseRaw = formData.get("baseUpdatedAt");
  const base = baseRaw ? new Date(String(baseRaw)) : null;
  if (base && Number.isNaN(base.getTime())) {
    return { error: "That save could not be checked. Reload and try again." };
  }

  const data = {
    content,
    // A title belongs to a letter only; a plain post has nothing else here.
    ...(isLetter ? { title: title?.trim() || null } : {}),
    ...imagesUpdate,
    ...cityScopeUpdate,
  };

  const write = async (tx: Pick<typeof prisma, "post" | "pendingImagePurge">) => {
    if (base) {
      const moved = await tx.post.updateMany({
        where: { id: postId, authorId: session.user.id, updatedAt: base },
        data,
      });
      if (moved.count === 0) return false;
    } else {
      await tx.post.update({ where: { id: postId }, data });
    }
    if (removedImages.length > 0) {
      await tx.pendingImagePurge.createMany({
        data: removedImages.map((url) => ({ url, reason: "edit" })),
      });
    }
    return true;
  };

  // The transaction is only worth its round trip when there are bytes to let
  // go of; an ordinary autosave keeps the single statement it had.
  const wrote = removedImages.length > 0 ? await prisma.$transaction(write) : await write(prisma);
  if (!wrote) {
    return {
      error:
        "This letter has changed somewhere else. Reload the page before you carry on, or your writing here will replace it.",
    };
  }
  // Best-effort and after the commit, exactly as a deletion does: a slow R2
  // must not hold a transaction open, and a failure is already recorded as
  // work the nightly sweep will redo.
  if (removedImages.length > 0) await drainPendingImagePurges(removedImages);

  /* /letters only. The letter index and the reading page are server-rendered
     and do show the new words; /feed's server tree renders no post, and
     EditPostDialog hands them back to the card through `onSaved` (B-041). */
  if (isLetter) {
    revalidatePath("/letters");
    revalidatePath(`/letters/${postId}`);
  }
  /* The new version, so the surface that just saved can hold it and keep
     saving. Without this every save after the first would look stale to the
     guard above. */
  const saved = await prisma.post.findUnique({
    where: { id: postId },
    select: { updatedAt: true },
  });
  return { success: true, updatedAt: saved?.updatedAt.toISOString() };
}

export async function toggleLike(postId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  // A like is small but it is still a write with a name on it (trust model,
  // Stage 2). Bookmarks stay below this gate: a save is private to the saver.
  const gate = await requireVerifiedMember();
  if (!gate.ok) return { error: gate.error };

  const visible = await canViewPost(postId, session.user);
  if (!visible.ok) return { error: POST_NOT_VISIBLE };

  /* Delete-first, rather than read-then-decide.
   *
   * A toggle is one row per (member, post), and the database already knows
   * whether that row exists -- so ask it to remove the row and read the count,
   * instead of looking first and acting on what you saw. The old shape was a
   * findUnique followed by a create or a delete, which two rapid taps (a mobile
   * double-tap, two tabs) both entered having read the same answer: both
   * created, and the loser threw a raw P2002 out of the action; or both
   * deleted, and the loser threw P2025. The client only ever inspected
   * `result.error`, so a throw became an unhandled rejection, no toast, and an
   * optimistic heart pointing the wrong way (audit B-040, Lows 67 and 80).
   *
   * Now: `deleteMany` returns 0 or 1 and cannot race with itself, and the
   * create's unique violation is the OTHER tap having already produced exactly
   * the row we wanted. Both outcomes are the state the caller asked for, so
   * both return it. The four sibling toggles below use the same shape.
   */
  const removed = await prisma.like.deleteMany({
    where: { userId: session.user.id, postId },
  });
  if (removed.count > 0) return { success: true, liked: false };

  let created = true;
  try {
    await prisma.like.create({ data: { userId: session.user.id, postId } });
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    created = false; // a concurrent tap got there first; the like stands
  }

  if (created) {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true, kind: true },
    });

    if (post && post.authorId !== session.user.id) {
      // One notification per person per post, not one per tap (audit M33). The
      // rule, and why, are on the helper -- toggleCommentLike below had its own
      // copy of these twelve lines and a comment promising they matched.
      await notifyMemberOnceUnread({
        userId: post.authorId,
        type: "like",
        message: `${session.user.name} liked your ${postNoun(post.kind)}`,
        link: postNotificationLink({ id: postId, kind: post.kind }),
      });
    }
  }

  // No revalidatePath here (deliberately): PostCard already applies the like/count change
  // optimistically on the client, so nothing here needs freshly-rendered server markup. A
  // revalidatePath forces Next to refresh the current route's server tree right after this
  // action resolves, and that refresh was landing as an occasional scroll-to-top on the heart
  // click (root cause of the "heart scroll-jump" bug). Comment likes had the same call and the
  // same symptom; see toggleCommentLike below.
  //
  // THE RULE, since audit 2 took the last five out: an action whose result the
  // client already holds does not revalidate /feed. That server tree renders
  // no post, no comment and no poll -- it fetches the unread count, the
  // member's cities, the "new since" marker and the four rail modules. Posts
  // arrive through `loadPosts` into client state. So votePoll, createComment,
  // deleteComment, adminRemoveComment and editPost's /feed call are all gone
  // for this reason. What still revalidates does so because a SERVER-rendered
  // surface changed: createPost and publishDraft move the rail's "Signs of
  // life", deletePost and adminRemovePost move the pulse count, and the
  // /letters calls feed a page that really is rendered on the server.
  return { success: true, liked: true };
}

export async function toggleBookmark(postId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  /* Bookmarking is private, but it is still a durable reference to a post,
     and loadSavedPosts re-applies the visibility rules when reading the list
     back. Refusing at the point of saving keeps the two consistent. */
  const visible = await canViewPost(postId, session.user);
  if (!visible.ok) return { error: POST_NOT_VISIBLE };

  // Delete-first; see the note in toggleLike above.
  const removed = await prisma.bookmark.deleteMany({
    where: { userId: session.user.id, postId },
  });
  if (removed.count > 0) return { success: true, bookmarked: false };

  try {
    await prisma.bookmark.create({ data: { userId: session.user.id, postId } });
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
  }
  return { success: true, bookmarked: true };
}

// ─── Comments ────────────────────────────────────────

export async function createComment(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  // A comment is public writing under your name on somebody else's post, and
  // it raises a notification on their account. Same gate as a post.
  const gate = await requireVerifiedMember();
  if (!gate.ok) return { error: gate.error };

  // Verified is not unlimited: creation is metered per account (audit M2).
  const limited = await rateLimit("comments", session.user.id);
  if (!limited.ok) return { error: limited.error };

  const raw = {
    content: formData.get("content") as string,
    postId: formData.get("postId") as string,
    parentId: (formData.get("parentId") as string) || undefined,
  };

  const parsed = commentSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  /* The post has to be one this person may actually see. Without this a
     non-member could comment inside a private Catch-up group holding nothing
     but the post id, and raise a notification on the author as they did. */
  const visible = await canViewPost(parsed.data.postId, session.user);
  if (!visible.ok) return { error: POST_NOT_VISIBLE };

  // If replying to a reply, redirect to the parent comment (enforce 1-level depth)
  let parentId = parsed.data.parentId || null;
  /* Who the reply was actually AIMED at, before the reparenting below.
     Threads are one level deep, so a reply to a reply is stored under the
     root -- but the person being answered is the one whose name the composer
     printed, and notifying the root's author instead told somebody else
     entirely while the addressee heard nothing (audit C-016). */
  const repliedToId = parentId;
  if (parentId) {
    const parent = await prisma.comment.findUnique({
      where: { id: parentId },
      select: { parentId: true, postId: true, deletedAt: true, isHidden: true },
    });
    // The UI offers no reply button on a "[deleted]" stub, so this only fires
    // when the target was deleted between render and submit.
    if (!parent || parent.deletedAt || parent.isHidden) {
      return { error: "That comment is gone" };
    }
    /* The parent must belong to the post being commented on (audit M28).
       Nothing checked this: `postId` and `parentId` arrived as two independent
       fields, so a crafted call could file a reply under a comment on a
       DIFFERENT post -- the reply rendered in a thread it was never written
       for, and both posts' comment counts moved. `canViewPost` above vets the
       post; this vets the pair. */
    if (parent.postId !== parsed.data.postId) {
      return { error: "That comment is not on this post" };
    }
    if (parent.parentId) {
      parentId = parent.parentId; // reply to the root comment instead
    }
  }

  /* The server half of the double-submit guard (audit M35).
   *
   * Comment is free text, so there is no unique index that could dedupe it,
   * and the client's in-flight ref cannot cover two tabs, a retried request or
   * a hand-made call. The same person writing the same words under the same
   * comment within seconds is a duplicate submission, not a person saying it
   * twice, so the first row is returned as if the second call had made it --
   * the caller merges it into the thread and nothing on screen betrays that
   * anything happened. The window is deliberately tight: a deliberate repeat a
   * minute later still lands. */
  const twin = await prisma.comment.findFirst({
    where: {
      postId: parsed.data.postId,
      authorId: session.user.id,
      parentId,
      content: parsed.data.content,
      deletedAt: null,
      createdAt: { gte: new Date(Date.now() - DOUBLE_SUBMIT_MS) },
    },
    include: { author: { select: COMMENT_AUTHOR_SELECT } },
  });
  const comment =
    twin ??
    (await prisma.comment.create({
      data: {
        content: parsed.data.content,
        postId: parsed.data.postId,
        authorId: session.user.id,
        parentId,
      },
      include: { author: { select: COMMENT_AUTHOR_SELECT } },
    }));

  // Notifications
  const post = await prisma.post.findUnique({
    where: { id: parsed.data.postId },
    select: { authorId: true, kind: true },
  });
  // A letter's comments live on the letter's own page, not in the feed, so the
  // notification has to say so and go there (audit B-046).
  const postLink = postNotificationLink({ id: parsed.data.postId, kind: post?.kind });

  // Notify post author about comment. Skipped when this call was the second
  // half of a double submission: the notification already went out with the
  // first one, and the bell is exactly where a duplicate would be noticed.
  if (!twin && post && post.authorId !== session.user.id) {
    await notifyMember({
      userId: post.authorId,
      type: "comment",
      message: `${session.user.name} commented on your ${postNoun(post.kind)}`,
      link: postLink,
    });
  }

  // Notify the author of the comment that was replied to
  if (!twin && repliedToId) {
    const parentComment = await prisma.comment.findUnique({
      where: { id: repliedToId },
      select: { authorId: true },
    });
    /* `authorId` is nullable since audit M34: a comment whose author has been
       purged survives as an authorless stub, and there is nobody to tell. */
    if (
      parentComment?.authorId &&
      parentComment.authorId !== session.user.id &&
      parentComment.authorId !== post?.authorId
    ) {
      await notifyMember({
        userId: parentComment.authorId,
        type: "reply",
        message: `${session.user.name} replied to your comment`,
        link: postLink,
      });
    }
  }

  // No revalidatePath: see the note in toggleLike above.
  // The full mapped comment, so the client can slot it into the thread
  // locally: with the thread paginated, "refetch everything" is no longer a
  // cheap way to make a fresh comment appear.
  return {
    success: true,
    commentId: comment.id,
    comment: {
      id: comment.id,
      content: comment.content,
      parentId: comment.parentId,
      createdAt: comment.createdAt.toISOString(),
      author: comment.author,
      likeCount: 0,
      liked: false,
      deleted: false,
      isOwn: true,
      viewerIsAdmin: session.user.role === "admin",
    },
  };
}

/**
 * Author's (or an admin's) delete. SOFT, never `comment.delete`: replies key
 * off parentId and the FK is SetNull, so a row delete silently promoted every
 * reply to a top-level comment (owner hit this live on 2026-08-13 — deleting
 * a parent appeared to take the reply with it while the count still included
 * it). The row stays as structure: content blanked, deletedAt stamped. Counts
 * and fetches exclude it; if replies survive it renders as a "[deleted]" stub.
 */
export async function deleteComment(commentId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { authorId: true, deletedAt: true },
  });

  if (!comment || comment.deletedAt) return { error: "Comment not found" };
  if (comment.authorId !== session.user.id && session.user.role !== "admin") {
    return { error: "Not authorized" };
  }

  await prisma.comment.update({
    where: { id: commentId },
    data: { deletedAt: new Date(), content: "" },
  });
  // No revalidatePath: see the note in toggleLike above. `removeLocally`
  // handles both comment removals in client state.
  return { success: true };
}

/**
 * Admin-only: soft-hide a comment from view, with the same optional warm
 * note flow as adminRemovePost. Distinct from deleteComment above (an
 * author's or admin's hard delete, already wired to nothing in the UI): this
 * keeps the row (and the thread's structure, since replies key off it) but
 * excludes it from loadComments for everyone.
 */
export async function adminRemoveComment(commentId: string, note?: string) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return { error: "Not authorized" };
  }

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { authorId: true, postId: true },
  });
  if (!comment) return { error: "Comment not found" };

  await prisma.comment.update({ where: { id: commentId }, data: { isHidden: true } });

  const trimmedNote = note?.trim();
  // No author left to write to when the account has been purged (audit M34).
  if (trimmedNote && comment.authorId) await notifyAdminNote(comment.authorId, trimmedNote);

  // No revalidatePath: see the note in toggleLike above.
  return { success: true };
}

// ─── Data Fetching ───────────────────────────────────

/**
 * The start of the chosen window, in the valley's day rather than the server's.
 *
 * These used to be `new Date(now.getFullYear(), now.getMonth(), now.getDate())`,
 * which is midnight in whatever zone the process happens to run in -- UTC on
 * Vercel. So "today" began at 05:30 IST and quietly dropped everything posted
 * in the small hours, and "this month" started five and a half hours into the
 * 1st (audit Low 48).
 */
function getTimeFilterDate(
  filter: "all" | "today" | "week" | "month" | "year"
): Date | null {
  if (filter === "all") return null;
  const [yyyy, mm] = valleyDayKey().split("-");
  switch (filter) {
    case "today":
      return valleyDayStart();
    case "week": {
      // The valley's weekday, read at IST noon so no rounding puts it on the
      // wrong side of midnight. Sunday is the week's start, as before.
      const start = valleyDayStart();
      const dow = new Date(`${valleyDayKey()}T12:00:00+05:30`).getUTCDay();
      return new Date(start.getTime() - dow * 24 * 60 * 60 * 1000);
    }
    case "month":
      return valleyMidnight(`${yyyy}-${mm}-01`);
    case "year":
      return valleyMidnight(`${yyyy}-01-01`);
  }
}

const PAGE_SIZE = 20;

/**
 * Everything a post card needs, for whichever member is looking.
 *
 * `loadPosts` and `loadSavedPosts` wrote this out separately, and separately
 * again for the payload below. They had already begun to disagree in ways that
 * looked deliberate but were not -- one summed poll votes into `sum`, the other
 * into `s` -- which is the drift audit C-004 closed one level up. The client
 * types both against a single `PostData`, so the two must agree; now they
 * cannot fail to.
 */
function postInclude(userId: string) {
  return {
    author: { select: AUTHOR_CARD_SELECT },
    _count: { select: { comments: { where: VISIBLE_COMMENT }, likes: true } },
    likes: { where: { userId }, select: { id: true } },
    bookmarks: { where: { userId }, select: { id: true } },
    pollOptions: {
      orderBy: { position: "asc" as const },
      include: { _count: { select: { votes: true } } },
    },
    pollVotes: { where: { userId }, select: { pollOptionId: true } },
  };
}

type PostRow = Prisma.PostGetPayload<{ include: ReturnType<typeof postInclude> }>;

/** One row as the client's `PostData`. */
function serializePost(p: PostRow, viewer: { userId: string; isAdmin: boolean }) {
  return {
    id: p.id,
    kind: p.kind,
    title: p.title,
    content: p.content,
    images: p.images,
    cityScope: p.cityScope,
    createdAt: p.createdAt.toISOString(),
    author: p.author,
    commentCount: p._count.comments,
    likeCount: p._count.likes,
    liked: p.likes.length > 0,
    /* Saved used to hardcode this true. It did not need to: its query already
       joins the viewer's own bookmark rows, so every post it returns has one
       by construction, and this reads the same value from the same data. */
    bookmarked: p.bookmarks.length > 0,
    isOwn: p.authorId === viewer.userId,
    viewerIsAdmin: viewer.isAdmin,
    poll:
      p.pollOptions.length > 0
        ? {
            options: p.pollOptions.map((o) => ({
              id: o.id,
              text: o.text,
              voteCount: o._count.votes,
            })),
            totalVotes: p.pollOptions.reduce((sum, o) => sum + o._count.votes, 0),
            userVotedOptionId: p.pollVotes[0]?.pollOptionId ?? null,
          }
        : null,
  };
}

export async function loadPosts(opts?: {
  cursor?: string | null; // opaque: a post id (keyset) or "offset:N"
  authorId?: string; // set => only this author's posts (profile Posts tab)
  kind?: "post" | "letter";
  search?: string;
  sortBy?: "recent" | "liked" | "commented";
  timeFilter?: "all" | "today" | "week" | "month" | "year";
}) {
  const session = await auth();
  const empty = { posts: [], hasMore: false, nextCursor: null as string | null };
  if (!session?.user?.id) return empty;

  const sortBy = opts?.sortBy ?? "recent";
  const timeFilter = opts?.timeFilter ?? "all";
  const timeDate = getTimeFilterDate(timeFilter);

  // City-scoped posts: cityScope IS NULL, OR the viewer has a matching
  // UserPlace, OR the viewer is an admin (sees everything). Admins skip the
  // fragment entirely rather than being passed an empty-cities case of it.
  const isAdmin = session.user.role === "admin";
  const viewerCities = isAdmin ? [] : await getViewerCities(session.user.id);

  // Every extra `OR` fragment (search, city-scope) is collected into one
  // `AND` array instead of being spread as bare `OR` keys, so they compose
  // safely with each other AND with the batch-targeting top-level `OR` added
  // below for the main feed (a second bare `OR` key would silently overwrite
  // the first instead of combining with it).
  /* The audience arms (city, batch, and the author's exemption from both)
     come from one shared builder, which the profile page's counts and Photos
     grid also use -- they had drifted apart, and the count beside a list was
     answering a different question from the list (bug-report-2 C-004). */
  const audience = audienceWhere(session.user, viewerCities);

  const andConditions: Record<string, unknown>[] = [...(audience.AND ?? [])];
  if (opts?.search) {
    /* Matches title (letters), content, or the AUTHOR'S NAME, case-insensitive
       on Postgres. The author clause is there because people remember posts by
       who wrote them at least as often as by what they said (owner,
       2026-08-04: "they might not always remember words from the post, but
       they might remember, oh, it was this person who did it"). It still
       returns POSTS, not people; finding a person is the directory's job. */
    const search = escapeLike(opts.search);
    andConditions.push({
      OR: [
        { title: { contains: search, ...insensitive } },
        { content: { contains: search, ...insensitive } },
        { author: { name: { contains: search, ...insensitive } } },
      ],
    });
  }
  const baseWhere = {
    isHidden: false,
    // Drafts (letters saved before publishing) never surface in any feed,
    // including the author's own profile/group feeds -- they only ever show
    // in the "Your drafts" strip on /letters.
    ...PUBLISHED_ONLY,
    // A blocked member's writing leaves the feed with them (owner decision,
    // audit Low 78). Nothing is deleted; unblocking restores all of it.
    ...AUTHOR_IN_GOOD_STANDING,
    ...(opts?.authorId ? { authorId: opts.authorId } : {}),
    ...(opts?.kind ? { kind: opts.kind } : {}),
    ...(andConditions.length ? { AND: andConditions } : {}),
    ...(timeDate ? { createdAt: { gte: timeDate } } : {}),
  };

  const where = {
    ...baseWhere,
    groupId: null,
    // ...or you wrote it: the author is not part of their own audience,
    // they are its source, so a post aimed at another batch used to
    // disappear from the feed of the person who wrote it (audit M30).
    // Mirrors the same exemption in decidePostVisibility, which is what
    // decides the single-post case. Both arms live in audienceWhere.
    OR: audience.OR,
  };

  const include = postInclude(session.user.id);

  let rows;
  let nextCursor: string | null = null;

  if (sortBy === "recent") {
    /* Keyset pagination on the VALUES, not on Prisma's `cursor`. The cursor
       carries (createdAt, id) so the next page is a comparison, and the post
       those values came from being deleted by its author, hidden by a
       moderator, or losing its author to a block no longer ends the scroll
       (audits C-005 / C-124 / C-162 / C-171 -- see keyset.ts for the proof).
       ANDed rather than spread: `where` already carries a top-level OR for the
       batch scope, and a second one would replace it. */
    const after = opts?.cursor?.startsWith("offset:") ? null : decodeKeyset(opts?.cursor);
    rows = await prisma.post.findMany({
      where: after ? { AND: [where, keysetWhere(after, "desc")] } : where,
      include,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: PAGE_SIZE + 1,
    });
    const hasMore = rows.length > PAGE_SIZE;
    if (hasMore) rows = rows.slice(0, PAGE_SIZE);
    nextCursor = hasMore ? encodeKeyset(rows[rows.length - 1]) : null;
  } else {
    // Count-based sorts cannot keyset cleanly: fall back to offset paging.
    //
    // The offset is clamped because the cursor is an opaque string that comes
    // back from a client call, and `parseInt("-5") || 0` is -5: Prisma will not
    // take a negative `skip` and threw instead of paging (audit Low 79).
    const parsedOffset = opts?.cursor?.startsWith("offset:")
      ? Number.parseInt(opts.cursor.slice(7), 10)
      : 0;
    const offset = Number.isFinite(parsedOffset) ? Math.max(0, parsedOffset) : 0;
    // Ending on (createdAt, id) makes the ordering total. Without it, the many
    // posts tied on nought likes have no defined position, so each offset page
    // re-sorted them differently and could repeat or skip rows (the feed's half
    // of audit B-122).
    const orderBy =
      sortBy === "liked"
        ? [
            { likes: { _count: "desc" as const } },
            { createdAt: "desc" as const },
            { id: "desc" as const },
          ]
        : [
            { comments: { _count: "desc" as const } },
            { createdAt: "desc" as const },
            { id: "desc" as const },
          ];
    rows = await prisma.post.findMany({
      where,
      include,
      orderBy,
      take: PAGE_SIZE + 1,
      skip: offset,
    });
    const hasMore = rows.length > PAGE_SIZE;
    if (hasMore) rows = rows.slice(0, PAGE_SIZE);
    nextCursor = hasMore ? `offset:${offset + PAGE_SIZE}` : null;
  }

  return {
    /* Each post's photographs carry what we know about them -- shape, focal
       point, the smear that holds their place -- so the card can lay them out
       without measuring anything. One query for the page. */
    posts: await withPhotoFacts(
      rows.map((p) => serializePost(p, { userId: session.user.id, isAdmin }))
    ),
    hasMore: nextCursor !== null,
    nextCursor,
  };
}

/**
 * The signed-in member's saved posts (their own bookmarks), most-recently-saved
 * first. Private by construction: it only ever reads the session user's own
 * Bookmark rows, so it can never leak another member's saved list even if the
 * caller lands on someone else's profile. Group posts only surface while the
 * member still belongs to that group.
 */
/** How many saved posts the Saved tab loads. It is a keepsake shelf rather
 *  than a feed, so it is one page; it now says so when it fills up. */
const SAVED_POSTS_LIMIT = 120;

export async function loadSavedPosts() {
  const session = await auth();
  if (!session?.user?.id) return { posts: [], capped: false };
  const userId = session.user.id;

  const isAdmin = session.user.role === "admin";
  const viewerCities = isAdmin ? [] : await getViewerCities(userId);

  const rows = await prisma.bookmark.findMany({
    where: {
      userId,
      post: {
        isHidden: false,
        // A draft can never be bookmarked in the first place (it never renders
        // in a card with a bookmark ribbon), but this guards the read path the
        // same way every other post list does.
        ...PUBLISHED_ONLY,
        // And the same standing rule the feed applies (audit Low 78): a post
        // saved before its author was blocked drops out of Saved too.
        ...AUTHOR_IN_GOOD_STANDING,
        groupId: null,
        // Same cityScope visibility rule as the main feed query: a bookmarked
        // post scoped to a city the viewer no longer lists should drop out of
        // Saved too, not just the feed.
        ...(isAdmin ? {} : { AND: [cityScopeWhere(viewerCities)] }),
      },
    },
    orderBy: { createdAt: "desc" },
    /* One more than the cap, purely so the caller can say it stopped short.
       This was a bare `take: 120` and the 121st saved post simply did not
       exist: no link, no count, no indication (audit Low 76). */
    take: SAVED_POSTS_LIMIT + 1,
    include: { post: { include: postInclude(userId) } },
  });

  const capped = rows.length > SAVED_POSTS_LIMIT;
  const page = capped ? rows.slice(0, SAVED_POSTS_LIMIT) : rows;

  return {
    /* True when there are older saved posts this page did not load, so the
       shelf can say so rather than end silently (audit Low 76). */
    capped,
    posts: await withPhotoFacts(page.map(({ post: p }) => serializePost(p, { userId, isAdmin }))),
  };
}

export async function toggleCommentLike(commentId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  // Same tier as toggleLike: a public gesture is a Stage 2 write.
  const gate = await requireVerifiedMember();
  if (!gate.ok) return { error: gate.error };

  const visible = await canViewPostOfComment(commentId, session.user);
  if (!visible.ok) return { error: POST_NOT_VISIBLE };

  // Delete-first; see the note in toggleLike above.
  const removed = await prisma.commentLike.deleteMany({
    where: { userId: session.user.id, commentId },
  });
  if (removed.count > 0) return { success: true, liked: false };

  let created = true;
  try {
    await prisma.commentLike.create({ data: { userId: session.user.id, commentId } });
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    created = false;
  }

  if (created) {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { authorId: true, postId: true, post: { select: { kind: true } } },
    });

    if (comment?.authorId && comment.authorId !== session.user.id) {
      // The same one-per-unread rule toggleLike uses (audit M33) -- the same
      // call now, rather than the same twelve lines typed again.
      await notifyMemberOnceUnread({
        userId: comment.authorId,
        type: "like",
        message: `${session.user.name} liked your comment`,
        link: postNotificationLink({ id: comment.postId, kind: comment.post?.kind }),
      });
    }
  }

  // No revalidatePath (see the matching note in toggleLike above): CommentItem already
  // applies the like/count change optimistically, and this call was the other half of the
  // heart scroll-jump bug (the post-action refresh occasionally reset scroll to the top).
  return { success: true, liked: true };
}

/**
 * One page of a post's thread. Pagination walks TOP-LEVEL comments only
 * (keyset on (createdAt, id), oldest first); each page carries every visible
 * reply of its parents, so a parent can never be sliced away from its thread.
 *
 * A deleted or admin-hidden parent whose replies survive is still returned,
 * as a content-free stub (`deleted: true`, no author) — the client renders
 * "[deleted]" and the replies keep their place. Without the stub the replies
 * silently vanished from the UI while `_count.comments` still included them.
 */
export async function loadComments(
  postId: string,
  opts?: { cursor?: string | null; take?: number }
) {
  // Comments were readable signed-out before; nothing else on the feed is.
  const session = await auth();
  if (!session?.user?.id) return { comments: [], nextCursor: null, hasMore: false };
  const userId = session.user.id;
  const viewerIsAdmin = session.user.role === "admin";

  /* Requiring a session was only half of it. This returned every comment on
     any post id -- content, author name, photo, batch -- for private-group
     and city-scoped posts the caller had no access to. An empty page is the
     right answer, and it is the same answer a post that does not exist gives,
     so this cannot be used to discover which ids are real. */
  const visible = await canViewPost(postId, session.user);
  if (!visible.ok) return { comments: [], nextCursor: null, hasMore: false };

  const take = Math.min(Math.max(opts?.take ?? 10, 1), 50);

  // A top-level row earns a slot on the page if it is itself visible, or if
  // it must stand in as the anchor for visible replies.
  const after = decodeKeyset(opts?.cursor);
  const rootWhere = {
    postId,
    parentId: null,
    OR: [VISIBLE_COMMENT, { replies: { some: VISIBLE_COMMENT } }],
  };
  // Value keyset, oldest-first. A root comment can leave this set between two
  // pages -- soft-deleted with no visible replies left, or hidden by a
  // moderator -- and naming it as a Prisma cursor then returned nothing at all
  // (see keyset.ts).
  const roots = await prisma.comment.findMany({
    where: after ? { AND: [rootWhere, keysetWhere(after, "asc")] } : rootWhere,
    select: { id: true, createdAt: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: take + 1,
  });

  const hasMore = roots.length > take;
  const pageRoots = hasMore ? roots.slice(0, take) : roots;
  const nextCursor = hasMore ? encodeKeyset(pageRoots[pageRoots.length - 1]) : null;
  const rootIds = pageRoots.map((r) => r.id);

  const rows = await prisma.comment.findMany({
    where: {
      OR: [
        { id: { in: rootIds }, ...VISIBLE_COMMENT },
        { parentId: { in: rootIds }, ...VISIBLE_COMMENT },
      ],
    },
    include: {
      author: {
        select: { ...AUTHOR_CARD_SELECT },
      },
      _count: { select: { commentLikes: true } },
      commentLikes: { where: { userId }, select: { id: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const visibleIds = new Set(rows.map((r) => r.id));
  const stubs = pageRoots
    .filter((r) => !visibleIds.has(r.id))
    .map((r) => ({
      id: r.id,
      content: "",
      parentId: null as string | null,
      createdAt: r.createdAt.toISOString(),
      author: null,
      likeCount: 0,
      liked: false,
      deleted: true,
      isOwn: false,
      viewerIsAdmin,
    }));

  return {
    comments: [
      ...rows.map((c) => ({
        id: c.id,
        content: c.content,
        parentId: c.parentId,
        createdAt: c.createdAt.toISOString(),
        author: c.author,
        likeCount: c._count.commentLikes,
        liked: c.commentLikes.length > 0,
        deleted: false,
        isOwn: c.author?.id === userId,
        viewerIsAdmin,
      })),
      ...stubs,
    ],
    nextCursor,
    hasMore,
  };
}

/**
 * Advance the "New since you were last here" marker to the newest post the
 * member has now been shown.
 *
 * This lived in localStorage until 2026-08-20, which made the divider a
 * per-browser fact: reading the feed on a laptop and then a phone announced
 * the same posts as new a second time (owner: "should only appear once, not
 * once on each device you're logged into"). On the account it is announced
 * once, on whichever device gets there first.
 *
 * The write is a single conditional updateMany rather than a read-then-write,
 * so it is monotonic without a transaction: two devices loading the feed at
 * the same moment cannot rewind each other, because the WHERE clause refuses
 * any value that is not strictly newer than what is already stored.
 *
 * Failure is deliberately silent in production. Nobody should meet an error
 * page because a divider could not be bookkept -- and in the public demo the
 * write is DENIED outright by the client extension in prisma.ts, since
 * feedSeenAt is not one of the visitor's own profile fields. Development logs
 * it, because a guard that hides its own breakage is worse than no guard.
 */
export async function markFeedSeen(newestCreatedAt: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  const seenAt = new Date(newestCreatedAt);
  if (Number.isNaN(seenAt.getTime())) return;
  /* A marker cannot be in the future, and this one only ever moves FORWARD --
     so a single crafted call with a date in the year 3000 would have retired
     the "New since you were last here" divider for that member permanently,
     with no way back short of editing the row by hand (audit Low 81). Nothing
     legitimate ever sends a future date: the value is the createdAt of a post
     already on screen. */
  if (seenAt.getTime() > Date.now()) return;

  try {
    await prisma.user.updateMany({
      where: {
        id: session.user.id,
        OR: [{ feedSeenAt: null }, { feedSeenAt: { lt: seenAt } }],
      },
      data: { feedSeenAt: seenAt },
    });
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[markFeedSeen] could not advance the feed marker", err);
    }
  }
}
