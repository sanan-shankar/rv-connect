# Platform health: the owner's words, 2026-09-29

Cleaned transcript of everything the owner said in the session that opened this work. Fillers
removed; hedges, swearing, order and emphasis kept. Where a word was mis-heard by dictation it
stays as transcribed with the guess in square brackets. Paragraphs are numbered so
`handover.md` can point at them. **Read this before `handover.md`.**

## The opening message

**¶1.** I have to add one more thing to your task because I've just been procrastinating and keep
forgetting to deal with this. And it's such a major issue. But I did a bunch of checks before,
when there was like 50 people on the site. And it was like, okay, I can have 10,000 pictures on
here. The cost is manageable. I can have 2,000 users on here, but Hobby Vercel and the free
super base [Supabase] plan should be fine. But what the fuck, man? Now I got 150 people and then I had to
upgrade to Vercel Pro, and now there's like 280 and it's still holding up. But I was totally
caught blindsided by that. My fluid active CPU thing just hit 100% and it shut down my website
and I just had to upgrade.

**¶2.** But I checked and it said that it was fine. And then I checked again and I sent
screenshots of the charts and this and that, and it said, oh, it's because of uploading photos,
it's on Vercel. But that's not even it, because so many days I didn't upload any photos and there
was still so many minutes clocked on it. So you've just... That's just such a huge mistake on your
part. And I now have $20 worth of credits, I guess, because I paid $20. But for all I know, when
there's more people joining, you've done no actual checking. You're just assuring me everything's
fine when it was so clearly not. And now I'm out $20 because I had to keep my website alive.

**¶3.** And then I think I heard from one of the audits or something, there was a risk of even
Superbase [Supabase] running out. And it's like, dude, I chose this. I architected everything based on these
facts. And now after everything is done, after I have 300 members on it, you're telling me I
have to change.

**¶4.** And then every week, or no, not even every week, every single night, I receive an email
from Sentry saying a workflow has failed. And I just keep marking them as red [read], keep deleting
them. I've given you access to my inbox, so you can even see these emails. But what the hell?
What is failing? Why hasn't it been fixed? I keep marking them as red [read] because I'm like, okay,
it'll be fixed the next time, or the next commit will fix it. And then I see from one of the
audits that the backups haven't been working. And it's like, what the fuck is going on with my
website? All of these things that you assured me would be fine, they're just not fine. And how
can I even explain myself to anyone after this?

**¶5.** I've done four different audits for bugs and security and refactoring. And there are
still so many marked high. Look at the latest audit, it's partially done, but there's stuff
marked high priority and they sound pretty, pretty dangerous. And I don't know, maybe they made a
mistake in calling that out. Maybe it's not actually a problem, but if it is, what the fuck?

**¶6.** And you have my Vercel, right? You have access to everything. Why can't you just... you
have my super base [Supabase]. Are you... I've done the CLIs for all of these things. How can you not see what is taking
my fluid active CPU? What the hell is going on? How can I have lost so much of it? You keep
saying, yes, for every user or something, it takes only like 20 seconds or maximum a minute. No,
dude, there was barely anyone on the site and I blew through five hours and I had to upgrade.

**¶7.** And you keep telling me things will be fine. You keep telling me this and that, but what
the fuck? I'm so done with that. How can I release this website? And then I just have to keep
paying money because of some... This is exactly what dumb people do when they vibe code. And I've
done so much to ensure that I'm taking every precaution to not do this. And then this is still
happening, even because I saw this coming and I explicitly ran two sessions just to target this.
And it still was a problem. I just don't understand how this could happen. So fucking
unacceptable.

## During the session

**¶8.** (A macOS keychain prompt appeared when the session ran `supabase projects list`.) "I just
got this. what's going on" — he was told to click Deny.

**¶9.** He sent seven Supabase dashboard screenshots: "a bunch screenshots from supabase". What
they showed is recorded in `handover.md`, "Supabase, as of 2026-09-29".

**¶10.** Asked how to turn prefetching off, he chose "Off everywhere (Recommended)". Asked about
pushing: "i'll push when everythings done".

**¶11.** Then:

> go ahead. solve all the problems. push when you need and just keep going until it's all done.
> How did you [find it, when you] are supposedly smarter than both the other sessions that I've
> run through this? Give me a final confirmation about the cell [Vercel] plan and the Superbase
> [Supabase] plan lasting till 2,000 members and being perfectly fine. Because I understand that
> in Vercel you will probably need to monitor the next month and see how it goes. That part I
> understand. At least Superbase [Supabase], make sure that it is perfectly fine for the next
> month, because yeah, I really can't tolerate any more nonsense.

**¶12.** "got an email from vercel saying the preview deployment failed"

**¶13.** "kowalski" (the progress-report keyword, CLAUDE.md).

**¶14.** Quoting the session's own line back — "I still need your Supabase dashboard change —
enabling Data API and restricting exposed schemas to just api in both projects — since I can't
do that without your login." — he asked: "give me click by click instructions".

**¶15.** "usage limit might hit at any time so make sure your work is fully resumable."
