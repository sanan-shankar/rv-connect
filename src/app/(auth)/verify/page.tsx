import { Mail } from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function VerifyPage() {
  return (
    <Card className="w-full max-w-md text-center">
      <CardHeader>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-leaf/10">
          <Mail className="h-8 w-8 text-leaf" />
        </div>
        <CardTitle className="font-heading text-2xl">
          Check your email
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-muted-foreground">
          A sign-in link has been sent to your email address. Click the link to
          continue.
        </p>
        <p className="text-sm text-muted-foreground">
          Didn&apos;t receive it? Check your spam folder or{" "}
          <Link href="/login" className="rounded-sm text-leaf underline hover:text-leaf-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
            try again
          </Link>
          .
        </p>
      </CardContent>
    </Card>
  );
}
