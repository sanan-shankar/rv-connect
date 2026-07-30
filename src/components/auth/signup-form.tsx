"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { YearInput } from "@/components/common/year-input";
import { toast } from "sonner";
import { AnimatePresence, motion } from "motion/react";
import { SPRINGS } from "@/components/common/motion";
import type { HoopoeApi } from "@/components/mascot/hoopoe-kit";
import { registerUser } from "./actions";

// keep the gaze sweep bounded to [-1, 1] as the field fills
const gazeFor = (len: number, over: number) =>
  Math.max(-1, Math.min(1, (len / over) * 2 - 1));

// Devices with a real mouse get the info bubble on hover; touch devices (no
// fine hover) get it on tap instead. Checked once on mount, not reactively,
// since a device does not switch input modes mid-session.
function useHoverCapable() {
  const [capable, setCapable] = useState(true);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Asks matchMedia whether the device has a real pointer. A media query has no server-side answer, so this has to happen after mount.
    setCapable(window.matchMedia("(hover: hover) and (pointer: fine)").matches);
  }, []);
  return capable;
}

/**
 * Small circled-i affordance that reveals a short warm note. Opens on hover
 * for mouse users, on tap for touch users, and on keyboard focus either way
 * (gated on :focus-visible so a mouse click does not double-fire with the tap
 * handler). Closes on blur, outside click/tap, or Escape.
 */
function InfoTip({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const hoverCapable = useHoverCapable();
  const wrapRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const tipId = useId();
  // Anchored to the trigger's right edge by default, but clamped so the
  // bubble never runs off either side of a narrow viewport regardless of
  // where the icon happens to sit.
  const [tipLeft, setTipLeft] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    function reposition() {
      const wrap = wrapRef.current;
      const tip = tipRef.current;
      if (!wrap || !tip) return;
      const wrapRect = wrap.getBoundingClientRect();
      const margin = 12;
      let left = wrapRect.width - tip.offsetWidth; // right-align to trigger, wrapper-relative
      const pageLeft = wrapRect.left + left;
      if (pageLeft < margin) left += margin - pageLeft;
      const pageRight = wrapRect.left + left + tip.offsetWidth;
      if (pageRight > window.innerWidth - margin) left -= pageRight - (window.innerWidth - margin);
      setTipLeft(left);
    }
    reposition();
    window.addEventListener("resize", reposition);
    function onOutside(e: PointerEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", reposition);
      document.removeEventListener("pointerdown", onOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span
      ref={wrapRef}
      className="relative inline-flex"
      onMouseEnter={hoverCapable ? () => setOpen(true) : undefined}
      onMouseLeave={hoverCapable ? () => setOpen(false) : undefined}
    >
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? tipId : undefined}
        onClick={!hoverCapable ? () => setOpen((o) => !o) : undefined}
        onFocus={(e) => {
          if (e.currentTarget.matches(":focus-visible")) setOpen(true);
        }}
        onBlur={() => setOpen(false)}
        className="grid h-4 w-4 shrink-0 place-items-center rounded-full text-muted-foreground/70 hover:text-canopy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            ref={tipRef}
            id={tipId}
            role="tooltip"
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -2 }}
            transition={SPRINGS.snappy}
            style={{ left: tipLeft ?? undefined, right: tipLeft == null ? 0 : undefined }}
            className="absolute top-full z-30 mt-2 w-64 max-w-[80vw] rounded-xl border border-border bg-paper px-3.5 py-2.5 text-[12.5px] leading-relaxed text-foreground shadow-lg"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}

