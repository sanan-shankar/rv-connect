# RV Alumni — Copy Inventory

Every user-facing piece of writing in the app, so you can rewrite it in your own voice.
This is all placeholder copy I wrote; none of it is final. Grouped by area, with the file and
line number for each string so you can jump straight to it.

Notes:
- House rule: no long dashes (em or en) anywhere. See `AI-WRITING-TELLS.md` for the full list.
- Excludes the throwaway `/preview` sandbox.
- Section 12 is seed/demo placeholder content (sample people, posts, letters). It is fake data
  for the demo and will mostly be replaced by real members, but it is writing I generated, so it
  is listed for completeness.
- The 404 has already been trimmed to "Looks like you wandered off the path. This page doesn't exist."

---

## 1. Landing page (marketing) — being adjusted in a separate pass, locations approximate

### Page metadata — src/app/page.tsx
- L12: "Rishi Valley Alumni"
- L14: "A quiet, invite-only home for Rishi Valley alumni and teachers. Find each other, share the valley, keep it close."

### Intro band — src/app/page.tsx
- L33: "What is inside"
- L36: "Everything the valley scattered, gathered in one quiet place."
- L39: "Alumni and teachers, past and present. Built and kept by one of us, for all of us."

### Feature: The Directory — src/app/page.tsx
- L47: "The Directory"
- L48: "Find the people, not just the posts."
- L49: "The whole point is the people. Search by batch, house, city, or what someone does now, and actually find the friend you lost touch with in 2009."
- L51: "A world map of where the valley scattered"
- L52: "Bird avatars until someone uploads a face"
- L53: "Filter by batch, house, and city"
- L59: alt: "The alumni directory, with a world map of where members live."

### Feature: The Feed — src/app/page.tsx
- L66: "The Feed"
- L67: "The valley, in one quiet sheet."
- L68: "One ruled sheet, not an endless scroll. A sighting, a memory, a note for the valley. It stays useful even when it is busy, because it was never built to be loud."
- L71: alt: "The feed, a calm ruled sheet of posts from members."

### Feature: Letters — src/app/page.tsx
- L78: "Room for the longer things."
- L79: "When a post is too small for what you want to say, write a Letter. An essay, a tribute, a travelogue, opening into a quiet reading page of its own."
- L80: alt: "The Letters page, with a long-form piece about the valley."

### Feature: Catch-ups — src/app/page.tsx
- L87: "A letter that comes round again."
- L88: "A round-robin that comes back every season. You answer a few prompts, everyone's answers arrive together, and the years stay close even when the miles do not."
- L90: alt: "The Catch-ups feature, a gathered group newsletter."

### Feature: The Valley Collection — src/app/page.tsx
- L97: "The Valley Collection"
- L98: "The valley remembers."
- L99: "Decades of the valley in one place. The banyan, Rishi Konda, choir on the steps, the hoopoes that never left. Add the ones only you still have."
- L101: alt: "The Valley Collection, a shared archive of valley photographs."

### Hero — src/components/landing/landing-hero.tsx
- "Rishi Valley" / "Alumni" (brand)
- "Welcome back to the valley."
- "A space for Rishi Valley alumni to reconnect, share stories, and find each other."
- "Request an invite" / "Sign in" (buttons)
- "See what's inside" (scroll cue)

### Sticky nav — src/components/landing/landing-nav.tsx
- "Rishi Valley", "Sign in", "Request an invite"

### Closing footer — src/components/landing/landing-footer.tsx
- L15: "Come back to the valley."
- L18: "If you grew up here or taught here, there is a place for you. It stays small on purpose, and it keeps the valley close."
- L26: "Request an invite" · L32: "Sign in"
- L42: "Rishi Valley" · L44: "Alumni"
- L46: "A quiet, invite-only home for the people of the valley."

