"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TriviaGate } from "@/components/auth/trivia-gate";
import { SignupForm } from "@/components/auth/signup-form";

type Step = "trivia" | "register";

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("trivia");

  return (
    <Card className="w-full max-w-md overflow-visible">
      <CardHeader>
        <Link
          href="/"
          className="mb-2 inline-flex items-center gap-1 rounded-sm text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 transition-colors duration-150"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        {step === "trivia" && (
          <>
            <CardTitle className="font-heading text-2xl">
              First, a quick check...
            </CardTitle>
            <CardDescription>
              Answer this to prove you&apos;re one of us.
            </CardDescription>
          </>
        )}
        {step === "register" && (
          <>
            <CardTitle className="font-heading text-2xl">
              Join the community
            </CardTitle>
            <CardDescription>
              Tell us a bit about yourself so your batchmates can find you.
            </CardDescription>
          </>
        )}
      </CardHeader>
      <CardContent>
        {step === "trivia" && (
          <TriviaGate onPass={() => setStep("register")} />
        )}
        {step === "register" && (
          <SignupForm
            onSuccess={() => {
              router.push("/feed");
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}
