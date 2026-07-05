# Copy inventory

This is every user-facing string on Rishi Valley, pulled from the codebase and grouped by where it appears. The owner reviews the text route by route. Leave a line alone and it ships as written. To change a line, write the replacement text directly under it (in the machine copy at `.copy-review/inventory.json`, set that entry's `replacement` field; anyone doing this by hand in this document should also update the JSON, since the JSON is what a build step will read from). Unmarked text stays exactly as shown.

Each entry shows the exact text as a quote, followed by the situation that triggers it (including any conditions), the file and line it lives in, and its kind (heading, body, button, label, placeholder, tooltip, helper, empty-state, validation, error, toast, notification, or metadata).

Sections run: landing page, /about, /login, /signup, /onboarding, global chrome (sidebar, footer, header, shared components), /feed, Letters, /directory, /groups, /catchups, /collection, /profile, /settings, notifications (bell/panel chrome), /support, /admin, 404/error pages, then three cross-cutting groups that pull matching strings out of every route above: validation messages, notification templates, and toasts.

## Landing page (/)

> Rishi Valley
- where: sticky slim nav bar, visible once the hero is scrolled past (hidden again over the closing CTA band); wordmark text; file: src/components/landing/landing-nav.tsx:59; kind: body

> Sign in
- where: visible once scrolled past hero; file: src/components/landing/landing-nav.tsx:67; kind: button

> Join
- where: visible once scrolled past hero; file: src/components/landing/landing-nav.tsx:73; kind: button

> Rishi Valley
- where: always visible, hero top-left wordmark; file: src/components/landing/landing-hero.tsx:287; kind: body

> Welcome back to the valley.
- where: always visible, hero headline; file: src/components/landing/landing-hero.tsx:298; kind: heading

> A space for the Rishi Valley community to stay connected.
- where: always visible, hero subhead; file: src/components/landing/landing-hero.tsx:301; kind: body

> Join the community
- where: always visible, primary hero CTA (also launches the hoopoe flight animation to /signup); file: src/components/landing/landing-hero.tsx:309; kind: button

> Sign in
- where: always visible, secondary hero CTA (also launches the hoopoe flight animation to /login); file: src/components/landing/landing-hero.tsx:316; kind: button

> See what's inside
- where: always visible, scroll-down cue beneath the hero CTAs; file: src/components/landing/landing-hero.tsx:329; kind: body

> Rishi Valley
- where: landing page title override (absolute, ignores the root template); file: src/app/page.tsx:17; kind: metadata

> A space for the Rishi Valley community to stay connected.
- where: landing page meta description; file: src/app/page.tsx:20; kind: metadata

> What is inside
- where: always visible, intro band eyebrow just above the fold; file: src/app/page.tsx:74; kind: heading

> The valley scattered everyone. This is where they find each other.
- where: always visible, intro band heading; file: src/app/page.tsx:77; kind: heading

> Old batchmates and the teachers who taught them. The first batches and the ones who left last summer. One of us built it and looks after it, for the rest of us.
- where: always visible, intro band body copy; file: src/app/page.tsx:80; kind: body

> The Directory
- where: always visible, Directory feature section eyebrow; file: src/app/page.tsx:90; kind: heading

> Everyone, and where they landed.
- where: always visible, Directory feature section title; file: src/app/page.tsx:91; kind: heading

> Search by batch, by house, by the city someone lives in now, or by what they do for a living. The friend you last saw at the 2009 leavers' assembly is three taps from here.
- where: always visible, Directory feature section body; file: src/app/page.tsx:92; kind: body

> A map with a pin on every town the valley reached
- where: always visible, Directory feature bullet list item 1; file: src/app/page.tsx:94; kind: body

> A bird stands in for anyone who has not added a photo yet
- where: always visible, Directory feature bullet list item 2; file: src/app/page.tsx:95; kind: body

> The directory: a grid of people, each with a bird for an avatar.
- where: always visible, alt text on the Directory showcase screenshot; file: src/app/page.tsx:100; kind: label

> the bird you get until you add a face
- where: scroll-triggered hand-drawn margin annotation pointing at a bird avatar in the Directory shot; file: src/app/page.tsx:102; kind: body

> The Feed
- where: always visible, Feed feature section eyebrow; file: src/app/page.tsx:112; kind: heading

> What everyone is up to, on one page.
- where: always visible, Feed feature section title; file: src/app/page.tsx:113; kind: heading

> A pair of grey hornbills at the fig tree by the amphitheatre. A wedding. A new job in a city nobody expected. A question for whoever still remembers the old library. It moves at the pace the valley did.
- where: always visible, Feed feature section body; file: src/app/page.tsx:114; kind: body

> The feed: posts from the valley, one after another down the page.
- where: always visible, alt text on the Feed showcase screenshot; file: src/app/page.tsx:119; kind: label

> settle it with a poll
- where: scroll-triggered hand-drawn margin annotation pointing at the poll in the Feed shot; file: src/app/page.tsx:121; kind: body

> Letters
- where: always visible, Letters feature section eyebrow; file: src/app/page.tsx:131; kind: heading

> Some things need more than a post.
- where: always visible, Letters feature section title; file: src/app/page.tsx:132; kind: heading

> Write a Letter instead: the teacher who changed the shape of your life, or a whole essay about the year you finally understood what the place was for. It opens on a page made for reading slowly.
- where: always visible, Letters feature section body; file: src/app/page.tsx:133; kind: body

> The Letters page, with a long-form piece about the valley.
- where: always visible, alt text on the Letters showcase screenshot; file: src/app/page.tsx:137; kind: label

> Catch-ups
- where: always visible, Catch-ups feature section eyebrow; file: src/app/page.tsx:144; kind: heading

> A letter that comes round every season.
- where: always visible, Catch-ups feature section title; file: src/app/page.tsx:145; kind: heading

> A few questions land in your inbox. You answer when you get a moment. Once everyone has, all the answers arrive together, so you hear from people you would never have thought to email.
- where: always visible, Catch-ups feature section body; file: src/app/page.tsx:146; kind: body

> The Catch-ups feature, a gathered group newsletter.
- where: always visible, alt text on the Catch-ups showcase screenshot; file: src/app/page.tsx:151; kind: label

> The Valley Collection
- where: always visible, Valley Collection feature section eyebrow; file: src/app/page.tsx:159; kind: heading

> The valley remembers.
- where: always visible, Valley Collection feature section title; file: src/app/page.tsx:160; kind: heading

> Photographs going back decades. The banyan before the storm took the far branch. Choir on the assembly steps. Founders' Week, class by class. The light coming off Rishikonda at six in the morning.
- where: always visible, Valley Collection feature section body; file: src/app/page.tsx:161; kind: body

> The Valley Collection, a shared archive of valley photographs.
- where: always visible, alt text on the Valley Collection showcase screenshot; file: src/app/page.tsx:165; kind: label

> add the ones only you still have
- where: scroll-triggered hand-drawn margin annotation pointing at the contribute button in the Collection shot; file: src/app/page.tsx:167; kind: body

> Ananya Krishnan, Rohan Mehta, Meera Iyer, Arjun Reddy, Fatima Sheikh
- where: always visible, static placeholder names used purely to illustrate the overlapping-avatar 'vouched for' graphic (not real users); file: src/components/landing/trust-section.tsx:4; kind: body

> Invite only
- where: always visible, Trust section eyebrow; file: src/components/landing/trust-section.tsx:24; kind: heading

> Small on purpose.
- where: always visible, Trust section title; file: src/components/landing/trust-section.tsx:27; kind: heading

> Someone already in vouches for you, and the school checks your name against the rolls. There are no open sign-ups here, and nobody is chasing a bigger number. You will know the place by who turns up in it.
- where: always visible, Trust section body paragraph 1; file: src/components/landing/trust-section.tsx:30; kind: body

> It will not ask you to keep up with it. There is no algorithm and no one selling your attention. Only the people you grew up with, and the valley you grew up in.
- where: always visible, Trust section body paragraph 2 (bolder emphasis); file: src/components/landing/trust-section.tsx:35; kind: body

> 10 people vouched
- where: always visible, hardcoded pill chip under the avatar row in the Trust section; file: src/components/landing/trust-section.tsx:60; kind: label

> Everyone starts as a bird. Add a photo of your face whenever you are ready, or keep the bird.
- where: always visible, caption under the Trust section avatar illustration; file: src/components/landing/trust-section.tsx:63; kind: body

> Come back to the valley.
- where: always visible, closing band heading; file: src/components/landing/landing-footer.tsx:14; kind: heading

> If you grew up here, or taught here, or looked after the place while the rest of us grew up, you already belong. Come and find everyone else.
- where: always visible, closing band body; file: src/components/landing/landing-footer.tsx:18; kind: body

> Join the community
- where: always visible, repeats the primary CTA; file: src/components/landing/landing-footer.tsx:26; kind: button

> Sign in
- where: always visible, repeats the secondary CTA; file: src/components/landing/landing-footer.tsx:32; kind: button

> Rishi Valley
- where: always visible, footer wordmark; file: src/components/landing/landing-footer.tsx:45; kind: body

> A space for the Rishi Valley community to stay connected.
- where: always visible, footer tagline next to the wordmark; file: src/components/landing/landing-footer.tsx:48; kind: body

> Search the valley
- where: always visible, static text inside the faux in-app search bar overlaid on every landing screenshot frame; file: src/components/landing/showcase-shot.tsx:63; kind: label

## /about

> About Rishi Valley
- where: hand-rolled page heading, always visible; file: src/app/(main)/about/page.tsx:13; kind: heading

> A space for the Rishi Valley community to stay connected.
- where: hand-rolled page subtitle, always visible; file: src/app/(main)/about/page.tsx:16; kind: body

> About
- where: tab title, always; file: src/app/(main)/about/page.tsx:6; kind: metadata

## /login

> Sign in
- where: browser tab title, combines with root template to read 'Rishi Valley · Sign in'; file: src/app/(auth)/login/layout.tsx:4; kind: metadata

> Rishi Valley
- where: always visible, wordmark over the photo panel (desktop only); file: src/app/(auth)/login/page.tsx:251; kind: body

> Welcome back
- where: always visible, form heading; file: src/app/(auth)/login/page.tsx:282; kind: heading

> Sign in to reconnect with the people who grew up under the same trees.
- where: always visible, form subhead; file: src/app/(auth)/login/page.tsx:285; kind: body

> Email
- where: always visible, email field label; file: src/app/(auth)/login/page.tsx:290; kind: label

> you@example.com
- where: always visible, email field placeholder; file: src/app/(auth)/login/page.tsx:294; kind: placeholder

> Password
- where: password field label, hidden only when the typed email exactly matches the configured admin bypass email; file: src/app/(auth)/login/page.tsx:307; kind: label

> Your password
- where: password field placeholder, same admin-bypass condition as above; file: src/app/(auth)/login/page.tsx:312; kind: placeholder

> Hide password / Show password
- where: aria-label on the password visibility toggle, text flips with state; file: src/app/(auth)/login/page.tsx:327; kind: tooltip

> Invalid email or password.
- where: shown when NextAuth credentials sign-in returns an error (wrong email/password); file: src/app/(auth)/login/page.tsx:196; kind: error

> Something went wrong. Please try again.
- where: shown when the submit handler throws an unexpected exception; file: src/app/(auth)/login/page.tsx:201; kind: error

> Sign in / Signing in...
- where: submit button, label swaps to the loading variant while the request is in flight; file: src/app/(auth)/login/page.tsx:342; kind: button

> New here?
- where: always visible, sign-up nudge below the form; file: src/app/(auth)/login/page.tsx:347; kind: body

> Join
- where: always visible, link inside the sign-up nudge; file: src/app/(auth)/login/page.tsx:352; kind: button

> Not available
- where: admin bypass attempted but ADMIN_EMAIL or the auth secret is not configured on the server; file: src/app/api/auth/admin-login/route.ts:12; kind: error

> Not authorized
- where: admin bypass attempted with an email that does not match the configured ADMIN_EMAIL; file: src/app/api/auth/admin-login/route.ts:18; kind: error

> No account found. Please sign up first.
- where: admin bypass attempted for the configured admin email but no matching user row exists yet; file: src/app/api/auth/admin-login/route.ts:24; kind: error

> Back
- where: always visible: top-left link back to the landing page on the login screen; file: src/app/(auth)/login/page.tsx; kind: button

## /signup

> Join
- where: browser tab title, combines with root template to read 'Rishi Valley · Join'; file: src/app/(auth)/signup/layout.tsx:4; kind: metadata

> Rishi Valley
- where: always visible, wordmark over the photo panel (desktop only); file: src/app/(auth)/signup/page.tsx:134; kind: body

> Back
- where: always visible, back link to landing; file: src/app/(auth)/signup/page.tsx:149; kind: button

> First, a quick check
- where: trivia step (shown first, before registration); file: src/app/(auth)/signup/page.tsx:180; kind: heading

> Answer this to prove you're one of us.
- where: trivia step subhead; file: src/app/(auth)/signup/page.tsx:183; kind: body

> Join the community
- where: registration step, shown after the trivia question is answered correctly; file: src/app/(auth)/signup/page.tsx:196; kind: heading

> Tell us a bit about yourself so your batchmates can find you.
- where: registration step subhead; file: src/app/(auth)/signup/page.tsx:199; kind: body

> ...
- where: placeholder shown for a fraction of a second while the trivia question is being fetched from the server; file: src/components/auth/trivia-gate.tsx:61; kind: body

> Your answer...
- where: always visible, answer field placeholder; file: src/components/auth/trivia-gate.tsx:65; kind: placeholder

> Not quite. Have another go.
- where: client-side fallback wrong-answer message, used only if the server response omits its own error text; file: src/components/auth/trivia-gate.tsx:48; kind: error

> Something went wrong. Please try again.
- where: shown when the trivia check request throws (network/exception); file: src/components/auth/trivia-gate.tsx:52; kind: error

> Check / Checking...
- where: submit button, label swaps while the answer is being checked; file: src/components/auth/trivia-gate.tsx:85; kind: button

> Already have an account?
- where: always visible, link to sign in for people who already have an account; file: src/components/auth/trivia-gate.tsx:88; kind: body

> Sign in
- where: always visible, link text inside the above line; file: src/components/auth/trivia-gate.tsx:94; kind: button

> What tree was the school built around?
- where: one of two randomly chosen trivia questions shown to gate sign-up; file: src/components/auth/trivia-actions.ts:21; kind: body

> What house is next to Krishna?
- where: the other randomly chosen trivia question; file: src/components/auth/trivia-actions.ts:26; kind: body

> Too many attempts. Please wait a few minutes and try again.
- where: more than 8 trivia attempts from the same client within a 10-minute window; file: src/components/auth/trivia-actions.ts:77; kind: error

> That question expired. Please try again.
- where: submitted trivia question id does not match any known question (stale/expired reference); file: src/components/auth/trivia-actions.ts:90; kind: error

> Not quite. Have another go.
- where: canonical server-side wrong-answer message returned to the client; file: src/components/auth/trivia-actions.ts:95; kind: error

> Please answer the entry question before signing up.
- where: registerUser server action is called without a valid trivia-pass cookie (gate bypass attempt); file: src/components/auth/actions.ts:13; kind: error

> Password must be at least 8 characters.
- where: server-side re-check: submitted password is under 8 characters; file: src/components/auth/actions.ts:19; kind: error

> An account with this email already exists. Try signing in instead.
- where: submitted email already belongs to an existing account; file: src/components/auth/actions.ts:68; kind: error

> Full Name
- where: always visible, name field label; file: src/components/auth/signup-form.tsx:255; kind: label

> Your full name
- where: always visible, name field placeholder; file: src/components/auth/signup-form.tsx:259; kind: placeholder

> Email
- where: always visible, email field label; file: src/components/auth/signup-form.tsx:268; kind: label

> you@example.com
- where: always visible, email field placeholder; file: src/components/auth/signup-form.tsx:273; kind: placeholder

> Password
- where: always visible, password field label; file: src/components/auth/signup-form.tsx:280; kind: label

> At least 8 characters
- where: always visible, password field placeholder; file: src/components/auth/signup-form.tsx:286; kind: placeholder

> Hide password / Show password
- where: aria-label on the password visibility toggle, text flips with state; file: src/components/auth/signup-form.tsx:299; kind: tooltip

> Confirm Password
- where: always visible, confirm-password field label; file: src/components/auth/signup-form.tsx:308; kind: label

> Confirm your password
- where: always visible, confirm-password field placeholder; file: src/components/auth/signup-form.tsx:313; kind: placeholder

> I am a...
- where: always visible, account-type toggle label; file: src/components/auth/signup-form.tsx:322; kind: label

> Alumnus
- where: always visible, account-type toggle option; file: src/components/auth/signup-form.tsx:175; kind: label

> Teacher
- where: always visible, account-type toggle option; file: src/components/auth/signup-form.tsx:176; kind: label

> What if I used to teach?
- where: aria-label of the circled-i info button next to the account-type toggle; file: src/components/auth/signup-form.tsx:347; kind: tooltip

> Taught at Rishi Valley at any point? Choose Teacher, it includes teachers who have since moved on too.
- where: popover content shown on hover/tap of the account-type info icon; file: src/components/auth/signup-form.tsx:348; kind: tooltip

> Teachers do not need a batch. If you also studied at Rishi Valley, you can add your batch later from your profile.
- where: shown only when the Teacher account type is selected; file: src/components/auth/signup-form.tsx:355; kind: helper

> Year joined
- where: shown only when Alumnus is selected, schooling fields; file: src/components/auth/signup-form.tsx:365; kind: label

> 2014
- where: shown only when Alumnus is selected, year-joined placeholder; file: src/components/auth/signup-form.tsx:371; kind: placeholder

> Year left
- where: shown only when Alumnus is selected, schooling field label; file: src/components/auth/signup-form.tsx:380; kind: label

> 2021
- where: shown only when Alumnus is selected, year-left placeholder; file: src/components/auth/signup-form.tsx:386; kind: placeholder

> Grade joined
- where: shown only when Alumnus is selected, schooling field label; file: src/components/auth/signup-form.tsx:395; kind: label

> 4
- where: shown only when Alumnus is selected, grade-joined placeholder; file: src/components/auth/signup-form.tsx:401; kind: placeholder

> Joined before 4th grade?
- where: shown only when Alumnus is selected, prompt next to the info icon below the schooling fields; file: src/components/auth/signup-form.tsx:412; kind: body

> Guidance for those who joined before 4th grade
- where: aria-label of the info icon answering the 'joined before 4th grade' question; file: src/components/auth/signup-form.tsx:413; kind: tooltip

> Rishi Valley batches count from 4th grade onward. Joined earlier than that? Enter the year you started 4th grade, with grade 4.
- where: popover content for the 'joined before 4th grade' info icon; file: src/components/auth/signup-form.tsx:414; kind: tooltip

> When you joined, when you left, and the grade you started in. We work out your batch from that, even if you left before 12th.
- where: shown only when Alumnus is selected, helper text under the schooling fields; file: src/components/auth/signup-form.tsx:420; kind: helper

> You'll join
- where: live batch preview, shown once all three schooling fields are filled and valid; file: src/components/auth/signup-form.tsx:437; kind: body

> Batch of {batchYear}
- where: live batch preview value, same trigger as above; {batchYear} is the computed batch year; file: src/components/auth/signup-form.tsx:440; kind: body

> Account created but sign in failed. Please log in manually.
- where: registration succeeded but the automatic sign-in immediately after failed; file: src/components/auth/signup-form.tsx:232; kind: error

> Something went wrong. Please try again.
- where: submit handler throws an unexpected exception; file: src/components/auth/signup-form.tsx:243; kind: error

> Join / Creating account...
- where: submit button, label swaps to the loading variant while creating the account; file: src/components/auth/signup-form.tsx:462; kind: button

> Everyone from the batch of {year}.
- where: joinBatchGroup: description set on a newly created 'Batch of {year}' group the first time someone from that batch signs up; file: src/components/auth/actions.ts:124; kind: body

> First name
- where: label above the first-name field (the signup form splits name into two fields; a stale 'Full Name' label from an earlier layout no longer exists in the code); file: src/components/auth/signup-form.tsx; kind: label

> Surname
- where: label above the surname field; file: src/components/auth/signup-form.tsx; kind: label

> Your first name
- where: placeholder in the first-name input; file: src/components/auth/signup-form.tsx; kind: placeholder

> Your surname
- where: placeholder in the surname input; file: src/components/auth/signup-form.tsx; kind: placeholder

> 2023
- where: placeholder in the year-left number input for alumni; file: src/components/auth/signup-form.tsx; kind: placeholder

> If you joined before 4th grade, enter the year you started 4th grade and put the grade joined as 4.
- where: body text of the info tooltip opened by the circled-i next to 'Joined before 4th grade?' (the previously recorded tooltip body text for this file does not match what is actually in the code); file: src/components/auth/signup-form.tsx; kind: tooltip

## /onboarding

> Complete your profile
- where: browser tab title; file: src/app/(auth)/onboarding/layout.tsx:4; kind: metadata

> Complete your profile
- where: always visible, card title; file: src/app/(auth)/onboarding/page.tsx:39; kind: heading

> Help your batchmates find and recognize you. You can always update this later.
- where: always visible, card description; file: src/app/(auth)/onboarding/page.tsx:42; kind: body

> Bio
- where: always visible, bio field label; file: src/app/(auth)/onboarding/page.tsx:49; kind: label

> A few words about yourself...
- where: always visible, bio field placeholder; file: src/app/(auth)/onboarding/page.tsx:53; kind: placeholder

> Current City
- where: always visible, city field label; file: src/app/(auth)/onboarding/page.tsx:60; kind: label

> e.g. Bangalore
- where: always visible, city field placeholder; file: src/app/(auth)/onboarding/page.tsx:64; kind: placeholder

> Industry
- where: always visible, industry select label; file: src/app/(auth)/onboarding/page.tsx:70; kind: label

> Select / Technology / Finance / Healthcare / Education / Arts & Media / Law / Government / Non-profit / Research / Consulting / Entrepreneurship / Agriculture / Student / Other
- where: always visible, industry select placeholder option plus the full fixed option list; file: src/app/(auth)/onboarding/page.tsx:77; kind: label

> Job Title
- where: always visible, job title field label; file: src/app/(auth)/onboarding/page.tsx:95; kind: label

> e.g. Engineer
- where: always visible, job title field placeholder; file: src/app/(auth)/onboarding/page.tsx:99; kind: placeholder

> Instagram
- where: always visible, Instagram field label; file: src/app/(auth)/onboarding/page.tsx:106; kind: label

> @handle
- where: always visible, Instagram field placeholder; file: src/app/(auth)/onboarding/page.tsx:110; kind: placeholder

> LinkedIn
- where: always visible, LinkedIn field label; file: src/app/(auth)/onboarding/page.tsx:114; kind: label

> Profile URL
- where: always visible, LinkedIn field placeholder; file: src/app/(auth)/onboarding/page.tsx:118; kind: placeholder

> Phone
- where: always visible, phone field label; file: src/app/(auth)/onboarding/page.tsx:124; kind: label

> +91 98765 43210
- where: always visible, phone field placeholder; file: src/app/(auth)/onboarding/page.tsx:128; kind: placeholder

> Skip for now
- where: always visible, skip button; file: src/app/(auth)/onboarding/page.tsx:139; kind: button

> Save & continue / Saving...
- where: submit button, label swaps to the loading variant while saving; file: src/app/(auth)/onboarding/page.tsx:147; kind: button

## Global chrome (sidebar, footer, header, tab titles, shared components)

> Rishi Valley
- where: default document title when a page sets no title of its own; file: src/app/layout.tsx:22; kind: metadata

> Rishi Valley · %s
- where: title template applied to every child page's title (e.g. Sign in becomes 'Rishi Valley · Sign in'); file: src/app/layout.tsx:23; kind: metadata

> A space for the Rishi Valley community to stay connected.
- where: default meta description, inherited by any page without its own; file: src/app/layout.tsx:26; kind: metadata

> Verified teacher / Verified former teacher / Verified member
- where: tooltip revealed on hover/focus of the small leaf verified badge next to a name; wording depends on the person's account type. Surfaces on feed post cards and (via IdentityRow) letter bylines.; file: src/components/common/verified-mark.tsx:27; kind: tooltip

> {minutes}m ago
- where: item is under 60 minutes old; file: src/lib/utils.ts:14; kind: helper

> {hours}h ago
- where: item is under 24 hours old; file: src/lib/utils.ts:16; kind: helper

> {days}d ago
- where: item is under 7 days old; file: src/lib/utils.ts:18; kind: helper

> {weeks}w ago
- where: item is under 4 weeks old; file: src/lib/utils.ts:20; kind: helper

> ?
- where: edge case: a user's name resolves to zero name parts (rare/possibly unreachable given how split() behaves on empty strings); file: src/lib/utils.ts:41; kind: helper

> Feed
- where: always visible desktop/mobile nav item; file: src/components/layout/sidebar.tsx:53; kind: label

> Directory
- where: always visible nav item; file: src/components/layout/sidebar.tsx:54; kind: label

> Groups
- where: always visible nav item; file: src/components/layout/sidebar.tsx:55; kind: label

> Collection
- where: always visible nav item; file: src/components/layout/sidebar.tsx:56; kind: label

> Letters
- where: always visible nav item; file: src/components/layout/sidebar.tsx:57; kind: label

> Catch-ups
- where: always visible nav item; file: src/components/layout/sidebar.tsx:58; kind: label

> About
- where: always visible nav item; file: src/components/layout/sidebar.tsx:59; kind: label

> Rishi Valley
- where: always visible mobile top bar / drawer wordmark; file: src/components/layout/sidebar.tsx:88; kind: label

> My Profile
- where: desktop user-menu dropdown item, always available; file: src/components/layout/sidebar.tsx:176; kind: label

> Settings
- where: desktop user-menu dropdown item; file: src/components/layout/sidebar.tsx:180; kind: label

> Admin Panel
- where: desktop user-menu dropdown item, shown only to admins; file: src/components/layout/sidebar.tsx:185; kind: label

> Sign out
- where: desktop user-menu dropdown item, always available; file: src/components/layout/sidebar.tsx:194; kind: button

> Open menu
- where: aria-label on the hamburger button that opens the mobile nav drawer; file: src/components/layout/sidebar.tsx:233; kind: tooltip

> Menu
- where: screen-reader-only title for the mobile nav drawer sheet; file: src/components/layout/sidebar.tsx:243; kind: label

> Close menu
- where: aria-label on the close button inside the mobile nav drawer; file: src/components/layout/sidebar.tsx:247; kind: tooltip

> Admin
- where: mobile drawer footer link, admins only -- note this reads 'Admin' while the desktop equivalent reads 'Admin Panel', an inconsistency; file: src/components/layout/sidebar.tsx:282; kind: label

> Rishi Valley, home
- where: aria-label on the sidebar logo/home link; file: src/components/layout/logo-fact.tsx:92; kind: tooltip

> Rishi Valley
- where: always visible wordmark next to the logo; file: src/components/layout/logo-fact.tsx:105; kind: label

> Did you know
- where: eyebrow label on the tooltip card revealed on hover/focus of the sidebar logo; file: src/components/layout/logo-fact.tsx:120; kind: label

> The valley is a recognised bird sanctuary. Patient watchers have logged more than two hundred species along the same dry-stream paths the children walk to class.
- where: one of ten 'valley facts', chosen at random once per page load, shown when the sidebar logo is hovered or focused; file: src/components/layout/logo-fact.tsx:23; kind: tooltip

> There are no bells. Lessons begin and end by a shared sense of time, an idea Krishnamurti held to so that attention was never summoned by a ringing.
- where: one of ten 'valley facts', random per page load, shown on hover/focus of the sidebar logo; file: src/components/layout/logo-fact.tsx:24; kind: tooltip

> Three hills frame the school: Bodikonda to the west, Middle Peak in the centre, and Rishikonda to the east, the granite ridge that gives the valley its first light.
- where: one of ten 'valley facts', random per page load, shown on hover/focus of the sidebar logo; file: src/components/layout/logo-fact.tsx:25; kind: tooltip

> The great banyan is old enough that its dropped roots have become trunks of their own, so a single tree now shelters whole classes sitting in its shade.
- where: one of ten 'valley facts', random per page load, shown on hover/focus of the sidebar logo; file: src/components/layout/logo-fact.tsx:26; kind: tooltip

> Asthachal, the sunset-watching place, is kept in silence. Students gather at dusk to watch the light leave the hills and say nothing at all.
- where: one of ten 'valley facts', random per page load, shown on hover/focus of the sidebar logo; file: src/components/layout/logo-fact.tsx:27; kind: tooltip

> The open-air amphitheatre is cut into a slope, so an unamplified voice on the stone floor carries cleanly to the back row.
- where: one of ten 'valley facts', random per page load, shown on hover/focus of the sidebar logo; file: src/components/layout/logo-fact.tsx:28; kind: tooltip

> Jiddu Krishnamurti founded the school in 1926 with the wish that learning happen without fear, reward, or comparison between one child and the next.
- where: one of ten 'valley facts', random per page load, shown on hover/focus of the sidebar logo; file: src/components/layout/logo-fact.tsx:29; kind: tooltip

> Decades of careful planting turned eroded scrubland back into woodland, and the returning birds were the first sign that the valley had healed.
- where: one of ten 'valley facts', random per page load, shown on hover/focus of the sidebar logo; file: src/components/layout/logo-fact.tsx:30; kind: tooltip

> The houses are named for trees and hills of the valley, so a student's first address is also a small lesson in what grows around them.
- where: one of ten 'valley facts', random per page load, shown on hover/focus of the sidebar logo; file: src/components/layout/logo-fact.tsx:31; kind: tooltip

> Rain is read, not forecast. Old students still tell which hill the clouds will break over by the way the wind turns through the three peaks.
- where: one of ten 'valley facts', random per page load, shown on hover/focus of the sidebar logo; file: src/components/layout/logo-fact.tsx:32; kind: tooltip

> Search the valley...
- where: placeholder text inside the expanded header search pill; file: src/components/layout/search-pill.tsx:177; kind: placeholder

> Search the valley
- where: aria-label on the expanded search input; file: src/components/layout/search-pill.tsx:178; kind: tooltip

> Rishi Valley School
- where: always visible external link to the school's own site; file: src/components/layout/footer.tsx:20; kind: label

> Support
- where: always visible link to the support/donate page; file: src/components/layout/footer.tsx:25; kind: label

> Feedback
- where: always visible link that opens the Tally feedback form; file: src/components/layout/footer.tsx:43; kind: label

> Rishi Valley (default); "Rishi Valley · %s" (template)
- where: root layout metadata: default title and template applied to every page unless overridden; file: src/app/layout.tsx:21; kind: metadata

> Copy link
- where: default aria-label fallback when a caller does not pass an explicit `label` prop; currently dead code since every call site (post-card.tsx, letter-engagement.tsx) passes its own label, but it is live text on the component's public API; file: src/components/common/share-button.tsx; kind: label

> Member profile
- where: default aria-label fallback on the avatar link when neither avatarLabel nor user.name is provided; currently unused since every call site supplies a name, but part of the component's copy surface; file: src/components/common/identity-row.tsx; kind: label

> Save
- where: default aria-label fallback text for the unsaved state when a caller does not pass an explicit `label` prop; currently unused since both call sites (post-card.tsx, letter-engagement.tsx) pass explicit labels; file: src/components/common/bookmark-button.tsx; kind: label

## /feed

> Feed
- where: always visible (browser tab / document title, rendered via the root layout's "Rishi Valley · %s" template as "Rishi Valley · Feed"); file: src/app/(main)/feed/page.tsx:10; kind: metadata

> What the valley is sharing today.
- where: always visible, page subtitle under the heading; file: src/app/(main)/feed/page.tsx:29; kind: body

> New post
- where: always visible, header primary action button; focuses/expands the composer on click; file: src/components/feed/new-post-cta.tsx:28; kind: button

> Share a memory, a sighting, or a note for the valley
- where: composer collapsed pill text and expanded textarea placeholder when composing a normal post (default scope); file: src/components/posts/create-post-form.tsx:33; kind: placeholder

> Bold / Italic / Underline / Strikethrough
- where: title/aria-label tooltip on the four inline rich-text formatting buttons in the composer toolbar; file: src/components/posts/create-post-form.tsx:292; kind: tooltip

> Photo
- where: attach-photo button label; switches to the uploading label while a file is in flight; file: src/components/posts/create-post-form.tsx:379; kind: button

> Uploading...
- where: attach-photo button label while an image upload request is in flight; file: src/components/posts/create-post-form.tsx:379; kind: button

> More (aria-label: "More post options")
- where: the "More" overflow trigger that reveals poll/letter options; visible text plus its aria-label; file: src/components/posts/create-post-form.tsx:392; kind: button

> Add a poll / Remove poll
- where: toggle in the More menu; label flips depending on whether a poll is already attached; file: src/components/posts/create-post-form.tsx:424; kind: button

> Write as a Letter / Back to a post
- where: toggle in the More menu that switches the composer between a normal post and a letter; label flips with the current kind; file: src/components/posts/create-post-form.tsx:440; kind: button

> Post / Posting... / Publish letter / Publishing...
- where: primary submit button; text changes between a normal post and a letter, and while the request is in flight; file: src/components/posts/create-post-form.tsx:477; kind: button

> Poll Options
- where: small caption above the poll option inputs while building a poll; file: src/components/posts/poll-creator.tsx:36; kind: label

> Option {n}
- where: placeholder for each poll option input; {n} is the option's 1-based position; file: src/components/posts/poll-creator.tsx:50; kind: placeholder

> Add option
- where: button to add another poll option, shown while under the 4-option cap; file: src/components/posts/poll-creator.tsx:76; kind: button

> Search the valley...
- where: search box placeholder, only rendered when showControls is true (currently the main /feed page passes showControls=false, so this is reachable today only from the group feed); file: src/components/posts/post-feed.tsx:143; kind: placeholder

> Filters
- where: disclosure button that reveals the sort/time filter row; only rendered when showControls is true; file: src/components/posts/post-feed.tsx:161; kind: button

> Most recent / Most liked / Most discussed
- where: sort-by dropdown options, shown once the Filters disclosure is open; file: src/components/posts/post-feed.tsx:171; kind: label

> All time / Today / This week / This month / This year
- where: time-range dropdown options, shown once the Filters disclosure is open; file: src/components/posts/post-feed.tsx:181; kind: label

> No posts match your search.
- where: empty state shown when a search query returns zero posts; file: src/components/posts/post-feed.tsx:213; kind: empty-state

> Try different keywords or clear your search.
- where: empty-state hint shown beneath the above, when a search query returns zero posts; file: src/components/posts/post-feed.tsx:218; kind: empty-state

> No stories yet. Be the first to share a memory.
- where: default empty-state heading when there is no search and the feed has no posts at all (no emptyTitle override passed); file: src/components/posts/post-feed.tsx:214; kind: empty-state

> Write about your time in the valley, share an update, or post a photo.
- where: default empty-state hint paired with the above; file: src/components/posts/post-feed.tsx:220; kind: empty-state

> New since you were last here
- where: divider shown only on the default "most recent" sort, with no active search, when the member has posts newer than their last recorded visit (localStorage last-seen marker) sitting above older ones; file: src/components/posts/post-feed.tsx:232; kind: body

> Load more / Loading...
- where: pagination button at the bottom of the feed when more posts are available; label changes mid-fetch; file: src/components/posts/post-feed.tsx:250; kind: button

> Edit
- where: dropdown menu item on your own post's "..." menu; file: src/components/posts/post-card.tsx:172; kind: button

> Delete
- where: dropdown menu item on your own post's "..." menu; file: src/components/posts/post-card.tsx:176; kind: button

> Report
- where: dropdown menu item on someone else's post's "..." menu; file: src/components/posts/post-card.tsx:182; kind: button

> Delete this post? This cannot be undone.
- where: native browser confirm() dialog shown when clicking Delete on your own post; file: src/components/posts/post-card.tsx:109; kind: body

> Letter
- where: small uppercase badge on a letter's compact card in the feed, always paired with the read-time text; file: src/components/posts/post-card.tsx:197; kind: label

> · {n} min read
- where: read-time estimate appended to the Letter badge on a letter's compact feed card; {n} is the computed minutes; file: src/components/posts/post-card.tsx:198; kind: body

> Read this letter
- where: call-to-action link at the bottom of a letter's compact feed card, opens the full reading view; file: src/components/posts/post-card.tsx:209; kind: button

> Read more
- where: shown under a normal (non-letter) post's text when it exceeds 300 characters and is still collapsed; file: src/components/posts/post-card.tsx:226; kind: button

> Hide comments / Show comments
- where: aria-label on the comment-toggle button; flips with the panel's open state; file: src/components/posts/post-card.tsx:280; kind: tooltip

> Remove bookmark / Save post
- where: aria-label on the bookmark ribbon button on a post card; flips with saved state; file: src/components/posts/post-card.tsx:295; kind: tooltip

> Copy link to post
- where: aria-label on the share button on a post card; file: src/components/posts/post-card.tsx:298; kind: tooltip

> No comments yet. Be the first.
- where: shown inside a post/letter's comment thread when it has zero comments; file: src/components/posts/comments-section.tsx:146; kind: empty-state

> Replying to {name}
- where: small pill shown above the comment composer once the member has tapped Reply on a comment; {name} is the comment author being replied to; file: src/components/posts/comments-section.tsx:202; kind: body

> Cancel reply
- where: aria-label on the small "x" that clears an in-progress reply; file: src/components/posts/comments-section.tsx:210; kind: tooltip

> Write a comment... / Reply to {name}...
- where: comment input placeholder; changes to a reply-specific prompt once Reply is tapped, with {name} interpolated; file: src/components/posts/comments-section.tsx:223; kind: placeholder

> Post comment
- where: aria-label on the round comment-submit arrow button; file: src/components/posts/comments-section.tsx:244; kind: tooltip

> Reply
- where: button under each comment to start a reply; file: src/components/posts/comments-section.tsx:337; kind: button

> Report Post
- where: modal heading for the report-a-post dialog; file: src/components/posts/report-dialog.tsx:55; kind: heading

> Help us keep the community safe. Tell us why you're reporting this post.
- where: modal helper copy under the Report Post heading; file: src/components/posts/report-dialog.tsx:58; kind: helper

> Select a reason
- where: placeholder on the reason dropdown in the report modal; file: src/components/posts/report-dialog.tsx:66; kind: placeholder

> Inappropriate content / Spam / Harassment / Other
- where: the four selectable reasons in the report modal's dropdown; file: src/components/posts/report-dialog.tsx:69; kind: label

> Additional details (optional)
- where: placeholder on the optional free-text details field in the report modal; file: src/components/posts/report-dialog.tsx:79; kind: placeholder

> Cancel
- where: cancel button in the report modal; file: src/components/posts/report-dialog.tsx:87; kind: button

> Submit Report / Submitting...
- where: submit button in the report modal; label changes while submitting; file: src/components/posts/report-dialog.tsx:90; kind: button

> Edit letter / Edit Post
- where: edit-post modal title; wording differs for a letter vs. a normal post; file: src/components/posts/edit-post-dialog.tsx:72; kind: heading

> Title your letter
- where: letter title input placeholder inside the edit-post modal, shown when editing a letter; file: src/components/posts/edit-post-dialog.tsx:80; kind: placeholder

> Campus Memory / Life Update / Looking for Connections / Photo / General
- where: the five selectable tag chips shown when editing a normal (non-letter) post; file: src/components/posts/edit-post-dialog.tsx:16; kind: label

> Cancel
- where: cancel button in the edit-post modal; file: src/components/posts/edit-post-dialog.tsx:112; kind: button

> Save / Saving...
- where: save button in the edit-post modal; label changes while saving; file: src/components/posts/edit-post-dialog.tsx:115; kind: button

> {n} vote / {n} votes
- where: vote total shown under a poll, singular/plural handled; {n} is the vote count; file: src/components/posts/poll-display.tsx:178; kind: body

> Searching...
- where: shown in the @mention dropdown while the user search request is in flight and no results are cached yet; file: src/components/posts/mention-dropdown.tsx:61; kind: body

> Batch of '{yy}
- where: meta line under each candidate's name in the @mention dropdown; {yy} is the last two digits of their batch year; file: src/components/posts/mention-dropdown.tsx:87; kind: body

> Teacher / Former teacher / Member / Batch of '{yy}
- where: the small meta text under an author's name on a post card; depends on account type / whether a batch year exists; file: src/lib/utils.ts:72; kind: body

> just now / {n}m ago / {n}h ago / {n}d ago / {n}w ago
- where: relative time text next to a post or comment's timestamp, chosen by elapsed time; file: src/lib/utils.ts:12; kind: body

> A letter
- where: fallback title used for a letter that has no title set AND no usable first line of body text to derive one from (effectively an empty letter) - shown on the feed's compact letter card, the Letters list, and the letter reading page; file: src/lib/utils.ts:178; kind: body

> Not authenticated
- where: generic error surfaced via toast if the member's session has expired or is missing when they try to post, comment, like, bookmark, vote, or report; file: src/app/(main)/feed/actions.ts:14; kind: error

> You're not a member of this group
- where: returned if createPost is called with a groupId the member does not belong to (not currently reachable through the composer UI, which only offers groups the member is already in); file: src/app/(main)/feed/actions.ts:52; kind: error

> Post not found
- where: returned by deletePost/editPost when the target post has already been removed; file: src/app/(main)/feed/actions.ts:139; kind: error

> Not authorized
- where: returned when a member tries to delete/edit a post they don't own (and, for delete, aren't a group admin of); file: src/app/(main)/feed/actions.ts:151; kind: error

> Invalid poll option
- where: returned by votePoll if the submitted option id doesn't belong to the post's poll; file: src/app/(main)/feed/actions.ts:97; kind: error

> Comment not found
- where: returned by deleteComment if the comment no longer exists; presently unreachable in the UI since no comment-delete button is wired up yet; file: src/app/(main)/feed/actions.ts:366; kind: error

## Letters (/letters)

> Write your letter to the valley. Take your time.
- where: textarea placeholder whenever the composer is in letter mode - the always-open Letters composer, or a feed post switched to "Write as a Letter"; file: src/components/posts/create-post-form.tsx:35; kind: placeholder

> Title your letter
- where: letter title input placeholder, shown above the body textarea whenever composing a letter; file: src/components/posts/create-post-form.tsx:307; kind: placeholder

> Letters
- where: always visible (browser tab title, rendered as "Rishi Valley · Letters"); file: src/app/(main)/letters/page.tsx:12; kind: metadata

> Longer pieces from the valley. Essays, tributes, travelogues, reflections.
- where: always visible, page subtitle; file: src/app/(main)/letters/page.tsx:57; kind: body

> Write a letter
- where: collapsed "write a letter" entry-point card, before it's expanded into the composer; file: src/components/letters/letter-composer.tsx:23; kind: button

> A longer piece, taken slowly. A tribute, a reflection, a letter home.
- where: subtext under "Write a letter" on the collapsed entry-point card; file: src/components/letters/letter-composer.tsx:26; kind: body

> No letters yet.
- where: empty-state heading shown when there are no letters visible to the member yet; file: src/app/(main)/letters/page.tsx:66; kind: empty-state

> Be the first to write one. A letter is for the things too long for the feed.
- where: empty-state hint paired with the above; file: src/app/(main)/letters/page.tsx:69; kind: empty-state

> Letter
- where: small uppercase badge on each letter card in the list, always paired with the read-time text; file: src/app/(main)/letters/page.tsx:82; kind: label

> · {n} min read
- where: read-time estimate on each letter card in the list; {n} is the computed minutes; file: src/app/(main)/letters/page.tsx:84; kind: body

> Read
- where: hover-revealed call-to-action link on each letter card in the list; file: src/app/(main)/letters/page.tsx:111; kind: button

> Letter
- where: fallback <title> when there is no session, the letter isn't found/isn't a letter/is hidden, or it belongs to a group the viewer isn't a member of (prevents leaking the real title); file: src/app/(main)/letters/[id]/page.tsx:19; kind: metadata

> {letter title}
- where: normal case: the browser tab title is the letter's own title (or its derived/fallback title); file: src/app/(main)/letters/[id]/page.tsx:36; kind: metadata

> All letters / Back to group
- where: back-navigation link above the letter; wording depends on whether the letter belongs to a group; file: src/app/(main)/letters/[id]/page.tsx:82; kind: button

> · {n} min read
- where: read-time estimate next to the Letter badge; {n} is the computed minutes; file: src/app/(main)/letters/[id]/page.tsx:88; kind: body

> {n} comments
- where: comment count in the letter's engagement row; note it always appends the word "comments" even when the count is 1 (no singular form, unlike the feed's numeric-only comment counter); file: src/components/letters/letter-engagement.tsx:61; kind: body

