export interface TourAutoOfferDecision {
  autoOffer?: boolean;
  pathname: string;
  phase: "idle" | "offering" | "running";
  hasSeenOnboarding: () => boolean;
  hasSettledTour: () => boolean;
}

/** Decide whether the first-feed tour offer may arm. Disabled unless opted in. */
export function shouldAutoOfferTour({
  autoOffer = false,
  pathname,
  phase,
  hasSeenOnboarding,
  hasSettledTour,
}: TourAutoOfferDecision): boolean {
  if (!autoOffer || pathname !== "/feed" || phase !== "idle") return false;
  return hasSeenOnboarding() && !hasSettledTour();
}
