/* ------------------------------------------------------------------ *
 *  What the demo community has been saying.
 *
 *  Every word here is invented. None of it is lifted from the real feed,
 *  from WhatsApp, or from anything a member wrote.
 *
 *  It is written rather than generated because the feed is the first
 *  thing a visitor sees and filler reads as filler instantly. Posts vary
 *  in length on purpose: a wall of identically-sized paragraphs is the
 *  single clearest tell that a demo is fake, so there are one-liners
 *  next to long ones, some with many comments and some with none, and
 *  the like counts are uneven the way real ones are.
 *
 *  House style, inherited from the rest of the project: no em dashes,
 *  anywhere. The community is "Rishi Valley", never "the alumni".
 * ------------------------------------------------------------------ */

interface DemoComment {
  author: string; // person slug
  text: string;
  /** Hours after the parent post was written. */
  hoursAfter: number;
  /** Person slugs who liked this comment. */
  likes?: string[];
}

export interface DemoPost {
  slug: string;
  author: string; // person slug
  kind?: "post" | "letter";
  title?: string; // letters only
  content: string;
  daysAgo: number;
  /** Person slugs who liked it. Length is the visible count. */
  likes?: string[];
  comments?: DemoComment[];
  /** Public paths under /images/collection. */
  images?: string[];
  poll?: { options: string[]; votes: Record<string, string[]> };
  /** Person slugs who bookmarked it. */
  bookmarks?: string[];
}

/* ---------------------------------------------------------------- *
 *  The feed
 * ---------------------------------------------------------------- */

