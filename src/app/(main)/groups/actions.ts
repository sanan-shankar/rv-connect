"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ─── Create ──────────────────────────────────────────

export async function createGroup(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const coverImage = (formData.get("coverImage") as string)?.trim() || null;
  const visibility =
    (formData.get("visibility") as string) === "private" ? "private" : "public";
  const memberIds = formData.get("memberIds") as string;

  if (!name || name.length < 2) return { error: "Group name is required" };
  if (name.length > 80) return { error: "Group name is too long" };

  let ids: string[] = [];
  try {
    ids = JSON.parse(memberIds || "[]");
  } catch {
    return { error: "Invalid member list" };
  }

  // Always include the creator, who becomes the Keeper (stored as role "admin").
  if (!ids.includes(session.user.id)) {
    ids.push(session.user.id);
  }

  const group = await prisma.group.create({
    data: {
      name,
      description,
      coverImage,
      visibility,
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

// ─── Membership ──────────────────────────────────────

/** Join a PUBLIC group directly. Private groups are invite-only and reject this. */
export async function joinGroup(groupId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { visibility: true },
  });
  if (!group) return { error: "Group not found" };
  if (group.visibility !== "public") {
    return { error: "This group is invite-only" };
  }

  await prisma.groupMember.upsert({
    where: { groupId_userId: { groupId, userId: session.user.id } },
    create: { groupId, userId: session.user.id, role: "member" },
    update: {},
  });

  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);
  return { success: true };
}

export async function leaveGroup(groupId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  await prisma.groupMember
    .delete({
      where: { groupId_userId: { groupId, userId: session.user.id } },
    })
    .catch(() => {});

  revalidatePath("/groups");
  return { success: true };
}

// ─── Invites (by @-mention, surfaced in notifications) ───

/** A Keeper (group admin) invites a person; the invite lands in their bell. */
export async function inviteToGroup(groupId: string, inviteeId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: session.user.id } },
    select: { role: true },
  });
  if (!membership || membership.role !== "admin") {
    return { error: "Only the group Keeper can invite people" };
  }

  if (inviteeId === session.user.id) {
    return { error: "You are already in this group" };
  }

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { name: true },
  });
  if (!group) return { error: "Group not found" };

  // Already a member?
  const already = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: inviteeId } },
    select: { id: true },
  });
  if (already) return { error: "That person is already a member" };

  // Reuse a previous invite row (re-invite resets a declined one to pending).
  await prisma.groupInvite.upsert({
    where: { groupId_inviteeId: { groupId, inviteeId } },
    create: {
      groupId,
      inviterId: session.user.id,
      inviteeId,
      status: "pending",
    },
    update: { status: "pending", inviterId: session.user.id, createdAt: new Date() },
  });

  await prisma.notification.create({
    data: {
      userId: inviteeId,
      type: "group_invite",
      message: `${session.user.name} invited you to join ${group.name}`,
      link: `/groups/${groupId}`,
    },
  });

  revalidatePath(`/groups/${groupId}`);
  return { success: true };
}

/** The invitee accepts or declines. Accepting joins them (works for private groups). */
export async function respondToInvite(
  groupId: string,
  action: "accept" | "decline"
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const invite = await prisma.groupInvite.findUnique({
    where: { groupId_inviteeId: { groupId, inviteeId: session.user.id } },
    select: { id: true, status: true },
  });
  if (!invite) return { error: "No pending invite" };

  if (action === "accept") {
    await prisma.groupMember.upsert({
      where: { groupId_userId: { groupId, userId: session.user.id } },
      create: { groupId, userId: session.user.id, role: "member" },
      update: {},
    });
    await prisma.groupInvite.update({
      where: { id: invite.id },
      data: { status: "accepted" },
    });
  } else {
    await prisma.groupInvite.update({
      where: { id: invite.id },
      data: { status: "declined" },
    });
  }

  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);
  return { success: true };
}
