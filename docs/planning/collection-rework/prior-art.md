# How everyone else solved this

Owner, in the brief: *"you have to see how big archives and photo libraries manage this. This
is surely not a problem we have to solve from scratch. Many people will have done it before."*
And again mid-session: *"we don't have to reinvent the wheel either do research on how other
companies do this and what the pros and cons of each are in detail and how they tackle them."*

This file is that research. Written 2026-08-26/27, sources at the bottom.

**A note on confidence.** Two things here were measured directly, in a browser, and are
certain: how the owner's reference gallery lays out (Pixieset, justified rows, numbers in
`handover.md` F2) and what our own code does. Everything else is public writing about other
people's products. Where a company published its own engineering account, that is strong.
Where the only sources are third-party guides, the *shape* of the answer is reliable and the
exact numbers may drift as products change. Flagged inline as **[measured]**, **[company]**
or **[secondary]**.

---

## The problem is two problems

It helps enormously to split them, because almost every company answers them separately and
we had been treating them as one:

1. **Framing.** One photograph of unknown shape, one column of known width. What happens to it?
2. **Layout.** Many photographs of different shapes, one area. How do they pack?

Our feed and catch-ups have a framing problem. Our Collection grid has a layout problem. The
crop that eats faces in a catch-up and the fact that our Collection rows do not line up are
not the same bug and do not have the same fix.

---

## Part one: framing a single photograph

### Instagram — a narrow legal range, and reject or crop outside it **[secondary]**

Feed posts live between **4:5 portrait and 1.91:1 landscape**. Three shapes are blessed: 4:5,
1:1, 1.91:1. Anything outside that range is cropped to fit, and via the publishing API it is
rejected outright. A 3:4 image (0.75) sits just under the 4:5 floor of 0.8, so it publishes by
hand but is refused by a scheduler, which tells you the boundary is enforced literally rather
than approximately.

Separately, the **profile grid thumbnail crops to 3:4**, so a photo can be legal in the feed
and still lose its edges in the grid. Instagram's own guidance is to keep the subject inside
the 3:4 safe area.

- **Why they do it.** Predictable card heights across thousands of device sizes. A feed with
  unbounded heights cannot be virtualised cheaply and cannot be scrolled comfortably.
- **The cost.** The uploader has to think about shape before they shoot. Photographers hate
  it. A 9:16 phone photo loses about 44% of its frame.
- **How they soften it.** A crop editor at upload time, so the *person* chooses what is lost
  rather than an algorithm. This is the important part and we do not have it.

### X / Twitter — tried an algorithm, measured it, threw it away **[company]**

This is the cautionary tale, and it lands directly on one of the six rules in `/lab/crop`.

From 2018 Twitter cropped timeline previews using a **saliency model**: a neural net predicting
where the eye goes, with the crop centred there. Exactly the "focal point" idea, done by the
company with the most data and the most engineers.

In May 2021 they published their own audit. The model **favoured white faces over Black faces
and women over men**. Their conclusion, verbatim from the engineering blog: *"not everything on
Twitter is a good candidate for an algorithm, and in this case, how to crop an image is a
decision best made by people."* They removed it, switched to showing standard aspect ratios
uncropped with a true preview at compose time, open-sourced the model and ran the industry's
first algorithmic bias bounty on it.

- **What this means for us.** Our sixth rule, "aspect bounds, aimed", uses `sharp`'s
  `attention` strategy to move the crop window. Two problems, and the owner should know both
  before choosing it. First, `sharp`'s attention is a contrast/edge heuristic, not a face
  detector, and the numbers in `_specimens.ts` prove it misbehaves on our own photographs: on
  both portraits it went for the bright canopy and walked straight past the benches. Second,
  and much more serious now that **D2 widened the archive to include people and class
  photos**, an automatic crop that systematically frames some faces better than others is a
  real failure with a documented precedent at a company far better resourced than us.
- **The honest version of the idea** is Twitter's replacement: don't guess, *show* the person
  the crop before they post and let them move it. Cheap, no model, no bias surface.

### Facebook, WhatsApp, Apple Music — blurred fill **[secondary]**

Where a photo does not fill a fixed box, fill the remainder with a blurred, dimmed, enlarged
copy of the same photo rather than a black bar. Instagram does this too for out-of-range
Stories.

- **Pro.** Nothing is cropped. Every card is the same height. No bars. It keeps the colour and
  mood of the photograph, so the page still feels like it is about that picture.
- **Con.** The photograph ends up small. A 9:16 photo inside a 3:2 box is showing you about a
  third of the width it could have used. It also reads as a workaround to some people, and it
  is the one option here with a distinct visual signature that will date.

