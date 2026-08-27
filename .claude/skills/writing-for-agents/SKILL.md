---
name: writing-for-agents
description: Use when writing anything that another AI session will work from — a prompt to paste into a new session, a spec, a handover, a fix-prompt, an implementation plan, a subagent's task, or a rewrite of any of those. Two failures to avoid: distilling the owner's brief until the nuance is gone, and over-directing until the receiving session cannot use its own judgment.
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
   cheap; a rebuilt-from-summary feature is not.
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
- `docs/audit-fix/*/fix-prompt.md` — the living handover; a fix session is started by
  @-ing it and nothing else.
- Any `Agent` tool prompt. A subagent gets one message and cannot ask a follow-up.
- Any prompt written for the owner to paste into a fresh session.
