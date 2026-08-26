/* ------------------------------------------------------------------ *
 *  The Catch-ups chapter.
 *
 *  Rewritten after the owner's note (2026-08-26): the first version put
 *  this in the policy pages' shell because he had praised those pages.
 *  Wrong lesson. Those pages are good because a legal document should be
 *  plain and unornamented. A guide has the opposite job. Nobody is
 *  obliged to read this one, so it has to earn the read.
 *
 *  So the chapter is mostly things to look at, with short lines beside
 *  them. Every piece here is the product's own material: a Round card,
 *  the answer card with a real bird avatar, the holding state Catch-ups
 *  actually shows during its quiet day. The one diagram is the four
 *  windows drawn to scale, because "three days, then seven, then one"
 *  is a shape and reads faster as one.
 *
 *  Facts are true to docs/spec/catchups.md sections 1, 2.2, 2.3, 2.5,
 *  2.6 and 7.
 * ------------------------------------------------------------------ */

import { BirdAvatar } from "@/components/common/bird-avatar";

/* The four windows, with the flex weights that make the band honest: the
   answering window really is seven times the length of the quiet day, and
   drawing them equal would teach the wrong shape. */
const WINDOWS = [
  { key: "ask", days: 3, label: "Questions", sub: "Anyone can add one" },
  { key: "answer", days: 7, label: "Answers", sub: "Everyone writes" },
  { key: "quiet", days: 1, label: "Quiet", sub: "Nobody can read it yet" },
];

/** A Round as it sits on the Catch-ups page. */
function RoundCard() {
  return (
    <div className="gd-round">
      <span className="gd-round-k">Round 4 · answering</span>
      <strong>The Yellow House, 2011</strong>
      <span className="gd-round-s">Seven questions. Closes in three days.</span>
      <span className="gd-round-faces">
        <BirdAvatar user={{ id: "r-1", name: "Meera Raghavan" }} size={28} />
        <BirdAvatar user={{ id: "r-2", name: "Anand Iyer" }} size={28} />
        <BirdAvatar user={{ id: "r-3", name: "Sunita Rao" }} size={28} />
        <BirdAvatar user={{ id: "r-4", name: "Vikram Nair" }} size={28} />
        <i>nine so far</i>
      </span>
    </div>
  );
}

/** The four windows, drawn to scale. */
function WindowBand() {
  return (
    <div className="gd-band">
      {/* The bars carry no words. A proportional band inside a 404px panel
          gives the one-day window about twenty pixels, and any label put in
          there clips. The shape lives on the bar, the words live under it. */}
      <div className="gd-band-track">
        {WINDOWS.map((w) => (
          <div key={w.key} className={`gd-seg gd-seg-${w.key}`} style={{ flexGrow: w.days }} />
        ))}
        <div className="gd-seg gd-seg-out" />
      </div>
      <ol className="gd-band-list">
        {WINDOWS.map((w) => (
          <li key={w.key}>
            <i className={`gd-dot gd-dot-${w.key}`} />
            <b>
              {w.label} <em>{w.days === 1 ? "1 day" : `${w.days} days`}</em>
            </b>
            <span>{w.sub}</span>
          </li>
        ))}
        <li>
          <i className="gd-dot gd-dot-out" />
          <b>It arrives</b>
          <span>All at once, for everyone</span>
        </li>
      </ol>
    </div>
  );
}

/** What the Catch-up shows during the day it goes quiet. The real holding state. */
function HoldingCard() {
  return (
    <div className="gd-holding">
      <span className="gd-shimmer" />
      <span className="gd-shimmer short" />
      <span className="gd-shimmer" />
      <p>Putting your Catch-up together</p>
    </div>
  );
}

/** One answer, the way it reads in a published Round. */
function AnswerCard() {
  return (
    <div className="gd-answer">
      <span className="gd-answer-q">What is the last thing that made you laugh out loud?</span>
      <div className="gd-answer-body">
        <BirdAvatar user={{ id: "meera-2011", name: "Meera Raghavan" }} size={38} />
        <div>
          <span className="gd-answer-who">
            Meera Raghavan <i>2011</i>
          </span>
          <p>
            My daughter has decided that every bird is called Kabir. Pigeon, Kabir. Crow,
            Kabir. On Tuesday a heron went over the balcony and she stood up, very serious,
            and said Kabir is very big today.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * The chapter. Every presentation next door renders exactly this, so anything
 * that changes between them is the container and not the writing.
 */
export function GuideBody() {
  return (
    <article className="gd-doc">
      <header className="gd-open">
        <div className="gd-open-words">
          <h1>A newsletter for your friends.</h1>
          <p>
            Pick a few people. Everyone answers the same handful of questions. When the
            window shuts, all the answers are gathered into one issue you read together.
          </p>
          <p className="gd-quiet">
            It is not a chat and it is not a feed. Nothing arrives while you wait, and then
            it all arrives at once.
          </p>
        </div>
        <div className="gd-open-thing">
          <RoundCard />
        </div>
      </header>

      <section className="gd-spread">
        <h2>One cycle is a Round</h2>
        <p>It moves in one direction and never goes back.</p>
        <WindowBand />
        <p className="gd-foot">
          Whoever starts a Catch-up keeps it, and can move any of those dates before the
          window opens.
        </p>
      </section>

      <section className="gd-spread gd-two">
        <div>
          <h2>The day it goes quiet</h2>
          <p>
            When answering shuts, the whole Round disappears for a day. Nobody can read it,
            including the person who started it.
          </p>
          <p className="gd-quiet">
            That pause is on purpose. It makes the Round something that happens to all of
            you on the same morning, instead of a page that fills up while nobody watches.
          </p>
        </div>
        <HoldingCard />
      </section>

      <section className="gd-spread">
        <h2>Write more than you think</h2>
        <p>
          This is the one part of the site where nobody is scrolling past you, and the person
          reading already knows who you were at fifteen. An ordinary Tuesday beats a summary
          of the year.
        </p>
        <AnswerCard />
      </section>

      <section className="gd-spread gd-ends">
        <div>
          <h3>Who is in one</h3>
          <p>
            Whoever you want. A house, a batch, the four of you from one dorm. No minimum,
            and nobody is added without being asked.
          </p>
        </div>
        <div>
          <h3>If hardly anyone answers</h3>
          <p>
            A first Round will not publish empty. The window opens again for three more days
            and everyone is nudged. After that it publishes thin, and it is written to read
            well thin.
          </p>
        </div>
      </section>

      <footer className="gd-close">
        <span>That is the whole of it.</span>
        <a className="gd-go" href="#">
          Start a Catch-up
        </a>
      </footer>
    </article>
  );
}