### Trust section — src/components/landing/trust-section.tsx
- L24: "Invite only"
- L27: "A small place, kept small on purpose."
- L30: "Members vouch for members, and the alumni office confirms. No open sign-ups, no strangers, no growth targets. You will know the place by who is in it."
- L35: "Not another feed to keep up with. Not Facebook. Just the valley, and the people in it."
- L52: "10 members vouched"
- L55: "A bird until you upload a face. You will know the verified mark when you see it."
- (sample names L6-10: Ananya Krishnan, Rohan Mehta, Meera Iyer, Arjun Reddy, Fatima Sheikh)

### Showcase shot — src/components/landing/showcase-shot.tsx
- L55: "Search the valley"

---

## 2. Global chrome

### Root metadata — src/app/layout.tsx
- L20: "RV Alumni — Rishi Valley School"  (NOTE: contains a long dash, fix)
- L22: "A space for Rishi Valley alumni to reconnect, reminisce, and find each other."

### 404 — src/app/not-found.tsx
- L7: "404" · L9: "Page not found"
- "Looks like you wandered off the path. This page doesn't exist."  (already trimmed)
- "Back to home"

### Error boundary — src/app/error.tsx
- L15: "Something went wrong"
- L18: "We hit an unexpected error. Please try again. If the problem persists, let an admin know."
- L26: "Try again"

### Footer — src/components/layout/footer.tsx
- "Rishi Valley School", "Support", "Feature Request", "Report a Bug"

### Sidebar nav + user menu — src/components/layout/sidebar.tsx
- Nav: "Feed", "Directory", "Groups", "Collection", "Letters", "Catch-ups", "Events", "About"
- Brand: "Rishi Valley" / "Alumni"
- Menu: "My Profile", "Settings", "Admin Panel", "Sign out", "More", "Admin"

---

## 3. Auth & onboarding

### Login — src/app/(auth)/login/page.tsx
- "Welcome back"
- "Sign in to reconnect with the people who grew up under the same trees."
- "Email" / "you@example.com" / "Password" / "Your password"
- "Show password" / "Hide password" (aria)
- "Signing in..." / "Sign in"
- "New here?" / "Request an invite"
- Errors: "Invalid email or password." / "Something went wrong. Please try again."

### Signup — src/app/(auth)/signup/page.tsx
- "Back", "First, a quick check...", "Answer this to prove you're one of us."
- "Join the community", "Tell us a bit about yourself so your batchmates can find you."

### Trivia gate — src/components/auth/trivia-gate.tsx + trivia-actions.ts
- Questions: "What tree was the school built around?", "What house is next to Krishna?"
- "Your answer...", "Checking...", "Check", "Already have an account?", "Sign in"
- "Not quite. Have another go.", "That question expired. Please try again.",
  "Too many attempts. Please wait a few minutes and try again.", "Something went wrong. Please try again."

### Signup form — src/components/auth/signup-form.tsx
- Account types: "Alumnus", "Teacher", "Former teacher"
- "Full Name" / "Your full name", "Email" / "you@example.com", "Password" / "At least 8 characters",
  "Confirm Password" / "Confirm your password", "I am a..."
- "Teachers do not need a batch. If you also studied at Rishi Valley, you can add your batch later from your profile."
- "Batch Type", "We'll display this as "Batch of 'XX". Even if you left after 10th (e.g. in 2014), your batch year is when your class graduated 12th — Batch of '16."  (NOTE: long dash, fix)
- "Select", "ICSE (10th)", "ISC (12th)", "Batch Year", "Year Joined" / "e.g. 2015", "Year Left" / "e.g. 2021"
- "Creating account..." / "Join"
- Errors/toasts: "Passwords do not match.", "Password must be at least 8 characters.",
  "Account created but sign in failed. Please log in manually.", "Welcome to the jungle!",
  "Something went wrong. Please try again."

### Signup server action — src/components/auth/actions.ts
- "Please answer the entry question before signing up.", "Password must be at least 8 characters.",
  "An account with this email already exists. Try signing in instead."