### The plain answer nobody writes blog posts about: cap and let the rest be

A height cap with `object-cover` is what we ship, and it is the worst of the options, for a
reason that is specific rather than general: **our cap is a fixed number of pixels
(`max-h-96`, 384px) applied to a column whose width varies from 358px to 1216px.** At 358px
that cap is roughly a 1:1 crop, which is mild. At 1216px it is a **3.2:1 letterbox applied to
every photograph regardless of shape**, which is why the wide-screen case the owner noticed is
so much worse than the laptop case. A cap expressed as an aspect ratio instead of a pixel
count fixes most of the visible damage without any other change.

---

## Part two: laying out many photographs

### Justified rows — Flickr, Google Photos, Pixieset, SmugMug, Unsplash **[company + measured]**

The clear winner, and what the owner's reference gallery does.

Walk the photographs in order, adding each to the current row, until the row's natural height
drops to the target you were aiming for. Then solve for the exact height that makes that row
fill the container. Every photograph keeps its true shape, gutters stay even, rows line up.

Flickr shipped it in 2011, and **open-sourced the algorithm as an npm package** in 2016
(`flickr/justified-layout`, MIT). Their own description of the trick: row height is the lever,
and it gets as close to the target as it can. Google Photos was built on the same idea, with
the stated goals of full-width justified layout, preserved aspect ratios, a scrubbable
timeline, hundreds of thousands of photos, 60fps and near-instant load.

- **Pro.** Nothing is cropped, ever. Even spacing. Works with any mix of shapes. Reading order
  is preserved (left to right, top to bottom), unlike columns.
- **Con.** A trailing row with one photograph in it wants to blow up to the full container
  width. Every implementation caps the last row instead; ours does, in `_justified.ts`.
- **Con.** It needs to know each photograph's dimensions **before** it can lay out. This is
  precisely the thing we do not store for feed, letter and catch-up images, and is why F4 in
  the handover is the load-bearing finding of this whole campaign.

### Masonry columns — Pinterest, and our Collection today

Fixed-width columns, photographs stacked down each, next photo goes to the shortest column.

- **Pro.** Trivial in CSS (`columns: 3`), nothing cropped, no dimensions needed up front.
- **Con.** Rows never line up, which is exactly the difference the owner noticed between our
  grid and his reference. Reading order goes down a column rather than across, so "newest
  first" reads oddly. CSS columns also cannot be virtualised, so it cannot survive 20,000
  images.

### Mosaic templates — Facebook, Twitter, our post cards

A hand-authored set of arrangements per photo count: one big plus two small, a 2x2, and so on,
with everything cropped to fit its slot.

- **Pro.** Dense, tidy, predictable height.
- **Con.** Every photograph is cropped, usually hard. This is what our three-photo post card
  does, and it is a second, separate source of the chopped-faces complaint.

---

## Part three: making it fast at 20,000 images

Two published pieces matter here and both cut against the obvious implementation.

**Flickr pre-generates the layout on the server. [company]** The justified algorithm needs the
viewport width, which normally only the browser knows, so Flickr stores the viewport width in
a **cookie** on first visit and runs the layout server-side on every subsequent request. The
payoff they measured: they know exactly which image sizes the top of the page needs and can
begin downloading them immediately, and **the first photograph loaded seven times faster.**
Client-side code still corrects the layout if the window was resized since. This is a directly
liftable idea and it fits our constraint perfectly: knowing the exact size in advance means
requesting a **precomputed derivative from R2**, never a Vercel image transform (handover F1).

**Google Photos virtualises. [company]** Only the visible rows exist in the DOM. Their stated
targets were hundreds of thousands of photos at 60fps with a scrubbable timeline. Note the
part most people skip: a virtualiser has to know row heights in advance to size the scrollbar,
which again means **stored dimensions**. Every road leads back to F4.

Note also what the owner observed on his reference gallery and what we measured: 35 images in
the DOM out of roughly 300. Batched lazy loading, not virtualisation, which is enough at 300
and would not be at 20,000.

---

## Part four: organising the archive

The owner talked himself both into and out of tags: *"do we need tags at all because if people
are just putting all the information under the captions then we don't really need tags."*

The digital-asset-management literature is unusually consistent on this **[secondary, but a
large and settled body of it]**: free-text keywording alone goes wrong at scale in a specific
and predictable way. It is inconsistent, too general, biased toward whatever the tagger
happened to care about, and it produces ad hoc private vocabularies. Controlled vocabularies
win on retrieval because everyone is made to use the same word, spelled the same way.

