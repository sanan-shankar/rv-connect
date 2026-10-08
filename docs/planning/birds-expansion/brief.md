# The owner's brief, in his own words

**Date: 2026-10-08. Spoken, in one sitting, as a dictated message followed by a pasted meeting
transcript titled "Bird illustration design review and assignment algorithm refinement".** This
file is the source of truth for what was asked for. Every session working this campaign reads THIS
file, in full, first. [`handover.md`](handover.md) indexes it; nothing replaces it.

**What was cleaned, and what was not.** Fillers ("um", "uh", "like", "you know", "okay" as a tic)
are removed. Stutters and restarts are merged. The speech-to-text mangled nearly every bird name;
where the intended name is clear from the gallery order and the description, **the word as
transcribed stays in the sentence and the reading sits beside it in square brackets**. Where a
sentence cannot be recovered it is left as transcribed and marked [unclear]. Everything else is
his: same content, same order, same emphasis, every hedge ("I guess", "honestly", "a bit",
"maybe", "I don't know"), every reversal, because the register is part of the instruction. The
paragraph numbers in **[n]** are the only structural addition, so the handover can point at them.
Anything in square brackets is the transcriber's note and nothing else is.

The 50 birds he is walking through are at `/birds`, in the order of `SPECIES_FULL_NAMES` in
`src/components/common/bird-avatar-v2.tsx`; the handover's ledger maps each remark to its index.

---

## Part one, the dictated message

