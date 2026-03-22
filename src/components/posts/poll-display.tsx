"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { votePoll } from "@/app/(main)/feed/actions";
import { toast } from "sonner";

interface PollOption {
  id: string;
  text: string;
  voteCount: number;
}

interface PollDisplayProps {
  postId: string;
  options: PollOption[];
  totalVotes: number;
  userVotedOptionId: string | null;
}

export function PollDisplay({
  postId,
  options,
  totalVotes,
  userVotedOptionId,
}: PollDisplayProps) {
  const [voted, setVoted] = useState(userVotedOptionId);
  const [localOptions, setLocalOptions] = useState(options);
  const [localTotal, setLocalTotal] = useState(totalVotes);
  const [submitting, setSubmitting] = useState(false);

  const hasVoted = voted !== null;

  async function handleVote(optionId: string) {
    if (submitting) return;
    setSubmitting(true);

    // Optimistic update
    const prevVoted = voted;
    const prevOptions = localOptions;
    const prevTotal = localTotal;

    setVoted(optionId);
    setLocalOptions((opts) =>
      opts.map((o) => ({
        ...o,
        voteCount:
          o.id === optionId
            ? o.voteCount + 1
            : o.id === prevVoted
              ? o.voteCount - 1
              : o.voteCount,
      }))
    );
    setLocalTotal((t) => (prevVoted ? t : t + 1));

    const result = await votePoll(postId, optionId);
    if (result.error) {
      // Revert
      setVoted(prevVoted);
      setLocalOptions(prevOptions);
      setLocalTotal(prevTotal);
      toast.error(result.error);
    }
    setSubmitting(false);
  }

  return (
    <div className="mt-3 space-y-2">
      {localOptions.map((option) => {
        const pct =
          localTotal > 0
            ? Math.round((option.voteCount / localTotal) * 100)
            : 0;
        const isSelected = voted === option.id;

        if (!hasVoted) {
          // Voting mode: clickable buttons
          return (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={submitting}
              className="w-full rounded-lg border border-border px-4 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:border-leaf hover:bg-leaf/5"
            >
              {option.text}
            </button>
          );
        }

        // Results mode: percentage bars
        return (
          <div
            key={option.id}
            onClick={() => handleVote(option.id)}
            className="relative cursor-pointer overflow-hidden rounded-lg border border-border px-4 py-2.5 transition-colors hover:border-leaf/50"
          >
            {/* Fill bar */}
            <div
              className="absolute inset-y-0 left-0 bg-leaf/15"
              style={{ width: `${pct}%` }}
            />
            <div className="relative flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                {isSelected && <Check className="h-3.5 w-3.5 text-leaf" />}
                {option.text}
              </span>
              <span className="text-sm text-muted-foreground">{pct}%</span>
            </div>
          </div>
        );
      })}
      <p className="text-xs text-muted-foreground">
        {localTotal} {localTotal === 1 ? "vote" : "votes"}
      </p>
    </div>
  );
}
