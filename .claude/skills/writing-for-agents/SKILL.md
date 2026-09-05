---
name: writing-for-agents
description: Use when writing anything that another AI session will work from — a prompt to paste into a new session, a spec, a handover, a fix-prompt, an implementation plan, a subagent's task, or a rewrite of any of those. Two failures to avoid: distilling the owner's brief until the nuance is gone, and over-directing until the receiving session cannot use its own judgment. When the brief is the owner's, his words travel verbatim to every worker; when one session hands its own work to the next, its judgment is enough.
---

# Writing for another session

Anything you write that another session works from is a **handover**, and a handover has
exactly two ways to fail. Both were named by the owner, both were repeat offences, and both
produce work worse than if he had simply stayed in the original session.

## Failure one: you distilled it

> "I don't want my brief to be roughly summarised and passed on to the next guy who only
> gets like 70% right."

> "I've told you many tiny things and many things we have to beat, and many of my opinions,
> and you have only distilled them down to the most important things. But I feel like being
> verbose is good in these prompts because when you're conveying everything, all your ideas,
> all your feared emotions, it kind of captures it better."

> "Do not lose any important information because that's when you get a lower quality result
> than if you just use the session that we're using right now."

**The instinct to compress is wrong here.** You compress for a reader whose attention is
scarce. The receiving session's attention is not scarce; its *context* is, and that is a
different resource. A handover that reads as bloated to you reads as sufficient to it.

What gets lost first, and matters most:

- **The small opinions.** "The tag pills are okay but not too pretty." Nothing turns on it
  alone; twenty of them are the taste.
- **The emotional register.** "It's like the worst design ever, I can't believe that was
  shipped" is not the same instruction as "improve the caption panel."
- **The things to beat.** Named competitors, reference links, "we have to be better than X".
- **The fears.** "I don't want to be billed by myself for images." That is a constraint.
- **The reversals.** Where he argues himself out of a position and back into it, that
  records which questions he considers open. A summary resolves them and lies.
- **The rejected paths.** What was already tried and why it failed, or the next session
  re-treads it.

### The rules

1. **The owner's own words go on disk verbatim, in full**, in a file the handover points at
   and instructs the reader to open first. Never only your paraphrase. A transcript is
   cheap; a rebuilt-from-summary feature is not. A transcript cleaned of nothing but noise
   counts as verbatim; see "Whose words are you carrying?" below for exactly what may go.
2. **A rewrite is not a summary.** When asked to rewrite or tighten something:
   > "rewritten should be pretty exactly the same with the grammar tightened up but every
   > single thing still conveyed."
   Same content, same order, same emphasis. Fix grammar and cut genuine repetition. If you
   removed an idea, you did it wrong.
3. **Quote rather than characterise** wherever the wording carries the nuance. Put his
   sentence in the document, not your reading of it.
4. **Index, don't replace.** A long brief plus a numbered ledger of every discrete ask,
   each with a status, beats a tidy summary. The ledger points into the brief; it is not a
   substitute for reading it, and it should say so.

## Whose words are you carrying?

Two kinds of handover, and the verbatim rule applies to only one of them. The owner drew the
line himself on 2026-09-05, while a session was turning his brief into a campaign:

> "When the brief has come from me, and then it is you who is relaying it, either to a
> subagent or to another session, I would not like the important parts, or at least most of
> it, to be summarised. I would like a good part of it to be verbatim, or at least reference
> some content where what I have said is verbatim. Because when you do this summarisation,
> that's where you get the lower quality of output, because these subagents or future agents
> are not able to capture the nuance in what I'm saying. They have to work off this
> reductionist view of the previous agent's judgment of what they thought was important in
> what I've said, and then I don't get exactly what I want."

> "Obviously, the skill will be called when I have not provided the brief, when it's just one
> session talking to another session, not much intervention from me, in which case it doesn't
> have to do this part of it, the verbatim part. It is more than competent enough to decide
> what needs to be said."

> "I would not want your four-bullet-point summarisation of it to go to the next session, and
> then that session does a horrible job."

**The brief came from the owner**, and you are relaying it: to a subagent, a next session, a
fix-prompt, a room brief, a prompt for him to paste. Then:

- His words are on disk in a file, cleaned of nothing but noise, and the handover says read
  it first (rule 1).
- The parts a worker needs are **quoted into its prompt**, paragraph by paragraph, not
  described. An `Agent` prompt for owner-briefed work carries his paragraphs and the path to
  the file. "The owner wants the list redesigned" is the failure this section exists for.
- Your reading of what he meant goes **beneath** his words, labelled as yours, never in place
  of them. Where you had to interpret a reversal or an ambiguity, quote both sides and say
  which you took.
- The test: could the worker, reading your prompt, tell which sentences are his and which
  are yours? If not, rewrite.

**Cleaning a transcript is allowed; summarising it is not.** He said what may go:

