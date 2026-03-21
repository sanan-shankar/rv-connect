"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { profileSchema } from "@/lib/validators";
import { revalidatePath } from "next/cache";

export async function updateUserProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const raw = {
    name: formData.get("name") as string,
    bio: (formData.get("bio") as string) || undefined,
    currentCity: (formData.get("currentCity") as string) || undefined,
    workplace: (formData.get("workplace") as string) || undefined,
    jobTitle: (formData.get("jobTitle") as string) || undefined,
    phone: (formData.get("phone") as string) || undefined,
    instagram: (formData.get("instagram") as string) || undefined,
    linkedin: (formData.get("linkedin") as string) || undefined,
    batchType: formData.get("batchType") as string,
    batchYear: Number(formData.get("batchYear")),
    yearJoined: formData.get("yearJoined")
      ? Number(formData.get("yearJoined"))
      : undefined,
    yearLeft: formData.get("yearLeft")
      ? Number(formData.get("yearLeft"))
      : undefined,
    admissionNumber: formData.get("admissionNumber")
      ? Number(formData.get("admissionNumber"))
      : undefined,
  };

  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: parsed.data.name,
      bio: parsed.data.bio || null,
      currentCity: parsed.data.currentCity || null,
      workplace: parsed.data.workplace || null,
      jobTitle: parsed.data.jobTitle || null,
      phone: parsed.data.phone || null,
      instagram: parsed.data.instagram || null,
      linkedin: parsed.data.linkedin || null,
      batchType: parsed.data.batchType,
      batchYear: parsed.data.batchYear,
      yearJoined: parsed.data.yearJoined ?? null,
      yearLeft: parsed.data.yearLeft ?? null,
      admissionNumber: parsed.data.admissionNumber ?? null,
    },
  });

  revalidatePath("/settings");
  revalidatePath(`/profile/${session.user.id}`);
  return { success: true };
}

export async function deleteAccount() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  await prisma.user.delete({
    where: { id: session.user.id },
  });

  return { success: true };
}