### Onboarding — src/app/(auth)/onboarding/page.tsx (+ actions.ts)
- "Complete your profile", "Help your batchmates find and recognize you. You can always update this later."
- "Bio" / "A few words about yourself...", "Current City" / "e.g. Bangalore", "Industry" / "Select"
- Industry options: Technology, Finance, Healthcare, Education, Arts & Media, Law, Government,
  Non-profit, Research, Consulting, Entrepreneurship, Agriculture, Student, Other
- "Job Title" / "e.g. Engineer", "Instagram" / "@handle", "LinkedIn" / "Profile URL", "Phone" / "+91 98765 43210"
- "Skip for now", "Saving...", "Save & continue", "Not authenticated"

### Validation messages — src/lib/validators.ts
- "Name must be at least 2 characters", "Please enter a valid email", "Password must be at least 8 characters"
- "Alumni need a batch type and graduation year", "Post cannot be empty", "Pick at least one subject",
  "Comment cannot be empty", "Please provide a reason"

---

## 4. Feed & posts

### Feed header — src/app/(main)/feed/page.tsx
- "Feed", "What the valley's alumni are sharing today."

### Composer — src/components/posts/create-post-form.tsx
- Placeholders: "Share a memory, a sighting, or a note for the valley", "Share something with this group",
  "Write your letter to the valley. Take your time.", "Title your letter"
- Tags: "Campus Memory", "Life Update", "Looking for Connections", "Photo", "General"
- Controls: "Bold", "Italic", "Photo", "Poll", "Letter"
- Buttons: "Uploading...", "Publishing...", "Posting...", "Publish letter", "Post"
- Toasts/limits: "You can add N more image(s)", "Each image must be under 5MB", "Upload failed",
  "Failed to upload images", "Your letter is published", "Posted to the group", "Post shared!"

### Post card — src/components/posts/post-card.tsx
- "Edit", "Delete", "Report", "Letter", "N min read", "Untitled letter", "Read this letter", "Read more"
- confirm: "Delete this post? This cannot be undone."
- toasts: "Link copied", "Could not copy the link"

### Post feed / filters — src/components/posts/post-feed.tsx
- "Search the valley...", "Filters", "Most recent", "Most liked", "Most discussed",
  "All time", "Today", "This week", "This month", "This year"
- Empty: "No posts match your search.", "No stories yet. Be the first to share a memory.",
  "Try different keywords or clear your search.", "Write about your time in the valley, share an update, or post a photo."
- "New since you were last here", "Loading...", "Load more"

### Comments — src/components/posts/comments-section.tsx
- "Loading comments...", "No comments yet. Be the first!", "Replying to {name}", "Reply to {name}...",
  "Write a comment...", "Reply", "Cancel"

### Report dialog — src/components/posts/report-dialog.tsx
- "Report Post", "Help us keep the community safe. Tell us why you're reporting this post."
- "Select a reason", "Inappropriate content", "Spam", "Harassment", "Other"
- "Additional details (optional)", "Cancel", "Submitting...", "Submit Report"
- "Please select a reason", "Report submitted. Thank you."

### Poll — poll-creator.tsx / poll-display.tsx
- "Poll Options", "Option N", "Add option", "vote" / "votes"

### Edit post — src/components/posts/edit-post-dialog.tsx
- "Edit letter" / "Edit Post", "Title your letter", "Cancel", "Saving...", "Save",
  "Letter updated" / "Post updated"

### Feed rail — src/components/feed/feed-rail.tsx
- "Coming up", "Founders' Week", "Rishi Valley, AP", "RSVP", "New in the directory",
  "Your groups", "You have not joined any groups yet.", "Find one"

### Misc — new-post-cta.tsx / search-pill.tsx / notification-bell.tsx
- "New post"
- "Search the valley..." / "Search the valley" (aria)
- "Notifications", "Mark all read", "No notifications yet", "Loading...", "99+"

### Feed server actions (toasts/errors) — src/app/(main)/feed/actions.ts
- "{name} liked your post", "{name} commented on your post", "{name} replied to your comment",
  "{name} liked your comment"
