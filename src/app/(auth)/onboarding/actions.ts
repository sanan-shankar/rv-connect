"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function updateProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  const data: Record<string, string | null> = {};
  const fields = ["bio", "currentCity", "workplace", "jobTitle", "phone", "instagram", "linkedin"];

  for (const field of fields) {
    const value = formData.get(field) as string | null;
    if (value && value.trim()) {
      data[field] = value.trim();
    }
  }

  if (Object.keys(data).length > 0) {
    await prisma.user.update({
      where: { id: session.user.id },
      data,
    });
  }

  return { success: true };
}
