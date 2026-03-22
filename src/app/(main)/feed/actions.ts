"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { postSchema, commentSchema } from "@/lib/validators";
import { revalidatePath } from "next/cache";
import { del } from "@vercel/blob";
import { unlink } from "fs/promises";
import path from "path";

const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;

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
    tag: (formData.get("tag") as string) || undefined,
    targetBatches: (formData.get("targetBatches") as string) || undefined,
    images: (formData.get("images") as string) || undefined,
    pollOptions,
  };

  const parsed = postSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const post = await prisma.post.create({
    data: {
      authorId: session.user.id,
      content: parsed.data.content,
      tag: parsed.data.tag || null,
      targetBatches: parsed.data.targetBatches || null,
      images: parsed.data.images || null,
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

  revalidatePath("/feed");
  return { success: true };
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
    select: { authorId: true, images: true },
  });

  if (!post) return { error: "Post not found" };
  if (post.authorId !== session.user.id && session.user.role !== "admin") {
    return { error: "Not authorized" };
  }

  // Delete image files
  if (post.images) {
    try {
      const images = JSON.parse(post.images) as string[];
      for (const img of images) {
        if (useBlob && img.startsWith("http")) {
          await del(img).catch(() => {});
        } else {
          const filepath = path.join(process.cwd(), "public", img);
          await unlink(filepath).catch(() => {});
        }
      }
    } catch {
      // ignore parse errors
    }
  }

  await prisma.post.delete({ where: { id: postId } });
  revalidatePath("/feed");
  return { success: true };
}

export async function editPost(postId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorId: true },
  });

  if (!post) return { error: "Post not found" };
  if (post.authorId !== session.user.id) return { error: "Not authorized" };

  const content = formData.get("content") as string;
  const tag = formData.get("tag") as string;

  if (!content || content.length > 5000) {
    return { error: "Content must be between 1 and 5000 characters" };
  }

  await prisma.post.update({
    where: { id: postId },
    data: {
      content,
      tag: tag || null,
    },
  });

  revalidatePath("/feed");
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

  revalidatePath("/feed");
  return { success: true, liked: !existing };
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

export async function loadPosts(opts?: {
  page?: number;
  tag?: string;
  search?: string;
  sortBy?: "recent" | "liked" | "commented";
  timeFilter?: "all" | "today" | "week" | "month" | "year";
}) {
  const session = await auth();
  if (!session?.user?.id) return { posts: [], hasMore: false };

  const page = opts?.page ?? 0;
  const sortBy = opts?.sortBy ?? "recent";
  const timeFilter = opts?.timeFilter ?? "all";
  const userBatch = `${session.user.batchType}-${session.user.batchYear}`;

  const timeDate = getTimeFilterDate(timeFilter);

  const where = {
    isHidden: false,
    ...(opts?.tag ? { tag: opts.tag } : {}),
    ...(opts?.search ? { content: { contains: opts.search } } : {}),
    ...(timeDate ? { createdAt: { gte: timeDate } } : {}),
    OR: [
      { targetBatches: null },
      { targetBatches: "" },
      { targetBatches: { contains: userBatch } },
    ],
  };

  type PostOrderBy =
    | { createdAt: "desc" }
    | { likes: { _count: "desc" } }
    | { comments: { _count: "desc" } };

  let orderBy: PostOrderBy;
  switch (sortBy) {
    case "liked":
      orderBy = { likes: { _count: "desc" as const } };
      break;
    case "commented":
      orderBy = { comments: { _count: "desc" as const } };
      break;
    default:
      orderBy = { createdAt: "desc" as const };
  }

  const posts = await prisma.post.findMany({
    where,
    include: {
      author: {
        select: {
          id: true,
          name: true,
          avatarColor: true,
          batchType: true,
          batchYear: true,
        },
      },
      _count: {
        select: {
          comments: true,
          likes: true,
        },
      },
      likes: {
        where: { userId: session.user.id },
        select: { id: true },
      },
      pollOptions: {
        orderBy: { position: "asc" },
        include: {
          _count: { select: { votes: true } },
        },
      },
      pollVotes: {
        where: { userId: session.user.id },
        select: { pollOptionId: true },
      },
    },
    orderBy,
    take: 21,
    skip: page * 20,
  });

  const hasMore = posts.length > 20;
  const trimmed = hasMore ? posts.slice(0, 20) : posts;

  return {
    posts: trimmed.map((p) => ({
      id: p.id,
      content: p.content,
      tag: p.tag,
      images: p.images,
      createdAt: p.createdAt.toISOString(),
      author: p.author,
      commentCount: p._count.comments,
      likeCount: p._count.likes,
      liked: p.likes.length > 0,
      isOwn: p.authorId === session.user.id,
      poll:
        p.pollOptions.length > 0
          ? {
              options: p.pollOptions.map((o) => ({
                id: o.id,
                text: o.text,
                voteCount: o._count.votes,
              })),
              totalVotes: p.pollOptions.reduce(
                (sum, o) => sum + o._count.votes,
                0
              ),
              userVotedOptionId: p.pollVotes[0]?.pollOptionId ?? null,
            }
          : null,
    })),
    hasMore,
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

  revalidatePath("/feed");
  return { success: true, liked: !existing };
}

export async function loadComments(postId: string) {
  const session = await auth();
  const userId = session?.user?.id;

  const comments = await prisma.comment.findMany({
    where: { postId },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          avatarColor: true,
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
  }));
}
