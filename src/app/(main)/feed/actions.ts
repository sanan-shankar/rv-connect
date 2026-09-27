"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { postSchema, commentSchema } from "@/lib/validators";
import { postContentMax, POST_TOO_LONG } from "@/lib/post-caps";
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
import { mentionedUserIds } from "@/lib/rich-text";
import { notifyMentioned } from "@/lib/mention-notifications";
import { parseJsonArray, withTitleAsOpeningLine } from "@/lib/utils";
import type { Prisma } from "@/generated/prisma/client";
import { DOUBLE_SUBMIT_MS, isPostTwin } from "@/lib/double-submit";
import { decodeKeyset, encodeKeyset, keysetWhere } from "@/lib/keyset";
import { isLetterDraft } from "@/lib/draft-rule";
import { AUTHOR_CARD_SELECT } from "@/lib/people-select";
import {
  EMPTY_COMMENT_PAGE,
  readCommentPage,
  serializeComment,
  toggleCommentLikeRow,
  writeComment,
} from "@/lib/comment-thread";

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
      images: imagesJson,
      cityScope,
      status: isDraft ? "draft" : "published",
      ...withPoll,
    },
  });

  /* "And, also, yeah, obviously, notify the person who is tagged." (owner)
   *
   * Skipped for a draft: nobody but its author can see it yet --
   * `decidePostVisibility` inside `notifyMentioned` would refuse every one
   * of them anyway (status is not "published") -- so this is skipped rather
   * than paid for. `publishDraft` below is what tells them once a letter
   * saved this way actually goes out.
   */
  if (!isDraft) {
    await notifyMentioned({
      ids: mentionedUserIds(parsed.data.content),
      actorId: session.user.id,
      actorName: session.user.name,
      scope: {
        id: post.id,
        authorId: post.authorId,
        cityScope: post.cityScope,
        targetBatches: post.targetBatches,
        isHidden: false,
        status: "published",
        kind: post.kind,
      },
      source: post.kind === "letter" ? "letter" : "post",
    });
  }

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
 *
 * `asPost` publishes it as a post instead: the desk offers that when a letter
 * under LETTER_MIN_WORDS is published (owner, 2026-09-17). Same row, so the
 * draft is not left behind, and the title becomes the opening line. Done here
 * rather than by the editPost before it, so a refused publish leaves the
 * draft exactly as the writer saved it.
 */
