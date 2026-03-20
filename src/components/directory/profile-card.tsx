import Link from "next/link";
import { MapPin, Briefcase } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { UserAvatar } from "@/components/common/user-avatar";
import { formatBatch } from "@/lib/utils";

interface ProfileCardProps {
  user: {
    id: string;
    name: string;
    avatarColor: string | null;
    batchType: string;
    batchYear: number;
    currentCity: string | null;
    jobTitle: string | null;
  };
}

export function ProfileCard({ user }: ProfileCardProps) {
  return (
    <Link href={`/profile/${user.id}`}>
      <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
        <CardContent className="flex flex-col items-center p-6 text-center">
          <UserAvatar
            name={user.name}
            avatarColor={user.avatarColor}
            size="lg"
          />
          <h3 className="mt-3 font-semibold text-foreground">{user.name}</h3>
          <p className="text-sm text-muted-foreground">
            {formatBatch(user.batchType, user.batchYear)}
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
        </CardContent>
      </Card>
    </Link>
  );
}
