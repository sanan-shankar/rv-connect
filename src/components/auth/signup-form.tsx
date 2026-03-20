"use client";

import { useState } from "react";
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
  onSuccess: (email: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);

    try {
      const result = await registerUser(formData);
      if (result.error) {
        setError(result.error);
      } else {
        toast.success("Welcome to the jungle 🌳");
        onSuccess(formData.get("email") as string);
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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="batchType">Batch Type</Label>
          <Select name="batchType" required>
            <SelectTrigger id="batchType">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ICSE">ICSE</SelectItem>
              <SelectItem value="ISC">ISC</SelectItem>
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
            required
          />
        </div>
      </div>

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

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        type="submit"
        className="w-full bg-leaf text-white hover:bg-leaf-light"
        disabled={loading}
      >
        {loading ? "Creating account..." : "Join & send magic link"}
      </Button>
    </form>
  );
}