**[1]** I have a bunch of new birds, okay? So we're gonna expand our catalog of 50 birds into more.
I've attached a PDF called Birds of Issue Value [The Birds of Rishi Valley; it is at `sanan's
stuff/The Birds of Rishi Valley.pdf` in the repo]. I don't know if it has all the birds that we
already have, but it definitely has other ones.

**[2]** From this list of birds, you have to take the ones that were, firstly, they would look
good as these profile pictures, right? It shouldn't, you have to have a sense, they should be
somewhat colorful, separate from the background, have different colors, be aesthetic. Get a
really thorough sense of color science and what goes together well and what is visually
appealing and what works with our app, and then pick the birds that work with that. That's one
criteria.

**[3]** The second one is they should be, it's fine if they are kind of similar, but they
shouldn't look too similar, particularly the black ones, they can look just way too similar. So
we need to have at least some way to tell them apart and some somewhat defining characteristics.
The birds that we have right now on the website are already kind of different from each other.
So the ones we add have to be obviously different from each other and different to the ones that
are already there and look amazing. So these are the two main criteria for which birds to pick.

**[4]** Now, when you build it, it's just one criteria, cuteness. That's all that matters. The
birds that are displayed on the support page are the ones that I handpicked from the 50 that I
thought are particularly cute and go well together with the other birds. So it's also about the
synergy of that, which is why I put the support page. But those are the ones that I thought
looked particularly nice.

**[5]** But now let me go through the bird list and talk through some of the birds. And so that
would give you an idea of what I'm looking for. And because for this session, apart from building
new birds, we'll also be tweaking the design of the old ones that I didn't like.

**[6]** So, okay, poo-poo [Hoopoe], obviously nothing to fall [nothing to fault]. Pfowl [Peafowl]
is also loved. Owlet is good. Laughing Dove is good. All of these are good.

**[7]** I'm not a huge fan of the red-whiskered Bobo [Red-whiskered Bulbul]. I feel like it looks
a bit almost angry and it's very sharp and stuff. And it just looks a bit like a mess right now,
particularly the thing on top that's going on looks kind of ugly.

**[8]** The Mao Koha [Sirkeer Malkoha] honestly looks okay. I guess that's how it looks in real
life, but yeah. The hornbill looks good, good representation. The magpie [Oriental Magpie-Robin]
looks decent, but the white shapes in the middle feel a bit arbitrary and just something not so
nice about them. They're not very visually appealing. Robin [Indian Robin] is okay. [He returns
to the Indian Robin in ¶36 and does not think it is okay; the later, longer remark is the one the
ledger takes.] The coal [Koel] is okay.

**[9]** Drongo, the fork is good. If we could make the fork a bit nicer, now it's like very
rough, that's fine. If you notice in the birds, even with Kukul [Coucal], there's a very rough
straight line. I don't really like those. It feels like it's just been, the image has just been
cut off.

**[10]** If you see the birds that we displayed on support are more often than not the circular
ones as opposed to the ones that broke shape. Now that is not a sign for you to make only
circular ones because some of the more unique ones like the hornbill, like the lapwing,

## Part two, the pasted transcript

**[11]** Like, the lapwing, like the bondhead and the continent [the Pond Heron and the Cormorant,
read from the sentence before: the birds that broke the circle]. Well, honestly, the Brahminy Kite
is also a very interesting take. It's not like the other circular bugs [birds], but I really love
it. The colors work really well on it. It is harder to make those look cute and work. And it's
easier for them to go around [go wrong].

**[12]** Like, there's something I don't like about the oriental manpie [Oriental Magpie-Robin],
even the shape slightly. Tickles blue flycatcher [Tickell's Blue Flycatcher], orange headed
thrush, they all look just a bit weird. I feel like it's straying a bit far. I know I've picked
all the super tall ones. Maybe that's a part of it. But on a common kingfisher, it looks fine.
Though that's also kind of dull. Small, minivan [Small Minivet] is okay. It's not not great.

**[13]** But the strike [Bay-backed Shrike] looks okay. You know? Although the strike's beak is a
bit too, like, crooked and pointy, as is the figure of falcon's [Peregrine Falcon's].

**[14]** Now, again, like I was saying, we have to balance cuteness with the trueness to the
bird. So if the cuckold and the cold [the Coucal and the Koel] do kind of freak me out with the
red eyes and stuff, but I guess that is how they are. So you might have to keep that. In other
places, we have compromised that to keep cuteness, and I think we've done a good job. Like, with
the laughing dog [Laughing Dove] and so on.

**[15]** Anyway, going through this list, the roof is fine [the Rufous Treepie is fine], by a
weaver [Baya Weaver], okay, it's okay. The Bemidani Starling [Brahminy Starling], I don't like at
all, to be honest. I don't like the color. I don't like that super thin black line. I don't,
honestly, I don't like anything about it. Nibrami styling [the Brahminy Starling], which should
should be done [should be redone]. Yellow water lapwing [Yellow-wattled Lapwing] is okay. In its
profile. [unclear]

**[16]** Isn't other spline catcher [the Asian Paradise Flycatcher]? Here's the thing. Other
spline catcher [the Paradise Flycatcher] is one of the most iconic birds in our school. And it's
like this insanely long tail, is white, magnificent, tiny, cute, just majestic bark [bird]. And
the females look like what you've done, but I think we should pick the male. And we need to make
sure that we're doing justice to it. Because, honestly, when I think of the ground beauty [grand
beauty] of the bird, that's why. And then I looked, like, I'm like, look at this. It's totally
not doing justice at all.

**[17]** And your pawn had [the Pond Heron], a very cute feel, like we could add color or do
[something]. It is kind of bland. The shape is good. Again, the beak has this weirdly, very
sharply cut off thing. Don't like that. Maybe, I don't know. I feel like I've said it before, but
we still have a lot of these very odd arbitrary sharp cutoffs.

**[18]** The little confidence [Little Cormorant]. See, there it's there in the middle. And,
honestly, that doesn't look too bad. If it could be rounded just a bit, that'd probably give it a
bit more polish. But stuff like the beak and the Indian horn hadn't [Indian Hornbill] shouldn't
just, it looks like the image has been interrupted and cut up.

**[19]** So I've asked you to do this multiple times. Maybe you failed. So maybe we need, like,
an independent reviewing agent so that you create some kind of a loop to fix that, because
that's not [acceptable].

**[20]** The Indian golden audio of premium price [the Indian Golden Oriole: pretty, vibrant
colour]. Vibrant color. Party [pretty], I don't know. There's, like, the eye, and then there's
this line going through the eye, and then that intersects the beak. The colors are fine, but I
feel like the layout is a bit weird, and it looks almost like it's wearing sunglasses. It doesn't
really look like a coherent picture.

**[21]** The [Cattle Egret, the next bird in the gallery] is good, against some sharp stuff.
Florida to fly catcher [Verditer Flycatcher]. Super simple. Super cute. Great job.

**[22]** Peregrine Falcon is probably the one that we worked around the most. Because I really
wanted to do it justice since it's so sick. And it seemed like we really overengineered it. It
doesn't look, it looks, it looks derpy is what it is, what it looks like. It doesn't, we have to
balance the cuteness with the, you know, the sheer strength of the bird. And right now, we've
just messed it up. We've overthunk it. We have way too many things going on. It looks like it has
a pot belly. It does, it looks, you can see that we've overthrown [overdrawn]. There's, like, a
lot of stuff going on. I don't, I'm not a huge fan. I don't know what exactly to change. I've
gone through maybe four or five versions of it. And I haven't liked any of them. We have to
balance the killer nature with the cuteness and at the same time keeping it just simple. Right
now, we have, like, 70 different elements. So I'm not happy with that.

**[23]** All in Channatash [Orange-headed Thrush], I think I already spoke about, the shape is a
bit long, as is with the blue flycatcher [Tickell's Blue Flycatcher] and the magpie [Magpie-Robin]
kind of. But at the same time, small minivet as well, a little bit [long]. Of the new batch, like,
it's still okay. There's just something I don't like about the orange headed thrush. For some
reason, it is just not working for me.

**[24]** Blue phase [Blue-faced Malkoha]: the background color is that, like, all of the green,
and then inside, we have a dark and only green [olive green]. I'm not so sure about the color
science of that. I mean, it looks a bit off.

**[25]** The Jacobin cuckoo again has a lot of randomly harsh and weird cut off shapes. It's hard
to really tell what's going on. It's another black and white bird. So it is a harder problem to
solve. But yeah, the thing on top and, you know, it's like you almost have to think of the white
as, like, white space, right, against some backgrounds. So it doesn't show that nicely. Yeah. I
feel like the Jacobin cuckoo should be redone again.

**[26]** Black eagle, similar problem with that eyebrow. There's this, like, you have a beak, and
then you have this random brown spot on top of the beak, and it's hard to tell what's going on.
And then there's a black line over the eye, but you can't really see that at all. So it's not
really adding anything to it. Large eagle [the Black Eagle again, or possibly another bird; the
ledger reads it as the Black Eagle since the remark continues it], similar problems to the
pterygoid falcon [Peregrine Falcon]. It does have too many elements, obviously, not as bad as the
pterygoid falcon [Peregrine Falcon], but, yeah, it's still pretty bad.

**[27]** Gertel's leaf [Jerdon's Leafbird], are such lovely colors. It's hard to make sense of
what is the eye, beak, face, you know, that part of the thing. I do love the colors. It does have
a lot of stuff going on, but, honestly, it just works. I don't feel like there's something to be
reduced, but the structure could be made a bit clearer.

**[28]** Black lung, flame back [Black-rumped Flameback] is honestly fine. Has been fine, but the
beak is a bit great [unclear: "a bit straight"? "a bit grey"?].

**[29]** Coppertone sunbar [the Purple-rumped Sunbird, from the description that follows] is a
very different take. The beak is very different. Honestly, it works. There's, like, a good sign
of, okay, we're taking out of the mould, but it's still giving something you like. And it has
this, like, nice green and yellow, and all of a sudden, we have this almost magenta thing, but it
still works.

**[30]** It comes with a flycatcher [Tickell's Blue Flycatcher, the next bird]. I don't like it.
There's something just not nice about it. Can't really put my finger on it, but yeah, it looks
just weird. Chestnut had to be fine [Chestnut-headed Bee-eater is fine]. Dry color cornea is gray
[Tricolored Munia is great? or is grey; unclear].

**[31]** Orange breast and green vision [Orange-breasted Green-Pigeon], I don't know. The colors
are a bit very random on it. And there's, like, you can't, again, there's this very light purple
near the eyes in two different parts, and it looks like that there's overlapping shapes. Like,
there's a light green background, again, kind of over that light purple, and it's cutting off or
something. Something not so nice about how that one looks.

**[32]** Indian white dye [Indian White-eye] is slightly better. I feel like maybe, honestly,
it's fine. Maybe a tad too simple, or honestly, it's okay. Yeah. So these are the ones that I
feel like we need to fix.

**[33]** Let me just go through some of the ones that, like, purple sunbird is great. Yellow
fruit and bulbar [Yellow-throated Bulbul] does have a lot of elements, but it still looks fine.
The eye is not in that, like, white circle that you've slowly built up to. I don't know if that's
intentional, but just start [unclear]. In this profile, nice, unique.

**[34]** Little caught competency [Little Cormorant], a black bird you've taken and done
something really nice. Wanted to catch it [Verditer Flycatcher], I've already said that, that I
would even feel really nice [it feels really nice]. Chronic pain pressure in general, sleep burn,
burn. [unclear] Black pig strike [Bay-backed Shrike] is good. Green beetle [Green Bee-eater] is
really nice. Culbersmith, Lovitz [Coppersmith Barbet, lovely].

**[35]** I feel like the leg could be put in different places. It looks a bit off right now.
[Which bird is not said; the Yellow-wattled Lapwing is the one whose legs are a feature, and the
Shrike and the Thrush each carry a leg stub. The ledger checks all three.]

**[36]** Indian Robin is similar to the Oriental Magpie-Robin. Something I don't like. I like
that it's all the same kind of subspecies you've picked, or the same species you've picked, a
similar shape. It's a good idea. Something I don't like about this. Honestly, it looks like a
bird trying to wave or something. I don't know. Something I'm not digging about this. I just
don't like. I feel bad for everyone who gets that bird.

**[37]** Okay. Now what we have to do is, I also wanna change a little bit of code that goes to
assign people birds. So since now we're adding these birds after about 500 people have joined, we
need to make sure that we assign birds that somewhat make all the birds equal. You know? Like,
that make the occurrence of all the birds equal. And that has to take into account the people
who have paid to override their birds. So a lot of people pay to get the common kingfisher. That
means we should randomly assign the common kingfisher less. Maybe not zero, but less. So we wanna
change the probabilities so that we get roughly frequency of all birds equal.

**[38]** So that means for the next probably many people, we will be assigning them the new
birds. And I don't want to change the code at any future point. I want it to be adaptable so that
it can adapt to any situation. So now it knows, okay, these 50 birds, there's already a bunch of
people. So that means we have to assign people the new birds. And then when the new birds kinda
level up, then it goes more random. And then, say, a lot of people change their bird to make it
the spotted owl, and then we have to randomly assign spotted owl a little less. I don't want to
make a likelihood zero, but I'd like to make it less, just so it equals up.

**[39]** Cool. That's pretty much it for this work. I'm not giving you and saying, okay, you have
to add these many. I keep the quality high [keep the quality high]. In fact, if there's one
solution [species] that you wanted to remove slash replace with the other one, then I'm fine with
that too. Just run it by me. Obviously, don't replace any of the ones I like.

**[40]** But yeah. That's it for this. I'm not gonna say you have to add another 50 birds or, you
know, I can't add more than this. Just keep the quality really high and make sure to hit all the
criteria. Make sure you have an independent reviewer. Make sure you review everything and you are
proud of your work, because we're not shipping anything off big [half-baked? unclear]. Birds are
one of the biggest personalities of this website, so this is incredibly important.
