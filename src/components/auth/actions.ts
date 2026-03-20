"use server";

import { prisma } from "@/lib/prisma";
import { signupSchema } from "@/lib/validators";
import { pickAvatarColor } from "@/lib/utils";

export async function registerUser(formData: FormData) {
  const raw = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    batchType: formData.get("batchType") as string,
    batchYear: Number(formData.get("batchYear")),
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

  // Create the user
  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      batchType: parsed.data.batchType,
      batchYear: parsed.data.batchYear,
      yearJoined: parsed.data.yearJoined ?? null,
      yearLeft: parsed.data.yearLeft ?? null,
      avatarColor: pickAvatarColor(),
    },
  });

  return { success: true, email: parsed.data.email };
}