export const DEMO_POSTS: DemoPost[] = [
  {
    slug: "flycatcher",
    author: "gita-raman",
    content:
      "A paradise flycatcher has been working the stretch of trees behind the science block all week, and this morning class nine simply stopped. No instruction, no announcement. Twenty two people watching a white ribbon of a bird go past at eye level.\n\nI have not managed to teach anything as well as that bird taught them in four seconds.",
    daysAgo: 1,
    likes: [
      "visitor", "ananya-ghosh", "ishaan-verma", "leela-varghese", "rukmini-iyer",
      "aisha-qureshi", "vikram-desai", "naina-chopra", "sana-mirza", "riya-banerjee",
      "farida-contractor", "dhruv-menon", "lakshmi-narayanan", "nandita-rangan",
      "sarojini-bhatt", "kabir-sethi", "vivaan-kapoor",
    ],
    comments: [
      {
        author: "ananya-ghosh",
        text: "Ma'am, this is genuinely why I am doing a PhD in this. You are responsible and I hope you feel appropriately guilty about it.",
        hoursAfter: 3,
        likes: ["gita-raman", "visitor", "ishaan-verma", "sana-mirza"],
      },
      {
        author: "ishaan-verma",
        text: "Drawing this tonight.",
        hoursAfter: 5,
        likes: ["gita-raman", "ananya-ghosh"],
      },
      {
        author: "rukmini-iyer",
        text: "They were behind the old science block in my time too. Same stretch of trees. Sixty years and the birds have kept better records than we have.",
        hoursAfter: 11,
        likes: ["gita-raman", "sarojini-bhatt", "visitor", "krishnan-menon", "sunita-devi"],
      },
    ],
  },
  {
    slug: "asthachal",
    author: "vikram-desai",
    content:
      "Shot a sunset for work yesterday and caught myself waiting for the bell. Thirty seven years old, standing on a hired crane in Film City, waiting for a bell that rang for the last time in 1988.",
    daysAgo: 2,
    likes: [
      "visitor", "anand-rao", "sameer-kulkarni", "kabir-anand", "fatima-sheikh",
      "arjun-nair", "divya-reddy", "nandita-rangan", "peter-dsouza", "zoya-hussain",
      "harsh-vardhan", "shreya-joshi", "priya-mathew", "imran-baig",
    ],
    comments: [
      {
        author: "kabir-anand",
        text: "The bell is why I can still count a bar without thinking. I have said this to three different music teachers and none of them believed me.",
        hoursAfter: 4,
        likes: ["vikram-desai", "nandita-rangan", "visitor"],
      },
      {
        author: "sunita-devi",
        text: "It still rings. Come and hear it.",
        hoursAfter: 19,
        likes: ["vikram-desai", "anand-rao", "visitor", "fatima-sheikh", "riya-banerjee", "gita-raman"],
      },
    ],
    bookmarks: ["visitor"],
  },
  {
    slug: "banyan-photo",
    author: "harsh-vardhan",
    content:
      "Went back last month for the first time in twenty years. I had convinced myself the banyan had got smaller, the way everything from childhood does.\n\nIt has not. It has got considerably larger, and it made me feel exactly as small as it did in 1991.",
    daysAgo: 4,
    images: ["/images/collection/c3.webp", "/images/collection/c1.webp"],
    likes: [
      "visitor", "rukmini-iyer", "sarojini-bhatt", "krishnan-menon", "nandita-rangan",
      "divya-reddy", "anand-rao", "leela-varghese", "sunita-devi", "zoya-hussain",
      "tanvi-shah", "aditya-krishnan", "meghna-pillai", "gita-raman", "ramesh-babu",
      "farida-contractor", "peter-dsouza", "naina-chopra", "yash-agarwal",
      "aryan-saxena", "kabir-sethi",
    ],
    comments: [
      {
        author: "sarojini-bhatt",
        text: "The benches look newer than I remember and the tree looks older. Both of those are probably me.",
        hoursAfter: 6,
        likes: ["harsh-vardhan", "rukmini-iyer", "visitor"],
      },
      {
        author: "meghna-pillai",
        text: "I have not been back since I left after class ten and this photograph has just cost me an afternoon.",
        hoursAfter: 27,
        likes: ["harsh-vardhan", "visitor", "kabir-sethi"],
      },
    ],
    bookmarks: ["visitor"],
  },
  {
    slug: "milk-break",
    author: "yash-agarwal",
    content: "Nobody warns you that milk break stops happening after school and never comes back.",
    daysAgo: 5,
    likes: [
      "visitor", "kabir-sethi", "naina-chopra", "vivaan-kapoor", "riya-banerjee",
      "aryan-saxena", "sana-mirza", "dhruv-menon", "meghna-pillai", "ishaan-verma",
      "shreya-joshi", "aditya-krishnan", "tanvi-shah",
    ],
    comments: [
      {
        author: "aryan-saxena",
        text: "I put a reminder in my calendar for 10:40 for about a month after I left. My flatmates thought I was taking medication.",
        hoursAfter: 2,
        likes: ["yash-agarwal", "visitor", "naina-chopra", "kabir-sethi", "vivaan-kapoor"],
      },
      { author: "vivaan-kapoor", text: "Doing this tomorrow.", hoursAfter: 8 },
    ],
  },
  {
    slug: "poll-asthachal",
    author: "divya-reddy",
    content:
      "Settling a long argument with my brother, who was in the batch above me and is wrong about most things. Which one actually stayed with you?",
    daysAgo: 6,
    poll: {
      options: [
        "Asthachal at the end of the day",
        "The walk up Rishi Konda",
        "The banyan at assembly",
        "The dining hall at full volume",
      ],
      votes: {
        "Asthachal at the end of the day": [
          "visitor", "vikram-desai", "anand-rao", "kabir-anand", "fatima-sheikh",
          "nandita-rangan", "zoya-hussain", "sana-mirza", "priya-mathew", "imran-baig",
          "shreya-joshi",
        ],
        "The walk up Rishi Konda": [
          "rohan-pillai", "ananya-ghosh", "dhruv-menon", "aryan-saxena", "leela-varghese",
          "harsh-vardhan",
        ],
        "The banyan at assembly": [
          "rukmini-iyer", "sarojini-bhatt", "krishnan-menon", "sunita-devi", "gita-raman",
          "ramesh-babu", "nikhil-bose",
        ],
        "The dining hall at full volume": [
          "yash-agarwal", "kabir-sethi", "naina-chopra", "vivaan-kapoor", "meghna-pillai",
          "riya-banerjee", "tanvi-shah", "aditya-krishnan", "ishaan-verma",
        ],
      },
    },
    likes: ["visitor", "nikhil-bose", "aisha-qureshi", "arjun-nair", "peter-dsouza"],
    comments: [
      {
        author: "nikhil-bose",
        text: "This poll is rigged. Three of these are the same answer wearing different clothes.",
        hoursAfter: 5,
        likes: ["divya-reddy", "visitor", "fatima-sheikh", "arjun-nair"],
      },
      {
        author: "peter-dsouza",
        text: "Twenty six years of teaching there and I would like to add a fifth option: the ten minutes before the first bell, when nobody has started being a school yet.",
        hoursAfter: 14,
        likes: [
          "divya-reddy", "visitor", "gita-raman", "sunita-devi", "nandita-rangan",
          "vikram-desai", "rukmini-iyer", "farida-contractor",
        ],
      },
    ],
  },
  {
    slug: "moving-to-blr",
    author: "shreya-joshi",
    content:
      "Moving back to Bombay in March after eleven years in Dubai. If there is anyone in the city who wants to get a coffee with a stranger who went to the same school twenty years apart, I am extremely available and slightly unmoored.",
    daysAgo: 7,
    likes: [
      "visitor", "vikram-desai", "kabir-sethi", "tanvi-shah", "imran-baig",
      "divya-reddy", "aisha-qureshi", "priya-mathew",
    ],
    comments: [
      {
        author: "vikram-desai",
        text: "Bandra, any Saturday. There are six of us who do this already and we are always looking for a seventh.",
        hoursAfter: 3,
        likes: ["shreya-joshi", "visitor", "kabir-sethi", "tanvi-shah"],
      },
      {
        author: "kabir-sethi",
        text: "I am in Sonipat during term but home in Bombay for all of March. Would love to.",
        hoursAfter: 9,
        likes: ["shreya-joshi", "vikram-desai"],
      },
    ],
  },
  {
    slug: "ramesh-telescope",
    author: "ramesh-babu",
    content:
      "Somebody asked me last week how many students came to the telescope evenings over thirty years. I did not know, so I went and counted the sign-up books, which I have kept, because of course I have kept them.\n\nFour thousand one hundred and six. Some of you signed twelve times. One of you signed once, in 1994, and wrote \"maybe\" next to your name, and I have thought about you at least annually ever since.",
    daysAgo: 9,
    likes: [
      "visitor", "rohan-pillai", "ananya-ghosh", "dhruv-menon", "arjun-nair",
      "sameer-kulkarni", "aisha-qureshi", "leela-varghese", "zoya-hussain",
      "harsh-vardhan", "nikhil-bose", "fatima-sheikh", "anand-rao", "priya-mathew",
      "imran-baig", "aryan-saxena", "sana-mirza", "gita-raman", "lakshmi-narayanan",
      "farida-contractor", "sunita-devi", "krishnan-menon", "rukmini-iyer",
      "divya-reddy", "vikram-desai",
    ],
    comments: [
      {
        author: "arjun-nair",
        text: "Sir, it was me. It was 1994 and I was thirteen and I wrote maybe because I was afraid of committing to anything. I came. I came eleven more times.",
        hoursAfter: 7,
        likes: [
          "ramesh-babu", "visitor", "rohan-pillai", "ananya-ghosh", "divya-reddy",
          "fatima-sheikh", "sameer-kulkarni", "nikhil-bose", "zoya-hussain",
          "aisha-qureshi", "gita-raman", "harsh-vardhan", "dhruv-menon",
        ],
      },
      {
        author: "ramesh-babu",
        text: "Arjun. Thirty one years. Well worth the wait.",
        hoursAfter: 9,
        likes: [
          "visitor", "arjun-nair", "ananya-ghosh", "divya-reddy", "rohan-pillai",
          "gita-raman", "sana-mirza", "nikhil-bose", "sunita-devi", "leela-varghese",
        ],
      },
    ],
    bookmarks: ["visitor"],
  },
  {
    slug: "pottery-shed",
    author: "farida-contractor",
    content:
      "The pottery shed roof finally gave in during the last storm. It is being rebuilt with the same tiles, because when I suggested corrugated sheeting a class seven girl looked at me as though I had proposed demolishing the banyan.\n\nShe was right. Same tiles.",
    daysAgo: 11,
    likes: [
      "visitor", "sarojini-bhatt", "tanvi-shah", "ishaan-verma", "harsh-vardhan",
      "meghna-pillai", "nandita-rangan", "gita-raman", "sunita-devi", "naina-chopra",
    ],
    comments: [
      {
        author: "sarojini-bhatt",
        text: "I threw my first pot under that roof in 1974. Tell her thank you from someone who has since made about nine thousand bowls.",
        hoursAfter: 16,
        likes: ["farida-contractor", "visitor", "tanvi-shah", "rukmini-iyer", "ishaan-verma"],
      },
    ],
  },
  {
    slug: "monsoon",
    author: "naina-chopra",
    content:
      "First proper rain here in Sonipat and the whole hostel came out into the corridor to look at it, and I realised I have been quietly training for this my entire life.",
    daysAgo: 13,
    likes: [
      "visitor", "riya-banerjee", "vivaan-kapoor", "kabir-sethi", "aryan-saxena",
      "sana-mirza", "yash-agarwal", "dhruv-menon", "meghna-pillai",
    ],
    comments: [
      {
        author: "riya-banerjee",
        text: "The valley in the first week of the monsoon is a genuinely unfair thing to have experienced at fifteen. Nothing since has measured up and I resent it.",
        hoursAfter: 6,
        likes: ["naina-chopra", "visitor", "vivaan-kapoor", "kabir-sethi"],
      },
    ],
  },
  {
    slug: "maths-fear",
    author: "lakshmi-narayanan",
    content:
      "A parent asked me on Saturday what I do about children who are bad at maths.\n\nI told her I have taught here for fourteen years and have not met one yet. I have met a great many who were told they were, usually before they turned nine, usually by someone who meant well.",
    daysAgo: 15,
    likes: [
      "visitor", "rohan-pillai", "divya-reddy", "ananya-ghosh", "dhruv-menon",
      "aisha-qureshi", "gita-raman", "sana-mirza", "priya-mathew", "sunita-devi",
      "zoya-hussain", "aryan-saxena", "fatima-sheikh", "nikhil-bose", "leela-varghese",
      "peter-dsouza", "arjun-nair",
    ],
    comments: [
      {
        author: "sunita-devi",
        text: "Forty years as a headmistress and I would put this on the wall of every staff room in the country.",
        hoursAfter: 8,
        likes: ["lakshmi-narayanan", "visitor", "gita-raman", "peter-dsouza", "divya-reddy"],
      },
      {
        author: "rohan-pillai",
        text: "I write software for a living and I spent from age eight to age nineteen certain I was bad at maths. Somebody said it once and I carried it for eleven years.",
        hoursAfter: 22,
        likes: [
          "lakshmi-narayanan", "visitor", "divya-reddy", "ananya-ghosh", "aisha-qureshi",
          "sana-mirza", "dhruv-menon",
        ],
      },
    ],
  },
  {
    slug: "cycle-madanapalle",
    author: "krishnan-menon",
    content:
      "We used to cycle to Madanapalle and back on a Sunday, which was against roughly four rules, and the entire staff knew, and nobody stopped us. I have thought about that a great deal since becoming responsible for other people.",
    daysAgo: 18,
    likes: [
      "visitor", "rukmini-iyer", "sarojini-bhatt", "anand-rao", "fatima-sheikh",
      "sunita-devi", "vikram-desai", "harsh-vardhan", "nandita-rangan", "peter-dsouza",
    ],
    comments: [
      {
        author: "peter-dsouza",
        text: "We knew. We always knew. The trick was knowing which rules were load-bearing.",
        hoursAfter: 12,
        likes: [
          "krishnan-menon", "visitor", "rukmini-iyer", "sunita-devi", "gita-raman",
          "fatima-sheikh", "anand-rao", "divya-reddy",
        ],
      },
    ],
  },
  {
    slug: "quiet-recording",
    author: "sameer-kulkarni",
    content:
      "Spent four nights this month trying to record true silence for a film. Anechoic chamber in Berlin, forty thousand euros of microphone, and it sounds wrong. Too dead.\n\nWhat I actually want is the valley at four in the morning, which is not silent at all. It has a floor to it. Crickets, something moving in the scrub, the air itself. That is what quiet is supposed to sound like and I cannot buy it.",
    daysAgo: 21,
    likes: [
      "visitor", "kabir-anand", "vikram-desai", "anand-rao", "nandita-rangan",
      "ananya-ghosh", "ishaan-verma", "ramesh-babu", "gita-raman", "zoya-hussain",
      "dhruv-menon", "arjun-nair", "leela-varghese",
    ],
    comments: [
      {
        author: "ramesh-babu",
        text: "Come in February, sleep badly on purpose, and bring the microphone. I will unlock the gate.",
        hoursAfter: 15,
        likes: ["sameer-kulkarni", "visitor", "kabir-anand", "gita-raman", "vikram-desai"],
      },
      {
        author: "kabir-anand",
        text: "If you get it, send it to me. I have been trying to write around that exact sound for fifteen years.",
        hoursAfter: 30,
        likes: ["sameer-kulkarni", "visitor"],
      },
    ],
    bookmarks: ["visitor"],
  },
  {
    slug: "textile-blue",
    author: "tanvi-shah",
    content:
      "Six months of trying to match a particular blue for a commission, and I got it last Tuesday, and only afterwards realised it is the exact blue of the gate at the bottom of the junior school path.",
    daysAgo: 24,
    likes: [
      "visitor", "ishaan-verma", "farida-contractor", "sarojini-bhatt", "meghna-pillai",
      "harsh-vardhan", "naina-chopra", "nandita-rangan",
    ],
  },
  {
    slug: "first-year-teaching",
    author: "sana-mirza",
    content:
      "Spent last week reporting from three government schools in Jharkhand for a piece on rural teacher shortages. One of them had a teacher who walks eleven kilometres each way, four days a week, and has done for six years.\n\nI keep thinking about how lucky we were, and how little of it we noticed at the time, and how the difference between the two was almost entirely an accident of where we happened to be sent at eleven years old.",
    daysAgo: 27,
    likes: [
      "visitor", "divya-reddy", "aisha-qureshi", "sunita-devi", "lakshmi-narayanan",
      "gita-raman", "zoya-hussain", "nikhil-bose", "fatima-sheikh", "leela-varghese",
      "ananya-ghosh", "peter-dsouza", "rukmini-iyer", "priya-mathew", "harsh-vardhan",
      "dhruv-menon", "rohan-pillai",
    ],
    comments: [
      {
        author: "divya-reddy",
        text: "This is the thing I could not articulate for about a decade after leaving. Thank you for writing it down properly.",
        hoursAfter: 9,
        likes: ["sana-mirza", "visitor", "aisha-qureshi", "sunita-devi", "zoya-hussain"],
      },
    ],
    bookmarks: ["visitor"],
  },
  {
    slug: "short-oriole",
    author: "aisha-qureshi",
    content: "Golden oriole in a Delhi park this morning. Absolutely no business being there. Made my week.",
    daysAgo: 30,
    likes: [
      "visitor", "gita-raman", "ananya-ghosh", "ishaan-verma", "leela-varghese",
      "rukmini-iyer", "sana-mirza",
    ],
    comments: [
      {
        author: "gita-raman",
        text: "They are further north every year. Delightful and slightly ominous, which is most bird news now.",
        hoursAfter: 4,
        likes: ["aisha-qureshi", "ananya-ghosh", "visitor", "leela-varghese"],
      },
    ],
  },
  {
    slug: "reunion-idea",
    author: "nikhil-bose",
    content:
      "Genuinely asking rather than volunteering: is anyone from the late nineties interested in doing something for the batch of 1999 next year? Sameer has already said yes, which in his case means he will attend and take photographs and do nothing else.",
    daysAgo: 34,
    likes: ["visitor", "sameer-kulkarni", "priya-mathew", "harsh-vardhan", "arjun-nair", "imran-baig"],
    comments: [
      {
        author: "sameer-kulkarni",
        text: "This is a fair and accurate description of my contribution and I stand by it.",
        hoursAfter: 5,
        likes: ["nikhil-bose", "visitor", "priya-mathew", "arjun-nair"],
      },
      {
        author: "priya-mathew",
        text: "I would fly from Toronto for this. Give me eight months of notice and I am there.",
        hoursAfter: 20,
        likes: ["nikhil-bose", "sameer-kulkarni", "visitor"],
      },
    ],
  },
  {
    slug: "ocean-work",
    author: "leela-varghese",
    content:
      "Counted reef fish for nine hours today, which sounds tedious and is, and then a whale shark went past about four metres below me and I forgot my own name.\n\nSame feeling as the first time I saw a hoopoe land. Exactly the same. Thirty years apart and the body does not distinguish.",
    daysAgo: 38,
    likes: [
      "visitor", "gita-raman", "ananya-ghosh", "aditya-krishnan", "ramesh-babu",
      "ishaan-verma", "sarojini-bhatt", "zoya-hussain", "rukmini-iyer", "dhruv-menon",
      "aisha-qureshi",
    ],
  },
  {
    slug: "old-piano",
    author: "kabir-anand",
    content:
      "Played a hall in Copenhagen last night on a beautifully maintained Steinway and afterwards a man asked me what my favourite instrument had been.\n\nIt was an upright in a room with a corrugated roof, with three dead keys in the middle octave, in 2007. I learned to play around the gaps. My whole left hand is shaped by an instrument that was slightly broken, and I would not undo it.",
    daysAgo: 43,
    likes: [
      "visitor", "nandita-rangan", "sameer-kulkarni", "farida-contractor", "vikram-desai",
      "peter-dsouza", "tanvi-shah", "ishaan-verma", "divya-reddy", "sana-mirza",
      "arjun-nair", "gita-raman",
    ],
    comments: [
      {
        author: "nandita-rangan",
        text: "The music room piano. It is still there and it still has the dead keys. Nobody has had the heart.",
        hoursAfter: 11,
        likes: [
          "kabir-anand", "visitor", "farida-contractor", "peter-dsouza", "sameer-kulkarni",
          "vikram-desai", "gita-raman",
        ],
      },
    ],
    bookmarks: ["visitor"],
  },
  {
    slug: "airline-view",
    author: "imran-baig",
    content:
      "Flew Dubai to Chennai on Tuesday and the routing took us almost directly over the valley at thirty six thousand feet. I could not see it. Obviously I could not see it. I looked anyway for about four minutes.",
    daysAgo: 49,
    likes: [
      "visitor", "shreya-joshi", "vikram-desai", "priya-mathew", "arjun-nair",
      "zoya-hussain", "kabir-anand", "sameer-kulkarni",
    ],
    comments: [
      {
        author: "shreya-joshi",
        text: "I do this from the ground with the flight tracker, which is arguably worse.",
        hoursAfter: 7,
        likes: ["imran-baig", "visitor"],
      },
    ],
  },
  {
    slug: "veterinary",
    author: "aditya-krishnan",
    content:
      "A stray came into the clinic today with the exact face of a dog that lived outside the junior school dining hall in about 2009 and would not eat anything except the crusts. I have named him accordingly and he is now, apparently, mine.",
    daysAgo: 55,
    likes: [
      "visitor", "meghna-pillai", "naina-chopra", "riya-banerjee", "yash-agarwal",
      "ishaan-verma", "leela-varghese", "gita-raman", "tanvi-shah", "kabir-sethi",
    ],
    comments: [
      {
        author: "yash-agarwal",
        text: "Bruno. His name was Bruno and he was beloved and he genuinely would not eat anything but crusts.",
        hoursAfter: 3,
        likes: [
          "aditya-krishnan", "visitor", "meghna-pillai", "naina-chopra", "ishaan-verma",
          "riya-banerjee",
        ],
      },
    ],
  },
];

