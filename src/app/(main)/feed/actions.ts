"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { postSchema, commentSchema } from "@/lib/validators";
import { postContentMax } from "@/lib/post-caps";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { drainPendingImagePurges } from "@/lib/account-purge";
import { copyPostImagesToCollection } from "@/lib/collection-intake";
import { getViewerCities, cityScopeWhere } from "@/lib/city-scope";
import { notifyAdminNote } from "@/lib/admin-note";
import { PUBLISHED_ONLY, batchScopeWhere } from "@/lib/posts";
import { requireVerifiedMember } from "@/lib/member-gate";
import { rateLimit } from "@/lib/rate-limit";
import { canViewPost, canViewPostOfComment, POST_NOT_VISIBLE } from "@/lib/post-visibility";
import { batchTargetKey, storedBatchTargets } from "@/lib/post-visibility-rule";
import { ownedUploadUrls } from "@/lib/upload-ownership";
import { escapeLike } from "@/lib/db-text";
import { isUniqueViolation } from "@/lib/prisma-errors";
import { postNotificationLink, postNoun } from "@/lib/notification-links";
import { valleyDayKey, valleyDayStart, valleyMidnight } from "@/lib/utils";

/** The url list out of a post's `images` column. Bad JSON reads as no images,
 *  never as a throw: a post with a corrupt column should still delete, and
 *  should still post. */
function parseImageUrls(images: string | null | undefined): string[] {
  if (!images) return [];
  try {
    const parsed = JSON.parse(images);
    return Array.isArray(parsed) ? parsed.filter((u) => typeof u === "string") : [];
  } catch {
    return [];
  }
}

/** Best-effort cleanup of a post's stored image files, in parallel. */
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
async function deletePostWithImages(postId: string, images: string | null): Promise<void> {
  const urls = parseImageUrls(images);
  await prisma.$transaction(async (tx) => {
    if (urls.length > 0) {
      await tx.pendingImagePurge.createMany({
        data: urls.map((url) => ({ url, reason: "post" })),
      });
    }
    await tx.post.delete({ where: { id: postId } });
  });
  // Best-effort and after the commit: a slow R2 must not hold a transaction
  // open, and a failure here is already recorded as work to redo.
  await drainPendingImagePurges(urls);
}


