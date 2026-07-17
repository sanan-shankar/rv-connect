import Link from "next/link";
import { MapPin, Briefcase } from "lucide-react";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { VerifiedMark } from "@/components/common/verified-mark";
import { batchLine } from "@/lib/utils";

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
    <Link href={`/profile/${user.id}`} className="group block">
      <div className="card-elevated flex h-full flex-col items-center rounded-[var(--radius)] border border-border bg-card p-5 text-center transition-transform duration-200 group-hover:-translate-y-0.5">
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
                {user.currentCity}
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
