"use client";

import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * A password input with the reveal toggle, in the register /login already
 * uses. Extracted so the reset page cannot drift from it: same 12px field,
 * same 32px reveal button carrying the state layer, same right padding so the
 * text never runs under the eye.
 *
 * `onRevealChange` is what the hoopoe listens to. The bird's wings are driven
 * by whether the password is VISIBLE, not by focus or by typing, so the
 * component reports that one fact and the page decides what the mascot does
 * with it.
 */
export function PasswordField({
  label,
  value,
  onChange,
  onRevealChange,
  placeholder = "At least 8 characters",
  autoComplete = "new-password",
  autoFocus,
  minLength = 8,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onRevealChange?: (revealed: boolean) => void;
  placeholder?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  minLength?: number;
  /** Small line under the field. Used for the strength floor, so the rule is
   *  stated before it is enforced rather than as an error after a failed try. */
  hint?: string;
}) {
  const id = useId();
  const [shown, setShown] = useState(false);

  function toggle() {
    const next = !shown;
    setShown(next);
    onRevealChange?.(next);
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={shown ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          required
          minLength={minLength}
          className="pr-10"
        />
        <button
          type="button"
          onClick={toggle}
          aria-label={shown ? "Hide password" : "Show password"}
          // state-layer, matching /login: an ink darkening alone is easy to
          // miss on a 32px target, and the same class carries the press.
          className="state-layer absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-[color,transform] duration-150 hover:text-foreground active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {shown ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
      </div>
      {hint && <p className="text-[12.5px] leading-snug text-muted-foreground">{hint}</p>}
    </div>
  );
}
