/* The onboarding flow's shared shapes, in a module of their own.
 *
 * They used to live in `onboarding-flow.tsx`, which imports the three steps
 * while all three import a type back from it -- three of the app's five real
 * madge cycles, from `import type` edges that are erased at compile time. They
 * never bit at runtime, but they kept every audit's cycle report noisy, and
 * `welcome/page.tsx` (a server component) had to reach into a client module for
 * a string union. A type has no reason to live in the component that happens to
 * render it. */

import type { PlaceSelection } from "@/components/common/location-picker";

/* The one value in this otherwise type-only module, and it is here for the
   same reason the types are: two unrelated components have to agree on it.
   The flow latches it so a member who bailed out of the wizard is not greeted
   from the top again; the demo bar latches it so a persona who arrives with a
   complete account is never ambushed by a first-run flow. It is a moment key
   for `mascot/moments/one-shot.ts` -- the app's one localStorage latch --
   because "has this ever happened for this member" is exactly what that file
   is, and onboarding used to carry a 28-line copy of it under its own prefix.
   Living beside the step ids keeps it out of either component's chunk. */
export const ONBOARDING_SEEN = "onboardingSeen";

export type OnboardingStepId = "welcome" | "register" | "houses" | "photo" | "done";

export interface OnboardingUser {
  id: string;
  name: string;
  photoUrl: string | null;
  birdOverride: string | null;
  accountType: string; // "alumnus" | "teacher" | "ex_teacher"
  admissionNumber: number | null;
  subjects: string | null;
  places: PlaceSelection[];
  workplace: string | null;
  jobTitle: string | null;
  yearJoined: number | null;
  yearLeft: number | null;
}
