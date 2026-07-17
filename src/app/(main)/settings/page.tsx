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
      birdOverride: true,
      about: true,
      displayEmail: true,
      houses: true,
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
      places: { orderBy: { position: "asc" }, select: { placeId: true, label: true, city: true, lat: true, lng: true } },
    },
  });

  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-heading text-3xl font-bold text-foreground">
        Your profile
      </h1>
      {/* Keyed by updatedAt so the form fully remounts (re-initializing its
          uncontrolled defaultValue fields) whenever the saved data changes. */}
      <SettingsForm key={user.updatedAt.toISOString()} user={user} />
    </div>
  );
}
