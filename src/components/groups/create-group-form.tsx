"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createGroup } from "@/app/(main)/groups/actions";

interface BatchYear {
  year: number;
  count: number;
}

interface Props {
  batchYears: BatchYear[];
  currentUserId: string;
}

export function CreateGroupForm({ batchYears, currentUserId }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedBatches, setSelectedBatches] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<"details" | "members">("details");

  function toggleBatch(year: number) {
    setSelectedBatches((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year]
    );
  }

  async function handleSubmit() {
    if (!name.trim()) {
      toast.error("Please enter a group name");
      return;
    }

    setSubmitting(true);

    // We'll add members by batch on the server side after creation
    // For now, pass batch years and let the server resolve to user IDs
    const formData = new FormData();
    formData.set("name", name);
    formData.set("description", description);
    formData.set("selectedBatches", JSON.stringify(selectedBatches));

    // Fetch user IDs for selected batches
    let memberIds: string[] = [currentUserId];
    if (selectedBatches.length > 0) {
      try {
        const res = await fetch(
          `/api/users-by-batch?batches=${selectedBatches.join(",")}`
        );
        if (res.ok) {
          const data = await res.json();
          memberIds = [...new Set([currentUserId, ...data.userIds])];
        }
      } catch {
        // Fall back to just the creator
      }
    }

    formData.set("memberIds", JSON.stringify(memberIds));

    const result = await createGroup(formData);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Group created!");
      router.push(`/groups/${result.groupId}`);
    }
    setSubmitting(false);
  }

  return (
    <div className="space-y-6">
      {step === "details" && (
        <div className="glass rounded-xl p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Group Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Batch of '16 Reunited"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this group about?"
              rows={2}
            />
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => setStep("members")}
              disabled={!name.trim()}
              variant="leaf"
            >
              Next: Add Members
            </Button>
          </div>
        </div>
      )}

      {step === "members" && (
        <div className="space-y-4">
          <button
            onClick={() => setStep("details")}
            className="inline-flex items-center gap-1 rounded-sm text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 transition-colors duration-150"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to details
          </button>

          <div className="glass rounded-xl p-6">
            <h2 className="mb-1 font-heading text-lg font-semibold text-foreground">
              Select batches to add
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Everyone from selected batches will be added. You can skip this and add people later.
            </p>

            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
              {batchYears.map(({ year, count }) => {
                const selected = selectedBatches.includes(year);
                return (
                  <button
                    key={year}
                    onClick={() => toggleBatch(year)}
                    className={`relative flex flex-col items-center rounded-lg p-3 transition-all ${
                      selected
                        ? "bg-leaf/15 ring-2 ring-leaf text-leaf"
                        : "glass hover:border-primary/30"
                    }`}
                  >
                    {selected && (
                      <Check className="absolute right-1.5 top-1.5 h-3.5 w-3.5" />
                    )}
                    <span className="font-heading text-base font-bold">
                      &apos;{String(year).slice(-2)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedBatches.length > 0 && (
              <p className="mt-3 text-sm text-muted-foreground">
                {selectedBatches.length} batch{selectedBatches.length !== 1 ? "es" : ""} selected
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "Creating..." : "Skip, create empty group"}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              variant="leaf"
            >
              {submitting ? "Creating..." : "Create Group"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
