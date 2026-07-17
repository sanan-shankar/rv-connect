import Link from "next/link";
import { CalendarDays, GraduationCap, MapPin, Users } from "lucide-react";
import { socialHref, socialIcon, socialDisplay, socialHost, type SocialKind } from "@/lib/social";

/**
 * The persistent profile rail: The record, Find them (socials), and Groups.
 * Rendered in the desktop right rail (sticky, always visible across tabs) and
 * inlined into the About tab on mobile. Server component: interactive states
 * are CSS transform/opacity transitions, no client JS needed here.
 */

export interface RailSocial {
  kind: SocialKind;
  value: string;
}

export interface RailGroup {
  id: string;
  name: string;
  memberCount: number;
}

export interface ProfileRailData {
  rvYears: string | null;
  enteredGrade: number | null;
  cities: string[];
  socials: RailSocial[];
  groups: RailGroup[];
  isOwnProfile: boolean;
}

function RailCard({ title, icon: Icon, action, children }: {
  title: string;
  icon?: typeof Users;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="card-elevated rounded-[var(--radius)] border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <h3 className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.13em] text-muted-foreground">
          {Icon && <Icon className="h-3.5 w-3.5" aria-hidden />}
          {title}
        </h3>
        {action && <span className="ml-auto">{action}</span>}
      </div>
      {children}
    </section>
  );
}

function RecordRow({ icon: Icon, children }: { icon: typeof MapPin; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 py-1 text-[13.5px] leading-snug text-foreground">
      <Icon className="mt-0.5 h-[15px] w-[15px] shrink-0 text-muted-foreground" aria-hidden />
      <span>{children}</span>
    </div>
  );
}

export function ProfileRailCards({ data }: { data: ProfileRailData }) {
  const { rvYears, enteredGrade, cities, socials, groups, isOwnProfile } = data;
  const hasRecord = rvYears || enteredGrade != null || cities.length > 0;

  return (
    <div className="space-y-4">
      {hasRecord && (
        <RailCard title="The record">
          <div className="space-y-0.5">
            {rvYears && <RecordRow icon={CalendarDays}>{rvYears}</RecordRow>}
            {enteredGrade != null && (
              <RecordRow icon={GraduationCap}>Entered in Grade {enteredGrade}</RecordRow>
            )}
            {cities.length > 0 && (
              <RecordRow icon={MapPin}>Based in {cities.join(", ")}</RecordRow>
            )}
          </div>
        </RailCard>
      )}

      {(socials.length > 0 || isOwnProfile) && (
        <RailCard title={isOwnProfile ? "Your links" : "Find them"}>
          {socials.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {socials.map((s) => {
                const Icon = socialIcon(s.kind);
                const host = socialHost(s.kind, s.value);
                return (
                  <a
                    key={s.kind + s.value}
                    href={socialHref(s.kind, s.value)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-mist/60 px-3.5 py-2 text-[13px] font-semibold text-foreground transition-[transform,background-color,border-color] duration-150 hover:-translate-y-0.5 hover:border-cinnamon/40 hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:translate-y-0 active:scale-[0.98]"
                  >
                    <Icon className="h-[15px] w-[15px] shrink-0 text-cinnamon" aria-hidden />
                    <span>{socialDisplay(s.kind, s.value)}</span>
                    {host && <span className="font-normal text-muted-foreground">{host}</span>}
                  </a>
                );
              })}
            </div>
          ) : (
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              You haven&rsquo;t added any links yet.{" "}
              <Link href="/settings" className="font-semibold text-leaf hover:underline">
                Add Instagram or LinkedIn
              </Link>{" "}
              so people can find you.
            </p>
          )}
        </RailCard>
      )}

      {groups.length > 0 && (
        <RailCard
          title="Groups"
          icon={Users}
          action={
            groups.length > 5 ? (
              <Link
                href="/groups"
                className="text-[11px] font-semibold text-canopy transition-colors duration-150 hover:text-canopy/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                See all ({groups.length})
              </Link>
            ) : (
              <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">
                {groups.length}
              </span>
            )
          }
        >
          <div>
            {groups.slice(0, 5).map((g) => (
              <Link
                key={g.id}
                href={`/groups/${g.id}`}
                className="flex items-center border-t border-border py-2 text-[13.5px] font-semibold text-foreground transition-colors duration-150 first:border-t-0 hover:text-leaf focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <span className="min-w-0 truncate">{g.name}</span>
                <span className="ml-auto pl-2 text-[12px] font-semibold text-sky">{g.memberCount}</span>
              </Link>
            ))}
          </div>
        </RailCard>
      )}
    </div>
  );
}
