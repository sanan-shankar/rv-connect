"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { registerUser } from "./actions";

export function SignupForm({
  onSuccess,
}: {
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [accountType, setAccountType] = useState<"alumnus" | "teacher" | "ex_teacher">("alumnus");
  const isAlum = accountType === "alumnus";

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
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      setLoading(false);
      return;
    }

    try {
      const result = await registerUser(formData);
      if (result.error) {
        setError(result.error);
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
        } else {
          toast.success("Welcome to the jungle!");
          onSuccess();
        }
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const currentYear = new Date().getFullYear();

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input
          id="name"
          name="name"
          placeholder="Your full name"
          required
          minLength={2}
          autoFocus
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
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="At least 8 characters"
          required
          minLength={8}
        />
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
              className={`rounded-full px-2 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
                accountType === t.value
                  ? "bg-leaf text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
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
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="batchType">Batch Type</Label>
            <div className="group relative">
              <span className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-muted-foreground/40 text-[10px] font-medium text-muted-foreground">
                i
              </span>
              <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded-lg bg-foreground px-3 py-2 text-xs leading-relaxed text-background opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                We&apos;ll display this as &quot;Batch of &apos;XX&quot;. Even if you left after 10th (e.g. in 2014), your batch year is when your class graduated 12th — Batch of &apos;16.
                <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-foreground" />
              </div>
            </div>
          </div>
          <Select name="batchType" required>
            <SelectTrigger id="batchType">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ICSE">ICSE (10th)</SelectItem>
              <SelectItem value="ISC">ISC (12th)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="batchYear">Batch Year</Label>
          <Input
            id="batchYear"
            name="batchYear"
            type="number"
            placeholder={String(currentYear)}
            min={1926}
            max={currentYear + 1}
            required={isAlum}
          />
        </div>
      </div>
      )}

      {isAlum && (
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="yearJoined">Year Joined</Label>
          <Input
            id="yearJoined"
            name="yearJoined"
            type="number"
            placeholder="e.g. 2015"
            min={1926}
            max={currentYear}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="yearLeft">Year Left</Label>
          <Input
            id="yearLeft"
            name="yearLeft"
            type="number"
            placeholder="e.g. 2021"
            min={1926}
            max={currentYear}
          />
        </div>
      </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        type="submit"
        variant="leaf"
        className="w-full"
        disabled={loading}
      >
        {loading ? "Creating account..." : "Join"}
      </Button>
    </form>
  );
}
