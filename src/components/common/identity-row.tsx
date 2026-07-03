import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { BirdAvatar, type AvatarUser } from "@/components/common/bird-avatar";
import { cn } from "@/lib/utils";

type AvatarSize = ComponentProps<typeof BirdAvatar>["size"];

// Edit these two numbers to tune every avatar/name/batch row in one place.
const IDENTITY_STACK_GAP_PX = 5; // Space between the name and batch/time rows.
const IDENTITY_COPY_NUDGE_Y_PX = 0; // Negative moves text up; positive moves it down.

const META_CLASS =
  "text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground";

type IdentityRowProps = {
  user: AvatarUser;
  name: ReactNode;
  meta?: ReactNode;
  avatarHref?: string;
  avatarLabel?: string;
  avatarSize?: AvatarSize;
  className?: string;
  avatarClassName?: string;
  avatarLinkClassName?: string;
  textClassName?: string;
  nameClassName?: string;
  metaClassName?: string;
};

/**
 * Shared geometry for horizontal identity rows. Callers can vary typography and
 * horizontal spacing, but the vertical-centering contract stays here.
 */
export function IdentityRow({
  user,
  name,
  meta,
  avatarHref,
  avatarLabel,
  avatarSize = "sm",
  className,
  avatarClassName,
  avatarLinkClassName,
  textClassName,
  nameClassName,
  metaClassName,
}: IdentityRowProps) {
  const avatar = (
    <BirdAvatar
      user={user}
      size={avatarSize}
      className={avatarClassName}
    />
  );

  return (
    <div className={cn("flex min-w-0 gap-3", className, "items-center")}>
      {avatarHref ? (
        <Link
          href={avatarHref}
          aria-label={avatarLabel ?? user.name ?? "Member profile"}
          className={cn(
            "inline-flex shrink-0 rounded-full transition-opacity duration-150 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:opacity-70",
            avatarLinkClassName
          )}
        >
          {avatar}
        </Link>
      ) : (
        avatar
      )}
      <div
        className={cn("flex min-w-0 flex-col", textClassName, "justify-center")}
        style={{
          gap: IDENTITY_STACK_GAP_PX,
          transform: `translateY(${IDENTITY_COPY_NUDGE_Y_PX}px)`,
        }}
      >
        <div className={cn(nameClassName, "min-w-0 leading-none")}>
          {name}
        </div>
        {meta ? (
          <div className={cn(META_CLASS, metaClassName, "min-w-0 leading-none")}>
            {meta}
          </div>
        ) : null}
      </div>
    </div>
  );
}
