import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SettingsForm } from "@/components/settings/settings-form";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      photoUrl: true,
      coverPhoto: true,
      avatarColor: true,
      bio: true,
      currentCity: true,
      workplace: true,
      jobTitle: true,
      phone: true,
      instagram: true,
      linkedin: true,
      batchYear: true,
      yearJoined: true,
      yearLeft: true,
      gradeJoined: true,
      admissionNumber: true,
      updatedAt: true,
    },
  });

  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-heading text-3xl font-bold text-foreground">
        Settings
      </h1>
      {/* Keyed by updatedAt so the form fully remounts (re-initializing its
          uncontrolled defaultValue fields) whenever the saved data actually
          changes, instead of re-rendering the same instance with stale
          uncontrolled field state. */}
      <SettingsForm key={user.updatedAt.toISOString()} user={user} />
    </div>
  );
}
