import { ChipSkeleton } from "@/components/admin/admin-skeleton";
import { IdentityRowSkeleton } from "@/components/common/identity-row";
import { ButtonSkeleton } from "@/components/common/skeleton";

/* One conversation (thread-view.tsx): the back link; the kind's chip over
   the subject's 24px line; the member's row with "Their record" opposite;
   then the card holding the messages and the reply under its hairline. */
export default function AdminThreadLoading() {
  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div className="flex h-[19.5px] items-center">
        <div className="skeleton-warm h-2.5 w-[88px] rounded-md" />
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5">
          <ChipSkeleton label="Something else" />
        </div>
        <div className="flex h-[30px] items-center">
          <div className="skeleton-warm h-5 w-72 max-w-full rounded-md" />
        </div>
        <div className="flex items-center justify-between gap-2 rounded-[var(--radius)] border border-border bg-card p-3.5">
          <IdentityRowSkeleton nameSize={13.5} metaSize={12.5} nameWidth="w-28" metaWidth="w-48" />
          <ButtonSkeleton size="xs" icon label="Their record" />
        </div>
      </div>
      <div className="rounded-[var(--radius)] border border-border bg-card p-4">
        {/* The opening note, centred at 13.5px on 1.65: one line from sm,
            two on a phone. */}
        <div className="flex justify-center">
          <div className="skeleton-warm h-[68.6px] w-72 max-w-full rounded-[var(--radius)] sm:h-[46.3px]" />
        </div>
        <div className="mt-5 border-t border-border pt-4">
          {/* The reply is written as the admins, so it carries no bird. */}
          <div className="skeleton-warm h-16 rounded-[var(--radius-input)]" />
          <div className="mt-3 flex items-center gap-2">
            <div className="skeleton-warm h-[31px] w-[103px] rounded-full" />
            <div className="ml-auto">
              <ButtonSkeleton size="sm" icon label="Reply" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
