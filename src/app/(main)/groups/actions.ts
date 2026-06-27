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

// Group posts are now regular Posts with a groupId. They are created via
// createPost and removed via deletePost (see feed/actions.ts), so the
// composer, likes, comments, polls, and moderation are all shared.

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