// Postgres accepts `mode: "insensitive"` on `contains`; SQLite's Prisma
// adapter rejects it (and SQLite `LIKE` is already case-insensitive for
// ASCII), so it's only added when the live provider is Postgres. Same
// detection as `src/app/(main)/directory/where.ts`.
const IS_POSTGRES = (process.env.DATABASE_URL ?? "").startsWith("postgres");
const searchInsensitive = IS_POSTGRES ? ({ mode: "insensitive" } as const) : {};


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
     the one on publishing, which is untouched. */
  const savingDraft = formData.get("saveAsDraft") === "true";
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
  const ownership = ownedUploadUrls(parseImageUrls(parsed.data.images), session.user.id);
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
   * The read side (`loadPosts({ groupId })`, membership-gated) is left alone:
   * it returns nothing today and harms nothing, and tearing the whole
   * group-feed plumbing out is a bigger, separate change.
   */
  if (parsed.data.groupId) {
    return { error: "Group posts are not available." };
  }
  const groupId = null;

  // City-scope audience control: only allowed to a city the poster themself has
  // listed (an own UserPlace), matched case-insensitively; anything else is
  // silently ignored rather than trusted, so a tampered form field can't scope
  // a post to an arbitrary city. Group posts never get a cityScope, same as
  // targetBatches above.
  let cityScope: string | null = null;
  if (!groupId && parsed.data.cityScope) {
    const ownPlace = await prisma.userPlace.findFirst({
      where: {
        userId: session.user.id,
        city: { equals: parsed.data.cityScope, ...searchInsensitive },
      },
      select: { city: true },
    });
    cityScope = ownPlace?.city ?? null;
  }

  // "Save as draft" only exists for letters; a plain post ignores the flag
  // even if a tampered form field sends it.
  const isDraft = parsed.data.kind === "letter" && parsed.data.saveAsDraft === true;

  // Poll options are written in the SAME create as the post, as a nested
  // create, so the post and all of its options land in one transaction (audit
  // M32). The old loop issued up to four separate round trips after the post
  // existed, and a failure mid-loop left a post carrying a partial poll.
  // Drafts are letters-only, so a poll never applies to one, but the guard
  // costs nothing.
  const withPoll =
    !isDraft && parsed.data.pollOptions && parsed.data.pollOptions.length >= 2
      ? {
          pollOptions: {
            create: parsed.data.pollOptions.map((text, i) => ({
              text: text.trim(),
              position: i,
            })),
          },
        }
      : {};

  const post = await prisma.post.create({
    data: {
      authorId: session.user.id,
      kind: parsed.data.kind || "post",
      title: parsed.data.kind === "letter" ? parsed.data.title || null : null,
      content: parsed.data.content,
      // Rebuilt from the parse rather than stored through, the same way
      // `images` is rebuilt from ownedUploadUrls above: what lands in the
      // column is a list this app can read back, normalised and de-duplicated,
      // never the client's own text (audit M43).
      targetBatches: groupId ? null : storedBatchTargets(parsed.data.targetBatches),
      groupId,
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
  if (!isDraft) revalidatePath(groupId ? `/groups/${groupId}` : "/feed");
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
    select: { authorId: true, status: true, kind: true, groupId: true },
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

  revalidatePath(post.groupId ? `/groups/${post.groupId}` : "/feed");
  revalidatePath("/letters");
  revalidatePath(`/letters/${postId}`);
  return { success: true };
}

/**
 * Deletes a letter draft. Author-only (a draft is never visible to anyone
 * else, admins included, so there is no group-admin or site-admin bypass
 * here the way deletePost has).
 */
export async function deleteDraft(postId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorId: true, status: true, images: true },
  });
  if (!post) return { error: "Draft not found" };
  if (post.authorId !== session.user.id) return { error: "Not authorized" };
  if (post.status !== "draft") return { error: "That letter isn't a draft" };

  await deletePostWithImages(postId, post.images);
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

  revalidatePath("/feed");
  return { success: true };
}

export async function deletePost(postId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorId: true, images: true, groupId: true },
  });

  if (!post) return { error: "Post not found" };

  let authorized =
    post.authorId === session.user.id || session.user.role === "admin";
  // Group admins may remove posts in their group.
  if (!authorized && post.groupId) {
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: post.groupId, userId: session.user.id } },
      select: { role: true },
    });
    authorized = membership?.role === "admin";
  }
  if (!authorized) return { error: "Not authorized" };

  // Delete image files
  await deletePostWithImages(postId, post.images);
  revalidatePath(post.groupId ? `/groups/${post.groupId}` : "/feed");
  return { success: true };
}

