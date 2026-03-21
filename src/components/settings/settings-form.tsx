"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { updateUserProfile, deleteAccount } from "./actions";

interface User {
  id: string;
  name: string;
  email: string;
  bio: string | null;
  currentCity: string | null;
  workplace: string | null;
  jobTitle: string | null;
  phone: string | null;
  instagram: string | null;
  linkedin: string | null;
  batchType: string;
  batchYear: number;
  yearJoined: number | null;
  yearLeft: number | null;
  admissionNumber: number | null;
}

export function SettingsForm({ user }: { user: User }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData(e.currentTarget);
    const result = await updateUserProfile(formData);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Profile updated");
      router.refresh();
    }
    setSaving(false);
  }

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteAccount();
    if (result.error) {
      toast.error(result.error);
      setDeleting(false);
    } else {
      signOut({ callbackUrl: "/" });
    }
  }

  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Edit Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={user.name}
                required
                minLength={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                name="bio"
                defaultValue={user.bio || ""}
                maxLength={1000}
                rows={3}
                placeholder="A few words about yourself..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="batchType">Batch Type</Label>
                <Select name="batchType" defaultValue={user.batchType}>
                  <SelectTrigger id="batchType">
                    <SelectValue />
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
                  defaultValue={user.batchYear}
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
                  defaultValue={user.yearJoined || ""}
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
                  defaultValue={user.yearLeft || ""}
                  min={1926}
                  max={currentYear}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admissionNumber">Admission Number</Label>
              <Input
                id="admissionNumber"
                name="admissionNumber"
                type="number"
                defaultValue={user.admissionNumber || ""}
                placeholder="e.g. 1234"
                min={0}
                max={10000}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentCity">Current City</Label>
              <Input
                id="currentCity"
                name="currentCity"
                defaultValue={user.currentCity || ""}
                placeholder="e.g. Bangalore"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="workplace">Industry</Label>
                <Select name="workplace" defaultValue={user.workplace || ""}>
                  <SelectTrigger id="workplace">
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Not specified</SelectItem>
                    <SelectItem value="Technology">Technology</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                    <SelectItem value="Healthcare">Healthcare</SelectItem>
                    <SelectItem value="Education">Education</SelectItem>
                    <SelectItem value="Arts & Media">Arts & Media</SelectItem>
                    <SelectItem value="Law">Law</SelectItem>
                    <SelectItem value="Government">Government</SelectItem>
                    <SelectItem value="Non-profit">Non-profit</SelectItem>
                    <SelectItem value="Research">Research</SelectItem>
                    <SelectItem value="Consulting">Consulting</SelectItem>
                    <SelectItem value="Entrepreneurship">Entrepreneurship</SelectItem>
                    <SelectItem value="Agriculture">Agriculture</SelectItem>
                    <SelectItem value="Student">Student</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="jobTitle">Job Title</Label>
                <Input
                  id="jobTitle"
                  name="jobTitle"
                  defaultValue={user.jobTitle || ""}
                  placeholder="e.g. Software Engineer"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  defaultValue={user.phone || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram</Label>
                <Input
                  id="instagram"
                  name="instagram"
                  defaultValue={user.instagram || ""}
                  placeholder="@handle"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkedin">LinkedIn</Label>
              <Input
                id="linkedin"
                name="linkedin"
                defaultValue={user.linkedin || ""}
                placeholder="Profile URL"
              />
            </div>

            <Button
              type="submit"
              disabled={saving}
              className="bg-leaf text-white hover:bg-leaf-light"
            >
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="font-heading text-destructive">
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Permanently delete your account and all associated data. This action
            cannot be undone.
          </p>
          <Button
            variant="outline"
            className="mt-3 text-destructive hover:text-destructive"
            onClick={() => setShowDeleteDialog(true)}
          >
            Delete my account
          </Button>
        </CardContent>
      </Card>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              This will permanently delete your account, all your posts,
              comments, and data. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Yes, delete my account"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
