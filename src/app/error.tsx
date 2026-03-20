"use client";

import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <h1 className="font-heading text-2xl font-bold text-foreground">
        Something went wrong
      </h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        We hit an unexpected error. Please try again — if the problem persists,
        let an admin know.
      </p>
      <Button
        onClick={reset}
        className="mt-6 bg-leaf text-white hover:bg-leaf-light"
      >
        Try again
      </Button>
    </div>
  );
}