/**
 * Admin-only: soft-hide any post (or letter, same model) from every card/row
 * it appears in, with an optional warm note relayed to the author as a
 * Notification (type "admin_note") that opens the dedicated /notice/[id]
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
    select: { authorId: true, groupId: true, kind: true },
  });
  if (!post) return { error: "Post not found" };

  await prisma.post.update({ where: { id: postId }, data: { isHidden: true } });

  const trimmedNote = note?.trim();
  if (trimmedNote) await notifyAdminNote(post.authorId, trimmedNote);

  revalidatePath(post.groupId ? `/groups/${post.groupId}` : "/feed");
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
    select: { authorId: true, kind: true, groupId: true, status: true, images: true },
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
      const current = new Set(parseImageUrls(post.images));
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
        if (allowed.length > 3) {
          imagesError = "Up to 3 photos.";
        } else {
          imagesUpdate = { images: allowed.length > 0 ? JSON.stringify(allowed) : null };
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
  if (cityScopeRaw !== null && isLetter && post.status === "draft" && !post.groupId) {
    const wanted = String(cityScopeRaw).trim();
    if (!wanted) {
      cityScopeUpdate = { cityScope: null };
    } else {
      const ownPlace = await prisma.userPlace.findFirst({
        where: {
          userId: session.user.id,
          city: { equals: wanted, ...searchInsensitive },
        },
        select: { city: true },
      });
      cityScopeUpdate = { cityScope: ownPlace?.city ?? null };
    }
  }

  await prisma.post.update({
    where: { id: postId },
    data: {
      content,
      // A title belongs to a letter only; a plain post has nothing else here.
      ...(isLetter ? { title: title?.trim() || null } : {}),
      ...imagesUpdate,
      ...cityScopeUpdate,
    },
  });

  revalidatePath(post.groupId ? `/groups/${post.groupId}` : "/feed");
  if (isLetter) {
    revalidatePath("/letters");
    revalidatePath(`/letters/${postId}`);
  }
  return { success: true };
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
      /* One notification per person per post, not one per tap.
       *
       * Unliking and re-liking used to mint a fresh row every time, so anyone
       * fidgeting with a heart could fill the author's bell with the same
       * sentence (audit M33). An unread like notification for this post is
       * already saying what a second one would say, so if one is sitting there
       * unread, leave it. Once they have read it, a later like is news again.
       */
      const link = postNotificationLink({ id: postId, kind: post.kind });
      const message = `${session.user.name} liked your ${postNoun(post.kind)}`;
      const alreadyTold = await prisma.notification.findFirst({
        where: { userId: post.authorId, type: "like", link, message, read: false },
        select: { id: true },
      });
      if (!alreadyTold) {
        await prisma.notification.create({
          data: { userId: post.authorId, type: "like", message, link },
        });
      }
    }
  }

  // No revalidatePath here (deliberately): PostCard already applies the like/count change
  // optimistically on the client, so nothing here needs freshly-rendered server markup. A
  // revalidatePath forces Next to refresh the current route's server tree right after this
  // action resolves, and that refresh was landing as an occasional scroll-to-top on the heart
  // click (root cause of the "heart scroll-jump" bug). Comment likes had the same call and the
  // same symptom; see toggleCommentLike below.
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

  const comment = await prisma.comment.create({
    data: {
      content: parsed.data.content,
      postId: parsed.data.postId,
      authorId: session.user.id,
      parentId,
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          avatarColor: true,
          photoUrl: true,
          birdOverride: true,
          accountType: true,
          verifyState: true,
          batchType: true,
          batchYear: true,
        },
      },
    },
  });

  // Notifications
  const post = await prisma.post.findUnique({
    where: { id: parsed.data.postId },
    select: { authorId: true, kind: true },
  });
  // A letter's comments live on the letter's own page, not in the feed, so the
  // notification has to say so and go there (audit B-046).
  const postLink = postNotificationLink({ id: parsed.data.postId, kind: post?.kind });

  // Notify post author about comment
  if (post && post.authorId !== session.user.id) {
    await prisma.notification.create({
      data: {
        userId: post.authorId,
        type: "comment",
        message: `${session.user.name} commented on your ${postNoun(post.kind)}`,
        link: postLink,
      },
    });
  }

  // Notify parent comment author about reply
  if (parentId) {
    const parentComment = await prisma.comment.findUnique({
      where: { id: parentId },
      select: { authorId: true },
    });
    if (
      parentComment &&
      parentComment.authorId !== session.user.id &&
      parentComment.authorId !== post?.authorId
    ) {
      await prisma.notification.create({
        data: {
          userId: parentComment.authorId,
          type: "reply",
          message: `${session.user.name} replied to your comment`,
          link: postLink,
        },
      });
    }
  }

  revalidatePath("/feed");
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
  revalidatePath("/feed");
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
  if (trimmedNote) await notifyAdminNote(comment.authorId, trimmedNote);

  revalidatePath("/feed");
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

