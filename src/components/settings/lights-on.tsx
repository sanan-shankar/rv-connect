"use client";

/* The way BACK to light: one calm page, one button, zero ceremony
 * (owner: "if dark mode is on, we should make it very easy to turn it
 * off"). The asymmetry is the whole joke. */

import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setThemePreference } from "@/components/settings/theme-actions";
import { callAction } from "@/lib/call-action";

export function LightsOn() {
  const router = useRouter();
  const { setTheme } = useTheme();

  async function turnOff() {
    setTheme("light");
    // callAction, and the navigation runs regardless of the result: the
    // theme already flipped client-side above, and a rejected persist here
    // must not also break the "one press" promise by stranding the tap with
    // an unhandled rejection (audit B-042).
    await callAction(() => setThemePreference("light"));
    router.back();
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-[480px] flex-col items-center justify-center gap-5 text-center">
      <h1 className="font-heading text-[28px] leading-tight tracking-[-0.02em] text-foreground">
        Dark mode is on.
      </h1>
      <p className="max-w-[38ch] text-[14.5px] leading-relaxed text-muted-foreground">
        Getting in took five questions, a Wordle and a sleeping bird.
        Getting out is one button.
      </p>
      <Button variant="primary" onClick={turnOff}>
        <Sun className="h-4 w-4" />
        Turn off dark mode
      </Button>
    </div>
  );
}
