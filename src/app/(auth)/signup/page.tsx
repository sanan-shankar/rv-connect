"use client";

import { useState } from "react";
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
import { MagicLinkSent } from "@/components/auth/magic-link-sent";

type Step = "trivia" | "register" | "sent";

export default function SignupPage() {
  const [step, setStep] = useState<Step>("trivia");
  const [email, setEmail] = useState("");

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <Link
          href="/"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
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
        {step === "sent" && (
          <>
            <CardTitle className="font-heading text-2xl">
              Check your inbox
            </CardTitle>
          </>
        )}
      </CardHeader>
      <CardContent>
        {step === "trivia" && (
          <TriviaGate onPass={() => setStep("register")} />
        )}
        {step === "register" && (
          <SignupForm
            onSuccess={(sentEmail) => {
              setEmail(sentEmail);
              setStep("sent");
            }}
          />
        )}
        {step === "sent" && <MagicLinkSent email={email} />}
      </CardContent>
    </Card>
  );
}
