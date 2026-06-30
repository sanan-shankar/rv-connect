"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Hoopoe } from "@/components/mascot/hoopoe";
import { useHoopoe } from "@/components/mascot/use-hoopoe";
import type { HoopoeApi } from "@/components/mascot/hoopoe-kit";
import { PeaksMark } from "@/components/layout/peaks-mark";
import { SPRINGS } from "@/components/common/motion";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);

  // The hoopoe covers its eyes (wings up) while the password is hidden, and peeks
  // when you reveal it; while peeking it follows what you type. One mascot, driven
  // by its controller.
  const { ref: hoopoeRef, ...hoopoe } = useHoopoe();
  const showPwRef = useRef(showPw);
  showPwRef.current = showPw;
  const introDone = useRef(false);

  // React to reveal toggles after the intro settles.
  useEffect(() => {
    if (!introDone.current) return;
    if (showPw) hoopoe.peek();
    else hoopoe.coverEyes();
  }, [showPw, hoopoe]);

  function onHoopoeReady(api: HoopoeApi) {
    // intro: peek in with a double-blink greeting, then tuck the wings over the
    // (hidden) password.
    api.peek();
    api.blinkOnce(true);
    setTimeout(() => {
      introDone.current = true;
      if (showPwRef.current) api.peek();
      else api.coverEyes();
    }, 1150);
  }

  const isAdmin =
    process.env.NEXT_PUBLIC_ADMIN_EMAIL &&
    email === process.env.NEXT_PUBLIC_ADMIN_EMAIL;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Admin bypass: direct login via admin-login endpoint (no password needed)
      if (isAdmin) {
        const res = await fetch("/api/auth/admin-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          window.location.href = "/feed";
          return;
        }
        if (data.error) {
          setError(data.error);
          setLoading(false);
          return;
        }
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password.");
      } else if (result?.ok) {
        window.location.href = "/feed";
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.4fr_1fr]">
      {/* Photo half: the valley, with the brand overlaid */}
      <div className="relative hidden overflow-hidden lg:block">
        <img
          src="/images/landing.jpeg"
          alt=""
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#16241a]/55 via-[#16241a]/15 to-transparent" />
        <Link
          href="/"
          className="absolute left-8 top-7 inline-flex items-center gap-2.5 rounded-sm text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          <PeaksMark size={18} />
          <span className="font-heading text-lg tracking-tight">Rishi Valley</span>
        </Link>
      </div>

      {/* Form half: warm panel, centered form. Arriving from the landing,
          the content does a lateral pass: it slides in from the right on the
          gentle spring while the photo half and its logo stay anchored.
          Hydration-safe (motion initial/animate on a client component); no
          reduced-motion branching per owner decision. */}
      <div className="grid min-h-screen place-items-center bg-background px-6 py-10">
        <motion.div
          className="w-full max-w-[360px] text-center"
          initial={{ opacity: 0, x: 48 }}
          animate={{ opacity: 1, x: 0 }}
          transition={SPRINGS.gentle}
        >
          <div className="mx-auto mb-1 grid h-[128px] place-items-center">
            <Hoopoe ref={hoopoeRef} size={102} onReady={onHoopoeReady} />
          </div>
          <h1 className="font-heading text-[27px] leading-tight tracking-tight text-foreground">
            Welcome back
          </h1>
          <p className="mx-auto mt-2 mb-7 max-w-[30ch] text-sm leading-relaxed text-muted-foreground">
            Sign in to reconnect with the people who grew up under the same trees.
          </p>

          <form onSubmit={handleSubmit} className="space-y-3.5 text-left">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  // follow the email as it's typed too, so the bird feels alive across the form
                  hoopoe.gaze(Math.max(-1, Math.min(1, (e.target.value.length / 22) * 2 - 1)));
                }}
                required
                autoFocus
              />
            </div>
            {!isAdmin && (
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPw ? "text" : "password"}
                    placeholder="Your password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      // the bird follows what you type whether peeking or covered (head tracks
                      // behind the wings when its eyes are hidden)
                      hoopoe.gaze(Math.max(-1, Math.min(1, (e.target.value.length / 16) * 2 - 1)));
                    }}
                    required
                    minLength={8}
                    className="pr-10"
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
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              type="submit"
              variant="leaf"
              className="mt-2 w-full"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-sm text-muted-foreground">
            New here?{" "}
            <Link
              href="/signup"
              className="rounded-sm font-medium text-leaf hover:text-leaf-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              Join
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
