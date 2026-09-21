import { ButtonSkeleton } from "@/components/common/skeleton";
import { COMPOSER_KINDS, kindLabel } from "@/lib/admin-threads";

/**
 * MessageComposer before its page arrives, for the three loading screens that
 * draw one: "Reach out" (a new message), a member's conversation and the
 * admin's (a reply). One placeholder because it is one component, on
 * message-composer.tsx's own measurements.
 *
 * The 36px bird beside the field, except on an admin's reply; the field at
 * the height its placeholder sizes it to (`rows` 3 for a new message, 2 for a
 * reply, which
 * both come to 64px on one line, and a new message's sentence wraps to 67.5
 * on a phone); then the row under it, wrapping where the real one wraps --
 * the three kinds when it is a new message, Screenshot, and the send button
 * as the real Button's box. Chips and buttons are their own boxes with their
 * words invisible, so each is as wide as the control it stands for.
 */
export function MessageComposerSkeleton({
  mode,
  submitLabel,
}: {
  /** MessageComposer's own modes; an admin's reply is sent as the admins and
   *  carries no bird. */
  mode: "new" | "reply" | "admin-reply";
  submitLabel: string;
}) {
  const field = (
    <div className="min-w-0 flex-1">
      <div
        className={
          mode === "new"
            ? "skeleton-warm h-[67.5px] rounded-[var(--radius-input)] sm:h-16"
            : "skeleton-warm h-16 rounded-[var(--radius-input)]"
        }
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {mode === "new" && (
          <div className="flex flex-wrap items-center gap-1.5">
            {COMPOSER_KINDS.map((k) => (
              <span key={k} className={CHIP}>
                <span className="invisible">{kindLabel(k)}</span>
              </span>
            ))}
          </div>
        )}
        <span className={`${CHIP} inline-flex items-center gap-1.5`}>
          <span className="size-3.5" />
          <span className="invisible">Screenshot</span>
        </span>
        <div className="ml-auto flex items-center gap-2.5">
          <ButtonSkeleton size="sm" icon label={submitLabel} />
        </div>
      </div>
    </div>
  );

  if (mode === "admin-reply") return field;
  return (
    <div className="flex gap-3">
      <div className="skeleton-warm mt-0.5 size-9 shrink-0 rounded-full" />
      {field}
    </div>
  );
}

/* The composer's small pills: a kind, and Screenshot. */
const CHIP = "skeleton-warm rounded-full px-3 py-1.5 text-[12.5px] font-medium";