export function SignupForm({
  hoopoe,
  onSuccess,
}: {
  hoopoe: HoopoeApi;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [accountType, setAccountType] = useState<"alumnus" | "teacher">("alumnus");
  const isAlum = accountType === "alumnus";
  const [showPw, setShowPw] = useState(false);

  // Phone, collected right here at the first step so it never feels like a
  // later afterthought. Country code defaults to +91 but is a free, editable
  // field; the number is digits-only. Optional. Combined into one value for the
  // hidden `phone` field the server reads (normalizePhone tidies it there).
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneDigits, setPhoneDigits] = useState("");
  const phoneValue = phoneDigits.trim() ? `${countryCode} ${phoneDigits}`.trim() : "";

  // The batch is asked directly now ("the year your class finished 12th"),
  // alongside the two plain years someone joined and left. All controlled so we
  // can validate before submit.
  const [yearJoined, setYearJoined] = useState("");
  const [yearLeft, setYearLeft] = useState("");
  const [batchYear, setBatchYear] = useState("");

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
      if (!yearJoined || !yearLeft || !batchYear) {
        setError("Please fill in the years you joined and left, and your batch.");
        hoopoe.react("error");
        setLoading(false);
        return;
      }
      if (Number(yearLeft) < Number(yearJoined)) {
        setError("The year you left cannot be before the year you joined.");
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="firstName">First name</Label>
          <Input
            id="firstName"
            name="firstName"
            placeholder="Your first name"
            required
            minLength={1}
            autoFocus
            onChange={(e) => hoopoe.gaze(gazeFor(e.target.value.length, 12))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Surname</Label>
          <Input
            id="lastName"
            name="lastName"
            placeholder="Your surname"
            required
            minLength={1}
            onChange={(e) => hoopoe.gaze(gazeFor(e.target.value.length, 12))}
          />
        </div>
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

      {/* Phone, right here at the first step. Optional, never verified. */}
      <input type="hidden" name="phone" value={phoneValue} />
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Label htmlFor="phoneDigits">Phone</Label>
          <span className="text-[12px] font-normal text-muted-foreground">(optional)</span>
        </div>
        <div className="flex gap-2">
          <Input
            aria-label="Country code"
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            inputMode="tel"
            className="w-16 shrink-0 text-center"
          />
          <Input
            id="phoneDigits"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="e.g. 98765 43210"
            value={phoneDigits}
            onChange={(e) => setPhoneDigits(e.target.value)}
            className="flex-1"
          />
        </div>
        <p className="text-[12.5px] leading-relaxed text-muted-foreground">
          Shown only to fellow Rishi Valley members once they sign in. Never public.
        </p>
      </div>

      {/* Account type */}
      <input type="hidden" name="accountType" value={accountType} />
      <div className="space-y-2">
        <Label>I am a...</Label>
        <div className="flex items-center gap-2">
          <div className="grid flex-1 grid-cols-2 gap-1.5 rounded-full border border-border bg-paper p-1">
            {ACCOUNT_TYPES.map((t) => {
              const selected = accountType === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setAccountType(t.value)}
                  aria-pressed={selected}
                  className={`relative rounded-full px-2 py-1.5 text-[13px] font-medium transition-colors transition-transform duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
                    selected
                      ? "text-canopy"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {selected && (
                    <motion.span
                      layoutId="signupAccountThumb"
                      className="absolute inset-0 z-0 rounded-full border border-canopy bg-canopy/10"
                      transition={SPRINGS.snappy}
                    />
                  )}
                  <span className="relative z-10">{t.label}</span>
                </button>
              );
            })}
          </div>
          <InfoTip label="What if I used to teach?">
            Taught at Rishi Valley at any point? Choose Teacher, it includes
            teachers who have since moved on too.
          </InfoTip>
        </div>
      </div>

      {!isAlum && (
        <p className="rounded-lg bg-paper px-3 py-2 text-[13px] leading-relaxed text-muted-foreground">
          No batch needed for teachers. You can add one later if you studied here too.
        </p>
      )}

      {isAlum && (
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="batchYear">Which batch are you in?</Label>
              <InfoTip label="What does batch mean?">
                Your batch is the year your class finished 12th grade at Rishi
                Valley, even if you left earlier. Left after 10th in 2021? Your
                batch is still 2023.
              </InfoTip>
            </div>
            <YearInput
              id="batchYear"
              name="batchYear"
              placeholder="e.g. 2023"
              value={batchYear}
              onValueChange={setBatchYear}
              required={isAlum}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="yearJoined">Year you joined</Label>
              <YearInput
                id="yearJoined"
                name="yearJoined"
                placeholder="e.g. 2014"
                value={yearJoined}
                onValueChange={setYearJoined}
                required={isAlum}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="yearLeft">Year you left</Label>
              <YearInput
                id="yearLeft"
                name="yearLeft"
                placeholder="e.g. 2021"
                value={yearLeft}
                onValueChange={setYearLeft}
                required={isAlum}
              />
            </div>
          </div>
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