- "You're not a member of this group", "Invalid poll option", "Post not found", "Not authorized",
  "Content must be between 1 and {cap} characters", "Title must be 160 characters or fewer"

---

## 5. Directory & profile

### Directory — src/app/(main)/directory/page.tsx + directory-client.tsx
- "Alumni Directory", "Find the people who grew up under the same trees."
- "Search by name, city, or profession...", "Filters", "Any city", "Any profession",
  "Batch from", "Batch to", "Sort", "Most recent", "Name A to Z", "Faculty", "Back to browse"
- Views: "Map", "Batches", "People"
- "{n} alumni found", "· showing", "Top cities"
- Empty: "No alumni match your search.", "Try a shorter search or clear a filter.",
  "No alumni on the map match your filters.", "The map fills in as alumni add their city.",
  "Try the People view, widen a filter, or clear your search.",
  "Add yours from your profile and watch the valley spread across the world."
- "Loading...", "Load more"

### World map — src/components/directory/alumni-map.tsx
- "World map of where alumni live", "{n} alumni across {m} cities", "{n} not yet on the map",
  "No one to show here yet."
- Controls: "Zoom in", "Zoom out", "View full screen", "Exit full screen", "Full screen", "Close"

### Profile — src/app/(main)/profile/[id]/page.tsx
- Open-to tags: "Open to mentoring", "Hosting visitors", "Career chats"
- Memory prompts: "A teacher I remember" / "Who shaped your years in the valley?",
  "A favorite memory" / "A morning, a person, a place you still think about.",
  "Committees and roles" / "Nature club, choir, editorial, sports..."
- "In the valley {from} to {to}", "Taught {subjects}", "Based in {city}", "Admission no. {n}"
- "In their words", "The valley years", "Details", "Contact", "Private to you", "Edit profile"
- "Email", "Phone", "Instagram", "LinkedIn", "Groups ({n})"
- Empty: "You haven't written an about section yet.", "Add a few lines so people know who you are now.",
  "{name} hasn't written an about section yet.",
  "Memory prompts are coming to your settings. Answer the ones you remember; the rest stay hidden.",
  "{name} hasn't shared valley memories yet.",
  "You haven't shared any contact details yet.", "Add some so people can reach you."
- vCard note: "{batchLine}, Rishi Valley Alumni"

### Profile tabs / feed — profile-tabs.tsx / profile-author-feed.tsx
- "Posts", "About", "Photos", "Profile sections" (aria)
- "You haven't posted yet.", "No posts yet from {name}.",
  "Share your first memory, a sighting, or a note for the valley.",
  "When they share something, it will show up here.", "Loading...", "Load more"

### Get in touch — src/components/profile/get-in-touch.tsx
- "Get in touch", "Save contact", "Reach {name}", "{name} chose to share these ways to connect.",
  "Save contact card", "This member hasn't shared contact details yet."

### Flag person — src/components/profile/flag-person-dialog.tsx
- Reasons: "This person isn't who they claim to be", "Not a Rishi Valley alumnus or teacher", "Impersonation", "Other"
- "Flag {name}", "For identity concerns only. An admin reviews every flag.",
  "Anything else that helps (optional)", "Sending...", "Send flag", "Thank you. An admin will take a look."

### Verified mark — src/components/common/verified-mark.tsx
- "Verified teacher", "Verified former teacher", "Verified alumnus"

### Admin profile tools — src/components/profile/admin-profile-tools.tsx
- "Admin tools", "Admin note", "Private note about this user...", "Saving...", "Save note",
  "Block user" / "Unblock user", "Delete user"
- confirm: "Are you sure you want to {block/unblock} this user?",
  "Are you sure you want to delete this user and all their data? This cannot be undone."
- toasts: "User {action}ed", "User deleted", "Note saved"
- verify notification: "You're verified. Your name now carries a small leaf to show you belong."

---

## 6. Groups