> Save letter / Remove bookmark
- where: aria-label on the bookmark ribbon in the letter reading view; flips with saved state; file: src/components/letters/letter-engagement.tsx:67; kind: tooltip

> Copy link to letter
- where: aria-label on the share button in the letter reading view; file: src/components/letters/letter-engagement.tsx:69; kind: tooltip

> {letter title or first line of content}
- where: dynamic tab title: normal case, via letterTitle(title, content); file: src/app/(main)/letters/[id]/page.tsx:36; kind: metadata

> Save letter
- where: aria-label on the bookmark/save button under a Letter when the letter is not yet saved; file: src/components/letters/letter-engagement.tsx; kind: label

## /directory

> Directory
- where: always visible; file: src/app/(main)/directory/page.tsx:10; kind: metadata

> Find the people who grew up under the same trees.
- where: always visible; file: src/app/(main)/directory/page.tsx:215; kind: body

> Search by name, city, or profession...
- where: always visible, in the search bar; file: src/components/directory/directory-client.tsx:183; kind: placeholder

> Filters
- where: always visible, toggles the tier-2 facet row; file: src/components/directory/directory-client.tsx:194; kind: button

> Back to browse
- where: shown only when a specific batch year or faculty is selected, or another filter is active (back-to-browse icon button); file: src/components/directory/directory-client.tsx:175; kind: tooltip