/* ---------------------------------------------------------------- *
 *  Letters: the long-form surface. Fewer, longer, titled.
 * ---------------------------------------------------------------- */

export const DEMO_LETTERS: DemoPost[] = [
  {
    slug: "letter-what-we-were-given",
    author: "sunita-devi",
    kind: "letter",
    title: "What we were given, and what it cost someone",
    content:
      "I left the valley in 1980 and spent the next forty years running other people's schools, which is a long way of saying I spent forty years comparing everything to one place.\n\nFor most of that time I thought what we had been given was the beauty. The hill, the tamarind, the light at six. It is an easy thing to think, because it is the part you can photograph.\n\nI was wrong, and it took me until I was about sixty to work out why.\n\nWhat we were actually given was the assumption of good faith. Not a rule, not a policy. An assumption, held by every adult in the place, that if a child did something strange it was probably interesting rather than probably bad. I have tried to import that into eleven schools and it is the single hardest thing to install, because it cannot be written down, and it costs the adults an enormous amount.\n\nIt cost them the comfort of certainty. It cost them the efficiency of just telling us. It cost them entire evenings that a stricter school would have got back.\n\nI did not know at fifteen that this was being spent on me. I want to say now, thirty years too late for most of them, that I know it now, and that I spent it as carefully as I could manage.",
    daysAgo: 8,
    likes: [
      "visitor", "rukmini-iyer", "krishnan-menon", "sarojini-bhatt", "gita-raman",
      "peter-dsouza", "ramesh-babu", "lakshmi-narayanan", "farida-contractor",
      "divya-reddy", "sana-mirza", "aisha-qureshi", "nikhil-bose", "fatima-sheikh",
      "zoya-hussain", "nandita-rangan", "anand-rao", "vikram-desai", "leela-varghese",
      "harsh-vardhan", "priya-mathew", "arjun-nair", "rohan-pillai", "ananya-ghosh",
      "sameer-kulkarni", "kabir-anand", "tanvi-shah", "dhruv-menon", "imran-baig",
    ],
    comments: [
      {
        author: "peter-dsouza",
        text: "It cost exactly what you say it cost, and I would spend it again, and I am extremely glad somebody noticed.",
        hoursAfter: 14,
        likes: [
          "sunita-devi", "visitor", "gita-raman", "rukmini-iyer", "divya-reddy",
          "sana-mirza", "ramesh-babu", "lakshmi-narayanan", "farida-contractor",
          "nandita-rangan", "fatima-sheikh",
        ],
      },
      {
        author: "divya-reddy",
        text: "I run six learning centres and I have been trying to name this for ten years. You have just named it. I am sending this to my entire team.",
        hoursAfter: 31,
        likes: ["sunita-devi", "visitor", "sana-mirza", "peter-dsouza", "zoya-hussain", "aisha-qureshi"],
      },
    ],
    bookmarks: ["visitor"],
  },
  {
    slug: "letter-birds-of-the-valley",
    author: "gita-raman",
    kind: "letter",
    title: "A partial census, kept badly, over twenty one years",
    content:
      "I started keeping a notebook in my second year here, mostly because a class six student asked me how many kinds of bird lived in the valley and I did not know, and found that intolerable.\n\nTwenty one years later I still do not exactly know, which I have made peace with. What I have instead is eleven notebooks, a great many arguments settled and unsettled, and a fairly clear sense of what has changed.\n\nWhat has increased: rosy starlings, in numbers that would have astonished me in 2004. Black kites, which have followed the roads in. Bee-eaters, marginally.\n\nWhat has thinned: the sparrows, everywhere, as everyone already knows. The nightjars, which I now hear perhaps four times a season where I used to hear them most warm evenings.\n\nWhat has held: the hoopoes. Stubbornly, delightfully, exactly as many hoopoes as there have ever been, walking about the playing fields with that ridiculous crest like they own the place, which of course they do.\n\nThe notebooks are in the biology room and anyone who wants to see them is welcome. Several of you are in them, incidentally. There is an entry from 2009 that reads only \"A. Ghosh, class 8, insists the flycatcher is nesting near the tank. A. Ghosh is correct.\"",
    daysAgo: 16,
    likes: [
      "visitor", "ananya-ghosh", "leela-varghese", "ishaan-verma", "aisha-qureshi",
      "rukmini-iyer", "ramesh-babu", "sarojini-bhatt", "dhruv-menon", "sana-mirza",
      "naina-chopra", "riya-banerjee", "farida-contractor", "lakshmi-narayanan",
      "sunita-devi", "aditya-krishnan", "zoya-hussain", "harsh-vardhan", "nikhil-bose",
      "rohan-pillai", "divya-reddy", "kabir-sethi",
    ],
    comments: [
      {
        author: "ananya-ghosh",
        text: "I have just found out I am in a notebook and I have had to put my laptop down and go for a walk.",
        hoursAfter: 5,
        likes: [
          "gita-raman", "visitor", "leela-varghese", "ishaan-verma", "sana-mirza",
          "dhruv-menon", "riya-banerjee", "naina-chopra", "rohan-pillai", "aisha-qureshi",
        ],
      },
      {
        author: "leela-varghese",
        text: "The nightjars are the line that got me. Same story on the coast, different species, same shape of loss.",
        hoursAfter: 26,
        likes: ["gita-raman", "visitor", "ananya-ghosh", "aisha-qureshi"],
      },
    ],
    bookmarks: ["visitor"],
  },
  {
    slug: "letter-leaving-early",
    author: "meghna-pillai",
    kind: "letter",
    title: "For everyone who left after class ten",
    content:
      "There is a particular kind of person in this community and almost nothing is written for us, so I am writing this.\n\nWe left after class ten. Some of us because of a board, some because of a parent's posting, some because of money, one or two because we were asked to. We did not do the last two years. We were not there for the goodbyes, we are not in the final photograph, and when people say \"our batch\" they mean a year we did not finish.\n\nFor a long time I felt like a guest at this. I would read these posts and feel the pull of them and then think, carefully and quietly, that I had not earned the pull.\n\nI want to say two things to anyone else carrying that.\n\nThe first is that the valley does not do part marks. Five years there is five years there. The thing it put in you is not prorated.\n\nThe second is that I came back for a day last year, unannounced, terrified, absolutely certain I would have to explain myself at the gate. Nobody asked me to explain anything. A teacher I had never met walked me to the banyan and asked which house I had been in, and when I said Krishna she said \"ah, the shouting ones\", and that was the entire process.\n\nCome back. Nobody is checking.",
    daysAgo: 23,
    likes: [
      "visitor", "yash-agarwal", "imran-baig", "kabir-sethi", "naina-chopra",
      "riya-banerjee", "vivaan-kapoor", "tanvi-shah", "aditya-krishnan", "shreya-joshi",
      "sana-mirza", "sunita-devi", "gita-raman", "peter-dsouza", "farida-contractor",
      "divya-reddy", "priya-mathew", "harsh-vardhan", "nandita-rangan", "sarojini-bhatt",
      "rukmini-iyer", "zoya-hussain", "aryan-saxena", "dhruv-menon",
    ],
    comments: [
      {
        author: "imran-baig",
        text: "Left after ten in 2002 and have felt exactly this for twenty three years without ever finding the words. Thank you.",
        hoursAfter: 6,
        likes: [
          "meghna-pillai", "visitor", "yash-agarwal", "sunita-devi", "gita-raman",
          "shreya-joshi", "tanvi-shah", "sana-mirza", "peter-dsouza",
        ],
      },
      {
        author: "gita-raman",
        text: "\"The shouting ones\" is, I am sorry to report, the official staff room designation for Krishna house and has been since well before your time.",
        hoursAfter: 18,
        likes: [
          "meghna-pillai", "visitor", "peter-dsouza", "sunita-devi", "nikhil-bose",
          "aditya-krishnan", "naina-chopra", "farida-contractor", "lakshmi-narayanan",
        ],
      },
    ],
    bookmarks: ["visitor"],
  },
];

