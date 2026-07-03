"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { TriviaGate } from "@/components/auth/trivia-gate";
import { SignupForm } from "@/components/auth/signup-form";
import { Hoopoe } from "@/components/mascot/hoopoe";
import { useHoopoe } from "@/components/mascot/use-hoopoe";
import type { HoopoeApi } from "@/components/mascot/hoopoe-kit";
import { PeaksMark } from "@/components/layout/peaks-mark";
import { SPRINGS } from "@/components/common/motion";

type Step = "trivia" | "register";

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("trivia");

  // ONE hoopoe, hoisted here and handed to both steps, so the same bird greets
  // you, quizzes you (reacting to a right or wrong answer), then watches you
  // fill the form and covers its eyes over your password. It is continuous
  // across the step change because it never unmounts. We split the ref off and
  // pass only the (stable) controller verbs to the steps; the page re-renders
  // only on the step swap, so the forwarded object identity stays steady.
  const { ref: hoopoeRef, ...hoopoe } = useHoopoe();

  function onHoopoeReady(api: HoopoeApi) {
    // a warm wave-and-nod greeting, then it leans in, curious, ready to quiz you
    api.react("greet");
    api.express("curious");
  }

  return (
    // Not a grid: the photo half is viewport-fixed (below), so it must never take part
    // in row-height sizing with the form column. `lg:pl-[...]` reserves the same width
    // the fixed panel occupies, so the form content starts right where the photo ends.
    <div className="min-h-screen lg:pl-[58.3333%]">
      {/* Photo half: the valley, with the brand overlaid (matches /login). Pinned to the
          viewport with `fixed` + `inset-y-0` (not part of the grid row), so its size and
          crop are constant no matter how tall the form column gets when switching between
          Alumnus/Teacher fields, error states, etc. The form column scrolls the page under
          it; the photo never resizes. */}
      <div className="fixed inset-y-0 left-0 hidden w-[58.3333%] overflow-hidden lg:block">
        <Image
          src="/images/landing.jpeg"
          alt=""
          fill
          priority
          className="object-cover"
          sizes="58vw"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#16241a]/55 via-[#16241a]/15 to-transparent" />
        <Link
          href="/"
          className="absolute left-8 top-7 inline-flex items-end gap-2.5 rounded-sm text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          <PeaksMark size={34} />
          <span
            className="font-heading font-bold tracking-tight"
            style={{ fontSize: "41.64px", lineHeight: 1, transform: "translateY(6.25px)" }}
          >
            Rishi Valley
          </span>
        </Link>
      </div>

      {/* Form half: warm panel. The inner content slides in from the right on the
          gentle spring while the photo half stays anchored (lateral pass from the
          landing), the way /login does. The hoopoe sits above the steps and stays
          mounted across the trivia -> register swap; only the step content crossfades. */}
      <div className="flex min-h-screen flex-col bg-background px-6 py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1 self-start rounded-sm text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <motion.div
          className="my-auto w-full max-w-[400px] self-center text-center"
          initial={{ opacity: 0, x: 48 }}
          animate={{ opacity: 1, x: 0 }}
          transition={SPRINGS.gentle}
        >
          <div className="mx-auto mb-1 grid h-[112px] place-items-center">
            <Hoopoe ref={hoopoeRef} size={96} onReady={onHoopoeReady} />
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {step === "trivia" ? (
              <motion.div
                key="trivia"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={SPRINGS.gentle}
              >
                <h1 className="font-heading text-[27px] leading-tight tracking-tight text-foreground">
                  First, a quick check
                </h1>
                <p className="mx-auto mb-6 mt-2 max-w-[32ch] text-sm leading-relaxed text-muted-foreground">
                  Answer this to prove you&apos;re one of us.
                </p>
                <TriviaGate hoopoe={hoopoe} onPass={() => setStep("register")} />
              </motion.div>
            ) : (
              <motion.div
                key="register"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={SPRINGS.gentle}
              >
                <h1 className="font-heading text-[27px] leading-tight tracking-tight text-foreground">
                  Join the community
                </h1>
                <p className="mx-auto mb-6 mt-2 max-w-[34ch] text-sm leading-relaxed text-muted-foreground">
                  Tell us a bit about yourself so your batchmates can find you.
                </p>
                <SignupForm hoopoe={hoopoe} onSuccess={() => router.push("/feed")} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