> Any city
- where: Filters panel open, city select placeholder; file: src/components/directory/directory-client.tsx:206; kind: placeholder

> Any profession
- where: Filters panel open, profession select placeholder; file: src/components/directory/directory-client.tsx:223; kind: placeholder

> Batch from
- where: Filters panel open, batch-year-from input; file: src/components/directory/directory-client.tsx:238; kind: placeholder

> Batch to
- where: Filters panel open, batch-year-to input; file: src/components/directory/directory-client.tsx:246; kind: placeholder

> Sort
- where: Filters panel open, sort select placeholder; file: src/components/directory/directory-client.tsx:261; kind: placeholder

> Most recent
- where: Filters panel open, default sort option; file: src/components/directory/directory-client.tsx:264; kind: label

> Name A to Z
- where: Filters panel open, alphabetical sort option; file: src/components/directory/directory-client.tsx:265; kind: label

> Map
- where: view toggle pill, always visible; file: src/components/directory/directory-client.tsx:295; kind: button

> Batches
- where: view toggle pill, always visible; file: src/components/directory/directory-client.tsx:295; kind: button

> People
- where: view toggle pill, appears only while a search/filter is active; file: src/components/directory/directory-client.tsx:295; kind: button

> {yearLabel}
- where: People view, shown while filtering on a specific batch year or faculty; file: src/components/directory/directory-client.tsx:149; kind: label

