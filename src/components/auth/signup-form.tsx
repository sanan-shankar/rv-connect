"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AnimatePresence, motion } from "motion/react";
import { SPRINGS } from "@/components/common/motion";
import { computeBatchFromSchooling } from "@/lib/utils";
import type { HoopoeApi } from "@/components/mascot/hoopoe-kit";
import { registerUser } from "./actions";

// keep the gaze sweep bounded to [-1, 1] as the field fills
const gazeFor = (len: number, over: number) =>
  Math.max(-1, Math.min(1, (len / over) * 2 - 1));

export function SignupForm({
  hoopoe,
  onSuccess,
}: {
  hoopoe: HoopoeApi;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [accountType, setAccountType] = useState<"alumnus" | "teacher" | "ex_teacher">("alumnus");
  const isAlum = accountType === "alumnus";
  const [showPw, setShowPw] = useState(false);

  // The three plain schooling facts that place an alumnus in a batch. We keep
  // them controlled so the batch can be previewed live as they are typed.
  const [yearJoined, setYearJoined] = useState("");
  const [yearLeft, setYearLeft] = useState("");
  const [gradeJoined, setGradeJoined] = useState("");

  // Live batch derivation, shown under the fields so the person sees exactly
  // where they will land before they submit. Same function the server uses, so
  // the preview can never disagree with what gets stored.
  const batch = useMemo(() => {
    if (!isAlum || !yearJoined || !yearLeft || !gradeJoined) return null;
    return computeBatchFromSchooling(
      Number(yearJoined),
      Number(yearLeft),
      Number(gradeJoined)
    );
  }, [isAlum, yearJoined, yearLeft, gradeJoined]);

  // The one shared hoopoe (hoisted to the page) covers its eyes while the
  // password is hidden and peeks (following what you type) once revealed.
  const showPwRef = useRef(showPw);
  showPwRef.current = showPw;
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      // arriving from the trivia step: let the panel settle, then tuck the wings
      // over the (hidden) password so it reads as the same bird following you in.
      mounted.current = true;
      const t = setTimeout(() => {
        if (showPwRef.current) hoopoe.peek();
        else hoopoe.coverEyes();
      }, 340);
      return () => clearTimeout(t);
    }
    if (showPw) hoopoe.peek();
    else hoopoe.coverEyes();
  }, [showPw, hoopoe]);

  const ACCOUNT_TYPES = [
    { value: "alumnus", label: "Alumnus" },
    { value: "teacher", label: "Teacher" },
    { value: "ex_teacher", label: "Former teacher" },
  ] as const;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);

    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      hoopoe.react("error");
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      hoopoe.react("error");
      setLoading(false);
      return;
    }

    if (isAlum) {
      const b = computeBatchFromSchooling(
        Number(yearJoined),
        Number(yearLeft),
        Number(gradeJoined)
      );
      if (!b.ok) {
        setError(b.error);
        hoopoe.react("error");
        setLoading(false);
        return;
      }
    }

    try {
      const result = await registerUser(formData);
      if (result.error) {
        setError(result.error);
        hoopoe.react("error");
      } else {
        // User created — sign in with credentials directly
        const email = formData.get("email") as string;
        const signInResult = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (signInResult?.error) {
          setError("Account created but sign in failed. Please log in manually.");
          hoopoe.react("error");
        } else {
          // a proper celebration before we hand off to the feed
          hoopoe.peek();
          hoopoe.react("success");
          toast.success("Welcome to the jungle!");
          setTimeout(onSuccess, 700);
        }
      }
    } catch {
      setError("Something went wrong. Please try again.");
      hoopoe.react("error");
    } finally {
      setLoading(false);
    }
  }

  const currentYear = new Date().getFullYear();

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input
          id="name"
          name="name"
          placeholder="Your full name"
          required
          minLength={2}
          autoFocus
          onChange={(e) => hoopoe.gaze(gazeFor(e.target.value.length, 24))}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
          onChange={(e) => hoopoe.gaze(gazeFor(e.target.value.length, 26))}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPw ? "text" : "password"}
            placeholder="At least 8 characters"
            required
            minLength={8}
            className="pr-10"
            onChange={(e) => {
              // the bird follows what you type whether peeking or covered
              // (its head tracks behind the wings when its eyes are hidden)
              hoopoe.gaze(gazeFor(e.target.value.length, 16));
            }}
          />
          <button
            type="button"
            onClick={() => setShowPw((s) => !s)}
            aria-label={showPw ? "Hide password" : "Show password"}
            className="absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {showPw ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          placeholder="Confirm your password"
          required
          minLength={8}
        />
      </div>

      {/* Account type */}
      <input type="hidden" name="accountType" value={accountType} />
      <div className="space-y-2">
        <Label>I am a...</Label>
        <div className="grid grid-cols-3 gap-1.5 rounded-full border border-border bg-paper p-1">
          {ACCOUNT_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setAccountType(t.value)}
              className={`relative rounded-full px-2 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
                accountType === t.value
                  ? "text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {accountType === t.value && (
                <motion.span
                  layoutId="signupAccountThumb"
                  className="absolute inset-0 z-0 rounded-full bg-canopy"
                  transition={SPRINGS.snappy}
                />
              )}
              <span className="relative z-10">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {!isAlum && (
        <p className="rounded-lg bg-paper px-3 py-2 text-[13px] leading-relaxed text-muted-foreground">
          Teachers do not need a batch. If you also studied at Rishi Valley, you can add your batch
          later from your profile.
        </p>
      )}

      {isAlum && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="yearJoined">Year joined</Label>
              <Input
                id="yearJoined"
                name="yearJoined"
                type="number"
                inputMode="numeric"
                placeholder="2014"
                min={1926}
                max={currentYear}
                value={yearJoined}
                onChange={(e) => setYearJoined(e.target.value)}
                required={isAlum}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="yearLeft">Year left</Label>
              <Input
                id="yearLeft"
                name="yearLeft"
                type="number"
                inputMode="numeric"
                placeholder="2021"
                min={1926}
                max={currentYear + 1}
                value={yearLeft}
                onChange={(e) => setYearLeft(e.target.value)}
                required={isAlum}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gradeJoined">Grade joined</Label>
              <Input
                id="gradeJoined"
                name="gradeJoined"
                type="number"
                inputMode="numeric"
                placeholder="4"
                min={1}
                max={12}
                value={gradeJoined}
                onChange={(e) => setGradeJoined(e.target.value)}
                required={isAlum}
              />
            </div>
          </div>

          <p className="text-[12.5px] leading-relaxed text-muted-foreground">
            When you joined, when you left, and the grade you started in. We work
            out your batch from that, even if you left before 12th.
          </p>

          <AnimatePresence mode="wait" initial={false}>
            {batch && (
              <motion.div
                key={batch.ok ? `ok-${batch.batchYear}` : `err-${batch.error}`}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={SPRINGS.snappy}
              >
                {batch.ok ? (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-canopy/25 bg-canopy/10 px-3.5 py-2.5">
                    <span className="text-[13px] text-muted-foreground">
                      You&apos;ll join
                    </span>
                    <span className="font-heading text-[15px] font-semibold text-canopy">
                      Batch of {batch.batchYear}
                    </span>
                  </div>
                ) : (
                  <p className="rounded-xl border border-cinnamon/30 bg-cinnamon/10 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-cinnamon">
                    {batch.error}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        type="submit"
        variant="primary"
        className="w-full"
        disabled={loading}
      >
        {loading ? "Creating account..." : "Join"}
      </Button>
    </form>
  );
}
