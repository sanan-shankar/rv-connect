"use client";

import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { FloatField } from "@/components/common/float-field";
import { useDeferredAutofocus } from "@/components/common/use-deferred-autofocus";

/**
 * A password box in the calm-form material: the label floats inside the
 * mist field, the reveal toggle sits in its right edge, and any rule worth
 * stating ("8+ characters") appears as the focus-time hint instead of a
 * permanent grey line. Extracted so the reset page cannot drift from what
 * /login and /signup draw.
 *
 * `onRevealChange` is what the hoopoe listens to. The bird's wings are driven
 * by whether the password is VISIBLE, not by focus or by typing, so the
 * component reports that one fact and the page decides what the mascot does
 * with it.
 *
 * `autoFocus` goes through useDeferredAutofocus: it never forces a layout in
 * the commit, and it only fires on devices with a real pointer - a phone
 * waits for the tap instead of summoning the keyboard (owner, 2026-08-14).
 */
export function PasswordField({
  label,
  value,
  onChange,
  onRevealChange,
  focusHint = "8+ characters",
  autoComplete = "new-password",
  autoFocus,
  minLength = 8,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onRevealChange?: (revealed: boolean) => void;
  /** Shown as the placeholder only while the field is focused and empty. */
  focusHint?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  minLength?: number;
}) {
  const id = useId();
  const [shown, setShown] = useState(false);
  const focusRef = useDeferredAutofocus<HTMLInputElement>();

  function toggle() {
    const next = !shown;
    setShown(next);
    onRevealChange?.(next);
  }

  return (
    <FloatField
      id={id}
      type={shown ? "text" : "password"}
      label={label}
      focusHint={focusHint}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoComplete={autoComplete}
      ref={autoFocus ? focusRef : undefined}
      required
      minLength={minLength}
      trailing={
        <button
          type="button"
          onClick={toggle}
          aria-label={shown ? "Hide password" : "Show password"}
          // state-layer, matching /login: an ink darkening alone is easy to
          // miss on a 32px target, and the same class carries the press.
          className="state-layer grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition-[color,transform] duration-150 hover:text-foreground active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {shown ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
      }
    />
  );
}
