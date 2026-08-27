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

export type OnboardingStepId = "welcome" | "register" | "houses" | "photo" | "done";

export interface OnboardingUser {
  id: string;
  name: string;
  photoUrl: string | null;
  avatarColor: string | null;
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