> "Maybe you can delete the uhs and the ahs and the other grammatical quirks, but I'd like
> the main content and nuance to be there."

So: remove fillers ("um", "uh", "like", "you know", "okay" as a tic); merge stutters and
restarts; correct a mis-hearing only when it is unambiguous, and put the original in square
brackets when it is not. Keep the order, the emphasis, the swearing, the reversals, the
asides and the "I don't know"s. Number the paragraphs so a ledger can point at them. If a
sentence of yours would replace a sentence of his, you have crossed the line.

**No owner brief behind it**: one session handing its own work to the next, what it found,
what it decided, what is left. You are the author, and your judgment about what to say is
the right one. The verbatim rule does not apply; every other rule in this file does. Where
the owner did speak during your session (a pick, an answer to a question, a correction),
that fragment is his and travels verbatim under the rule above, however short it is.

## Failure two: you over-directed it

> "When I talk to you, I give you a certain level of information and a certain level of
> autonomy... But then when I get you to write a prompt, you specify it in a way where
> you're giving such direct instructions that you're not going to allow that session to be
> creative enough. You've completely constrained it."

> "If you're going to strictly tell it, just do this, that, this brand colour, that's the
> animation, just this, that, that, and finish it. It's just going to do that."

> "If I just needed one solution, then it's fine to be direct. But we don't know what we
> want, so we need a level of creativity for it to iterate and decide what's best."

The receiving session owns the iteration loop — build, screenshot, look, adjust, look again.
**That loop is where the quality comes from.** A prompt that specifies the answer removes
the loop and you get exactly what you wrote down and nothing better.

### The rules

5. **Mark every decision with its status.** This is the mechanism, and it is not optional:

   | Mark | Means | The receiving session |
   |---|---|---|
   | **LOCKED** | The owner decided it. Reasons given. | Does not relitigate. Flags it if genuinely impossible. |
   | **RECOMMENDED** | Your judgment, with reasoning. | Free to do better. Must say what it did instead and why. |
   | **OPEN** | Nobody has decided. | Decides it, using taste and the iteration loop. |

   Without these three marks everything reads as an order. With them, a long document can
   be highly specific *and* leave real room.

6. **State intent and constraint, not implementation.** "Every tall card the same height, so
   scrolling has a rhythm" leaves room. "`height: 700px`" does not. Give the number only
   where the number is the decision.
7. **Say what "good" looks like** so the loop has a target. What you would look at, what
   would make you reject it, which viewport, which real content.
8. **Say what has been tried and rejected, with reasons.** Otherwise it is retried.
9. **Grant the autonomy out loud.** "Sections 6 and 7 are yours. Bring back something better
   than what is written here." A session that has not been told it may deviate will not.
10. **Do not pre-empt discovery.** If you have not verified something, say you have not.
    A confident wrong detail costs more than an admitted gap.

## Operational context

Include it so it is never explained twice: which repo and account, which branch, which
paths, which logins already exist, which commands run the gates, which server is already
running, what must never be touched. Name the accounts explicitly where more than one
exists — the wrong GitHub or the wrong test user is a real and repeated failure.

## Before you hand it off

Read it as the receiving session: you have this document, the files it names, and nothing
else. Then:

- Would this produce what the live session would have produced? If not, what is missing is
  usually a small opinion, an emotional line, or a rejected path.
- Is every decision marked LOCKED, RECOMMENDED or OPEN?
- Is there anything the receiver is *meant* to decide, that reads like an instruction?
- Are the owner's own words on disk in full, and does the document say to read them first?
- Would a stranger know which account, repo, path and command to use?
- Is anything asserted that you did not verify?

## Checklist

- [ ] Owner's words captured verbatim in a file, and the handover says read it first
- [ ] If the brief is his: the paragraphs a worker needs are quoted into the worker's prompt, not paraphrased
- [ ] Numbered ledger of every discrete ask, each with a status, pointing into that file
- [ ] Every decision marked LOCKED / RECOMMENDED / OPEN
- [ ] Autonomy granted explicitly, by section
- [ ] Small opinions, emotional register, references-to-beat and stated fears all present
- [ ] Tried-and-rejected paths listed with reasons
- [ ] What "good" looks like, and how to check it
- [ ] Operational context: accounts, repo, paths, commands, what not to touch
- [ ] Unverified claims marked as unverified

## Where this already applies in this repo

- `docs/planning/collection-rework/` — `brief.md` is the verbatim pattern; `handover.md` is
  the ledger pattern.
- `docs/planning/catchups-rework/` — `brief.md` is the cleaned-transcript pattern with
  numbered paragraphs; `handover.md` writes one prompt per session and quotes the brief into
  each by paragraph number.
- `docs/audit-fix/*/fix-prompt.md` — the living handover; a fix session is started by
  @-ing it and nothing else.
- Any `Agent` tool prompt. A subagent gets one message and cannot ask a follow-up.
- Any prompt written for the owner to paste into a fresh session.