> {resultCount} person/people found
- where: People view, result count line, always shown while filtering; file: src/components/directory/directory-client.tsx:308; kind: body

> · showing {results.length}
- where: People view, shown only when more results exist than are currently loaded; file: src/components/directory/directory-client.tsx:310; kind: body

> No one matches your search.
- where: People view, zero results for the current search/filters; file: src/components/directory/directory-client.tsx:318; kind: empty-state

> Try a shorter search or clear a filter.
- where: People view, zero results for the current search/filters; file: src/components/directory/directory-client.tsx:321; kind: empty-state

> Load more
- where: People view, more results exist beyond the current page (button, and its loading state); file: src/components/directory/directory-client.tsx:342; kind: button

> Loading...
- where: People view, while fetching the next page of results; file: src/components/directory/directory-client.tsx:342; kind: button

> The map fills in as people add their city.
- where: Map view, no filter active, and no alumni have a mappable city yet; file: src/components/directory/directory-client.tsx:355; kind: empty-state

> Add yours from your profile and watch the valley spread across the world.
- where: Map view, no filter active, and no alumni have a mappable city yet; file: src/components/directory/directory-client.tsx:360; kind: empty-state

> No one on the map matches your filters.
- where: Map view, a filter is active and it matches no one with a mappable city; file: src/components/directory/directory-client.tsx:354; kind: empty-state

> Try the People view, widen a filter, or clear your search.
- where: Map view, a filter is active and it matches no one with a mappable city; file: src/components/directory/directory-client.tsx:359; kind: empty-state

> Top cities
- where: Map view, shown when at least one city pin exists; file: src/components/directory/directory-client.tsx:373; kind: heading

> {count} person/people
- where: Batches view, per-year tile, always visible; file: src/components/directory/directory-client.tsx:403; kind: body

> Faculty
- where: Batches view, faculty tile, shown only when facultyCount > 0; file: src/components/directory/directory-client.tsx:413; kind: label

> {facultyCount} teacher/teachers
- where: Batches view, faculty tile, shown only when facultyCount > 0; file: src/components/directory/directory-client.tsx:416; kind: body

> World map of where members live
- where: screen-reader label on the world map SVG, always present in Map view; file: src/components/directory/alumni-map.tsx:193; kind: label

> {count} members across {cities} cities
- where: hovering a merged cluster of nearby cities on the map; file: src/components/directory/alumni-map.tsx:218; kind: tooltip

> {city} - {count} member/members
- where: hovering a single city pin on the map; file: src/components/directory/alumni-map.tsx:248; kind: tooltip

> Zoom in
- where: map zoom-in control, always visible on the map; file: src/components/directory/alumni-map.tsx:295; kind: label

> Zoom out
- where: map zoom-out control, always visible on the map; file: src/components/directory/alumni-map.tsx:303; kind: label

> Full screen
- where: map full-screen toggle button, collapsed state; file: src/components/directory/alumni-map.tsx:318; kind: button

> Close
- where: map full-screen toggle button, expanded state; file: src/components/directory/alumni-map.tsx:318; kind: button

> Exit full screen
- where: screen-reader label on the full-screen toggle, expanded state; file: src/components/directory/alumni-map.tsx:314; kind: label

> View full screen
- where: screen-reader label on the full-screen toggle, collapsed state; file: src/components/directory/alumni-map.tsx:314; kind: label

> {unmapped} not yet on the map
- where: Map view, shown as a bottom-left pill only when at least one alumnus has no mappable city; file: src/components/directory/alumni-map.tsx:333; kind: body

> {unmapped} person/people not yet on the map
- where: clicking the unmapped pill, opens the drilldown sheet title; file: src/components/directory/alumni-map.tsx:326; kind: heading

> No one to show here yet.
- where: city or unmapped drilldown sheet, edge case where the list ends up empty; file: src/components/directory/alumni-map.tsx:367; kind: empty-state

> Teacher
- where: profile card meta line, teacher account; file: src/lib/utils.ts:77; kind: label

> Former teacher
- where: profile card meta line, former-teacher account; file: src/lib/utils.ts:78; kind: label

> Member
- where: profile card meta line, alumnus with no recorded batch year; file: src/lib/utils.ts:79; kind: label

> Batch of '{yy}
- where: profile card meta line, alumnus with a batch year; file: src/lib/utils.ts:80; kind: label

> Verified member
- where: hovering or focusing the leaf mark next to a verified alumnus's name on their profile card; file: src/components/common/verified-mark.tsx:31; kind: tooltip

> Verified teacher
- where: hovering or focusing the leaf mark next to a verified current teacher's name; file: src/components/common/verified-mark.tsx:28; kind: tooltip

> Verified former teacher
- where: hovering or focusing the leaf mark next to a verified former teacher's name; file: src/components/common/verified-mark.tsx:30; kind: tooltip

> Close
- where: screen-reader-only label on the sheet's close button (Radix Sheet primitive, separate component instance from the Dialog's own 'Close' text); file: src/components/ui/sheet.tsx; kind: label

## /groups

> Share something with this group
- where: composer placeholder when the CreatePostForm is used inside a group's feed; file: src/components/posts/create-post-form.tsx:34; kind: placeholder

> Groups
- where: always visible; file: src/app/(main)/groups/page.tsx:12; kind: metadata

> Spaces for batches, friends, and shared interests across the valley.
- where: always visible; file: src/app/(main)/groups/page.tsx:62; kind: body

> New group
- where: always visible; file: src/app/(main)/groups/page.tsx:68; kind: button

> Your groups
- where: always visible section label; file: src/app/(main)/groups/page.tsx:75; kind: heading

> You have not joined any groups yet.
- where: viewer has not joined any groups; file: src/app/(main)/groups/page.tsx:81; kind: empty-state

> Join a public group below, or start your own.
- where: viewer has not joined any groups; file: src/app/(main)/groups/page.tsx:84; kind: empty-state

> Browse public groups
- where: always visible section label; file: src/app/(main)/groups/page.tsx:98; kind: heading

> Open to everyone. Join from the group page anytime.
- where: always visible; file: src/app/(main)/groups/page.tsx:102; kind: body

> Nothing new to browse right now. You have joined every public group.
- where: viewer has already joined every public group; file: src/app/(main)/groups/page.tsx:107; kind: empty-state

> Private
- where: group card, visibility chip; file: src/components/groups/group-card.tsx:47; kind: label

> Public
- where: group card, visibility chip; file: src/components/groups/group-card.tsx:47; kind: label

> {postCount} posts
- where: group card, always visible; file: src/components/groups/group-card.tsx:65; kind: body

> Keeper: {firstName}
- where: group card, shown only when the group has a known Keeper; file: src/components/groups/group-card.tsx:68; kind: body

> Create a group
- where: always visible; file: src/app/(main)/groups/new/page.tsx:9; kind: metadata

> Give it a name and decide who can join. You can invite people anytime.
- where: always visible; file: src/app/(main)/groups/new/page.tsx:28; kind: body

> Cover image (optional)
- where: cover-image upload area, no cover set yet; file: src/components/groups/create-group-form.tsx:112; kind: label

> Remove cover
- where: cover-image preview, remove button; file: src/components/groups/create-group-form.tsx:128; kind: label

> Add a cover
- where: no cover selected yet; file: src/components/groups/create-group-form.tsx:141; kind: button

> Uploading...
- where: cover image is uploading; file: src/components/groups/create-group-form.tsx:141; kind: button

> Group name
- where: always visible; file: src/components/groups/create-group-form.tsx:147; kind: label

> e.g. Bengaluru circle
- where: always visible; file: src/components/groups/create-group-form.tsx:152; kind: placeholder

> Description (optional)
- where: always visible; file: src/components/groups/create-group-form.tsx:159; kind: label

> What is this group about?
- where: always visible; file: src/components/groups/create-group-form.tsx:164; kind: placeholder

> Who can join
- where: always visible; file: src/components/groups/create-group-form.tsx:171; kind: label

> Public
- where: visibility option card; file: src/components/groups/create-group-form.tsx:178; kind: label

> Anyone can find it and join.
- where: visibility option card; file: src/components/groups/create-group-form.tsx:179; kind: body

> Private
- where: visibility option card; file: src/components/groups/create-group-form.tsx:183; kind: label

> Invite-only, hidden from browse.
- where: visibility option card; file: src/components/groups/create-group-form.tsx:185; kind: body

> Add batches now (optional)
- where: shown only when at least one batch year exists in the database; file: src/components/groups/create-group-form.tsx:224; kind: label

> Everyone from a selected batch is added. You can also invite people later from the group page.
- where: shown only when at least one batch year exists in the database; file: src/components/groups/create-group-form.tsx:226; kind: helper

> Create group
- where: always visible, submit button and its submitting state; file: src/components/groups/create-group-form.tsx:260; kind: button

> Creating...
- where: while the group is being created; file: src/components/groups/create-group-form.tsx:260; kind: button

> Group name is required
- where: server rejects group creation (name too short, too long, or bad member list); file: src/app/(main)/groups/actions.ts:20; kind: error

> Group name is too long
- where: server rejects group creation, name over 80 characters; file: src/app/(main)/groups/actions.ts:21; kind: error

> Invalid member list
- where: server rejects group creation, malformed member-id payload; file: src/app/(main)/groups/actions.ts:27; kind: error

> Group
- where: no session (metadata fallback); file: src/app/(main)/groups/[id]/page.tsx:18; kind: metadata

> This group is not available.
- where: the group id in the URL does not match any group; file: src/app/(main)/groups/[id]/page.tsx:74; kind: error

> The demo data may have been reset, or this link points to an older group id.
- where: the group id in the URL does not match any group; file: src/app/(main)/groups/[id]/page.tsx:77; kind: error

> View current groups
- where: the group id in the URL does not match any group; file: src/app/(main)/groups/[id]/page.tsx:80; kind: button

> This group is invite-only.
- where: private group, viewer is not a member and has no pending invite; file: src/app/(main)/groups/[id]/page.tsx:112; kind: error

> Ask the group Keeper for an invite to see what is shared here.
- where: private group, viewer is not a member and has no pending invite; file: src/app/(main)/groups/[id]/page.tsx:116; kind: error

> Share something with {group.name}...
- where: viewer is a member, composer placeholder in the group feed; file: src/app/(main)/groups/[id]/page.tsx:157; kind: placeholder

> No posts yet in this group.
- where: viewer is a member, group has no posts yet; file: src/app/(main)/groups/[id]/page.tsx:159; kind: empty-state

> Be the first to share something with the group.
- where: viewer is a member, group has no posts yet; file: src/app/(main)/groups/[id]/page.tsx:160; kind: empty-state

> Join to see and share posts
- where: viewer is not a member (public group preview, or has a pending invite); file: src/app/(main)/groups/[id]/page.tsx:165; kind: heading

> Accept the invite above to read the feed and post here.
- where: viewer is not a member and has a pending invite; file: src/app/(main)/groups/[id]/page.tsx:169; kind: helper

> This is a public group. Join from the header above to read the feed and post.
- where: viewer is not a member, public group, no pending invite; file: src/app/(main)/groups/[id]/page.tsx:170; kind: helper

> Private
- where: group header, visibility chip; file: src/components/groups/group-header.tsx:110; kind: label

> Public
- where: group header, visibility chip; file: src/components/groups/group-header.tsx:110; kind: label

> {members.length} member/members
- where: always visible, toggles the member list; file: src/components/groups/group-header.tsx:125; kind: button

> You are the {roleLabel}
- where: shown to the viewer when they are a member of the group; file: src/components/groups/group-header.tsx:130; kind: body

> here
- where: shown to the viewer when they are a plain member (not the Keeper) of the group; file: src/components/groups/group-header.tsx:134; kind: body

> Keeper
- where: member list expanded, next to the admin's name; file: src/components/groups/group-header.tsx:190; kind: label

> Leave
- where: viewer is a member but not the Keeper; file: src/components/groups/group-header.tsx:153; kind: button

> Join group
- where: viewer is not a member and the group is public; file: src/components/groups/group-header.tsx:164; kind: button

> Joining...
- where: join request in flight; file: src/components/groups/group-header.tsx:164; kind: button

> Leave this group?
- where: clicking Leave, native browser confirm dialog; file: src/components/groups/group-header.tsx:52; kind: body

> Invite
- where: Keeper only, opens the invite dialog; file: src/components/groups/group-invite-dialog.tsx:88; kind: button

> Invite to {groupName}
- where: invite dialog open; file: src/components/groups/group-invite-dialog.tsx:93; kind: heading

> Search a person by name. Their invite arrives in their notifications.
- where: invite dialog open; file: src/components/groups/group-invite-dialog.tsx:96; kind: body

> Type a name, like @Meera...
- where: invite dialog open, search field; file: src/components/groups/group-invite-dialog.tsx:103; kind: placeholder

> Searching...
- where: invite dialog, a search query is in flight; file: src/components/groups/group-invite-dialog.tsx:109; kind: body

> No one found by that name.
- where: invite dialog, search returns zero people; file: src/components/groups/group-invite-dialog.tsx:112; kind: empty-state

> Batch of '{yy}
- where: invite dialog, per-result meta line when the person has a batch year; file: src/components/groups/group-invite-dialog.tsx:134; kind: body

> Invited
- where: invite dialog, per-result invite button after it has been sent; file: src/components/groups/group-invite-dialog.tsx:149; kind: button

> Inviting...
- where: invite dialog, per-result invite button while the request is in flight; file: src/components/groups/group-invite-dialog.tsx:151; kind: button

> Only the group Keeper can invite people
- where: non-admin tries to invite (should be unreachable via UI, but returned by the server action); file: src/app/(main)/groups/actions.ts:125; kind: error

> You are already in this group
- where: inviter tries to invite themselves (edge case); file: src/app/(main)/groups/actions.ts:129; kind: error

> That person is already a member
- where: invited person is already a group member; file: src/app/(main)/groups/actions.ts:143; kind: error

> This group is invite-only
- where: joinGroup called on a group that turns out to be private; file: src/app/(main)/groups/actions.ts:85; kind: error

> Group not found
- where: joinGroup or inviteToGroup called with a group id that no longer exists; file: src/app/(main)/groups/actions.ts:83; kind: error

> No pending invite
- where: responding to an invite that no longer exists (edge case); file: src/app/(main)/groups/actions.ts:182; kind: error

> Not authenticated
- where: session expired mid-action (join/leave/invite/respond, all share this message); file: src/app/(main)/groups/actions.ts:11; kind: error

> {inviterName} invited you to join {groupName}.
- where: viewer has a pending invite to this group (banner shown above the group header); file: src/components/groups/invite-response.tsx:49; kind: body

> Decline
- where: pending-invite banner; file: src/components/groups/invite-response.tsx:60; kind: button

> Accept invite
- where: pending-invite banner, default state; file: src/components/groups/invite-response.tsx:69; kind: button

> Joining...
- where: pending-invite banner, request in flight; file: src/components/groups/invite-response.tsx:69; kind: button

> {group.name}
- where: dynamic tab title: normal case, the group's actual name; file: src/app/(main)/groups/[id]/page.tsx:35; kind: metadata

## /catchups

> Catch-ups
- where: always visible; file: src/app/(main)/catchups/page.tsx:7; kind: metadata

> A gentle group newsletter: everyone answers a few prompts, and their replies are gathered into one issue.
- where: always visible; file: src/app/(main)/catchups/page.tsx:15; kind: body