### Groups list/new — src/app/(main)/groups/page.tsx + new/page.tsx
- "Groups", "Spaces for batches, friends, and shared interests across the valley.", "New group"
- "Your groups", "You have not joined any groups yet.", "Join a public group below, or start your own."
- "Browse public groups", "Open to everyone. Join from the group page anytime.",
  "Nothing new to browse right now. You have joined every public group."
- "Create a group", "Give it a name and decide who can join. You can invite people anytime."

### Group page — src/app/(main)/groups/[id]/page.tsx
- "This group is invite-only.", "Ask the group Keeper for an invite to see what is shared here.",
  "A Keeper", "Share something with {group}...", "No posts yet in this group.",
  "Be the first to share something with the group.", "Join to see and share posts",
  "Accept the invite above to read the feed and post here.",
  "This is a public group. Join from the header above to read the feed and post."

### Create group form — src/components/groups/create-group-form.tsx
- "Group name" / "e.g. Bengaluru Alumni", "Description (optional)" / "What is this group about?"
- "Who can join", "Public" / "Anyone can find it and join.", "Private" / "Invite-only, hidden from browse."
- "Cover image (optional)", "Add a cover", "Remove cover", "Uploading...", "Creating...", "Create group"
- "Add batches now (optional)", "Everyone from a selected batch is added. You can also invite people later from the group page."
- errors/toasts: "Cover must be under 5MB", "Upload failed", "Failed to upload cover",
  "Please enter a group name", "Group created"

### Group header / cards — group-header.tsx / group-card.tsx
- "Keeper" / "Member", "Join group", "Joining...", "Leave", "Leave this group?", "Welcome to {group}",
  "Private" / "Public", "member"/"members", "You are the ... here", "{n} posts", "Keeper: {name}"

### Invites — group-invite-dialog.tsx / invite-response.tsx
- "Invite to {group}", "Search a person by name. Their invite arrives in their notifications.",
  "Type a name, like @Meera...", "Searching...", "No one found by that name.", "Invite", "Inviting...", "Invited"
- "Invited {name}", "{name} invited you to join {group}.", "Accept invite", "Decline", "Joining...",
  "Welcome to {group}", "Invite declined"

### Group actions (toasts/errors) — src/app/(main)/groups/actions.ts
- "{name} added you to {group}", "{name} invited you to join {group}", "Group name is required",
  "Group name is too long", "This group is invite-only", "Only the group Keeper can invite people",
  "You are already in this group", "That person is already a member", "No pending invite"

---

## 7. Letters, Catch-ups, Events

### Letters — src/app/(main)/letters/page.tsx + [id]/page.tsx
- "Letters", "Longer pieces from the valley. Essays, tributes, travelogues, reflections."
- "No letters yet.", "Be the first to write one. A letter is for the things too long for the feed."
- "Letter", "N min read", "Read", "Back to group", "All letters", "A letter" (default title fallback)

### Catch-ups (stub) — src/app/(main)/catchups/page.tsx
- "Catch-ups", "A gentle group newsletter: everyone answers a few prompts, and their replies are gathered into one issue."
- "In the works", "A round of catching up, on a rhythm", "Browse your groups"
- "A Catch-up is run from a group. Each round, every member is asked a few questions, and their answers are compiled into a single warm issue for the whole group to read, with a browsable archive of past ones."
- "This is the one feature that needs a scheduler and email behind it, so it arrives just after the site goes live. For now, gather your people into a group."

### Events (stub) — src/app/(main)/events/page.tsx
- "Events", "Reunions, founders' week, city meet-ups, and gatherings in the valley."
- "In the works", "Where the valley gathers", "Back to the feed"
- "Events will let anyone post a gathering, with a date, a place, and a simple way to say you are coming. The next one will surface on your feed as it approaches."
- "This lands alongside the deploy. Until then, share plans with everyone on the feed or inside a group."

---

## 8. The Valley Collection

