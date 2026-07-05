"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signupSchema } from "@/lib/validators";
import { computeBatchFromSchooling } from "@/lib/utils";
import { hasPassedTrivia } from "./trivia-actions";

export async function registerUser(formData: FormData) {
  // The trivia gate is enforced server-side: a valid signed pass cookie must be
  // present, so the gate cannot be skipped by jumping straight to register.
  if (!(await hasPassedTrivia())) {
    return { error: "Please answer the entry question before signing up." };
  }

  const password = formData.get("password") as string;

  if (!password || password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const accountType = (formData.get("accountType") as string) || "alumnus";
  const isAlum = accountType === "alumnus";
  const num = (key: string) =>
    formData.get(key) ? Number(formData.get(key)) : undefined;
  const raw = {
    firstName: formData.get("firstName") as string,
    lastName: formData.get("lastName") as string,
    email: formData.get("email") as string,
    password,
    accountType,
    // Alumni describe their schooling with three plain facts; the batch is
    // derived below. Teachers send none of these.
    yearJoined: isAlum ? num("yearJoined") : undefined,
    yearLeft: isAlum ? num("yearLeft") : undefined,
    gradeJoined: isAlum ? num("gradeJoined") : undefined,
  };

  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Derive the batch from the three schooling facts (server-side source of
  // truth; the form shows the same computation live). batchType/batchYear are
  // outputs here, never taken verbatim from the form.
  let batchYear: number | null = null;
  let batchType: "ICSE" | "ISC" | null = null;
  if (isAlum) {
    const batch = computeBatchFromSchooling(
      parsed.data.yearJoined!,
      parsed.data.yearLeft!,
      parsed.data.gradeJoined!
    );
    if (!batch.ok) {
      return { error: batch.error };
    }
    batchYear = batch.batchYear;
    batchType = batch.batchType;
  }

  // Check if user already exists
  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (existing) {
    return { error: "An account with this email already exists. Try signing in instead." };
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 12);

  // First name and surname are collected separately but stored as one plain
  // name, joined by a single space. Both halves are already trimmed by the
  // schema, so this cannot produce leading/trailing/double spaces.
  const name = `${parsed.data.firstName} ${parsed.data.lastName}`;

  // Create the user
  const user = await prisma.user.create({
    data: {
      name,
      email: parsed.data.email,
      password: hashedPassword,
      accountType: parsed.data.accountType,
      batchType,
      batchYear,
      yearJoined: parsed.data.yearJoined ?? null,
      yearLeft: parsed.data.yearLeft ?? null,
      gradeJoined: parsed.data.gradeJoined ?? null,
    },
  });

  // Every alumnus is auto-added to their batch group ("Batch of {year}"), which
  // is created on demand by the first person from that batch to join. No manual
  // joining. Teachers have no batch and skip this. A failure here must not sink
  // an otherwise-successful registration, so it is best-effort.
  if (isAlum && batchYear != null) {
    try {
      await joinBatchGroup(user.id, batchYear);
    } catch (err) {
      console.error("Batch group auto-join failed", err);
    }
  }

  return { success: true, email: parsed.data.email };
}

/**
 * Find-or-create the "Batch of {year}" group and add the user as a member.
 * Idempotent on membership via the GroupMember (groupId, userId) unique
 * constraint, so re-running is safe.
 */
async function joinBatchGroup(userId: string, batchYear: number) {
  const name = `Batch of ${batchYear}`;

  // Group.name is not unique in the schema, so match by exact name. The first
  // person from a batch creates the group (they become its creator only to
  // satisfy the required FK; everyone joins as a plain member since a batch
  // group has no keeper).
  let group = await prisma.group.findFirst({
    where: { name },
    select: { id: true },
  });

  if (!group) {
    group = await prisma.group.create({
      data: {
        name,
        description: `Everyone from the batch of ${batchYear}.`,
        visibility: "public",
        creatorId: userId,
      },
      select: { id: true },
    });
  }

  await prisma.groupMember.upsert({
    where: { groupId_userId: { groupId: group.id, userId } },
    create: { groupId: group.id, userId, role: "member" },
    update: {},
  });
}
