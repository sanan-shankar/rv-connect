"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { motion } from "motion/react";
import { SPRINGS } from "@/components/common/motion";
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

/* Per-row stagger so the bars sweep in one after another (about 75ms apart). */
const ROW_STAGGER = 0.075;

/* A short count-up to the final percentage, paced to land with its bar. The number
   and the bar share the same delay and a close duration so they read as one motion.
   The animation re-runs whenever the target changes (a vote, or a switched pick). */
function CountUp({ value, delay }: { value: number; delay: number }) {
  // Start at zero so the figure sweeps up the first time results appear, in step
  // with its bar (which scales in from zero). Later target changes count from the
  // last shown value rather than snapping.
  const [shown, setShown] = useState(0);
  const fromRef = useRef(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) {
      // already at target (e.g. first mount, where shown was seeded to value)
      return;
    }
    const dur = 560; // ms, a touch longer than the bar so the figure settles with it
    const delayMs = delay * 1000;
    let start = 0; // seeded from the first frame timestamp, not a render-scope clock
    const tick = (now: number) => {
      if (!start) start = now;
      const t = Math.min(1, Math.max(0, (now - start - delayMs) / dur));
      const e = 1 - Math.pow(1 - t, 3); // ease-out cubic, matches the bar settle
      setShown(Math.round(from + (to - from) * e));
      if (t < 1) {
        raf.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [value, delay]);

  return <>{shown}%</>;
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
      {localOptions.map((option, i) => {
        const pct =
          localTotal > 0
            ? Math.round((option.voteCount / localTotal) * 100)
            : 0;
        const isSelected = voted === option.id;
        const delay = i * ROW_STAGGER;

        if (!hasVoted) {
          // Voting mode: clickable buttons
          return (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={submitting}
              className="w-full rounded-lg border border-border px-4 py-2.5 text-left text-sm font-medium text-foreground transition-colors duration-150 hover:border-leaf hover:bg-leaf/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.98]"
            >
              {option.text}
            </button>
          );
        }

        // Results mode: percentage bars that grow from zero
        return (
          <div
            key={option.id}
            onClick={() => handleVote(option.id)}
            className="relative cursor-pointer overflow-hidden rounded-lg border border-border px-4 py-2.5 transition-colors hover:border-leaf/50"
          >
            {/* Fill bar: a full-width block scaled in on the X axis from a left origin.
                Only transform animates, never width or any layout property. The picked
                option gets a slightly stronger leaf tint. */}
            <motion.div
              className={`absolute inset-y-0 left-0 w-full origin-left ${
                isSelected ? "bg-leaf/25" : "bg-leaf/15"
              }`}
              style={{ transformOrigin: "left" }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: pct / 100 }}
              transition={{ type: "spring", stiffness: 150, damping: 20, delay }}
            />
            <div className="relative flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                {isSelected && (
                  <motion.span
                    className="inline-grid h-4 w-4 place-items-center rounded-full bg-leaf text-white"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ ...SPRINGS.snappy, delay: delay + 0.1 }}
                  >
                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  </motion.span>
                )}
                {option.text}
              </span>
              <span className="text-sm tabular-nums text-muted-foreground">
                <CountUp value={pct} delay={delay} />
              </span>
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