### Collection — src/app/(main)/collection/page.tsx + [id]/page.tsx
- "The Valley Collection", "A shared picture of the place: the banyan, Rishi Konda, the birds, the light."
- "The Collection", "Pending review"

### Collection actions (toasts/errors) — src/app/(main)/collection/actions.ts
- "Only image files are allowed", "HEIC is not supported yet. Please export as JPG or PNG.",
  "Photo must be under 15MB", "Invalid subjects", "Could not process the photo: {message}", "Photo not found"
- "A photo you shared was not added to the Collection. This space is for the place itself; please share people-shots on the feed or your profile instead."

---

## 9. Settings & Admin

### Settings — src/components/settings/settings-form.tsx
- "Edit Profile", "Profile photo", "Your photo shows everywhere in place of your bird.",
  "Upload a photo, or keep your valley bird.", "Change photo", "Upload photo", "Remove photo"
- Fields: "Full Name", "Bio" / "A few words about yourself...", "Batch Type", "ICSE", "ISC",
  "Batch Year", "Year Joined", "Year Left", "Admission Number" / "e.g. 1234", "Current City" / "e.g. Bangalore",
  "Industry" / "Select industry" / "Not specified" (+ same industry list as onboarding),
  "Job Title" / "e.g. Software Engineer", "Phone", "Instagram" / "@handle", "LinkedIn" / "Profile URL"
- "Saving...", "Save changes"
- "Danger Zone", "Permanently delete your account and all associated data. This action cannot be undone.",
  "Delete my account", "Delete Account",
  "This will permanently delete your account, all your posts, comments, and data. This cannot be undone.",
  "Cancel", "Deleting...", "Yes, delete my account"
- toasts: "Please choose an image", "Photo must be under 15MB", "Photo updated", "Photo removed", "Profile updated"

### Admin — src/app/(main)/admin/page.tsx + components/admin/*
- Stats: "Total Alumni", "Total Posts", "New This Week", "Pending Reports", "Photos to Review"
- "Admin Panel", "Reported Posts (N)", "Verification (N)", "Photos to Review (N)", "Users (N)"
- Photo queue: "No photos awaiting review.", "Approve", "Decline"
- Report mgmt: "No pending reports.", "{a} flagged {b}", "{a} reported a post by {b}", "Reason: {r}",
  "View profile", "View", "Dismiss", "Hide post", "Delete post", "Block from the Users list below if needed",
  toasts: "Report dismissed", "Post hidden and report resolved", "Post deleted and report resolved"
- User mgmt: "Search users by name or email...", "Name", "Email", "Batch", "Status", "Actions",
  "Admin", "Blocked", "Active", "View profile", "Block user"/"Unblock user", "Delete user",
  "Delete this user permanently?", toasts: "User blocked"/"User unblocked"/"User deleted"
- Verification queue: "Everyone is verified. Nothing waiting.", "Verified", "Flagged", "Adm. {n}", "Verify"

---

## 10. Support & About

### Support — src/app/(main)/support/page.tsx
- "Support", "Help keep the RV Alumni network in the valley alive."
- Cost rows: "Server (always on)" / "Render, kept warm so the first visit each day is not slow" / "about ₹600 / month",
  "Database" / "Where every profile, post, and photo lives" / "about ₹550 / month",
  "Image storage and delivery" / "Hosting and serving the photos people share" / "a few hundred, usage based",
  "Email" / "Sign-in links and invites" / "small, most months free",
  "Domain name" / "Renewed once a year" / "about ₹1,000 / year"
- "Keep the network in the valley alive.",
  "RV Alumni runs on a small monthly bill. If it has helped you find an old friend or a lost batchmate, you can help keep it going. There is no pressure, and the site is always free to use."
- "What it actually costs", "All in", "roughly ₹1,200 to ₹1,500 a month to run",
  "These are the real numbers, not rounded up. A few people chipping in is enough to cover the whole thing."
