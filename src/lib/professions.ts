/**
 * Profession / industry vocabulary. Provisional per the owner ("professions
 * need a defined vocabulary eventually" — backlog item), but this exact list
 * and order is what the onboarding "Industry" select already writes into
 * `User.workplace` (src/app/(auth)/onboarding/page.tsx), so the Directory
 * Profession filter can match on it with plain equality without a schema
 * change. Kept as a single source so onboarding and the filter option list
 * can never drift apart again.
 */
export const PROFESSIONS = [
  "Technology",
  "Finance",
  "Healthcare",
  "Education",
  "Arts & Media",
  "Law",
  "Government",
  "Non-profit",
  "Research",
  "Consulting",
  "Entrepreneurship",
  "Agriculture",
  "Student",
  "Other",
] as const;