export async function loadPosts(opts?: {
  cursor?: string | null; // opaque: a post id (keyset) or "offset:N"
  groupId?: string; // set => load this group's feed; unset => main feed
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
  const groupId = opts?.groupId;
  const userBatch = batchTargetKey(session.user.batchType, session.user.batchYear);
  const timeDate = getTimeFilterDate(timeFilter);

  // Group feeds are private: only members may read them.
  if (groupId) {
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: session.user.id } },
      select: { id: true },
    });
    if (!membership) return empty;
  }

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
  const andConditions: Record<string, unknown>[] = [];
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
        { title: { contains: search, ...searchInsensitive } },
        { content: { contains: search, ...searchInsensitive } },
        { author: { name: { contains: search, ...searchInsensitive } } },
      ],
    });
  }
  /* City scope, unless you wrote it (audit M30). An AND-ed clause cannot be
     escaped by the OR above, so the author exemption has to be spelled out
     here as well: a member who has moved away and writes a letter for the city
     they left could otherwise not see their own post in any feed. */
  if (!isAdmin) {
    andConditions.push({
      OR: [cityScopeWhere(viewerCities), { authorId: session.user.id }],
    });
  }

  const baseWhere = {
    isHidden: false,
    // Drafts (letters saved before publishing) never surface in any feed,
    // including the author's own profile/group feeds -- they only ever show
    // in the "Your drafts" strip on /letters.
    ...PUBLISHED_ONLY,
    ...(opts?.authorId ? { authorId: opts.authorId } : {}),
    ...(opts?.kind ? { kind: opts.kind } : {}),
    ...(andConditions.length ? { AND: andConditions } : {}),
    ...(timeDate ? { createdAt: { gte: timeDate } } : {}),
  };

  const where = groupId
    ? { ...baseWhere, groupId }
    : {
        ...baseWhere,
        groupId: null,
        OR: [
          ...batchScopeWhere(userBatch).OR,
          // ...or you wrote it. The author is not part of their own audience,
          // they are its source, so a post aimed at another batch used to
          // disappear from the feed of the person who wrote it (audit M30).
          // Mirrors the same exemption in decidePostVisibility, which is what
          // decides the single-post case.
          { authorId: session.user.id },
        ],
      };

  const include = {
    author: {
      select: {
        id: true,
        name: true,
        photoUrl: true,
        birdOverride: true,
        accountType: true,
        verifyState: true,
        batchType: true,
        batchYear: true,
      },
    },
    _count: { select: { comments: { where: { isHidden: false, deletedAt: null } }, likes: true } },
    likes: { where: { userId: session.user.id }, select: { id: true } },
    bookmarks: { where: { userId: session.user.id }, select: { id: true } },
    pollOptions: {
      orderBy: { position: "asc" as const },
      include: { _count: { select: { votes: true } } },
    },
    pollVotes: { where: { userId: session.user.id }, select: { pollOptionId: true } },
  };

  let rows;
  let nextCursor: string | null = null;

  if (sortBy === "recent") {
    // Keyset pagination: stable ordering by (createdAt, id), seek past the cursor id.
    const keysetCursor =
      opts?.cursor && !opts.cursor.startsWith("offset:") ? opts.cursor : undefined;
    rows = await prisma.post.findMany({
      where,
      include,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: PAGE_SIZE + 1,
      ...(keysetCursor ? { cursor: { id: keysetCursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > PAGE_SIZE;
    if (hasMore) rows = rows.slice(0, PAGE_SIZE);
    nextCursor = hasMore ? rows[rows.length - 1].id : null;
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
    posts: rows.map((p) => ({
      id: p.id,
      kind: p.kind,
      title: p.title,
      content: p.content,
      images: p.images,
      groupId: p.groupId,
      cityScope: p.cityScope,
      createdAt: p.createdAt.toISOString(),
      author: p.author,
      commentCount: p._count.comments,
      likeCount: p._count.likes,
      liked: p.likes.length > 0,
      bookmarked: p.bookmarks.length > 0,
      isOwn: p.authorId === session.user.id,
      viewerIsAdmin: isAdmin,
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
    })),
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
export async function loadSavedPosts() {
  const session = await auth();
  if (!session?.user?.id) return { posts: [] };
  const userId = session.user.id;

  // Only surface group posts the viewer can still legitimately read.
  const memberships = await prisma.groupMember.findMany({
    where: { userId },
    select: { groupId: true },
  });
  const groupIds = memberships.map((m) => m.groupId);
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
        OR: [{ groupId: null }, { groupId: { in: groupIds } }],
        // Same cityScope visibility rule as the main feed query: a bookmarked
        // post scoped to a city the viewer no longer lists should drop out of
        // Saved too, not just the feed.
        ...(isAdmin ? {} : { AND: [cityScopeWhere(viewerCities)] }),
      },
    },
    orderBy: { createdAt: "desc" },
    take: 120,
    include: {
      post: {
        include: {
          author: {
            select: {
              id: true,
              name: true,
              photoUrl: true,
              birdOverride: true,
              accountType: true,
              verifyState: true,
              batchType: true,
              batchYear: true,
            },
          },
          _count: { select: { comments: { where: { isHidden: false, deletedAt: null } }, likes: true } },
          likes: { where: { userId }, select: { id: true } },
          bookmarks: { where: { userId }, select: { id: true } },
          pollOptions: {
            orderBy: { position: "asc" as const },
            include: { _count: { select: { votes: true } } },
          },
          pollVotes: { where: { userId }, select: { pollOptionId: true } },
        },
      },
    },
  });

  return {
    posts: rows.map(({ post: p }) => ({
      id: p.id,
      kind: p.kind,
      title: p.title,
      content: p.content,
      images: p.images,
      groupId: p.groupId,
      cityScope: p.cityScope,
      createdAt: p.createdAt.toISOString(),
      author: p.author,
      commentCount: p._count.comments,
      likeCount: p._count.likes,
      liked: p.likes.length > 0,
      bookmarked: true,
      isOwn: p.authorId === userId,
      viewerIsAdmin: isAdmin,
      poll:
        p.pollOptions.length > 0
          ? {
              options: p.pollOptions.map((o) => ({
                id: o.id,
                text: o.text,
                voteCount: o._count.votes,
              })),
              totalVotes: p.pollOptions.reduce((s, o) => s + o._count.votes, 0),
              userVotedOptionId: p.pollVotes[0]?.pollOptionId ?? null,
            }
          : null,
    })),
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

    if (comment && comment.authorId !== session.user.id) {
      const link = postNotificationLink({ id: comment.postId, kind: comment.post?.kind });
      const message = `${session.user.name} liked your comment`;
      // Same one-per-unread rule as toggleLike (audit M33).
      const alreadyTold = await prisma.notification.findFirst({
        where: { userId: comment.authorId, type: "like", link, message, read: false },
        select: { id: true },
      });
      if (!alreadyTold) {
        await prisma.notification.create({
          data: { userId: comment.authorId, type: "like", message, link },
        });
      }
    }
  }

  // No revalidatePath (see the matching note in toggleLike above): CommentItem already
  // applies the like/count change optimistically, and this call was the other half of the
  // heart scroll-jump bug (the post-action refresh occasionally reset scroll to the top).
  return { success: true, liked: true };
}

/** A comment row still shown to readers: neither admin-hidden nor self-deleted. */
const VISIBLE_COMMENT = { isHidden: false, deletedAt: null } as const;

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
  const roots = await prisma.comment.findMany({
    where: {
      postId,
      parentId: null,
      OR: [VISIBLE_COMMENT, { replies: { some: VISIBLE_COMMENT } }],
    },
    select: { id: true, createdAt: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: take + 1,
    ...(opts?.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
  });

  const hasMore = roots.length > take;
  const pageRoots = hasMore ? roots.slice(0, take) : roots;
  const nextCursor = hasMore ? pageRoots[pageRoots.length - 1].id : null;
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
        select: {
          id: true,
          name: true,
          avatarColor: true,
          photoUrl: true,
          birdOverride: true,
          accountType: true,
          verifyState: true,
          batchType: true,
          batchYear: true,
        },
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
        isOwn: c.author.id === userId,
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
