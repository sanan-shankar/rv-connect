# Owner questions — final, five-line form (orchestrator, 2026-10-24)

Settled since the interim draft, so not asked: the old Q2 (hold the next Edition; the hold no longer exists),
Q7 (Fluid compute; measured on), Q8 (R2 lifecycle rule; recorded as never added, so the in-app cleanup is a
row), Q12 (members in the wrong batch; fixed by the batch move). Q9 became a check in the "only you" list.

### Q1. A member's reports to the moderators, after the member is gone
- **What I'd change:** keep the reports a member filed when their account is deleted or merged, shown as "filed by a member who has since left".
- **What you'd notice:** the reports page keeps old reports instead of losing them when the reporter leaves.
- **If I guess wrong:** reports you wanted gone stay in the admin list until you resolve them.
- **Options:** (a) keep them, reporter shown as departed; (b) delete them with the member, as today, and change the privacy page to say so.
- **If you don't reply:** (a). The privacy page already promises it. (rows: T7a-01)

### Q2. A Catch-up ended while people are still answering
- **What I'd change:** when a Keeper ends a Catch-up mid-week, publish what was written so far before it closes.
- **What you'd notice:** ending a Catch-up sends out one last Edition with whatever answers are in.
- **If I guess wrong:** a Keeper who meant to cancel sends a half-empty Edition.
- **Options:** (a) publish first; (b) refuse to end until the week is out; (c) warn plainly that the answers will be thrown away.
- **If you don't reply:** (a). (rows: T2a-07)

### Q3. Changing your sign-in email and password from inside the site
- **What I'd change:** add "Change email" (a link goes to the new address) and "Change password" (asks for the current one) to Settings.
- **What you'd notice:** two new rows in Settings. A member who mistyped their email at signup can fix it themselves.
- **If I guess wrong:** two more controls in Settings you did not want.
- **Options:** (a) build both; (b) only the email change; (c) neither; you change emails by hand.
- **If you don't reply:** (a). Today a mistyped email that does not bounce is permanent. (rows: T5-01, T6-06)

### Q4. Telling a blocked member they are blocked
- **What I'd change:** at sign-in, a blocked member sees "This account is paused. Write to us." instead of "wrong password".
- **What you'd notice:** nothing, unless you block someone.
- **If I guess wrong:** a blocked member learns they were blocked.
- **Options:** (a) say it plainly; (b) keep "wrong password", but stop the reset page promising a link that never comes.
- **If you don't reply:** (a). (rows: T5-14)

### Q5. The "flagged" member state
- **What I'd change:** delete it, and show "reported N times" on a person's admin page instead.
- **What you'd notice:** the Flagged filter and chip leave the admin People list. Nothing could ever set them.
- **If I guess wrong:** you lose a state you meant to build later.
- **Options:** (a) delete it; (b) build it: a button that flags a member.
- **If you don't reply:** (a). (rows: T7a-08)

### Q6. Blocked and leaving members inside a Catch-up
- **What I'd change:** hide blocked members and members leaving the site from every Catch-up, as the feed already does.
- **What you'd notice:** their names and answers stop showing in Catch-ups; counts drop by one when you block someone.
- **If I guess wrong:** a member's past answers vanish from an Edition people remember reading.
- **Options:** (a) hide them everywhere in Catch-ups; (b) hide them from lists and counts, but keep their published answers.
- **If you don't reply:** (b). Published Editions stay as they were read. (rows: T2a-13, T2b-05)

### Q7. A photograph ticked into the Collection from a post
- **What I'd change:** nothing in the code. Say on the tick that the Collection gets the feed's smaller copy.
- **What you'd notice:** one line of small print under "Also add to the Collection".
- **If I guess wrong:** you wanted full resolution, and photos added this way stay smaller.
- **Options:** (a) keep the smaller copy and say so; (b) keep the original for the Collection (more storage, slower post).
- **If you don't reply:** (a). (rows: V-T4a-A, which rides on T4a-01)

### Q8. A supporter with a profile photo picks a bird
- **What I'd change:** tell them on the pick page, before they choose, that their photo will show instead of the bird.
- **What you'd notice:** one sentence on the bird picker for members with a photo.
- **If I guess wrong:** you wanted the paid bird to win over the photo.
- **Options:** (a) photo wins, say so first; (b) a picked bird replaces the photo everywhere.
- **If you don't reply:** (a). (rows: T8a-16)

### Q9. How a Catch-up's closing time is written
- **What I'd change:** name the last full day: "Last day to answer: Saturday", with "closes 7 am India time" in small print.
- **What you'd notice:** the deadline line changes wording on every Catch-up and in its reminders.
- **If I guess wrong:** the wording reads oddly to you. Today "Answers close Sunday" means the window is already shut on Sunday morning.
- **Options:** (a) last full day, plus the hour in small print; (b) the hour ("closes 7 am Sunday, India time"); (c) move the close to the end of the named day.
- **If you don't reply:** (a). (rows: T7b-15)

### Q10. What the analytics tool reads from a click
- **What I'd change:** stop PostHog reading the text and the link of anything that shows a person: names, cards, email and phone links.
- **What you'd notice:** click reports in PostHog lose those labels; everything else stays.
- **If I guess wrong:** you lose click detail you use.
- **Options:** (a) mask anything showing a person; (b) mask all text; (c) leave it.
- **If you don't reply:** (a). (rows: T7b-22, T7b-21)

