import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CelebrationSignals } from "@/components/mascot/moments/celebration-signals";
import { OnboardingFlow, type OnboardingStepId } from "@/components/onboarding/onboarding-flow";

export const metadata: Metadata = {
  title: "Welcome",
};

// Route name: /welcome, not /onboarding. A small, unrelated "complete your
// profile" page already lives at (auth)/onboarding (dead code today — it is
// not linked from anywhere post-registration hands off to this route
// instead — but its URL cannot be reused without deleting someone else's
// file, which is out of scope here). /welcome is this task's own suggested
// fallback name for exactly this situation.
const STEP_IDS: OnboardingStepId[] = ["welcome", "register", "houses", "photo", "done"];

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      photoUrl: true,
      avatarColor: true,
      admissionNumber: true,
      workplace: true,
      jobTitle: true,
      yearJoined: true,
      yearLeft: true,
      places: {
        orderBy: { position: "asc" },
        select: { placeId: true, label: true, city: true, lat: true, lng: true },
      },
    },
  });
  if (!user) redirect("/login");

  const { step: stepParam } = await searchParams;
  const requestedStep = STEP_IDS.includes(stepParam as OnboardingStepId)
    ? (stepParam as OnboardingStepId)
    : null;

  // Guard: "have they finished (or explicitly bailed on) onboarding" is
  // derived from data, not a schema column — admissionNumber is only ever
  // set via the onboarding "register" step or /settings, so a fresh signup
  // always has it null. IMPORTANT: this can only be decided client-side, in
  // OnboardingFlow's once-per-mount effect, NOT here with a server redirect().
  // Next.js re-runs this Server Component (refetching fresh data, admission
  // number included) after every server action invoked from this page —
  // that is exactly what the register step does. A redirect() here would
  // therefore fire the INSTANT someone saves their admission number, bouncing
  // them to /feed mid-wizard before Houses/Photo/Done ever show. The client
  // component captures admissionNumber once at its true first mount and never
  // re-checks it, so a later data refresh from its own actions cannot retrigger
  // this decision. See onboarding-flow.tsx for the actual guard.
  return (
    <>
      {/* The post-signup welcome hoopoe (mascot-moments board) now plays HERE,
          the moment a fresh account lands on its first page, instead of on
          /feed. One-shot latched (one-shot.ts) so it can only ever fire once
          per account no matter which page mounts this; /feed keeps its own
          mount for the other celebrations (first Letter, proud moments),
          which are unrelated to onboarding. */}
      <CelebrationSignals userId={session.user.id} />
      <OnboardingFlow
        user={{
          id: user.id,
          name: user.name,
          photoUrl: user.photoUrl,
          avatarColor: user.avatarColor,
          admissionNumber: user.admissionNumber,
          places: user.places,
          workplace: user.workplace,
          jobTitle: user.jobTitle,
          yearJoined: user.yearJoined,
          yearLeft: user.yearLeft,
        }}
        initialStep={requestedStep ?? "welcome"}
      />
    </>
  );
}