/* ---------------------------------------------------------------- *
 *  The Collection
 *
 *  DIMENSIONS MATTER HERE. The grid is CSS-columns masonry and each tile
 *  renders the THUMBNAIL at `w-full` with `width`/`height` set from these
 *  numbers, so the browser reserves its box from this ratio. If it disagrees
 *  with the thumbnail's real ratio the tile renders at the wrong size and the
 *  columns go ragged, which is exactly what happened when three of these were
 *  guessed at rather than measured.
 *
 *  The `demo-*` files are generated with `fit: "inside"` at 1600 and 480, the
 *  same settings contributePhoto uses, so a thumbnail always shares its
 *  display image's aspect ratio. The original numbered assets do NOT hold
 *  that invariant (two of their thumbs are square crops of non-square
 *  images) and are left alone because /lab/viewer uses them as fixtures.
 *
 *  Six frames of the banyan and the assembly benches. Small on purpose:
 *  these are the only photographs the repository actually owns, and six
 *  well-captioned ones read as a young archive that has begun properly,
 *  where twelve near-identical crops would read as padding. The
 *  Collection is the one surface waiting on the owner's real photographs
 *  (see docs/spec/demo.md, "Filling the Collection").
 * ---------------------------------------------------------------- */

export interface DemoPhoto {
  slug: string;
  file: string; // basename in public/images/collection
  uploader: string;
  caption: string;
  subject: string;
  era: string;
  photoYear?: number;
  photoMonth?: number;
  datePrecision: string;
  loves: string[];
  width: number;
  height: number;
}