### Q11. Inviting someone to a Catch-up by link
- **What I'd change:** bring back "Copy invite link" for Keepers. It lost its only button in the September rebuild; old links still work.
- **What you'd notice:** a copy-link row in a Catch-up's settings.
- **If I guess wrong:** you removed it on purpose.
- **Options:** (a) bring it back; (b) it was on purpose, so remove the join-by-link page too.
- **If you don't reply:** (a). (rows: T3-17)

### Q12. Your test account Jerry is an admin on the live site
- **What I'd change:** leave Jerry out of the admin bells and admin lists, but keep the admin role so checks still work.
- **What you'd notice:** Jerry no longer shows among the admins, and messages from members stop ringing Jerry.
- **If I guess wrong:** you wanted Jerry to be a plain member.
- **Options:** (a) keep admin, hide Jerry from admin fan-outs; (b) make Jerry a plain member.
- **If you don't reply:** (a). (rows: L10-05)

### Q13. When a new signup joins their batch's Catch-up
- **What I'd change:** keep enrolment at signup, but nobody can press a Catch-up's controls (publish early, extend, remove a question) until their email is confirmed.
- **What you'd notice:** nothing, for confirmed members. An unconfirmed one sees the controls asking them to confirm first.
- **If I guess wrong:** you wanted strangers kept out of batch Catch-ups entirely until vouched for.
- **Options:** (a) controls wait for a confirmed email; (b) also delay joining the batch until confirmed; (c) delay joining until vouched.
- **If you don't reply:** (a). The control fix ships either way. (rows: L10-01)

### Q14. Backups keep what a member erased
- **What I'd change:** have the nightly photo mirror delete what the live bucket deleted, 30 days later, and say in the privacy page that backups hold erased data for up to 30 days.
- **What you'd notice:** one sentence in the privacy page.
- **If I guess wrong:** a photo deleted by mistake cannot be recovered after 30 days.
- **Options:** (a) 30-day window, stated; (b) keep backups for ever and say so; (c) leave it as it is, unstated.
- **If you don't reply:** (a). (rows: L11-02)

### Q15. "Close and send it out" before anyone has answered
- **What I'd change:** pressing it on an Edition with no answers says "Nobody has answered yet" and offers "Give everyone 3 more days". It no longer quietly moves the deadline or sends an empty Edition.
- **What you'd notice:** a different message on that one press; nothing else.
- **If I guess wrong:** a Keeper who really wanted an empty Edition out cannot send one.
- **Options:** (a) refuse and offer more time; (b) publish the empty Edition at once; (c) keep today's behaviour, but say what it did.
- **If you don't reply:** (a). (rows: C3-01)

### Q16. Someone a Keeper removed, using an old invite link
- **What I'd change:** a member a Keeper removed cannot rejoin by an invite link; only a Keeper can add them back.
- **What you'd notice:** nothing, unless someone tries it.
- **If I guess wrong:** a removal you meant as temporary needs a Keeper to undo it.
- **Options:** (a) removal sticks against links; (b) links always work, as today.
- **If you don't reply:** (a). Ask beside Q11. (rows: L12-09)

### Q17. Editing a letter that is already published
- **What I'd change:** "Edit" on a published letter opens the full letter desk, the same page drafts use, instead of a small box.
- **What you'd notice:** editing a letter looks like writing one.
- **If I guess wrong:** you preferred a quick box for small corrections. The box is fixed either way so Save can be reached.
- **Options:** (a) open the desk; (b) keep the box, made scrollable.
- **If you don't reply:** (b) now, since it is the smaller change; (a) later if you want it. (rows: T8b-17)

### Q18. The entry question's answers are public
- **What I'd change:** move the trivia questions and answers out of the code (into the database the admin trivia room already uses), write a fresh set because the old answers stay in GitHub's history for good, and make the dinner question need a real dish, not any word containing "egg".
- **What you'd notice:** new entry questions at signup; the admin trivia room is where you edit them.
- **If I guess wrong:** you spend time writing questions for a gate you think of as a courtesy.
- **Options:** (a) move them and write new ones; (b) treat the gate as a speed bump, keep it as it is, and change the privacy page's "to no one else" to say what really keeps strangers out (confirming an email); (c) make the repository private again (old answers still leaked).
- **If you don't reply:** (a). The repository is public by your choice, which is fine for code but not for the gate's answers. (rows: C5-03)

### Q19. Verifying a new member from the office list by name
- **What I'd change:** verify automatically only when the signup email is on the office list. A match on name and batch year goes to your verify queue with the office-list row beside it, and is refused outright if another account already claimed that person.
- **What you'd notice:** a few more people in your verify queue: the ones who signed up with a different email from the one the school has.
- **If I guess wrong:** you do more verifying by hand.
- **Options:** (a) email match automatic, name match to you; (b) keep both automatic, but refuse a second account claiming the same person; (c) leave it.
- **If you don't reply:** (a). Today anyone with any working mailbox who types a real classmate's name and year is verified as them. 119 members were verified this way. (rows: O-08)