> In the works
- where: always visible, placeholder-page eyebrow; file: src/app/(main)/catchups/page.tsx:19; kind: label

> A round of catching up, on a rhythm
- where: always visible, placeholder-page title; file: src/app/(main)/catchups/page.tsx:20; kind: heading

> A Catch-up is run from a group. Each round, every member is asked a few questions, and their answers are compiled into a single warm issue for the whole group to read, with a browsable archive of past ones.
- where: always visible, placeholder-page body; file: src/app/(main)/catchups/page.tsx:24; kind: body

> This is the one feature that needs a scheduler and email behind it, so it arrives just after the site goes live. For now, gather your people into a group.
- where: always visible, placeholder-page body; file: src/app/(main)/catchups/page.tsx:29; kind: body

> Browse your groups
- where: always visible, placeholder-page CTA; file: src/app/(main)/catchups/page.tsx:21; kind: button

## /collection

> Collection
- where: always visible; file: src/app/(main)/collection/page.tsx:8; kind: metadata

> The Valley Collection
- where: always visible; file: src/app/(main)/collection/page.tsx:20; kind: heading

> A shared picture of the place: the banyan, Rishi Konda, the birds, the light.
- where: always visible; file: src/app/(main)/collection/page.tsx:21; kind: body

> Search captions and birds...
- where: search box in the filter toolbar; file: src/components/collection/collection-client.tsx:134; kind: placeholder

> Subject
- where: subject filter dropdown, unselected placeholder; file: src/components/collection/collection-client.tsx:142; kind: placeholder

> All subjects
- where: subject filter dropdown, first/default option; file: src/components/collection/collection-client.tsx:145; kind: label

> Birds
- where: subject filter dropdown option and subject chip on photo cards/detail; file: src/lib/collection.ts:4; kind: label

> Wildlife
- where: subject filter dropdown option and subject chip on photo cards/detail; file: src/lib/collection.ts:5; kind: label

> Landscape
- where: subject filter dropdown option and subject chip on photo cards/detail; file: src/lib/collection.ts:6; kind: label

> Campus
- where: subject filter dropdown option and subject chip on photo cards/detail; file: src/lib/collection.ts:7; kind: label

> Buildings
- where: subject filter dropdown option and subject chip on photo cards/detail; file: src/lib/collection.ts:8; kind: label

> The Banyan
- where: subject filter dropdown option and subject chip on photo cards/detail; file: src/lib/collection.ts:9; kind: label

> Rishi Konda
- where: subject filter dropdown option and subject chip on photo cards/detail; file: src/lib/collection.ts:10; kind: label

> Hills
- where: subject filter dropdown option and subject chip on photo cards/detail; file: src/lib/collection.ts:11; kind: label

> Weather & Sky
- where: subject filter dropdown option and subject chip on photo cards/detail; file: src/lib/collection.ts:12; kind: label

> Flora
- where: subject filter dropdown option and subject chip on photo cards/detail; file: src/lib/collection.ts:13; kind: label

> Assembly & Dining
- where: subject filter dropdown option and subject chip on photo cards/detail; file: src/lib/collection.ts:14; kind: label

> Arts & Music
- where: subject filter dropdown option and subject chip on photo cards/detail; file: src/lib/collection.ts:15; kind: label

> Sport & Outdoors
- where: subject filter dropdown option and subject chip on photo cards/detail; file: src/lib/collection.ts:16; kind: label

> Historical
- where: subject filter dropdown option and subject chip on photo cards/detail; file: src/lib/collection.ts:17; kind: label

> Area
- where: area filter dropdown, unselected placeholder; file: src/components/collection/collection-client.tsx:155; kind: placeholder

> Anywhere
- where: area filter dropdown, first/default option (means no area filter); file: src/components/collection/collection-client.tsx:158; kind: label

> Junior School
- where: area filter dropdown option and area chip on photo cards/detail; file: src/lib/collection.ts:22; kind: label

> Senior School
- where: area filter dropdown option and area chip on photo cards/detail; file: src/lib/collection.ts:23; kind: label

> Whole Campus
- where: area filter dropdown option and area chip on photo cards/detail; file: src/lib/collection.ts:24; kind: label

> Off Campus
- where: area filter dropdown option and area chip on photo cards/detail; file: src/lib/collection.ts:25; kind: label

> Era
- where: era filter dropdown, unselected placeholder; file: src/components/collection/collection-client.tsx:167; kind: placeholder

> Any era
- where: era filter dropdown, first/default option (means no era filter); file: src/components/collection/collection-client.tsx:171; kind: label

> Pre-1960s
- where: era filter dropdown option and era chip on photo cards/detail (chip hidden when era is 'unknown'); file: src/lib/collection.ts:29; kind: label

> 1960s
- where: era filter dropdown option and era chip on photo cards/detail; file: src/lib/collection.ts:30; kind: label

> 1970s
- where: era filter dropdown option and era chip on photo cards/detail; file: src/lib/collection.ts:31; kind: label

> 1980s
- where: era filter dropdown option and era chip on photo cards/detail; file: src/lib/collection.ts:32; kind: label

> 1990s
- where: era filter dropdown option and era chip on photo cards/detail; file: src/lib/collection.ts:33; kind: label

> 2000s
- where: era filter dropdown option and era chip on photo cards/detail; file: src/lib/collection.ts:34; kind: label

> 2010s
- where: era filter dropdown option and era chip on photo cards/detail; file: src/lib/collection.ts:35; kind: label

> 2020s
- where: era filter dropdown option and era chip on photo cards/detail; file: src/lib/collection.ts:36; kind: label

