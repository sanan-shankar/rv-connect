"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { postSchema, commentSchema } from "@/lib/validators";
import { revalidatePath } from "next/cache";
import { delImage } from "@/lib/storage";
import { getViewerCities, cityScopeWhere } from "@/lib/city-scope";
import { notifyAdminNote } from "@/lib/admin-note";

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
    tag: (formData.get("tag") as string) || undefined,
    targetBatches: (formData.get("targetBatches") as string) || undefined,
    groupId: (formData.get("groupId") as string) || undefined,
    images: (formData.get("images") as string) || undefined,
    pollOptions,
    cityScope: (formData.get("cityScope") as string) || undefined,
  };

  const parsed = postSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const groupId = parsed.data.groupId || null;

  // Posting into a group requires membership; group posts ignore batch targeting.
  if (groupId) {
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: session.user.id } },
    });
    if (!membership) return { error: "You're not a member of this group" };
  }

  // City-scope audience control: only allowed to a city the poster themself has
  // listed (an own UserPlace), matched case-insensitively; anything else is
  // silently ignored rather than trusted, so a tampered form field can't scope
  // a post to an arbitrary city. Group posts never get a cityScope, same as
  // tag/targetBatches above.
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

  const post = await prisma.post.create({
    data: {
      authorId: session.user.id,
      kind: parsed.data.kind || "post",
      title: parsed.data.kind === "letter" ? parsed.data.title || null : null,
      content: parsed.data.content,
      tag: groupId ? null : parsed.data.tag || null,
      targetBatches: groupId ? null : parsed.data.targetBatches || null,
      groupId,
      images: parsed.data.images || null,
      cityScope,
    },
  });

  // Create poll options if present
  if (parsed.data.pollOptions && parsed.data.pollOptions.length >= 2) {
    for (let i = 0; i < parsed.data.pollOptions.length; i++) {
      await prisma.pollOption.create({
        data: {
          postId: post.id,
          text: parsed.data.pollOptions[i].trim(),
          position: i,
        },
      });
    }
  }

  revalidatePath(groupId ? `/groups/${groupId}` : "/feed");
  if (parsed.data.kind === "letter") revalidatePath("/letters");
  return { success: true, postId: post.id };
}

export async function votePoll(postId: string, optionId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  // Verify option belongs to post
  const option = await prisma.pollOption.findUnique({
    where: { id: optionId },
    select: { postId: true },
  });

  if (!option || option.postId !== postId) {
    return { error: "Invalid poll option" };
  }

  // Check for existing vote on this post
  const existing = await prisma.pollVote.findUnique({
    where: {
      userId_postId: {
        userId: session.user.id,
        postId,
      },
    },
  });

  if (existing) {
    // Switch vote
    await prisma.pollVote.update({
      where: { id: existing.id },
      data: { pollOptionId: optionId },
    });
  } else {
    await prisma.pollVote.create({
      data: {
        pollOptionId: optionId,
        userId: session.user.id,
        postId,
      },
    });
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
  if (post.images) {
    try {
      const images = JSON.parse(post.images) as string[];
      for (const img of images) {
        await delImage(img);
      }
    } catch {
      // ignore parse errors
    }
  }

  await prisma.post.delete({ where: { id: postId } });
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

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorId: true, kind: true, groupId: true },
  });

  if (!post) return { error: "Post not found" };
  if (post.authorId !== session.user.id) return { error: "Not authorized" };

  const content = formData.get("content") as string;
  const tag = formData.get("tag") as string;
  const title = formData.get("title") as string;
  const isLetter = post.kind === "letter";
  const cap = isLetter ? 20000 : 5000;

  if (!content || content.length > cap) {
    return { error: `Content must be between 1 and ${cap} characters` };
  }
  if (title && title.length > 160) {
    return { error: "Title must be 160 characters or fewer" };
  }

  await prisma.post.update({
    where: { id: postId },
    data: {
      content,
      // Tags are post-only; a letter keeps its title and ignores tags.
      ...(isLetter ? { title: title?.trim() || null } : { tag: tag || null }),
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

  const existing = await prisma.like.findUnique({
    where: {
      userId_postId: {
        userId: session.user.id,
        postId,
      },
    },
  });

  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
  } else {
    await prisma.like.create({
      data: {
        userId: session.user.id,
        postId,
      },
    });

    // Create notification for post author
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true },
    });

    if (post && post.authorId !== session.user.id) {
      await prisma.notification.create({
        data: {
          userId: post.authorId,
          type: "like",
          message: `${session.user.name} liked your post`,
          link: `/feed#${postId}`,
        },
      });
    }
  }

  // No revalidatePath here (deliberately): PostCard already applies the like/count change
  // optimistically on the client, so nothing here needs freshly-rendered server markup. A
  // revalidatePath forces Next to refresh the current route's server tree right after this
  // action resolves, and that refresh was landing as an occasional scroll-to-top on the heart
  // click (root cause of the "heart scroll-jump" bug). Comment likes had the same call and the
  // same symptom; see toggleCommentLike below.
  return { success: true, liked: !existing };
}

export async function toggleBookmark(postId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const existing = await prisma.bookmark.findUnique({
    where: { userId_postId: { userId: session.user.id, postId } },
    select: { id: true },
  });

  if (existing) {
    await prisma.bookmark.delete({ where: { id: existing.id } });
  } else {
    await prisma.bookmark.create({
      data: { userId: session.user.id, postId },
    });
  }

  return { success: true, bookmarked: !existing };
}

