import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { SettingsForm } from "@/components/settings/settings-form";
import { Button } from "@/components/ui/button";

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
      birdOverride: true,
      about: true,
      displayEmail: true,
      houses: true,
      workplace: true,
      jobTitle: true,
      phone: true,
      // NOTE: the "phones" column only exists after
      // prisma/migrations-manual/2026-07-30-phones.sql has been run; until
      // then this select 500s at runtime even though tsc is happy.
      phones: true,
      instagram: true,
      linkedin: true,
      facebook: true,
      links: true,
      batchYear: true,
      yearJoined: true,
      yearLeft: true,
      admissionNumber: true,
      // NOTE: the "theme" column only exists after
      // prisma/migrations-manual/2026-07-30-theme.sql has been run; until
      // then this select 500s at runtime even though tsc is happy.
      theme: true,
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

      {/* Appearance lives OUTSIDE the profile form: a theme choice is not a
          profile field and must not ride the form's dirty/save cycle. Turning
          dark ON is a whole ceremony (the gauntlet route); turning it OFF is
          the same route, one button. */}
      <section>
        <h2 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Appearance
        </h2>
        <div className="card-elevated flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-card px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[13.5px] font-medium text-foreground">
              {user.theme === "dark" ? "Dark mode is on" : "Dark mode"}
            </p>
            <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
              {user.theme === "dark"
                ? "You made it through the questions. Turning it off is one press."
                : "Experimental. Turning it on involves some questions."}
            </p>
          </div>
          {/* Button's `render` swaps its element for the Link; buttonVariants
              is client-only and cannot be CALLED from this server component. */}
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/settings/dark-mode" />}>
            {user.theme === "dark" ? "Turn it off" : "Explore the dark"}
          </Button>
        </div>
      </section>
    </div>
  );
}