> Not sure
- where: era filter dropdown option; label shown for photos with no known era (used in the contribute dialog's era select as the default choice; chip itself is suppressed on cards/detail when era is 'unknown'); file: src/lib/collection.ts:37; kind: label

> Newest
- where: sort dropdown option; file: src/components/collection/collection-client.tsx:184; kind: label

> Oldest
- where: sort dropdown option; file: src/components/collection/collection-client.tsx:185; kind: label

> Most loved
- where: sort dropdown option; file: src/components/collection/collection-client.tsx:186; kind: label

> A wander
- where: sort dropdown option; shuffles a bounded recent set instead of paging; file: src/components/collection/collection-client.tsx:187; kind: label

> Contribute
- where: toolbar CTA, always visible when the collection has at least one photo; file: src/components/collection/collection-client.tsx:192; kind: button

> The collection is just beginning.
- where: shown when there are zero photos to display (either the whole collection is empty, or the current filters/search match nothing - same copy for both cases); file: src/components/collection/collection-client.tsx:198; kind: heading

> The first photographs of the valley will live here: the banyan, Rishi Konda, the birds, the light. Add the first one.
- where: same empty state as above; file: src/components/collection/collection-client.tsx:201; kind: empty-state

> Contribute a photo
- where: button inside the empty state; file: src/components/collection/collection-client.tsx:207; kind: button

> Awaiting review
- where: section heading shown above the current user's own not-yet-approved photos, only when they have at least one pending; file: src/components/collection/collection-client.tsx:215; kind: heading

> Pending review
- where: badge overlay on a photo tile for the current user's own photo that is still awaiting admin approval; file: src/components/collection/collection-client.tsx:40; kind: label

> Load more
- where: pagination button, shown when more pages of photos exist; file: src/components/collection/collection-client.tsx:237; kind: button

> Loading...
- where: load-more button label while the next page is being fetched; file: src/components/collection/collection-client.tsx:237; kind: button

> The Collection
- where: back link above the photo; file: src/app/(main)/collection/[id]/page.tsx:71; kind: label

> Pending review
- where: badge shown when viewing your own (or, as admin, anyone's) photo that has not yet been approved; file: src/app/(main)/collection/[id]/page.tsx:89; kind: label

> Collection
- where: browser tab title; falls back to 'Collection' if the photo has no caption, is hidden, or the viewer isn't the uploader/an admin viewing an unapproved photo; file: src/app/(main)/collection/[id]/page.tsx:18; kind: metadata

> {caption, truncated to 70 chars}...
- where: browser tab title when the photo has a caption; caption is truncated to 70 characters with a trailing ellipsis if longer; file: src/app/(main)/collection/[id]/page.tsx:32; kind: metadata

> Contribute a photo
- where: dialog opened via the Contribute button; file: src/components/collection/contribute-dialog.tsx:108; kind: heading

> What is this, and where in the valley? The Collection is for the place itself.
- where: dialog subtitle, always visible while open; file: src/components/collection/contribute-dialog.tsx:110; kind: body

> Choose a photo (up to 15MB)
- where: file-picker button before a photo is chosen; file: src/components/collection/contribute-dialog.tsx:145; kind: button

> Remove photo
- where: icon-only button to clear the chosen photo preview; file: src/components/collection/contribute-dialog.tsx:134; kind: label

> What is in it?
- where: field label above the subject-tag toggle buttons; file: src/components/collection/contribute-dialog.tsx:152; kind: label

> Part of school
- where: field label above the area select; file: src/components/collection/contribute-dialog.tsx:176; kind: label

> Optional
- where: area select placeholder inside the dialog (area is optional here); file: src/components/collection/contribute-dialog.tsx:180; kind: placeholder

> Roughly when?
- where: field label above the era select; file: src/components/collection/contribute-dialog.tsx:192; kind: label

> Caption
- where: field label above the caption input; file: src/components/collection/contribute-dialog.tsx:212; kind: label

> The banyan after the first rain...
- where: caption input placeholder; file: src/components/collection/contribute-dialog.tsx:218; kind: placeholder

> Bird or species names (optional)
- where: field label above the free-tags input, with an inline '(optional)' qualifier in a lighter weight; file: src/components/collection/contribute-dialog.tsx:227; kind: label

> hoopoe, paradise flycatcher
- where: free-tags input placeholder; file: src/components/collection/contribute-dialog.tsx:232; kind: placeholder

> Add to the Collection
- where: submit button, default state; file: src/components/collection/contribute-dialog.tsx:244; kind: button

> Adding...
- where: submit button while the upload is in flight; file: src/components/collection/contribute-dialog.tsx:244; kind: button

> 1960s / 1970s / 1980s / 1990s / 2000s / 2010s / 2020s
- where: Era taxonomy chip label (1960s-2020s each has its own row, condensed here); file: src/lib/collection.ts:30; kind: label

## /profile/[id]

> Flag
- where: always visible on a profile that is not the viewer's own (flag-person entry point, part of the directory/profile identity area); file: src/components/profile/flag-person-dialog.tsx:44; kind: button

> Flag {name}
- where: flag dialog open; file: src/components/profile/flag-person-dialog.tsx:55; kind: heading

> For identity concerns only. An admin reviews every flag.
- where: flag dialog open; file: src/components/profile/flag-person-dialog.tsx:58; kind: body

> This person isn't who they claim to be
- where: flag dialog open, reason radio option 1 (default selected); file: src/components/profile/flag-person-dialog.tsx:11; kind: label

> Not a Rishi Valley alumnus or teacher
- where: flag dialog open, reason radio option 2; file: src/components/profile/flag-person-dialog.tsx:12; kind: label

> Impersonation
- where: flag dialog open, reason radio option 3; file: src/components/profile/flag-person-dialog.tsx:13; kind: label

> Other
- where: flag dialog open, reason radio option 4; file: src/components/profile/flag-person-dialog.tsx:14; kind: label

> Anything else that helps (optional)
- where: flag dialog open, optional detail field; file: src/components/profile/flag-person-dialog.tsx:79; kind: placeholder

> Send flag
- where: flag dialog open, submit button and its sending state; file: src/components/profile/flag-person-dialog.tsx:85; kind: button

> Sending...
- where: flag dialog open, submit button while the request is in flight; file: src/components/profile/flag-person-dialog.tsx:85; kind: button

> You can't flag yourself
- where: user tries to flag their own profile (should be unreachable via UI, but returned by the server action); file: src/components/posts/report-action.ts:29; kind: error

> Please provide a valid reason
- where: flag submitted with an empty or over-500-char reason (edge case); file: src/components/posts/report-action.ts:32; kind: error

> Not authenticated
- where: session expired mid-flag-submission; file: src/components/posts/report-action.ts:28; kind: error

> Profile
- where: page metadata title, shown when the profile belongs to a deleted/blocked/nonexistent user (fallback); file: src/app/(main)/profile/[id]/page.tsx:61; kind: metadata

> {user.name}
- where: page metadata title, normal case; file: src/app/(main)/profile/[id]/page.tsx:62; kind: metadata

> You haven’t written an about section yet. Add a few lines so people know who you are now.
- where: About tab, viewing own profile, no bio/about text set yet; file: src/app/(main)/profile/[id]/page.tsx:198; kind: empty-state

> {firstName} hasn’t written an about section yet.
- where: About tab, viewing someone else's profile, they have no about text; file: src/app/(main)/profile/[id]/page.tsx:207; kind: empty-state

> In their words
- where: About tab heading, always visible; file: src/app/(main)/profile/[id]/page.tsx:191; kind: heading

> The valley years
- where: About tab, 'valley years' section heading, always visible; file: src/app/(main)/profile/[id]/page.tsx:214; kind: heading

> A teacher I remember / Who shaped your years in the valley?
- where: About tab, memory-prompt scaffold shown only on own profile (unanswered prompt row 1 of 3); file: src/app/(main)/profile/[id]/page.tsx:39; kind: placeholder

> A favorite memory / A morning, a person, a place you still think about.
- where: About tab, memory-prompt scaffold shown only on own profile (unanswered prompt row 2 of 3); file: src/app/(main)/profile/[id]/page.tsx:40; kind: placeholder

> Committees and roles / Nature club, choir, editorial, sports...
- where: About tab, memory-prompt scaffold shown only on own profile (unanswered prompt row 3 of 3); file: src/app/(main)/profile/[id]/page.tsx:41; kind: placeholder

> Memory prompts are coming to your settings. Answer the ones you remember; the rest stay hidden.
- where: About tab, below the memory prompts, own profile only; file: src/app/(main)/profile/[id]/page.tsx:225; kind: body

> {firstName} hasn’t shared valley memories yet.
- where: About tab, viewing someone else's profile who has not answered any valley-memory prompts; file: src/app/(main)/profile/[id]/page.tsx:234; kind: empty-state

> Edit profile
- where: CTA on own profile header, always visible for the owner; file: src/app/(main)/profile/[id]/page.tsx:301; kind: button

> {postCount} post / {postCount} posts
- where: post-count line under the header, always visible; file: src/app/(main)/profile/[id]/page.tsx:331; kind: body

> In the valley {yearJoined} to {yearLeft}
- where: header meta strip, shown only when both yearJoined and yearLeft are set; file: src/app/(main)/profile/[id]/page.tsx:336; kind: body

> Details
- where: Details rail heading, always visible; file: src/app/(main)/profile/[id]/page.tsx:371; kind: heading

> Private to you
- where: Details rail, next to the admission number row, only shown to the profile owner or an admin; file: src/app/(main)/profile/[id]/page.tsx:383; kind: label

> In the valley from {yearJoined}
- where: Details rail row: shown when only yearJoined is set; file: src/app/(main)/profile/[id]/page.tsx:126; kind: body

> {batchType} {batchYear}
- where: Details rail row: shown when batchType and batchYear are both set; file: src/app/(main)/profile/[id]/page.tsx:129; kind: body

> Taught {subjects}
- where: Details rail row: shown for teacher/ex_teacher accounts with subjects set; file: src/app/(main)/profile/[id]/page.tsx:132; kind: body

> Based in {currentCity}
- where: Details rail row: shown when currentCity is set; file: src/app/(main)/profile/[id]/page.tsx:134; kind: body

> {jobTitle} at {workplace}
- where: Profession composed string, shown wherever profession appears (header meta, Details rail, vCard) when both jobTitle and workplace are set; file: src/app/(main)/profile/[id]/page.tsx:109; kind: body

> Admission no. {admissionNumber}
- where: Details rail row: shown to the owner/admin when admissionNumber is set; file: src/app/(main)/profile/[id]/page.tsx:137; kind: body

> Contact
- where: Contact rail heading, shown when there are contact methods or viewer is the owner; file: src/app/(main)/profile/[id]/page.tsx:394; kind: heading

> You haven’t shared any contact details yet. Add some so people can reach you.
- where: Contact rail, own profile, no contact methods shared yet; file: src/app/(main)/profile/[id]/page.tsx:421; kind: empty-state

> Email / Phone / Instagram / LinkedIn
- where: Contact rail row labels, shown per contact method the person has shared; file: src/app/(main)/profile/[id]/page.tsx:143; kind: label

> Groups ({groups.length})
- where: Groups rail heading, shown when the person belongs to at least one group; file: src/app/(main)/profile/[id]/page.tsx:435; kind: heading

> Open to mentoring / Hosting visitors / Career chats
- where: default 'Open to' suggestion chips, shown only on the viewer's own profile when they have not picked any tags yet; file: src/app/(main)/profile/[id]/page.tsx:34; kind: body

> Batch of '{yy} / Teacher / Former teacher / Member
- where: header meta line and Details 'batch' line; also reused in admin verification queue meta line: Batch of '{yy} for alumni, Teacher / Former teacher for staff, Member as fallback with no batch year; file: src/lib/utils.ts:72; kind: body

> {batchLine}, Rishi Valley community
- where: vCard file downloaded via 'Save contact' – NOTE field content, always included; file: src/app/(main)/profile/[id]/page.tsx:178; kind: body

> You haven't posted yet.
- where: posts tab, viewer's own profile with zero posts; file: src/components/profile/profile-author-feed.tsx:78; kind: empty-state

> No posts yet from {firstName}.
- where: posts tab, viewing someone else's profile with zero posts; file: src/components/profile/profile-author-feed.tsx:78; kind: empty-state

> Share your first memory, a sighting, or a note for the valley.
- where: posts tab empty-state subtext, own profile; file: src/components/profile/profile-author-feed.tsx:82; kind: empty-state

> When they share something, it will show up here.
- where: posts tab empty-state subtext, someone else's profile; file: src/components/profile/profile-author-feed.tsx:83; kind: empty-state

> Loading...
- where: posts tab, 'load more' button, while fetching next page; file: src/components/profile/profile-author-feed.tsx:107; kind: button

> Load more
- where: posts tab, button to load additional posts, idle state; file: src/components/profile/profile-author-feed.tsx:107; kind: button

> Posts / About / Photos / Saved
- where: Posts/About/Photos/Saved tab bar labels; Photos only shown if the author has photos, Saved only on the viewer's own profile; file: src/components/profile/profile-tabs.tsx:34; kind: label

> Profile sections
- where: tab list accessible name, always present (screen reader only); file: src/components/profile/profile-tabs.tsx:44; kind: label

> Nothing saved yet
- where: Saved tab (owner only), no bookmarked posts yet; file: src/components/profile/saved-posts-feed.tsx:165; kind: empty-state

> Tap the ribbon on any post to keep it here for later. Everything you save stays private to you.
- where: Saved tab empty-state subtext, owner only; file: src/components/profile/saved-posts-feed.tsx:168; kind: empty-state

> {visibleCount} saved post / {visibleCount} saved posts
- where: Saved tab header, count of saved posts, always visible when at least one is saved; file: src/components/profile/saved-posts-feed.tsx:181; kind: body

> Private to you
- where: Saved tab header chip, always visible when at least one is saved; file: src/components/profile/saved-posts-feed.tsx:186; kind: label

> Hoopoe, Peafowl, Owlet, Roller, Kingfisher, Pitta, Parakeet, Plum Parakeet, Bee-eater, Barbet, Hornbill, Malkoha, Y-T Bulbul, R-W Bulbul, Magpie-Robin, Indian Robin, Koel, Drongo, Coucal, Treepie, Oriole, Weaver, Sunbird, Starling, Lapwing, Spurfowl, Paradise Flycatcher, Pond Heron, Cormorant, Golden Oriole, Cattle Egret, Verditer Flycatcher, Peregrine Falcon, Orange-headed Thrush, Blue-faced Malkoha, Jacobin Cuckoo, Black Eagle, Red Avadavat, Common Kingfisher, Jerdon's Leafbird, Brahminy Kite, Flameback, Bay-backed Shrike, Purple-rumped Sunbird, Tickell's Blue Flycatcher, Chestnut-headed Bee-eater, Tricolored Munia, Small Minivet, Green-Pigeon, Indian White-eye
- where: profile avatar species chip: appears on hover, keyboard focus, or tap of the large avatar on a profile header, only for members using the generated bird avatar (hidden if they uploaded a real photo). One of 50 species names is deterministically chosen per member; full pool listed here; file: src/components/common/bird-avatar-v2.tsx:97; kind: tooltip

> Valley bird
- where: profile avatar species chip fallback: shown if the deterministic species index ever falls outside the archetype list (defensive fallback, should not normally trigger); file: src/components/profile/profile-avatar.tsx:42; kind: tooltip

> {name}, {species}
- where: profile avatar aria-label, always present; includes species only when the avatar is a generated bird (no uploaded photo); file: src/components/profile/profile-avatar.tsx:95; kind: label

> Member
- where: profile avatar aria-label fallback when the user has no name on record; file: src/components/profile/profile-avatar.tsx:95; kind: label

> Get in touch
- where: 'Get in touch' CTA, shown on someone else's profile; file: src/components/profile/get-in-touch.tsx:69; kind: button

> This member hasn't shared contact details yet.
- where: 'Get in touch' button tooltip, shown only when disabled because the person has not shared any contact method; file: src/components/profile/get-in-touch.tsx:66; kind: tooltip

> Save contact
- where: 'Save contact' CTA next to Get in touch, always visible on someone else's profile; file: src/components/profile/get-in-touch.tsx:73; kind: button

> Reach {firstName}
- where: Get in touch dialog title, opened from someone else's profile; file: src/components/profile/get-in-touch.tsx:80; kind: heading

> {firstName} chose to share these ways to connect.
- where: Get in touch dialog description, always shown when dialog opens; file: src/components/profile/get-in-touch.tsx:82; kind: body

> Save contact card
- where: Get in touch dialog, secondary download button at the bottom; file: src/components/profile/get-in-touch.tsx:111; kind: button

> Admin tools
- where: Admin tools panel heading, shown to admins viewing someone else's profile; file: src/components/profile/admin-profile-tools.tsx:72; kind: heading

> Admin note
- where: Admin tools, private note field label, admin view only; file: src/components/profile/admin-profile-tools.tsx:80; kind: label

> Private note about this user...
- where: Admin tools, note textarea placeholder; file: src/components/profile/admin-profile-tools.tsx:85; kind: placeholder

> Saving...
- where: Admin tools, save-note button while saving; file: src/components/profile/admin-profile-tools.tsx:95; kind: button

> Save note
- where: Admin tools, save-note button idle state; file: src/components/profile/admin-profile-tools.tsx:95; kind: button

> Are you sure you want to {action} this user?
- where: Admin tools, browser confirm() dialog before blocking or unblocking a user; file: src/components/profile/admin-profile-tools.tsx:29; kind: body

> Unblock user / Block user
- where: Admin tools, block/unblock button label depending on current state; file: src/components/profile/admin-profile-tools.tsx:112; kind: button

> Are you sure you want to delete this user and all their data? This cannot be undone.
- where: Admin tools, browser confirm() dialog before permanently deleting a user; file: src/components/profile/admin-profile-tools.tsx:43; kind: body

> Delete user
- where: Admin tools, delete-user button label, always visible to admins; file: src/components/profile/admin-profile-tools.tsx:121; kind: button

> Close
- where: screen-reader-only label on every dialog's built-in close (X) button; file: src/components/ui/dialog.tsx:75; kind: label

> Could not delete this user. Check the server log.
- where: shown when adminDeleteUser throws (e.g. a DB constraint failure) instead of succeeding; file: src/components/profile/admin-actions.ts; kind: error

## /settings

> Settings
- where: page metadata title, always; file: src/app/(main)/settings/page.tsx:8; kind: metadata

> Edit Profile
- where: Edit Profile card title, always visible; file: src/components/settings/settings-form.tsx:180; kind: heading

> Profile photo
- where: Profile photo field label, always visible; file: src/components/settings/settings-form.tsx:185; kind: label

> Your photo shows everywhere in place of your bird.
- where: helper text next to the avatar preview, shown when the member has an uploaded photo; file: src/components/settings/settings-form.tsx:206; kind: helper

> Upload a photo, or keep your valley bird.
- where: helper text next to the avatar preview, shown when the member has no uploaded photo (using the generated bird); file: src/components/settings/settings-form.tsx:207; kind: helper

> Upload photo / Change photo
- where: avatar upload button, shown when no photo yet vs. replacing an existing one; file: src/components/settings/settings-form.tsx:222; kind: button

> Remove photo
- where: remove-photo button, shown only when a photo has been uploaded; file: src/components/settings/settings-form.tsx:233; kind: button

> Header picture
- where: Header picture field label, always visible; file: src/components/settings/settings-form.tsx:242; kind: label

> Shown across the top of your profile.
- where: helper text under the cover-photo preview, shown when a custom header has been uploaded; file: src/components/settings/settings-form.tsx:261; kind: helper

> A default valley banner shows until you add your own.
- where: helper text under the cover-photo preview, shown when no custom header has been uploaded (default banner in use); file: src/components/settings/settings-form.tsx:263; kind: helper

> Upload header / Change header
- where: header-picture upload button, shown when no header yet vs. replacing an existing one; file: src/components/settings/settings-form.tsx:278; kind: button

> Remove header
- where: remove-header button, shown only when a custom header photo exists; file: src/components/settings/settings-form.tsx:289; kind: button

> Full Name
- where: Full Name field label; file: src/components/settings/settings-form.tsx:300; kind: label

> Bio
- where: Bio field label; file: src/components/settings/settings-form.tsx:311; kind: label

> A few words about yourself...
- where: Bio textarea placeholder, shown when empty; file: src/components/settings/settings-form.tsx:318; kind: placeholder

> Batch Type
- where: Batch Type field label; file: src/components/settings/settings-form.tsx:324; kind: label

> ICSE / ISC
- where: Batch Type select options, always the same two choices; file: src/components/settings/settings-form.tsx:330; kind: label

> Batch Year
- where: Batch Year field label; file: src/components/settings/settings-form.tsx:336; kind: label

> Year Joined
- where: Year Joined field label; file: src/components/settings/settings-form.tsx:350; kind: label

> Year Left
- where: Year Left field label; file: src/components/settings/settings-form.tsx:361; kind: label

> Admission Number
- where: Admission Number field label; file: src/components/settings/settings-form.tsx:374; kind: label

> e.g. 1234
- where: Admission Number input placeholder; file: src/components/settings/settings-form.tsx:380; kind: placeholder

> Current City
- where: Current City field label; file: src/components/settings/settings-form.tsx:387; kind: label

> e.g. Bangalore
- where: Current City input placeholder; file: src/components/settings/settings-form.tsx:392; kind: placeholder

> Industry
- where: Industry field label; file: src/components/settings/settings-form.tsx:398; kind: label

> Select industry
- where: Industry select placeholder, shown before a value is chosen; file: src/components/settings/settings-form.tsx:401; kind: placeholder

> Not specified
- where: Industry select, explicit empty option; file: src/components/settings/settings-form.tsx:404; kind: label

> Technology, Finance, Healthcare, Education, Arts & Media, Law, Government, Non-profit, Research, Consulting, Entrepreneurship, Agriculture, Student, Other
- where: Industry select, full list of choices, always the same; file: src/components/settings/settings-form.tsx:405; kind: label

> Job Title
- where: Job Title field label; file: src/components/settings/settings-form.tsx:423; kind: label

> e.g. Software Engineer
- where: Job Title input placeholder; file: src/components/settings/settings-form.tsx:428; kind: placeholder

> Phone
- where: Phone field label; file: src/components/settings/settings-form.tsx:435; kind: label

> Instagram
- where: Instagram field label; file: src/components/settings/settings-form.tsx:443; kind: label

> @handle
- where: Instagram input placeholder; file: src/components/settings/settings-form.tsx:448; kind: placeholder

> LinkedIn
- where: LinkedIn field label; file: src/components/settings/settings-form.tsx:454; kind: label

> Profile URL
- where: LinkedIn input placeholder; file: src/components/settings/settings-form.tsx:459; kind: placeholder

> Saving...
- where: Save button while a submit is in flight; file: src/components/settings/settings-form.tsx:468; kind: button

> Save changes
- where: Save button, idle state; file: src/components/settings/settings-form.tsx:468; kind: button

> Danger Zone
- where: Danger Zone card title, always visible; file: src/components/settings/settings-form.tsx:478; kind: heading

> Permanently delete your account and all associated data. This action cannot be undone.
- where: Danger Zone body copy, always visible; file: src/components/settings/settings-form.tsx:483; kind: body

> Delete my account
- where: button that opens the delete-account confirmation dialog; file: src/components/settings/settings-form.tsx:491; kind: button

> Delete Account
- where: delete-account confirmation dialog title; file: src/components/settings/settings-form.tsx:499; kind: heading

> This will permanently delete your account, all your posts, comments, and data. This cannot be undone.
- where: delete-account confirmation dialog description; file: src/components/settings/settings-form.tsx:501; kind: body

> Cancel
- where: delete-account dialog, cancel button; file: src/components/settings/settings-form.tsx:510; kind: button

> Deleting...
- where: delete-account dialog, confirm button while deletion is in flight; file: src/components/settings/settings-form.tsx:517; kind: button

> Yes, delete my account
- where: delete-account dialog, confirm button idle state; file: src/components/settings/settings-form.tsx:517; kind: button

> Company / Organisation
- where: label above the Company/Organisation input in the profile edit form; file: src/components/settings/settings-form.tsx; kind: label

> e.g. Tata Consultancy Services
- where: placeholder text in the Company/Organisation (workplace) input; file: src/components/settings/settings-form.tsx; kind: placeholder

> e.g. Teacher
- where: placeholder text in the Job Title input; file: src/components/settings/settings-form.tsx; kind: placeholder

> Schooling
- where: label above the year-joined/year-left/grade-joined trio in the profile edit form (this section was reworked to match signup's schooling UI; the old 'Batch Type'/'Batch Year'/'Year Joined'/'Year Left' labels no longer exist in the code); file: src/components/settings/settings-form.tsx; kind: label

> Your batch is worked out from these three facts, even if you left before 12th. Correct them here if your batch looks wrong.
- where: helper copy under the 'Schooling' label explaining how the batch is derived; file: src/components/settings/settings-form.tsx; kind: helper

> Year joined
- where: label for the year-joined input in the Schooling section (lowercase 'joined', distinct from a stale 'Year Joined' label that no longer exists in the code); file: src/components/settings/settings-form.tsx; kind: label

> Year left
- where: label for the year-left input in the Schooling section; file: src/components/settings/settings-form.tsx; kind: label

> Grade joined
- where: label for the grade-joined input in the Schooling section; file: src/components/settings/settings-form.tsx; kind: label

> 2014
- where: placeholder in the year-joined number input; file: src/components/settings/settings-form.tsx; kind: placeholder

> 2021
- where: placeholder in the year-left number input; file: src/components/settings/settings-form.tsx; kind: placeholder

> 4
- where: placeholder in the grade-joined number input; file: src/components/settings/settings-form.tsx; kind: placeholder

> Your batch
- where: left-hand label inside the live batch-preview chip once all three schooling fields validate successfully; file: src/components/settings/settings-form.tsx; kind: body

> Batch of {batch.batchYear}
- where: right-hand value inside the live batch-preview chip, e.g. 'Batch of 2015'; file: src/components/settings/settings-form.tsx; kind: body

## Notifications (bell and panel chrome)

> Notifications
- where: tooltip/title attribute on the bell icon trigger; file: src/components/layout/notification-bell.tsx:100; kind: tooltip

> {count} unread notifications
- where: screen-reader-only text on the bell trigger when there are unread notifications; {count} is the unread count; file: src/components/layout/notification-bell.tsx:125; kind: label

> 99+
- where: unread count badge shown over 99, truncated; file: src/components/layout/notification-bell.tsx:158; kind: label

> Mark all read
- where: button shown only when there is at least one unread notification; file: src/components/layout/notification-bell.tsx:196; kind: button

> No notifications yet
- where: shown once notifications have loaded and the list is empty; file: src/components/layout/notification-bell.tsx:204; kind: empty-state

> Loading...
- where: shown while the notification list is being fetched, right after the panel is first opened; file: src/components/layout/notification-bell.tsx:209; kind: body

> just now
- where: relative timestamp under each notification, for events less than a minute old; file: src/lib/utils.ts:12; kind: label

> {n}m ago
- where: relative timestamp for events under an hour old; {n} is the minute count; file: src/lib/utils.ts:14; kind: label

> {n}h ago
- where: relative timestamp for events under a day old; {n} is the hour count; file: src/lib/utils.ts:16; kind: label

> {n}d ago
- where: relative timestamp for events under a week old; {n} is the day count; file: src/lib/utils.ts:18; kind: label

> {n}w ago
- where: relative timestamp for events under 4 weeks old; {n} is the week count; file: src/lib/utils.ts:20; kind: label

> {formatted date, e.g. '5 Jul 2026'}
- where: relative timestamp fallback for anything a month or older; renders as a localized date like '5 Jul 2026'; file: src/lib/utils.ts:21; kind: label

> {unreadCount} unread notifications
- where: screen-reader-only label: text differs when there are unread notifications vs none; file: src/components/layout/notification-bell.tsx:125; kind: label

## /support

> Support
- where: browser tab title; file: src/app/(main)/support/page.tsx:7; kind: metadata

> Help keep the Rishi Valley community running.
- where: meta description; file: src/app/(main)/support/page.tsx:8; kind: metadata

> Keep the network in the valley alive.
- where: hero heading, always visible; file: src/app/(main)/support/page.tsx:64; kind: heading

> Rishi Valley runs on a small monthly bill. If it has helped you find an old friend or a lost batchmate, you can help keep it going. There is no pressure, and the site is always free to use.
- where: hero paragraph, always visible; file: src/app/(main)/support/page.tsx:66; kind: body

> What it actually costs
- where: section heading above the cost breakdown; file: src/app/(main)/support/page.tsx:79; kind: heading

> Hosting
- where: cost breakdown row label; file: src/app/(main)/support/page.tsx:15; kind: label

> Vercel, so every page loads fast wherever you are
- where: cost breakdown row detail; file: src/app/(main)/support/page.tsx:16; kind: body

> about ₹600 / month
- where: cost breakdown row amount; file: src/app/(main)/support/page.tsx:17; kind: body

> Database
- where: cost breakdown row label; file: src/app/(main)/support/page.tsx:20; kind: label

> Supabase Postgres in Mumbai, where every profile, post, and photo lives
- where: cost breakdown row detail; file: src/app/(main)/support/page.tsx:21; kind: body

> about ₹550 / month
- where: cost breakdown row amount; file: src/app/(main)/support/page.tsx:22; kind: body

> Image storage and delivery
- where: cost breakdown row label; file: src/app/(main)/support/page.tsx:25; kind: label

> Cloudflare R2, hosting and serving the photos people share
- where: cost breakdown row detail; file: src/app/(main)/support/page.tsx:26; kind: body

> a few hundred, usage based
- where: cost breakdown row amount; file: src/app/(main)/support/page.tsx:27; kind: body

> Email
- where: cost breakdown row label; file: src/app/(main)/support/page.tsx:30; kind: label

> Sign-in links and invites
- where: cost breakdown row detail; file: src/app/(main)/support/page.tsx:31; kind: body

> small, most months free
- where: cost breakdown row amount; file: src/app/(main)/support/page.tsx:32; kind: body

> Domain name
- where: cost breakdown row label; file: src/app/(main)/support/page.tsx:35; kind: label

> Renewed once a year
- where: cost breakdown row detail; file: src/app/(main)/support/page.tsx:36; kind: body

> about ₹1,000 / year
- where: cost breakdown row amount; file: src/app/(main)/support/page.tsx:37; kind: body

> All in
- where: total row label at the bottom of the cost breakdown table; file: src/app/(main)/support/page.tsx:99; kind: label

> roughly ₹1,200 to ₹1,500 a month to run
- where: total row amount; file: src/app/(main)/support/page.tsx:101; kind: body

> These are the real numbers, not rounded up. A few people chipping in is enough to cover the whole thing.
- where: caption under the cost breakdown and the CostBar chart; file: src/app/(main)/support/page.tsx:107; kind: body

> Chip in over UPI
- where: section heading above the UPI contribution panel; file: src/app/(main)/support/page.tsx:115; kind: heading

> What your support pays for
- where: section heading for the closing explanation; file: src/app/(main)/support/page.tsx:128; kind: heading

> Your contribution keeps the directory, the feed, the groups, and the Valley Collection running, with no ads and no one selling your details. It stays small, built for this community and no one else. Supporting is never a requirement to be here.
- where: closing paragraph, always visible; file: src/app/(main)/support/page.tsx:133; kind: body

> Thank you to everyone quietly keeping this going.
- where: final thank-you line, always visible; file: src/app/(main)/support/page.tsx:139; kind: body

> Where the monthly bill goes ${amount}
- where: CostBar widget label, next to the animated running total; the total is prefixed with a literal '$' even though every other amount on the page is in ₹ (rupees) - likely an unintended currency mismatch worth fixing in the rewrite; file: src/components/support/cost-bar.tsx:84; kind: body

> a rough split, not exact
- where: caption to the right of the CostBar label, disclaiming precision; file: src/components/support/cost-bar.tsx:89; kind: body

> Hosting
- where: CostBar segment legend label; file: src/components/support/cost-bar.tsx:13; kind: label

> Database
- where: CostBar segment legend label; file: src/components/support/cost-bar.tsx:14; kind: label

> Everything else
- where: CostBar segment legend label (a simplified 3-way split that differs from the 5-row breakdown above it); file: src/components/support/cost-bar.tsx:15; kind: label

> UPI QR code for {UPI_ID}. Scan it with any UPI app to contribute.
- where: alt text on the UPI QR code image; {UPI_ID} is the literal id 'rvalumni@upi'; file: src/components/support/support-contribute.tsx:68; kind: helper

> Scan with any UPI app
- where: caption under the QR code; file: src/components/support/support-contribute.tsx:77; kind: body

> UPI ID
- where: small caps label above the UPI ID; file: src/components/support/support-contribute.tsx:85; kind: label

> Copy
- where: copy-to-clipboard button, default state; file: src/components/support/support-contribute.tsx:109; kind: button

> Copied
- where: copy-to-clipboard button, briefly after a successful copy; file: src/components/support/support-contribute.tsx:103; kind: button

> Copy UPI ID
- where: aria-label on the copy button; file: src/components/support/support-contribute.tsx:94; kind: label

> A gentle suggestion
- where: small caps label above the suggested-amount chips; file: src/components/support/support-contribute.tsx:118; kind: label

> Cover a month
- where: suggested-amount chip; file: src/components/support/support-contribute.tsx:24; kind: label

> About a month of running costs
- where: helper note shown under the chips when 'Cover a month' is selected; file: src/components/support/support-contribute.tsx:24; kind: helper

> Cover a quarter
- where: suggested-amount chip; file: src/components/support/support-contribute.tsx:25; kind: label

> Three quiet months kept online
- where: helper note shown under the chips when 'Cover a quarter' is selected; file: src/components/support/support-contribute.tsx:25; kind: helper

> Whatever feels right
- where: suggested-amount chip, no fixed amount; file: src/components/support/support-contribute.tsx:26; kind: label

> Any amount is genuinely appreciated
- where: helper note shown under the chips when 'Whatever feels right' is selected (note: no trailing period, unlike the fallback string below); file: src/components/support/support-contribute.tsx:26; kind: helper

> Any amount is genuinely appreciated.
- where: fallback helper note if somehow no chip is selected (has a trailing period, unlike the chip's own note text above); file: src/components/support/support-contribute.tsx:149; kind: helper

> Open my UPI app · ₹{amount}
- where: primary CTA button that opens the user's UPI app; shows the chosen amount suffix only when a fixed-amount chip is selected; file: src/components/support/support-contribute.tsx:163; kind: button

> Keeping Rishi Valley online
- where: transaction note ('tn' field) prefilled into the UPI deep link when a fixed suggested amount is chosen; appears inside the visitor's own UPI payment app, not on the Rishi Valley site itself; file: src/components/support/support-contribute.tsx:36; kind: helper

> The button opens your UPI app with the ID filled in. On a laptop, scan the code or copy the ID into your phone. Card and international options are coming for those abroad.
- where: closing disclaimer paragraph under the UPI button, always visible; file: src/components/support/support-contribute.tsx:166; kind: body

## /admin

> Admin
- where: page metadata title, always; file: src/app/(main)/admin/page.tsx:13; kind: metadata

> Admin Panel
- where: page heading, always visible; file: src/app/(main)/admin/page.tsx:99; kind: heading

> Total Members / Total Posts / New This Week / Pending Reports / Photos to Review
- where: stat tile labels, always visible; file: src/app/(main)/admin/page.tsx:89; kind: label

> Reported Posts ({pendingReports})
- where: Reported Posts section heading with live count; file: src/app/(main)/admin/page.tsx:124; kind: heading

> Verification ({pendingVerification.length})
- where: Verification section heading with live count; file: src/app/(main)/admin/page.tsx:145; kind: heading

> Photos to Review ({pendingPhotos.length})
- where: Photos to Review section heading with live count; file: src/app/(main)/admin/page.tsx:153; kind: heading

> Users ({users.length})
- where: Users section heading with live count; file: src/app/(main)/admin/page.tsx:175; kind: heading

> No pending reports.
- where: Reported Posts panel, shown when there are no pending reports; file: src/components/admin/report-management.tsx:26; kind: empty-state

> {reporterName} flagged {reportedUserName}
- where: reported-user card copy, always shown for user-type reports; file: src/components/admin/report-management.tsx:54; kind: body

> Reason: {reason}
- where: report card, shows the report reason text, both user and post reports; file: src/components/admin/report-management.tsx:57; kind: body

> View profile
- where: reported-user card, view-profile button; file: src/components/admin/report-management.tsx:63; kind: button

> Dismiss
- where: report card, dismiss button (user and post reports); file: src/components/admin/report-management.tsx:68; kind: button

> Block from the Users list below if needed
- where: reported-user card, hint text pointing admin to the Users table below to actually block someone; file: src/components/admin/report-management.tsx:73; kind: helper

> {reporterName} reported a post by {postAuthor}
- where: reported-post card copy, always shown for post-type reports; file: src/components/admin/report-management.tsx:82; kind: body

> View
- where: reported-post card, view button linking to the post in the feed; file: src/components/admin/report-management.tsx:93; kind: button

> Hide post
- where: reported-post card, hide-post button; file: src/components/admin/report-management.tsx:109; kind: button

> Delete post
- where: reported-post card, delete-post button; file: src/components/admin/report-management.tsx:118; kind: button

> Search users by name or email...
- where: Users table search input placeholder, always visible; file: src/components/admin/user-management.tsx:50; kind: placeholder

> Name / Email / Batch / Status / Actions
- where: Users table column headers, always visible; file: src/components/admin/user-management.tsx:59; kind: label

> Admin
- where: Users table status badge, shown for admin accounts; file: src/components/admin/user-management.tsx:79; kind: label

> Blocked
- where: Users table status badge, shown for blocked accounts; file: src/components/admin/user-management.tsx:84; kind: label

> Active
- where: Users table status text, shown for non-blocked, non-admin accounts; file: src/components/admin/user-management.tsx:88; kind: label

> View profile
- where: Users table row action icon tooltips, always visible; file: src/components/admin/user-management.tsx:93; kind: tooltip

> Unblock user / Block user
- where: Users table row action icon tooltip, toggles by block state; file: src/components/admin/user-management.tsx:103; kind: tooltip

> Delete user
- where: Users table row action icon tooltip, delete action; file: src/components/admin/user-management.tsx:111; kind: tooltip

> Delete this user permanently?
- where: browser confirm() dialog before deleting a user from the Users table; file: src/components/admin/user-management.tsx:41; kind: body

> No photos awaiting review.
- where: Photo review queue, shown when there is nothing awaiting moderation; file: src/components/admin/photo-queue.tsx:38; kind: empty-state

> Approve
- where: photo review card, approve button; file: src/components/admin/photo-queue.tsx:97; kind: button

> Decline
- where: photo review card, decline button; file: src/components/admin/photo-queue.tsx:106; kind: button

> Everyone is verified. Nothing waiting.
- where: Verification queue, shown when there are no members awaiting verification; file: src/components/admin/verification-queue.tsx:31; kind: empty-state

> Flagged
- where: Verification queue row badge, shown when a member's identity has been flagged (from the Flag-person flow); file: src/components/admin/verification-queue.tsx:57; kind: label

> {batchLine} · {email}
- where: Verification queue row, per-user meta line, always visible; file: src/components/admin/verification-queue.tsx:62; kind: body

> · Adm. {admissionNumber}
- where: Verification queue row, admission number appended when present; file: src/components/admin/verification-queue.tsx:63; kind: body

> · {yearJoined}-{yearLeft}
- where: Verification queue row, year range appended when both yearJoined and yearLeft are present; file: src/components/admin/verification-queue.tsx:64; kind: body

> Verify
- where: Verification queue row, verify button; file: src/components/admin/verification-queue.tsx:69; kind: button

> Photos to Review ({count})
- where: photo review queue section heading, with the pending count interpolated; file: src/app/(main)/admin/page.tsx:153; kind: heading

## 404 and error pages

> 404
- where: always visible on any unmatched route; file: src/app/not-found.tsx:7; kind: heading

> Page not found
- where: always visible on any unmatched route; file: src/app/not-found.tsx:9; kind: heading

> Looks like you wandered off the path. This page doesn't exist.
- where: always visible on any unmatched route; file: src/app/not-found.tsx:12; kind: body

> Back to home
- where: always visible on any unmatched route; file: src/app/not-found.tsx:16; kind: button

> Something went wrong
- where: shown when a route throws an unhandled render/render-time error; file: src/app/error.tsx:15; kind: error

> We hit an unexpected error. Please try again. If the problem persists, let an admin know.
- where: shown when a route throws an unhandled render/render-time error; file: src/app/error.tsx:18; kind: error

> Try again
- where: button to retry rendering after an unhandled error; file: src/app/error.tsx:26; kind: button

## Validation messages

> Passwords do not match.
- where: client validation: confirm-password does not match password, on submit; file: src/components/auth/signup-form.tsx:190; kind: validation

> Password must be at least 8 characters.
- where: client validation: password under 8 characters, on submit; file: src/components/auth/signup-form.tsx:197; kind: validation

> Please enter whole numbers for the years and grade.
- where: live batch preview error, shown when the alumnus years/grade combination is non-integer; file: src/lib/utils.ts:124; kind: validation

> The grade you joined in should be between 1 and 12.
- where: live batch preview error, grade joined outside 1-12; file: src/lib/utils.ts:127; kind: validation

> The year you joined should be between 1926 and {thisYear}.
- where: live batch preview error, year joined outside 1926-current year; {thisYear} interpolated; file: src/lib/utils.ts:130; kind: validation

> The year you left should be between 1926 and {thisYear + 1}.
- where: live batch preview error, year left outside 1926-(current year + 1); {thisYear+1} interpolated; file: src/lib/utils.ts:133; kind: validation

> The year you left cannot be before the year you joined.
- where: live batch preview error, year left entered before year joined; file: src/lib/utils.ts:136; kind: validation

> That is too short a stay to place you. Check the years you entered.
- where: live batch preview error, computed grade-at-leaving is less than grade joined (impossibly short stay); file: src/lib/utils.ts:144; kind: validation

> Those years add up to past 12th grade. Check your joining grade and years.
- where: live batch preview error, computed grade-at-leaving exceeds 12; file: src/lib/utils.ts:150; kind: validation

> First name is required
- where: server-side zod validation: firstName empty (reachable only if the request bypasses the client form's single Full Name field); file: src/lib/validators.ts:14; kind: validation

> Surname is required
- where: server-side zod validation: lastName empty; file: src/lib/validators.ts:15; kind: validation

> Please enter a valid email
- where: server-side zod validation: malformed email; file: src/lib/validators.ts:16; kind: validation

> Password must be at least 8 characters
- where: server-side zod validation: password under 8 characters; file: src/lib/validators.ts:17; kind: validation

> Alumni need the year they joined, the year they left, and the grade they joined in.
- where: server-side zod validation: alumnus account missing one of yearJoined/yearLeft/gradeJoined; file: src/lib/validators.ts:28; kind: validation

> Post cannot be empty
- where: zod validation error when a post or letter's content field is submitted empty; file: src/lib/validators.ts:55; kind: validation

> Comment cannot be empty
- where: zod validation error when a comment is submitted empty; file: src/lib/validators.ts:76; kind: validation

> Content must be between 1 and {cap} characters
- where: returned by editPost when the edited content is empty or exceeds the per-kind cap ({cap} is 5000 for a post or 20000 for a letter); file: src/app/(main)/feed/actions.ts:189; kind: validation

> Title must be 160 characters or fewer
- where: returned by editPost when a letter's title exceeds 160 characters; file: src/app/(main)/feed/actions.ts:192; kind: validation

> Too small: expected string to have >=2 characters
- where: toast when the profile form's zod validation fails on the 'name' field being shorter than 2 characters (default Zod v4 library message, not custom-authored); file: src/lib/validators.ts:35; kind: validation

> Too big: expected string to have <={max} characters
- where: toast when the profile form's zod validation fails because a text field (name/bio/currentCity/workplace/jobTitle/phone/instagram/linkedin) exceeds its max length (default Zod v4 library message, not custom-authored); file: src/lib/validators.ts:36; kind: validation

> Too small: expected number to be >={min} / Too big: expected number to be <={max}
- where: toast when a numeric year/admission field (batchYear, yearJoined, yearLeft, admissionNumber) falls outside its allowed min/max range (default Zod v4 library message, not custom-authored); file: src/lib/validators.ts:45; kind: validation

> Pick at least one subject
- where: server-side zod validation message when the subject array is empty; same wording as the client-side pre-check toast; file: src/lib/validators.ts:69; kind: validation

> Name must be at least 2 characters
- where: name shorter than 2 characters on the signup form; file: src/lib/validators.ts:10; kind: validation

> Please provide a reason
- where: reason field is empty on submitting a report; file: src/lib/validators.ts:78; kind: validation

## Notification templates

> {name} liked your post
- where: created when someone likes your post; fires the LoveButton on a post card, surfaces in the recipient's notification feed and links back to the post; file: src/app/(main)/feed/actions.ts:246; kind: notification

> {name} commented on your post
- where: created when someone comments on your post; surfaces in the recipient's notification feed and links back to the post; file: src/app/(main)/feed/actions.ts:325; kind: notification

> {name} replied to your comment
- where: created when someone replies to your top-level comment (only if the replier isn't you and isn't already the post author, who gets the comment notification instead); file: src/app/(main)/feed/actions.ts:346; kind: notification

> {name} liked your comment
- where: created when someone likes your comment; file: src/app/(main)/feed/actions.ts:665; kind: notification

> {creatorName} added you to {groupName}
- where: fires when a Keeper creates a group and adds a batch of members at creation time; file: src/app/(main)/groups/actions.ts:58; kind: notification

> {inviterName} invited you to join {groupName}
- where: fires when a Keeper invites a specific person to join the group; file: src/app/(main)/groups/actions.ts:161; kind: notification

> You're verified. Your name now carries a small leaf to show you belong.
- where: notification message template created when an admin verifies a member's account; file: src/components/profile/admin-actions.ts:69; kind: notification

> A photo you shared was not added to the Collection. This space is for the place itself; please share people-shots on the feed or your profile instead.
- where: notification sent to the uploader when an admin declines their Collection photo submission; file: src/app/(main)/collection/actions.ts:282; kind: notification

> {name} added you to {groupName}
- where: notification sent to every member added to a new group at creation time (excluding the creator); file: src/app/(main)/groups/actions.ts:58; kind: notification

> {name} invited you to join {groupName}
- where: notification sent to the invitee; file: src/app/(main)/groups/actions.ts:161; kind: notification

> Batch of {batchYear}
- where: the name given to a batch's auto-created group the first time any alumnus from that batch signs up or is added; shown everywhere that group's name is displayed; file: src/components/auth/actions.ts; kind: notification

## Toasts

> Welcome to the jungle!
- where: toast fired immediately on successful account creation, just before redirecting to the feed; file: src/components/auth/signup-form.tsx:238; kind: toast

> You can add {remaining} more image{s}
- where: toast shown when the member tries to attach more images than the 3-image limit allows; {remaining} and the trailing "s" are interpolated; file: src/components/posts/create-post-form.tsx:202; kind: toast

> Each image must be under 5MB
- where: toast shown when an attached image file exceeds 5MB; file: src/components/posts/create-post-form.tsx:212; kind: toast

> Upload failed
- where: toast shown when the /api/upload request fails and returns no specific server error message; file: src/components/posts/create-post-form.tsx:228; kind: toast

> Failed to upload images
- where: toast shown when the image upload request throws (network failure); file: src/components/posts/create-post-form.tsx:236; kind: toast

> Your letter is published / Posted to the group / Post shared!
- where: success toast after posting; wording depends on whether it was a letter, a group post, or an ordinary feed post; file: src/components/posts/create-post-form.tsx:281; kind: toast

> Please select a reason
- where: toast shown if Submit is pressed in the report modal with no reason selected; file: src/components/posts/report-dialog.tsx:32; kind: toast

> Report submitted. Thank you.
- where: success toast after a post report is submitted; file: src/components/posts/report-dialog.tsx:41; kind: toast

> Letter updated / Post updated
- where: success toast after saving an edited post; wording differs for a letter vs. a normal post; file: src/components/posts/edit-post-dialog.tsx:62; kind: toast

> Link copied
- where: success toast after copying a post/letter/comment link to the clipboard; file: src/components/common/share-button.tsx:35; kind: toast

> Could not copy the link
- where: error toast if the clipboard write throws (e.g. permissions denied); file: src/components/common/share-button.tsx:37; kind: toast

> Thank you. An admin will take a look.
- where: flag submitted successfully; file: src/components/profile/flag-person-dialog.tsx:32; kind: toast

> Cover must be under 5MB
- where: uploaded cover image file exceeds 5MB; file: src/components/groups/create-group-form.tsx:45; kind: toast

> Upload failed
- where: cover upload request fails and the API returns no specific error message; file: src/components/groups/create-group-form.tsx:55; kind: toast

> Failed to upload cover
- where: cover upload throws a network/client exception; file: src/components/groups/create-group-form.tsx:61; kind: toast

> Please enter a group name
- where: submitting the form with an empty group name; file: src/components/groups/create-group-form.tsx:70; kind: toast

> Group created
- where: group created successfully; file: src/components/groups/create-group-form.tsx:103; kind: toast

> Welcome to {group.name}
- where: joining a public group succeeds; file: src/components/groups/group-header.tsx:70; kind: toast

> Invited {firstName}
- where: invite sent successfully; file: src/components/groups/group-invite-dialog.tsx:78; kind: toast

> Welcome to {groupName}
- where: accepting a pending invite succeeds; file: src/components/groups/invite-response.tsx:36; kind: toast

> Invite declined
- where: declining a pending invite succeeds; file: src/components/groups/invite-response.tsx:38; kind: toast

> Removed from saved
- where: Saved tab, toast shown when un-saving (un-bookmarking) a post from the saved list; file: src/components/profile/saved-posts-feed.tsx:140; kind: toast

> Note saved
- where: Admin tools, toast after saving the admin note succeeds; file: src/components/profile/admin-profile-tools.tsx:63; kind: toast

> User blocked / User unblocked
- where: Admin tools, toast after blocking or unblocking a user; file: src/components/profile/admin-profile-tools.tsx:36; kind: toast

> User deleted
- where: Admin tools, toast after a user is deleted (page then redirects to /directory); file: src/components/profile/admin-profile-tools.tsx:52; kind: toast

> Not authorized
- where: generic error returned/toasted whenever a non-admin session somehow reaches an admin-only server action (block/unblock, delete user, save note, verify, unverify, hide post, dismiss report, resolve report), should not be reachable via the normal UI; file: src/components/profile/admin-actions.ts:10; kind: toast

> Please choose an image
- where: toast when the selected avatar file is not an image; file: src/components/settings/settings-form.tsx:74; kind: toast

> Photo must be under 15MB
- where: toast when the selected avatar file exceeds 15MB; file: src/components/settings/settings-form.tsx:78; kind: toast

> Photo updated
- where: toast after a profile photo upload succeeds; file: src/components/settings/settings-form.tsx:92; kind: toast

> Photo removed
- where: toast after removing the profile photo; file: src/components/settings/settings-form.tsx:105; kind: toast

> Header picture updated
- where: toast after a header/cover photo upload succeeds; file: src/components/settings/settings-form.tsx:130; kind: toast

> Header picture removed
- where: toast after removing the header/cover photo; file: src/components/settings/settings-form.tsx:143; kind: toast

> Profile updated
- where: toast after the profile form saves successfully; file: src/components/settings/settings-form.tsx:157; kind: toast

> Not authenticated
- where: toast when not signed in reaches a settings server action (should not normally be reachable via UI); file: src/components/settings/actions.ts:16; kind: toast

> No photo provided
- where: toast when an avatar/cover upload is submitted with no file attached; file: src/components/settings/actions.ts:74; kind: toast

> Only image files are allowed
- where: server-side re-check toast when the uploaded file is not an image type; file: src/components/settings/actions.ts:75; kind: toast

> HEIC is not supported yet. Please export as JPG or PNG.
- where: toast when the uploaded avatar/cover file is a HEIC/HEIF image, which is not supported; file: src/components/settings/actions.ts:77; kind: toast

> Photo must be under 15MB
- where: server-side re-check toast when the uploaded file exceeds 15MB; file: src/components/settings/actions.ts:78; kind: toast

> Could not process the photo: {message}
- where: toast when Sharp/image processing or the R2 upload throws while saving an avatar or cover photo; file: src/components/settings/actions.ts:93; kind: toast

> Report dismissed
- where: toast shown after dismissing a report; file: src/components/admin/report-management.tsx:32; kind: toast

> Post hidden and report resolved
- where: toast after hiding a reported post and resolving its report; file: src/components/admin/report-management.tsx:38; kind: toast

> Post deleted and report resolved
- where: toast after deleting a reported post and resolving its report; file: src/components/admin/report-management.tsx:44; kind: toast

> User blocked / User unblocked
- where: toast after blocking/unblocking a user from the Users table; file: src/components/admin/user-management.tsx:37; kind: toast

> User deleted
- where: toast after deleting a user from the Users table; file: src/components/admin/user-management.tsx:44; kind: toast

> Verified
- where: toast after verifying a member; file: src/components/admin/verification-queue.tsx:41; kind: toast

> Please choose an image
- where: toast shown when a non-image file is picked; file: src/components/collection/contribute-dialog.tsx:58; kind: toast

> Photo must be under 15MB
- where: toast shown when the picked file exceeds 15MB (client-side check, mirrors the server-side limit); file: src/components/collection/contribute-dialog.tsx:62; kind: toast

> Choose a photo first
- where: toast shown if Submit is pressed with no photo chosen; file: src/components/collection/contribute-dialog.tsx:77; kind: toast

> Pick at least one subject
- where: toast shown if Submit is pressed with zero subject tags selected (client-side check); file: src/components/collection/contribute-dialog.tsx:78; kind: toast

> Added to the Collection
- where: success toast when the uploader is an admin or a trusted contributor, so the photo skips the review queue and goes straight into the Collection; file: src/components/collection/contribute-dialog.tsx:96; kind: toast

> Thank you. An admin will review it shortly.
- where: success toast for a normal contributor, whose photo enters the pending-review queue; file: src/components/collection/contribute-dialog.tsx:97; kind: toast

> Not authenticated
- where: toast when the server action returns an error and the session is somehow missing (edge case); file: src/app/(main)/collection/actions.ts:71; kind: toast

> No photo provided
- where: toast if the form is submitted with no file attached at the server (defensive check behind the client-side one); file: src/app/(main)/collection/actions.ts:74; kind: toast

> Only image files are allowed
- where: toast when the uploaded file's MIME type is not an image type; file: src/app/(main)/collection/actions.ts:75; kind: toast

> HEIC is not supported yet. Please export as JPG or PNG.
- where: toast when the uploaded file is HEIC/HEIF; file: src/app/(main)/collection/actions.ts:77; kind: toast

> Photo must be under 15MB
- where: toast when the uploaded file exceeds 15MB (server-side check); file: src/app/(main)/collection/actions.ts:78; kind: toast

> Invalid subjects
- where: toast if the hidden subjects JSON field fails to parse (should not happen via normal UI); file: src/app/(main)/collection/actions.ts:85; kind: toast

> Could not process the photo: {message}
- where: toast when image processing (sharp resize/convert) throws; {message} is the underlying error's message, interpolated in; file: src/app/(main)/collection/actions.ts:125; kind: toast

> Not authorized
- where: toast if a non-admin session somehow calls approve/decline (defensive); file: src/app/(main)/collection/actions.ts:250; kind: toast

> Photo not found
- where: toast when declining a photo that no longer exists (already deleted); file: src/app/(main)/collection/actions.ts:269; kind: toast

> UPI ID copied. Thank you for keeping us online.
- where: toast after the UPI ID is successfully copied to the clipboard; file: src/components/support/support-contribute.tsx:52; kind: toast

> Could not copy automatically. Please select and copy the ID below.
- where: toast when the clipboard write fails (blocked permissions/insecure context); file: src/components/support/support-contribute.tsx:57; kind: toast

> Not authenticated
- where: markNotificationRead/markAllNotificationsRead: no signed-in session; file: src/app/(main)/notifications/actions.ts:29; kind: toast

> Not authenticated
- where: updateProfile: no signed-in session; file: src/app/(auth)/onboarding/actions.ts:9; kind: toast

> No files provided
- where: api/upload: request has no files attached; file: src/app/api/upload/route.ts:18; kind: toast

> Maximum 3 images allowed
- where: api/upload: more than 3 files submitted at once; file: src/app/api/upload/route.ts:23; kind: toast

> Each file must be under 5MB
- where: api/upload: an individual file exceeds 5MB; file: src/app/api/upload/route.ts:33; kind: toast

> Only image files are allowed
- where: api/upload: a file's type is not image/*; file: src/app/api/upload/route.ts:40; kind: toast

> Failed to upload images: {message}
- where: api/upload: sharp/S3 processing threw during upload, message interpolated; file: src/app/api/upload/route.ts:66; kind: toast

> Unauthorized
- where: shown when a photo/image upload to /api/upload is attempted without a valid session; the client does `toast.error(data.error || "Upload failed")` so the route's raw error text surfaces directly; file: src/app/api/upload/route.ts; kind: toast
