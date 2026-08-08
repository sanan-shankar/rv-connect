"use client";

import { Button } from "@/components/ui/button";

export default function Error({
  reset,
}: {
  // Next's error boundary always passes `error`; this screen deliberately does
  // not read it. Showing a member a stack digest tells them nothing and looks
  // broken, so the copy below stays generic. Kept in the type, not destructured,
  // so the signature still documents what Next hands in.
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <h1 className="font-heading text-2xl font-bold text-foreground">
        Something went wrong
      </h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        We hit an unexpected error. Please try again. If the problem persists,
        let an admin know.
      </p>
      <Button
        onClick={reset}
        variant="primary"
        className="mt-6"
      >
        Try again
      </Button>
    </div>
  );
}
