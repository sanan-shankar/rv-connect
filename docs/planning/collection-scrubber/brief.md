# The owner's own words — session of 2026-08-28/29

**Read this file before `handover.md`, and read all of it.** This is the whole of what he
said in one long session, in order, verbatim, typos and all. The handover's ledger points
into this; it does not replace it. Most of these are already shipped — they are here because
the taste in them is standing, and the next session must not undo any of it while building
the parts that are not.

Status tags are mine, not his. `[SHIPPED]` means it is on `main` already.

---

### 1. The contribute dialog, the founding brief `[SHIPPED]`

> in the add to the valley's memory dialog box:
>
> There's a big gap between the title and the first picture and there's a gap between the
> title and the ad More as well. I'm just wondering if we can put the ad More somewhere
> else. I just wanna make this some more vertically space efficient design cause on
> computer okay? It's fine but on mobile I just want to increase the conversion rateright
> so first yeah okay so just tighten things up a little bit don't make it cramped but yeah
> let's let's improve it a bit then if there are multiple images let's make it a Carousel
> because I don't think people are going to click well firstly defaults to select all and
> then I don't think people are going to go one by one and put all the tags and stuff like
> that and when people upload photos, they're generally not going to upload all bird photos
> and stuff like thatso it's not like the tags will carry on for each batch of photos so
> let's make a carousel that works very well maybe on mobile if you can just swipe but I
> guess you should also have those buttons and also follow those buttons like the arrow
> buttons let on laptop when you have it over them don't make them enlarge just change the
> colouring cause that's what we normally do. We change the colouring when we have it over
> and then it compresses when we press it but on catch ups the arrows enlarge when you
> hover over them and then compress when you press them so it's like a much more
> exaggerated compression because it's enlarged to start with so yeah let's get that right
> and now in this carousel maybe on Phone you could swipe the switch pictures or something
> I don't know and we have to make sure different size pictures. We manage the different
> sizing of the panel smooand let the first question be what is it of okay? And on mobile
> let us make instead of two columns three Rose let's make it three columns two rows I
> think that will still be a big enough touch target and then below that let's have the
> when it was taken and then below that let's have the description and don't say what is
> this photograph? We can just sayadd a description and then in the dot you can say include
> any further context or I don't know something nice anything you remember. It is not a
> nice way I've seen but and then I don't want to bold this. What to wear who or maybe I
> should maybe just say what is happening where in the Valli it was and who is in it? Don't
> say if you know don't say a Alanis plenty don't say nothing is required oka? Yeah we have
> to make sure we don't use a fonts that are too small on mobile because this is getting to
> become a bad accessory accessibility thing okay and then the year thing under that
> description and maybe the description isn't a rectangle but I'm in this tall rectangle
> but it should clearly expand people are typing okay and yeah it's a usual I guess and
> then they can swipe and then they can repeat the same process for the next picture I
> guess they doesn't need to be status like outline over the picture anymore if there's
> only one per so you can adjust that I think we can do this. We can do part of this for
> computer as well like the carousel aspect we can apply even on computer. Yeah, and make
> sure that the picture is obviously centred in the carousel right now some of them are
> just left a line or something cool if you think I don't think we need to make this a
> separate page yeah I don't think we need to make this a separate page, but if there's if
> you have a good reason for saying okay let's just make it its own page then I will
> consider it but yeah otherwise just this much oh yeah one more tiny thing is the ordering
> button the newest time oldest most loved delete the subtext subtitle text for that
> because the same thing that font is just getting too small you know we're just not
> respecting the user enough the mobile user so we can just see newest chronological oldest
> most loved we should probably sayChrono logical actually know the order is good newest
> chronological old as most loved

### 2. The middle dot `[SHIPPED]`

> also the middle dot between the number of photographs and the sorting that middle dot
> isn't actually in the middle of the line it's like almost a full stop At the bottom of
> the line.

### 3. Apply-to-all `[SHIPPED]`

> make sure your apply all button is tastefully positioned and built

### 4. How to edit files — a working preference, not a task

> recent sessions normally run edits through bash python instead of through write and edit
> tools because it's more efficient fyi. any reason you're doing it this ways?

### 5. The carousel transition `[SHIPPED]`

> do the crossfade carousel transition not what's ther enow

> when you move from one picture to another in the image viewer it doesn't slide it does
> the crossfade thing. what's what I mean