export const DEMO_PHOTOS: DemoPhoto[] = [
  {
    slug: "banyan-benches",
    file: "demo-banyan-benches",
    uploader: "harsh-vardhan",
    caption: "The assembly benches, empty, on a Sunday morning in August.",
    subject: "assembly-dining,campus",
    era: "2020s",
    photoYear: 2024,
    photoMonth: 8,
    datePrecision: "month",
    loves: [
      "visitor", "rukmini-iyer", "sarojini-bhatt", "sunita-devi", "gita-raman",
      "meghna-pillai", "divya-reddy", "nandita-rangan", "kabir-sethi",
    ],
    width: 900,
    height: 900,
  },
  {
    slug: "banyan-trunk",
    file: "demo-banyan-trunk",
    uploader: "harsh-vardhan",
    caption: "The main trunk. For scale, those are full-sized stone benches behind it.",
    subject: "banyan,flora",
    era: "2020s",
    photoYear: 2024,
    photoMonth: 8,
    datePrecision: "month",
    loves: [
      "visitor", "rukmini-iyer", "krishnan-menon", "sarojini-bhatt", "vikram-desai",
      "nandita-rangan", "gita-raman", "farida-contractor", "sunita-devi", "naina-chopra",
      "riya-banerjee", "ishaan-verma",
    ],
    width: 900,
    height: 900,
  },
  {
    slug: "banyan-arch",
    file: "demo-banyan-arch",
    uploader: "ishaan-verma",
    caption: "The low branch everyone has sat on at least once, and nobody was ever supposed to.",
    subject: "banyan,campus",
    era: "2020s",
    photoYear: 2024,
    datePrecision: "year",
    loves: [
      "visitor", "yash-agarwal", "naina-chopra", "vivaan-kapoor", "kabir-sethi",
      "aryan-saxena", "meghna-pillai", "riya-banerjee", "aditya-krishnan", "sana-mirza",
    ],
    width: 900,
    height: 900,
  },
  {
    slug: "assembly-wide",
    file: "demo-assembly-wide",
    uploader: "gita-raman",
    caption: "Where morning assembly happens, for anyone who has forgotten the shape of it.",
    subject: "assembly-dining,landscape",
    era: "2020s",
    photoYear: 2024,
    datePrecision: "year",
    loves: [
      "visitor", "sunita-devi", "peter-dsouza", "ramesh-babu", "lakshmi-narayanan",
      "rukmini-iyer", "harsh-vardhan", "zoya-hussain", "priya-mathew",
    ],
    width: 760,
    height: 1140,
  },
  {
    slug: "banyan-canopy",
    file: "demo-banyan-canopy",
    uploader: "ishaan-verma",
    caption: "Looking up from the third row of benches.",
    subject: "banyan,weather-sky",
    era: "2020s",
    photoYear: 2024,
    datePrecision: "year",
    loves: [
      "visitor", "vikram-desai", "sameer-kulkarni", "kabir-anand", "tanvi-shah",
      "ananya-ghosh", "leela-varghese", "farida-contractor",
    ],
    width: 1280,
    height: 760,
  },
  {
    slug: "banyan-pillar",
    file: "demo-banyan-pillar",
    uploader: "gita-raman",
    caption: "The stone pillar at the centre. Nobody I have asked knows what it was originally for.",
    subject: "buildings,historical",
    era: "2020s",
    photoYear: 2023,
    datePrecision: "year",
    loves: [
      "visitor", "harsh-vardhan", "krishnan-menon", "rukmini-iyer", "nikhil-bose",
      "sarojini-bhatt", "sunita-devi",
    ],
    width: 1200,
    height: 800,
  },
];