- "Chip in over UPI", "What your support pays for",
  "Your contribution keeps the directory, the feed, the groups, and the Valley Collection running, with no ads and no one selling your details. It stays invite only, built for this community and no one else. Supporting is never a requirement to be here."
- "Thank you to everyone quietly keeping this going."

### About — src/app/(main)/about/page.tsx
- "About RV Alumni", "A space for Rishi Valley alumni to reconnect, share stories, and find each other."
- "What is this?", "RV Alumni is a simple, community-run platform for alumni of Rishi Valley School. Whether you graduated decades ago or just a few years back, this is your space to reconnect with batchmates, share memories of campus life, and stay in touch with the people who shaped your journey."
- "How to use it"
- "Feed" / "Share stories, campus memories, life updates, or photos. Use tags to categorise your posts. You can also target specific batches if your post is relevant to a particular group."
- "Directory" / "Find alumni by name, batch year, or city. Click on any profile card to see their full details."
- "Profile" / "Fill in your profile so your batchmates can find and recognise you. Add your city, workplace, and social links."
- "Community Guidelines" / "This is a space for genuine connection, not another WhatsApp group. Please keep these in mind:"  (NOTE: there was an em dash here; confirm removed)
- "Share genuinely" / "Post real stories, memories, and updates. We're here to reconnect, not to broadcast."
- "No forwards or chain messages" / "Please don't share festival greetings, chain messages, or forwards. Save those for WhatsApp."
- "Be respectful" / "This is a community of people who shared a formative experience. Treat everyone with the same respect you'd show in person."
- "No spam or self-promotion" / "The occasional career update is welcome, but this isn't the place for sales pitches or marketing."
- "Report, don't retaliate" / "If you see something inappropriate, use the report button. The admin team will handle it."
- "Rishi Valley School" / "Learn more about Rishi Valley, its philosophy, campus life, and current happenings." / "Visit rishivalley.org"

---

## 11. Common error strings (appear across server actions)
- "Not authenticated", "Not authorized" (used widely; generic, low priority to rewrite)

---

## 12. Seed / demo placeholder content — prisma/seed-demo.mjs

Fake data for the demo. Will mostly be replaced by real members, but listed because I wrote it.

### Sample groups
- "Bengaluru Alumni" / "Valley folk now in Bengaluru. Meetups, chai, and the occasional trek."
- "Class of '09" / "The batch that planted the south orchard. Keeping the thread alive."
- "Birders of RV" / "Sightings, photos and dawn-walk notes from the valley and beyond."

### Sample people + bios
- Ananya Krishnan: "ISC '08. Spend my days designing software and my weekends sketching the kingfishers near my parents' place. Still owe the library three books."
- Rohan Mehta: "Left the valley in '96, been building bridges ever since. Nothing I have designed is as quiet as the walk up to Rishi Konda at dawn."
- Meera Iyer: "Studying soil microbes in Berlin, which feels like a roundabout way of staying close to the valley's red earth. ICSE '14, ISC '16."
- Arjun Reddy: "Telling stories with a camera. Half of them somehow circle back to a hillside school I once knew. ISC 2002."
- Fatima Sheikh: "Children's doctor in Mumbai. The patience I learned under the tamarind tree turns out to be the most useful thing I carry to work."
- David Thomas: "Playing and teaching piano in New York. First learned to read music in the old assembly hall. ISC '99."
- Priya Nair: "Building payments infrastructure by day. Trying to grow a balcony herb garden that survives the fog. ISC 2017."
- Kabir Singh: "Arguing for rivers and forests in Delhi courtrooms. The seven years on a hillside were not lost on me. ISC 2005."
- Sneha Pillai: "Designing buildings that try to breathe the way the dorms did. ICSE '13, ISC '15."
- Lim Wei Sheng: "Studying coral reefs out of Singapore. Funny how a landlocked hill school taught me to pay attention to small living things. ISC 2009."
- Zara Hussain: "Reporting from Dubai. Learned to ask questions during long walks and longer silences in the valley. ISC 2019."
- Nikhil Joshi: "Taught geography in Toronto for thirty years, shamelessly stealing every method I first met as a student in the valley. ISC '93."
- Lakshmi Subramaniam (teacher, "Biology, Nature Club"): "Taught Biology and ran the Nature Club for twenty-four years. If you ever knew the names of the morning birds, some of that may be my fault."
- George Abraham (teacher, "Mathematics, Astronomy"): "Still here, still teaching Mathematics, still dragging students out at midnight to look at Saturn through the old telescope."

