import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <h1 className="font-heading text-6xl font-bold text-leaf">404</h1>
      <h2 className="mt-4 font-heading text-2xl font-bold text-foreground">
        Page not found
      </h2>
      <p className="mt-2 max-w-md text-muted-foreground">
        Looks like you wandered off the path. This page doesn&apos;t exist — but
        the valley is still waiting for you.
      </p>
      <Link href="/" className="mt-6">
        <Button variant="leaf">
          Back to home
        </Button>
      </Link>
    </div>
  );
}