export async function publishDraft(postId: string, opts: { asPost?: boolean } = {}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  // The moment a draft letter becomes visible to everyone. Drafts themselves
  // stay ungated on purpose: writing privately harms nobody, and somebody
  // waiting on a confirmation email should not lose what they were working on.
  const gate = await requireVerifiedMember();
  if (!gate.ok) return { error: gate.error };

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      authorId: true,
      status: true,
      kind: true,
      title: true,
      content: true,
      cityScope: true,
      targetBatches: true,
      isHidden: true,
    },
  });
  if (!post) return { error: "Draft not found" };
  if (post.authorId !== session.user.id) return { error: "Not authorized" };
  if (post.kind !== "letter" || post.status !== "draft") {
    return { error: "That letter isn't a draft" };
  }

  let asPost = {};
  // A draft has never had an audience, so this is what it is published WITH,
  // not what it was written with -- the text `notifyMentioned` below reads.
  let finalContent = post.content;
  let finalKind = post.kind;
  // `?.`: a hand-made call can send null, which the default does not cover.
  if (opts?.asPost === true) {
    finalContent = withTitleAsOpeningLine(post.title, post.content);
    if (finalContent.length > postContentMax("post")) return { error: POST_TOO_LONG };
    finalKind = "post";
    asPost = { kind: "post", title: null, content: finalContent };
  }

  await prisma.post.update({
    where: { id: postId },
    data: { status: "published", createdAt: new Date(), ...asPost },
  });

  /* A draft has no readers -- `decidePostVisibility` refuses every viewer but
   * its author while status is "draft" -- so THIS is the letter's real
   * "create" moment for anyone it @-mentions, not the original save. Every
   * mention counts as new here; nobody could have seen an earlier one.
   */
  await notifyMentioned({
    ids: mentionedUserIds(finalContent),
    actorId: session.user.id,
    actorName: session.user.name,
    scope: {
      id: postId,
      authorId: post.authorId,
      cityScope: post.cityScope,
      targetBatches: post.targetBatches,
      isHidden: post.isHidden,
      status: "published",
      kind: finalKind,
    },
    source: finalKind === "letter" ? "letter" : "post",
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

  // The author or an admin, and nobody else.
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
    select: {
      authorId: true,
      kind: true,
      status: true,
      images: true,
      content: true,
      cityScope: true,
      targetBatches: true,
      isHidden: true,
    },
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

  /* Only people NEWLY mentioned: diff this edit's ids against the ids the
   * body already carried, so re-saving a post that still mentions the same
   * person does not tell them again. Skipped for a draft the same way
   * createPost skips it -- nobody but the author can see it, so there is
   * nobody to diff for yet; publishDraft is where a drafted letter's
   * mentions are told, all at once, the day it actually goes out.
   */
  if (post.status === "published") {
    const oldIds = new Set(mentionedUserIds(post.content));
    const newIds = mentionedUserIds(content).filter((id) => !oldIds.has(id));
    await notifyMentioned({
      ids: newIds,
      actorId: session.user.id,
      actorName: session.user.name,
      scope: {
        id: postId,
        authorId: post.authorId,
        cityScope: post.cityScope,
        targetBatches: post.targetBatches,
        isHidden: post.isHidden,
        status: "published",
        kind: post.kind,
      },
      source: isLetter ? "letter" : "post",
    });
  }

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
   * both return it. The two toggles below use the same shape, and so do the
   * Collection's and Catch-ups' loves.
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

  /* The reparenting, the "is this parent even on this post" check and the
     double-submit guard all moved to `lib/comment-thread.ts` in build phase 9,
     when a Catch-up answer got the same thread. Every reason they exist is
     written out there; each one is a live bug that happened once. */
  const written = await writeComment({
    target: { postId: parsed.data.postId },
    authorId: session.user.id,
    content: parsed.data.content,
    parentId: parsed.data.parentId,
  });
  if ("error" in written) return { error: written.error };
  const { comment, repliedToId, twin } = written;

  // Notifications
  const post = await prisma.post.findUnique({
    where: { id: parsed.data.postId },
    select: {
      authorId: true,
      kind: true,
      cityScope: true,
      targetBatches: true,
      isHidden: true,
      status: true,
    },
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
  let repliedToAuthorId: string | null = null;
  if (!twin && repliedToId) {
    const parentComment = await prisma.comment.findUnique({
      where: { id: repliedToId },
      select: { authorId: true },
    });
    repliedToAuthorId = parentComment?.authorId ?? null;
    /* `authorId` is nullable since audit M34: a comment whose author has been
       purged survives as an authorless stub, and there is nobody to tell. */
    if (
      repliedToAuthorId &&
      repliedToAuthorId !== session.user.id &&
      repliedToAuthorId !== post?.authorId
    ) {
      await notifyMember({
        userId: repliedToAuthorId,
        type: "reply",
        message: `${session.user.name} replied to your comment`,
        link: postLink,
      });
    }
  }

  // Mentions inside the comment text itself: the same "notify the tagged
  // member" rule a post/letter body gets, scoped to the post the comment is
  // on -- a comment is never more visible than its own thread. Whoever is
  // already hearing about this exact comment through "commented on your
  // post" or "replied to your comment" above is skipped, so a mention is
  // never a second bell for the same event.
  if (!twin && post) {
    const alsoSkip = [post.authorId, repliedToAuthorId].filter(
      (id): id is string => id !== null
    );
    await notifyMentioned({
      ids: mentionedUserIds(parsed.data.content),
      actorId: session.user.id,
      actorName: session.user.name,
      scope: {
        id: parsed.data.postId,
        authorId: post.authorId,
        cityScope: post.cityScope,
        targetBatches: post.targetBatches,
        isHidden: post.isHidden,
        status: post.status,
        kind: post.kind,
      },
      source: "comment",
      alsoSkip,
    });
  }

  // No revalidatePath: see the note in toggleLike above.
  // The full mapped comment, so the client can slot it into the thread
  // locally: with the thread paginated, "refetch everything" is no longer a
  // cheap way to make a fresh comment appear.
  return {
    success: true,
    commentId: comment.id,
    comment: serializeComment(comment, {
      userId: session.user.id,
      isAdmin: session.user.role === "admin",
    }),
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
}) {
  const session = await auth();
  const empty = { posts: [], hasMore: false, nextCursor: null as string | null };
  if (!session?.user?.id) return empty;

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
  };

  const where = {
    ...baseWhere,
    // ...or you wrote it: the author is not part of their own audience,
    // they are its source, so a post aimed at another batch used to
    // disappear from the feed of the person who wrote it (audit M30).
    // Mirrors the same exemption in decidePostVisibility, which is what
    // decides the single-post case. Both arms live in audienceWhere.
    OR: audience.OR,
  };

  const include = postInclude(session.user.id);

  /* Keyset pagination on the VALUES, not on Prisma's `cursor`. The cursor
     carries (createdAt, id) so the next page is a comparison, and the post
     those values came from being deleted by its author, hidden by a
     moderator, or losing its author to a block no longer ends the scroll
     (audits C-005 / C-124 / C-162 / C-171 -- see keyset.ts for the proof).
     ANDed rather than spread: `where` already carries a top-level OR for the
     batch scope, and a second one would replace it.

     There used to be a second arm here, offset paging for the feed's "Most
     liked" and "Most discussed" sorts. Nothing could reach it: the controls
     that set the sort left the screen on 2026-06-28. The `offset:` guard
     below outlives it on purpose -- a page left open from before this change
     can still hand back an `offset:N` cursor, and it reads as "start again
     from the first page" rather than as a post id. */
  const after = opts?.cursor?.startsWith("offset:") ? null : decodeKeyset(opts?.cursor);
  let rows = await prisma.post.findMany({
    where: after ? { AND: [where, keysetWhere(after, "desc")] } : where,
    include,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: PAGE_SIZE + 1,
  });
  const hasMore = rows.length > PAGE_SIZE;
  if (hasMore) rows = rows.slice(0, PAGE_SIZE);
  const nextCursor = hasMore ? encodeKeyset(rows[rows.length - 1]) : null;

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

/** How many saved posts the Saved tab loads. It is a keepsake shelf rather
 *  than a feed, so it is one page; it now says so when it fills up. */
const SAVED_POSTS_LIMIT = 120;

/**
 * The signed-in member's saved posts (their own bookmarks), most-recently-saved
 * first. Private by construction: it only ever reads the session user's own
 * Bookmark rows, so it can never leak another member's saved list even if the
 * caller lands on someone else's profile.
 */
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

  // Delete-first, and the whole toggle now lives in `lib/comment-thread.ts`:
  // a Catch-up answer's comments carry the same heart, on the same table.
  const { liked, created } = await toggleCommentLikeRow(session.user.id, commentId);
  if (!liked) return { success: true, liked: false };

  if (created) {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { authorId: true, postId: true, post: { select: { kind: true } } },
    });

    /* `postId` is nullable since build phase 9 -- a Catch-up answer's
       comments share this table. This branch cannot meet one:
       `canViewPostOfComment` above answers not-found when there is no post,
       which is how the feed's heart declines a thread that is not its own. */
    if (comment?.authorId && comment.postId && comment.authorId !== session.user.id) {
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
 * One page of a post's thread. The paging, the stub rule and the serialiser
 * all live in `lib/comment-thread.ts` now that a Catch-up answer has a thread
 * too (build phase 9); what stays here is the half that is the FEED's — who
 * is allowed to read this one.
 */
export async function loadComments(
  postId: string,
  opts?: { cursor?: string | null; take?: number }
) {
  // Comments were readable signed-out before; nothing else on the feed is.
  const session = await auth();
  if (!session?.user?.id) return EMPTY_COMMENT_PAGE;

  /* Requiring a session was only half of it. This returned every comment on
     any post id -- content, author name, photo, batch -- for private-group
     and city-scoped posts the caller had no access to. An empty page is the
     right answer, and it is the same answer a post that does not exist gives,
     so this cannot be used to discover which ids are real. */
  const visible = await canViewPost(postId, session.user);
  if (!visible.ok) return EMPTY_COMMENT_PAGE;

  return readCommentPage(
    { postId },
    { userId: session.user.id, isAdmin: session.user.role === "admin" },
    opts
  );
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