But the owner's counter-argument is also correct and is not answered by that literature: **a
controlled vocabulary that nobody fills in is worth nothing.** He cannot ask a contributor to
tag 100 photographs, and he expects 70-80% of the archive to arrive in bulk.

The two are reconcilable, and this is the shape almost every serious archive actually uses:

- **A small controlled spine** — a handful of buckets that will not drift, used for browsing
  and filtering. Small enough that a contributor picks from it without thinking.
- **Free text underneath it** — caption, notes, place, people — searched rather than filtered.
  This is where "behind junior Adi under the trees" belongs, and it is exactly why the current
  "Part of school" dropdown is heading for 2,000 unusable options (brief #30). The owner
  reasoned his own way to this: fold that field into the search box.
- **Machine assistance to fill the spine**, not to invent it. This is the owner's own LLM
  proposal (#25) and it is the right shape: the model's job is to map a photograph and its
  description onto an existing small vocabulary, which is a classification task with a closed
  answer set, not open-ended tag generation. Same pattern as the directory professions.

Worth flagging honestly: automated tagging services are sold hard by every DAM vendor and are
mediocre at the thing that would matter most here, which is recognising *this specific place*
and *these specific people*. It will know "tree" and "building". It will not know "the banyan"
or "Rishi Konda" unless we teach it those words explicitly in the prompt.

---

## What this points at

Not a decision, since the crop rule is the owner's to make in `/lab/crop`. But the reading
lines up behind a fairly clear position:

1. **Store dimensions on every image.** Justified rows need it, virtualisation needs it,
   reserving space needs it, and picking the right R2 derivative needs it. Nothing else in
   this campaign can be done well without it. (handover F4)
2. **Express the cap as a shape, not a pixel count.** Most of the wide-screen ugliness the
   owner sees is that one bug.
3. **Justified rows for the Collection grid.** Universal among photo-first products, the
   reference gallery does it, Flickr open-sourced the maths, and our own implementation is
   ~30 lines.
4. **Do not ship an automatic saliency crop, at least not for photographs of people.** X
   tried it with far more resources, measured real bias, and withdrew it. If we want a crop
   that respects the subject, take their replacement instead: show the contributor the crop
   at upload and let them drag it.
5. **A small controlled spine plus strong free-text search**, with the LLM filling the spine
   rather than inventing vocabulary.
6. **Pre-compute the layout server-side where we can**, because the same knowledge that makes
   it fast is the knowledge that keeps us off Vercel's metered optimiser.

---

## Sources

Measured directly, this session:
- [gallery.alekziol.com/mechsoc-banquet](https://gallery.alekziol.com/mechsoc-banquet/) — the owner's reference. Pixieset, theme "vintage". Geometry measured in `chrome-devtools`; numbers in `handover.md` F2.

Company engineering writing:
- [X Engineering, "Sharing learnings about our image cropping algorithm"](https://blog.x.com/engineering/en_us/topics/insights/2021/sharing-learnings-about-our-image-cropping-algorithm)
- [Kadambi et al., "Image Cropping on Twitter: Fairness Metrics, their Limitations, and the Importance of Representation"](https://arxiv.org/pdf/2105.08667)
- [code.flickr.com, "Our Justified Layout Goes Open Source"](https://code.flickr.net/2016/04/05/our-justified-layout-goes-open-source/) and the [live demo + npm package](https://flickr.github.io/justified-layout/)
- [code.flickr.com, "Pre-generating Justified Views"](https://webarchive.library.unt.edu/web/20131218203619mp_/http://code.flickr.net/2013/06/14/pre-generating-justified-views)
- [Antin Harasymiv, "Building the Google Photos Web UI"](https://medium.com/google-design/google-photos-45b714dfbed1)

Press, on the X crop withdrawal:
- [CNN Business](https://www.cnn.com/2021/05/19/tech/twitter-image-cropping-algorithm-bias) · [Washington Post](https://www.washingtonpost.com/technology/2021/05/20/twitter-cropping-tool-removed/)

Secondary guides, for the Instagram numbers:
- [Buffer, Instagram image sizes](https://buffer.com/resources/instagram-image-size/) · [Hootsuite, social media image sizes](https://blog.hootsuite.com/social-media-image-sizes-guide/) · [growthscribe, aspect ratio for Instagram](https://growthscribe.com/aspect-ratio-for-instagram/)

On taxonomy versus free tags:
- [Journal of Digital Asset Management, "Taxonomies and controlled vocabularies best practices for metadata"](https://link.springer.com/article/10.1057/dam.2010.29) · [FotoWare](https://www.fotoware.com/blog/taxonomies-controlled-vocabulary-in-dam) · [Orange Logic](https://www.orangelogic.com/taxonomy-in-digital-asset-management)
