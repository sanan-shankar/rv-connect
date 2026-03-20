import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SettingsForm } from "@/components/settings/settings-form";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      bio: true,
      currentCity: true,
      workplace: true,
      jobTitle: true,
      phone: true,
      instagram: true,
      linkedin: true,
      batchType: true,
      batchYear: true,
      yearJoined: true,
      yearLeft: true,
    },
  });

  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-heading text-3xl font-bold text-foreground">
        Settings
      </h1>
      <SettingsForm user={user} />
    </div>
  );
}