/* ---------------------------------------------------------------- *
 *  The Catch-up
 *
 *  Two Editions, deliberately: Edition 1 is published, so a visitor can read
 *  a finished issue immediately and see what the feature is FOR, and
 *  Edition 2 is open for answers, so they can write into it themselves and
 *  watch their own words land in a real page. One without the other
 *  leaves the most interesting thing the site does looking either empty
 *  or inert.
 * ---------------------------------------------------------------- */

interface DemoEntry {
  author: string;
  body: string;
  loves?: string[];
}

export interface DemoPrompt {
  text: string;
  askedBy: string;
  category?: string | null;
  showAsker?: boolean;
  entries: DemoEntry[];
}

/** Who is in the Catch-up. The visitor is a plain member, not the Keeper:
 *  a Keeper sees admin controls first, and the demo should open on the
 *  reading experience rather than on a settings panel. */
export const CATCHUP_MEMBERS = [
  "visitor",
  "shreya-joshi",
  "aditya-krishnan",
  "ananya-ghosh",
  "kabir-anand",
  "yash-agarwal",
  "ishaan-verma",
  "tanvi-shah",
  "aryan-saxena",
  "sana-mirza",
];

export const CATCHUP_KEEPER = "shreya-joshi";

export const CATCHUP_META = {
  groupName: "The 2010s, loosely",
  title: "The 2010s, loosely",
  intro: "Anyone who was in the valley somewhere between 2009 and 2020. Monthly, no pressure.",
  cadence: "monthly",
};