### Sample posts (tag — body)
- Nature: "A hoopoe on the slope below Rishi Konda this morning, working the grass for grubs with that absurd crown going up and down. First one I have seen since the rains. The valley remembers how to surprise you."
- Meetup: "Bengaluru alumni, we are doing a small evening at Cubbon Park next Saturday. Bring a flask of tea and any stories you are willing to part with. Reply here if you are coming so I can count cups."
- Campus: "Took the senior boys up for Saturn last night. Clear sky, rings tilted just right, and for once nobody complained about the cold. One of them said it looked fake. High praise."
- Alumni Fund: "Quick note on the alumni fund: this year's scholarship corpus covered full fees for four students who could not otherwise have come. If you have been meaning to give, even a small amount compounds quietly. Details are on the support page."
- Memory: "Thirty years on and I can still draw the floor plan of the old dorm from memory. The creaky third bed by the window was mine. Anyone else from the '96 batch remember the midnight thunderstorm that took out the power for a week?"
- Nature: "From a soil lab in Berlin: the red earth of the valley is doing something I am only now learning to measure. I keep a small jar of it on my desk. Colleagues think it is decorative. It is not."
- Update: "Spent a week back on campus filming for a small documentary. The tamarind tree is bigger. The silence at dusk is exactly the same. I will share a cut with this community before anyone else."
- Meetup: "Bay Area folks: there are more of us out here than I realised. Thinking of a Sunday hike and dosa afterward. Drop your name if a morning walk that is gentler than the trek to Rishi Konda appeals to you."
- Memory: "A child in my clinic today would not stop fidgeting until I sat on the floor with her. Somewhere in that was the patience of a hundred quiet mornings under the tamarind tree. Thank you, valley, for that."
- Update: "Playing a set in a small room in the West Village this Friday. The first chords I ever learned were on the assembly hall harmonium, slightly out of tune. Everything since has been an attempt to get back to that feeling."
- Campus: "We designed a library this year with deep verandahs and cross ventilation, no air conditioning. The clients were nervous. I kept thinking of the old reading room and how the breeze did all the work. It works."
- Nature: "Diving a reef off Singapore this week and counting species the way we once counted birds on the morning walk. The attention is the same. Wherever you went, the valley taught you to look slowly."
- Meetup: "Any alumni passing through Dubai this month? I am here and short of people who will let me ramble about the school for an hour over coffee. The bar is low and the coffee is good."
- Memory: "Class of '93 here, now retired in Toronto after a life of teaching geography. Every map I ever drew on a blackboard started, secretly, from the contour of those hills. To my old batch: I think of you often."
- Alumni Fund: "The Nature Club needs a modest sum to replace its ageing binoculars and reprint the bird checklist. If any old club members want to chip in, it would mean a generation more of children learning the difference between a bulbul and a babbler."
- Campus: "Exam season ended, so I let the maths class out early to watch the sunset from the rocks. Some lessons are not on the syllabus. The valley grades those ones itself."

### Sample Letters (long-form; full text in prisma/seed-demo.mjs)
- Title (L396): "A letter to the boy in the third bed by the window"  (body at L399, ~5 paragraphs)
- Title (L403): "On the red earth, and why I keep a jar of it on my desk"  (body at L406, ~4 paragraphs)

### Other seed fallbacks
- "A Keeper", "{inviterName} invited you to join {group}" (notification fallback)
- seed-collection.mjs L167/L190: "The valley" (SVG caption fallback)
</content>
