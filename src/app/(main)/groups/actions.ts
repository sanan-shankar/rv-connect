"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createGroup(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const memberIds = formData.get("memberIds") as string;

  if (!name || name.length < 2) return { error: "Group name is required" };

  let ids: string[] = [];
  try {
    ids = JSON.parse(memberIds || "[]");
  } catch {
    return { error: "Invalid member list" };
  }

  // Always include the creator
  if (!ids.includes(session.user.id)) {
    ids.push(session.user.id);
  }

  const group = await prisma.group.create({
    data: {
      name,
      description,
      creatorId: session.user.id,
      members: {
        create: ids.map((userId) => ({
          userId,
          role: userId === session.user.id ? "admin" : "member",
        })),
      },
    },
  });

  revalidatePath("/groups");
  return { success: true, groupId: group.id };
}

export async function createGroupPost(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const groupId = formData.get("groupId") as string;
  const content = (formData.get("content") as string)?.trim();
  const images = formData.get("images") as string | null;

  if (!content) return { error: "Post cannot be empty" };
  if (!groupId) return { error: "Group is required" };

  // Verify membership
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: session.user.id } },
  });
  if (!membership) return { error: "You're not a member of this group" };

  await prisma.groupPost.create({
    data: {
      groupId,
      authorId: session.user.id,
      content,
      images: images || null,
    },
  });

  revalidatePath(`/groups/${groupId}`);
  return { success: true };
}

export async function addMembersToGroup(groupId: string, userIds: string[]) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  // Verify the user is a group admin
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: session.user.id } },
  });
  if (!membership || membership.role !== "admin") {
    return { error: "Only group admins can add members" };
  }

  // Add members (skip existing)
  for (const userId of userIds) {
    await prisma.groupMember.upsert({
      where: { groupId_userId: { groupId, userId } },
      create: { groupId, userId },
      update: {},
    });
  }

  revalidatePath(`/groups/${groupId}`);
  return { success: true };
}

export async function leaveGroup(groupId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  await prisma.groupMember.delete({
    where: { groupId_userId: { groupId, userId: session.user.id } },
  }).catch(() => {});

  revalidatePath("/groups");
  return { success: true };
}

export async function deleteGroupPost(postId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const post = await prisma.groupPost.findUnique({
    where: { id: postId },
    include: { group: { include: { members: true } } },
  });

  if (!post) return { error: "Post not found" };

  const isAuthor = post.authorId === session.user.id;
  const isGroupAdmin = post.group.members.some(
    (m) => m.userId === session.user.id && m.role === "admin"
  );

  if (!isAuthor && !isGroupAdmin) return { error: "Not authorized" };

  await prisma.groupPost.delete({ where: { id: postId } });
  revalidatePath(`/groups/${post.groupId}`);
  return { success: true };
}