/** Edition 1: published. This is the finished artefact a visitor reads. */
export const CATCHUP_ROUND_1: { theme: string; prompts: DemoPrompt[] } = {
  theme: "Things we have not thrown away",
  prompts: [
    {
      text: "What is one object you still own from your years there?",
      askedBy: "shreya-joshi",
      category: "valley-days",
      entries: [
        {
          author: "kabir-anand",
          body: "A house badge, Blue, with the pin snapped off. It has lived in the coin section of every wallet I have owned since 2010. I have replaced the wallet four times and moved the badge across each time without ever deciding to.",
          loves: ["visitor", "shreya-joshi", "ananya-ghosh", "yash-agarwal", "tanvi-shah", "ishaan-verma"],
        },
        {
          author: "ananya-ghosh",
          body: "My bird list. Forty two pages, started in class six, last entry dated 2014 because I switched to a proper field notebook and felt very grown up about it. The handwriting gets noticeably better around page fifteen, which is exactly when a teacher told me she could not read it.",
          loves: ["visitor", "shreya-joshi", "kabir-anand", "aditya-krishnan", "sana-mirza", "aryan-saxena", "ishaan-verma"],
        },
        {
          author: "tanvi-shah",
          body: "A square of cloth I dyed in class nine that came out a colour I did not intend and have spent eleven years professionally failing to reproduce.",
          loves: ["visitor", "ishaan-verma", "shreya-joshi", "ananya-ghosh"],
        },
        {
          author: "yash-agarwal",
          body: "Nothing. I have kept nothing, and reading everyone else's answers has been genuinely upsetting, and I am now going to call my mother and ask what is in the loft.",
          loves: ["visitor", "kabir-anand", "shreya-joshi", "aditya-krishnan", "ananya-ghosh", "tanvi-shah", "sana-mirza", "aryan-saxena", "ishaan-verma"],
        },
      ],
    },
    {
      text: "Where were you when you last thought about the valley, before this Edition?",
      askedBy: "ishaan-verma",
      category: null,
      entries: [
        {
          author: "aditya-krishnan",
          body: "In a consultation room at 11pm with a dog that would not settle, humming something I could not place, which turned out to be the tune we sang at the end of Thursday assembly.",
          loves: ["visitor", "shreya-joshi", "kabir-anand", "ananya-ghosh", "sana-mirza"],
        },
        {
          author: "sana-mirza",
          body: "In an editorial meeting, being told a piece was too sympathetic to its subject, and thinking about a specific English class in 2017 where I was told almost exactly the opposite by someone who turned out to be right.",
          loves: ["visitor", "shreya-joshi", "ananya-ghosh", "yash-agarwal", "aryan-saxena"],
        },
        {
          author: "aryan-saxena",
          body: "Standing in a queue at the airport in March, when the man behind me had a bag with a school crest on it that was not ours, and I felt an entirely unearned flash of competitiveness about it.",
          loves: ["visitor", "yash-agarwal", "aditya-krishnan", "kabir-anand", "shreya-joshi", "tanvi-shah"],
        },
      ],
    },
    {
      text: "One thing you would tell your class seven self.",
      askedBy: "shreya-joshi",
      category: "the-valley",
      showAsker: true,
      entries: [
        {
          author: "shreya-joshi",
          body: "That the people you are frightened of at thirteen turn out, without exception, to have been frightened of something themselves, and that half of them will message you warmly in about fifteen years.",
          loves: ["visitor", "kabir-anand", "ananya-ghosh", "yash-agarwal", "sana-mirza", "tanvi-shah", "aditya-krishnan", "ishaan-verma", "aryan-saxena"],
        },
        {
          author: "ishaan-verma",
          body: "Draw more. Nobody is marking it.",
          loves: ["visitor", "tanvi-shah", "shreya-joshi", "ananya-ghosh", "kabir-anand", "sana-mirza"],
        },
      ],
    },
  ],
};

