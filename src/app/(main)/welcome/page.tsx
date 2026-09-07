import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CelebrationSignals } from "@/components/mascot/moments/celebration-signals";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import type { OnboardingStepId } from "@/components/onboarding/types";
import { safeNextPath } from "@/lib/next-path";
import { IDENTITY_SELECT } from "@/lib/people-select";
import { parseHouseYearEntries } from "@/lib/house-spans";

export const metadata: Metadata = {
  title: "Welcome",
};

// Route name: /welcome, not /onboarding. It was named around an unrelated
// "complete your profile" page that used to sit at (auth)/onboarding, whose
// URL could not be reused at the time; that file has since been deleted, so
// the collision this name avoided no longer exists. The name stays because
// it is the linked destination post-registration hands off to.
const STEP_IDS: OnboardingStepId[] = ["welcome", "register", "houses", "photo", "done"];

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string; next?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      ...IDENTITY_SELECT,
      accountType: true,
      admissionNumber: true,
      subjects: true,
      workplace: true,
      jobTitle: true,
      yearJoined: true,
      yearLeft: true,
      houses: true,
      places: {
        orderBy: { position: "asc" },
        select: { placeId: true, label: true, city: true, lat: true, lng: true },
      },
    },
  });
  if (!user) redirect("/login");

  const { step: stepParam, next: nextParam } = await searchParams;
  // Carried here from /signup so an invite link survives the whole
  // signup -> onboarding detour. Validated, never used raw.
  const next = safeNextPath(nextParam);
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

  // The post-signup welcome hoopoe (mascot-moments board) plays on this
  // route instead of /feed, the moment a fresh account gets here, but only
  // once the wizard reaches its "done" step (OnboardingFlow decides when
  // this actually mounts, see its own file comment). One-shot latched
  // (one-shot.ts) so it can only ever fire once per account no matter
  // which page mounts it; /feed keeps its own mount for the other
  // celebrations (first Letter, proud moments), which are unrelated to
  // onboarding, and doubles as the fallback for anyone who "Finish later"s
  // out of the wizard before reaching Done.
  const celebration = <CelebrationSignals userId={session.user.id} />;

  return (
    <OnboardingFlow
      next={next}
      user={{
        id: user.id,
        name: user.name,
        photoUrl: user.photoUrl,
        birdOverride: user.birdOverride,
        accountType: user.accountType,
        admissionNumber: user.admissionNumber,
        subjects: user.subjects,
        places: user.places,
        workplace: user.workplace,
        jobTitle: user.jobTitle,
        yearJoined: user.yearJoined,
        yearLeft: user.yearLeft,
        /* The houses step used to read this column itself, from a mount
           effect, through a server action, behind a two-bar skeleton -- a
           second round trip to the same row the line above came from. The
           page re-runs after every server action invoked from it (see the
           guard note above), so this is as fresh as admissionNumber is. */
        houses: parseHouseYearEntries(user.houses),
      }}
      initialStep={requestedStep ?? "welcome"}
      celebration={celebration}
    />
  );
}