// ─── Comments ────────────────────────────────────────

export async function createComment(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const raw = {
    content: formData.get("content") as string,
    postId: formData.get("postId") as string,
    parentId: (formData.get("parentId") as string) || undefined,
  };

  const parsed = commentSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // If replying to a reply, redirect to the parent comment (enforce 1-level depth)
  let parentId = parsed.data.parentId || null;
  if (parentId) {
    const parent = await prisma.comment.findUnique({
      where: { id: parentId },
      select: { parentId: true },
    });
    if (parent?.parentId) {
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
  });

  // Notifications
  const post = await prisma.post.findUnique({
    where: { id: parsed.data.postId },
    select: { authorId: true },
  });

  // Notify post author about comment
  if (post && post.authorId !== session.user.id) {
    await prisma.notification.create({
      data: {
        userId: post.authorId,
        type: "comment",
        message: `${session.user.name} commented on your post`,
        link: `/feed#${parsed.data.postId}`,
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
          link: `/feed#${parsed.data.postId}`,
        },
      });
    }
  }

  revalidatePath("/feed");
  return { success: true, commentId: comment.id };
}

export async function deleteComment(commentId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { authorId: true },
  });

  if (!comment) return { error: "Comment not found" };
  if (comment.authorId !== session.user.id && session.user.role !== "admin") {
    return { error: "Not authorized" };
  }

  await prisma.comment.delete({ where: { id: commentId } });
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

function getTimeFilterDate(
  filter: "all" | "today" | "week" | "month" | "year"
): Date | null {
  if (filter === "all") return null;
  const now = new Date();
  switch (filter) {
    case "today":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case "week": {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      d.setDate(d.getDate() - d.getDay()); // start of week (Sunday)
      return d;
    }
    case "month":
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case "year":
      return new Date(now.getFullYear(), 0, 1);
  }
}

const PAGE_SIZE = 20;

export async function loadPosts(opts?: {
  cursor?: string | null; // opaque: a post id (keyset) or "offset:N"
  groupId?: string; // set => load this group's feed; unset => main feed
  authorId?: string; // set => only this author's posts (profile Posts tab)
  kind?: "post" | "letter";
  tag?: string;
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
  const userBatch = `${session.user.batchType}-${session.user.batchYear}`;
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
    // Matches title (letters) or content, case-insensitive on Postgres.
    andConditions.push({
      OR: [
        { title: { contains: opts.search, ...searchInsensitive } },
        { content: { contains: opts.search, ...searchInsensitive } },
      ],
    });
  }
  if (!isAdmin) andConditions.push(cityScopeWhere(viewerCities));

  const baseWhere = {
    isHidden: false,
    ...(opts?.authorId ? { authorId: opts.authorId } : {}),
    ...(opts?.tag ? { tag: opts.tag } : {}),
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
          { targetBatches: null },
          { targetBatches: "" },
          { targetBatches: { contains: userBatch } },
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
    _count: { select: { comments: { where: { isHidden: false } }, likes: true } },
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
    const offset = opts?.cursor?.startsWith("offset:")
      ? parseInt(opts.cursor.slice(7), 10) || 0
      : 0;
    const orderBy =
      sortBy === "liked"
        ? { likes: { _count: "desc" as const } }
        : { comments: { _count: "desc" as const } };
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
      tag: p.tag,
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
          _count: { select: { comments: { where: { isHidden: false } }, likes: true } },
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
      tag: p.tag,
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

  const existing = await prisma.commentLike.findUnique({
    where: {
      userId_commentId: {
        userId: session.user.id,
        commentId,
      },
    },
  });

  if (existing) {
    await prisma.commentLike.delete({ where: { id: existing.id } });
  } else {
    await prisma.commentLike.create({
      data: {
        userId: session.user.id,
        commentId,
      },
    });

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { authorId: true, postId: true },
    });

    if (comment && comment.authorId !== session.user.id) {
      await prisma.notification.create({
        data: {
          userId: comment.authorId,
          type: "like",
          message: `${session.user.name} liked your comment`,
          link: `/feed#${comment.postId}`,
        },
      });
    }
  }

  // No revalidatePath (see the matching note in toggleLike above): CommentItem already
  // applies the like/count change optimistically, and this call was the other half of the
  // heart scroll-jump bug (the post-action refresh occasionally reset scroll to the top).
  return { success: true, liked: !existing };
}

export async function loadComments(postId: string) {
  const session = await auth();
  const userId = session?.user?.id;
  const viewerIsAdmin = session?.user?.role === "admin";

  const comments = await prisma.comment.findMany({
    where: { postId, isHidden: false },
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
      _count: {
        select: { commentLikes: true },
      },
      ...(userId
        ? {
            commentLikes: {
              where: { userId },
              select: { id: true },
            },
          }
        : {}),
    },
    orderBy: { createdAt: "asc" },
  });

  return comments.map((c) => ({
    id: c.id,
    content: c.content,
    parentId: c.parentId,
    createdAt: c.createdAt.toISOString(),
    author: c.author,
    likeCount: c._count.commentLikes,
    liked: "commentLikes" in c ? (c.commentLikes as unknown[]).length > 0 : false,
    viewerIsAdmin,
  }));
}