/** Edition 2: open for answers right now, with a few entries already in so
 *  the page is not a blank form. The visitor has deliberately NOT answered
 *  the first question, so there is an obvious, inviting thing to do. */
export const CATCHUP_ROUND_2: { theme: string; prompts: DemoPrompt[] } = {
  theme: "The long way edition",
  prompts: [
    {
      text: "What is something you do now that started in the valley without you noticing?",
      askedBy: "ananya-ghosh",
      category: "valley-days",
      entries: [
        {
          author: "ananya-ghosh",
          body: "I still cannot walk past a tree with something moving in it. My partner has learned to simply keep going and wait for me at the corner.",
          loves: ["visitor", "shreya-joshi", "ishaan-verma", "aditya-krishnan"],
        },
        {
          author: "kabir-anand",
          body: "Counting things in fours. Every rhythm I write comes out in four and I blame morning assembly entirely.",
          loves: ["visitor", "ananya-ghosh", "tanvi-shah"],
        },
      ],
    },
    {
      text: "Recommend one thing to the group. Anything at all.",
      askedBy: "yash-agarwal",
      category: null,
      entries: [
        {
          author: "yash-agarwal",
          body: "Go to the place you keep meaning to go back to. I put it off for nine years and then went in February and it took a day and a half and cost less than a good dinner.",
          loves: ["visitor", "shreya-joshi", "ananya-ghosh", "aryan-saxena", "sana-mirza"],
        },
      ],
    },
  ],
};
