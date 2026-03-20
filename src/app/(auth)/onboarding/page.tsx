"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { updateProfile } from "./actions";

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    await updateProfile(formData);
    router.push("/feed");
  }

  function handleSkip() {
    router.push("/feed");
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="font-heading text-2xl">
          Complete your profile
        </CardTitle>
        <CardDescription>
          Help your batchmates find and recognize you. You can always update this
          later.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              name="bio"
              placeholder="A few words about yourself..."
              maxLength={1000}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="currentCity">Current City</Label>
            <Input
              id="currentCity"
              name="currentCity"
              placeholder="e.g. Bangalore"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="workplace">Industry</Label>
              <select
                id="workplace"
                name="workplace"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                defaultValue=""
              >
                <option value="">Select</option>
                <option value="Technology">Technology</option>
                <option value="Finance">Finance</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Education">Education</option>
                <option value="Arts & Media">Arts & Media</option>
                <option value="Law">Law</option>
                <option value="Government">Government</option>
                <option value="Non-profit">Non-profit</option>
                <option value="Research">Research</option>
                <option value="Consulting">Consulting</option>
                <option value="Entrepreneurship">Entrepreneurship</option>
                <option value="Agriculture">Agriculture</option>
                <option value="Student">Student</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input
                id="jobTitle"
                name="jobTitle"
                placeholder="e.g. Engineer"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="instagram">Instagram</Label>
              <Input
                id="instagram"
                name="instagram"
                placeholder="@handle"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkedin">LinkedIn</Label>
              <Input
                id="linkedin"
                name="linkedin"
                placeholder="Profile URL"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              name="phone"
              placeholder="+91 98765 43210"
            />
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleSkip}
            >
              Skip for now
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-leaf text-white hover:bg-leaf-light"
              disabled={loading}
            >
              {loading ? "Saving..." : "Save & continue"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
