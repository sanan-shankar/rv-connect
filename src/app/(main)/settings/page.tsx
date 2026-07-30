import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
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
      facebook: true,
      links: true,
      batchYear: true,
      yearJoined: true,
      yearLeft: true,
      admissionNumber: true,
      updatedAt: true,
      places: { orderBy: { position: "asc" }, select: { placeId: true, label: true, city: true, lat: true, lng: true } },
    },
  });

  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <PageHeader title="Your profile" />
      {/* Keyed by updatedAt so the form fully remounts (re-initializing its
          uncontrolled defaultValue fields) whenever the saved data changes. */}
      <SettingsForm key={user.updatedAt.toISOString()} user={user} />
    </div>
  );
}