### 6. The toolbar baseline `[SHIPPED]`

> the 1 phtoograph newst line isn't in line with the buckets line

### 7. The stage height `[SHIPPED]`

> make 240px the max but if the tallest photo is less than that then make it that

### 8. The dot, again `[SHIPPED]`

> Middle dot still not in the middle is it?

(He was right. The first fix was verified against a screenshot of the OLD rule, because the
dev server was serving a stale stylesheet. See handover §0.)

### 9. The questions panel — the second founding brief `[SHIPPED]`

> can we scratch the way we do years now. instead of decades. just make a revolut-esque
> cute signup/sign in style box where they can put year and month. do we show year and
> month or show month only after they put year? idk. if they leave it blank it can go to I
> odn't know. looking at that box i'm seeing it just has an excess of elements and border
> it's not smart and sleek at all. it's just overcrowded and disgusting. we need to holld
> ourselves to a higher standard there. the sign up UI was so beautiful. now don't copy it
> exactly. it was written to be good for sign ups. we have to write something that's good
> for this. I think the tagging is fine and carousel is now fine. i'm not perfectly happy
> with the descrption box size of style eithe ri think that can be tweaked. the addmore and
> add pictures thing is fine. so many things are good not to change the hwole thing but
> definitely some weaknesses. cmon fix them and do an amazing job and urprise me with some
> amazing ui

### 10. The info tooltip `[SHIPPED]`

> pay attention to the position of the information box and how it moves. its misplaces now.
> also pick the size of it's window carefully. we don't want some unevenly wrapped lines and
> it looks wonky. pick a size that gives it some uniform lines

> still not a huge fan of the position of the i circle. it's not alligned to anything just
> hanging I can't see why it's there

### 11. Pushing

> whenever you're done I give you permission to push. you're almost there just make sure you
> address everything and you're happy

### 12. The two grouped rows `[SHIPPED]`

> why is the second box bigger than the first??

### 13. The finish screen `[SHIPPED]`

> Three photographs, added to the valley's memory.
>
> make this thank you for your contribution. make the hoopoe on that page a bit bigger and
> have a big celebration reaction for the hoopoe and move the hoopoe slightly heigher it's
> sitting too close the the title

### 14. THE DECADE RAIL — the live work `[BUG FIXED, REDESIGN OPEN]`

> also say I just enter collection. then I click 2020s and then those pics come up, I now
> have no way to go back? or am I missing something. the only way to bring up that sidebar
> type thing is to reload collections. like doing that has locked me into 2020s. let's
> brainstorm how we can best use that side number panel. I love the idea and I love showing
> how many photos in each year with the grey line. I expect we might have to divide up the
> decades into years later on once more pictures come in. but yeah. it's definiitely not in
> it's full potential now. can be much better and tie in with the ui better instead of just
> suddenly changing the positions of phtoos when you click on it

### 15. EXIF — live work `[OPEN]`

> also isn't it possible to scrape the when of the photo from the metadata? like have that
> as the default if it's reliable metadata. and if they want to edit the year they can but
> otherwise it ships withi that

### 16. Mobile decade strip `[SHIPPED — removed]`

> Remove the decades and undated thing from mobile. It looks really bad. And the 4 photos
> newest needs to be moved a touch down it's too close the to the navigation

### 17. The page title `[SHIPPED]`

> Also move the word collection a bit below. Don't move the rest that's fine. Just the
> collection word is too close to the valley. Just a bit under

> You can tweak it for all of them if all it does is moves the wrapped words a bit lower

### 18. His three decisions, in answer to a brainstorm

Asked what pressing a decade should do — **seek (travel the river)** vs **filter but animate**
vs **both** — he chose **seek**.

Asked how "when" should work under 1280px — **in the toolbar sentence** vs **a proper
scrubber down the right edge** vs **nothing on mobile** — he chose:

> A proper scrubber down the right edge

Asked how far EXIF should go — **suggest never assume** vs **default and let them edit** vs
**default only when the date is old** — he chose, in his own words:

> default only when date is old is good but maybe extend that to 2010

Asked how far to take the seek now — **jump down and page onward** vs **full scrubber both
directions** vs **do EXIF first** — he chose:

> Full scrubber, both directions

### 19. The instruction that produced this document

> I think just write a concrete plan for now that i'll paste into the next chat. include all
> the nuance in my prompts
