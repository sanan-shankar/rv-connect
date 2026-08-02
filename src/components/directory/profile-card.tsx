import Link from "next/link";
import { MapPin, Briefcase } from "lucide-react";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { VerifiedMark } from "@/components/common/verified-mark";
import { batchLine } from "@/lib/utils";
import { shortPlaceLabel } from "@/lib/normalize";

interface ProfileCardProps {
  user: {
    id: string;
    name: string;
    avatarColor: string | null;
    photoUrl?: string | null;
    birdOverride?: string | null;
    accountType?: string | null;
    verifyState?: string | null;
    batchType: string | null;
    batchYear: number | null;
    currentCity: string | null;
    jobTitle: string | null;
  };
}

export function ProfileCard({ user }: ProfileCardProps) {
  return (
    // The ring goes on the Link (the focusable node) at the card's own radius,
    // so keyboard focus outlines the card and not a shrink-wrapped inline box.
    // It had no focus-visible style at all.
    <Link
      href={`/profile/${user.id}`}
      className="group block rounded-[var(--radius)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {/* state-layer sits on the card face, which is the thing with the surface
          and the radius. Hover used to be a 1px border tint plus a name
          underline, and there was no press state at all; the layer carries
          both. */}
      <div className="card-elevated flex h-full flex-col items-center rounded-[var(--radius)] border border-border bg-card p-5 text-center transition-colors duration-200 state-layer group-hover:border-canopy/40">
        <BirdAvatar
          user={{ id: user.id, name: user.name, photoUrl: user.photoUrl, birdOverride: user.birdOverride }}
          size="md"
        />
        <h3 className="mt-3 flex items-center gap-1 font-semibold tracking-tight text-foreground group-hover:underline">
          {user.name}
          <VerifiedMark user={user} />
        </h3>
        <p className="mt-0.5 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
          {batchLine(user)}
        </p>
        {(user.currentCity || user.jobTitle) && (
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {user.currentCity && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {shortPlaceLabel(user.currentCity)}
              </span>
            )}
            {user.jobTitle && (
              <span className="flex items-center gap-1">
                <Briefcase className="h-3 w-3" />
                {user.jobTitle}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
