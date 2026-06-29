"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signupSchema } from "@/lib/validators";
import { pickAvatarColor } from "@/lib/utils";
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
  const raw = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    password,
    accountType,
    batchType: isAlum ? (formData.get("batchType") as string) || undefined : undefined,
    batchYear: isAlum && formData.get("batchYear")
      ? Number(formData.get("batchYear"))
      : undefined,
    yearJoined: formData.get("yearJoined")
      ? Number(formData.get("yearJoined"))
      : undefined,
    yearLeft: formData.get("yearLeft")
      ? Number(formData.get("yearLeft"))
      : undefined,
  };

  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
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

  // Create the user
  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      password: hashedPassword,
      accountType: parsed.data.accountType,
      batchType: parsed.data.batchType ?? null,
      batchYear: parsed.data.batchYear ?? null,
      yearJoined: parsed.data.yearJoined ?? null,
      yearLeft: parsed.data.yearLeft ?? null,
      avatarColor: pickAvatarColor(),
    },
  });

  return { success: true, email: parsed.data.email };
}
