/* ------------------------------------------------------------------ *
 *  The Catch-ups chapter.
 *
 *  Second rewrite. History, because both notes are rules now:
 *
 *  1. The first version sat in the policy pages' shell. Rejected as
 *     boring. Those pages are plain because a legal document should be.
 *     A guide has to earn a read nobody owes it.
 *  2. The second version earned it with charm, and he rejected that
 *     too: "I do like the straightforward tone of the T&C instead of
 *     your try hard cringe cute tone." So the VOICE is the community
 *     guidelines' voice (declarative, concrete, second person, willing
 *     to just say the rule) while the FORM is not a document.
 *
 *  Checked against docs/content/AI-WRITING-TELLS.md. The second version
 *  broke it in four places worth remembering: it said what a Catch-up
 *  is not before saying what it is, it invented an anecdote to sound
 *  human, it closed on "that is the whole of it", and it kept turning
 *  facts into aphorisms.
 *
 *  Two graphics, and only two. The owner's rule: "graphics would
 *  obviously be good to break up the text, but don't make bad ones and
 *  put it there for the sake of it." A graphic earns its place when the
 *  fact is a shape or a comparison. The timeline is a shape: three
 *  days, then seven, then one. The naming rule is a comparison, and it
 *  is the thing people will otherwise get wrong. The Round card, the
 *  holding shimmer and the example answer were all cut. They showed
 *  what the product already shows you.
 *
 *  Facts are true to docs/spec/catchups.md sections 1, 2.2, 2.3, 2.5,
 *  2.6 and 7. "Keeper" is shipped UI language, so the guide uses it.
 * ------------------------------------------------------------------ */

import { BirdAvatar } from "@/components/common/bird-avatar";

const WINDOWS = [
  { key: "ask", days: 3, label: "Questions", sub: "Anyone can add one" },
  { key: "answer", days: 7, label: "Answers", sub: "Everyone writes" },
  { key: "quiet", days: 1, label: "Hidden", sub: "Nobody can read it" },
];

/**
 * Graphic one: the windows at their real lengths. The fact here is a shape.
 * Answering is most of the cycle and the hidden day is a sliver, and drawing
 * the four equal would teach the wrong thing.
 */
function WindowBand() {
  return (
    <figure className="gd-band">
      {/* No words on the bars. In a narrow container the one-day window is
          about twenty pixels wide and any label in it clips. */}
      <div className="gd-band-track">
        {WINDOWS.map((w) => (
          <div key={w.key} className={`gd-seg gd-seg-${w.key}`} style={{ flexGrow: w.days }} />
        ))}
        <div className="gd-seg gd-seg-out" />
      </div>
      <figcaption className="gd-band-list">
        {WINDOWS.map((w) => (
          <span key={w.key}>
            <i className={`gd-dot gd-dot-${w.key}`} />
            <b>
              {w.label} <em>{w.days === 1 ? "1 day" : `${w.days} days`}</em>
            </b>
            <span>{w.sub}</span>
          </span>
        ))}
        <span>
          <i className="gd-dot gd-dot-out" />
          <b>It publishes</b>
          <span>Everyone sees it at once</span>
        </span>
      </figcaption>
    </figure>
  );
}

/**
 * Graphic two: who your name is attached to. Questions can be anonymous and
 * answers never can, which is the rule people get wrong, and it is a
 * comparison rather than a sentence.
 */
function NamingRule() {
  return (
    <figure className="gd-naming">
      <div className="gd-naming-row">
        <span className="gd-naming-face blank" aria-hidden="true" />
        <div>
          <b>A question you add</b>
          <span>Your name, or not. You choose each time.</span>
        </div>
      </div>
      <div className="gd-naming-row">
        <BirdAvatar user={{ id: "naming-example", name: "A member" }} size={34} />
        <div>
          <b>An answer you write</b>
          <span>Always your name. There is no anonymous answer.</span>
        </div>
      </div>
    </figure>
  );
}

export function GuideBody() {
  return (
    <article className="gd-doc">
      <h1>Catch-ups</h1>
      <p className="gd-lede">
        A Catch-up is a group newsletter that comes round on a schedule. Everyone answers
        the same questions while the window is open. When it shuts, the answers are
        collected into one issue the whole group reads.
      </p>

      <section>
        <h2>Who is in one</h2>
        <p>
          You choose. A house, a batch, six people from your year. There is no minimum,
          and nobody is added without being asked first. Whoever starts a Catch-up is its
          Keeper and tends it from then on.
        </p>
      </section>

      <section>
        <h2>How a Round runs</h2>
        <p>One cycle is called a Round. It runs in one direction and does not go back.</p>
        <WindowBand />
        <p>
          Those are the defaults. The Keeper can change any of them before a window opens,
          and can publish early if everyone has already written.
        </p>
      </section>

      <section>
        <h2>The day it is hidden</h2>
        <p>
          When answering closes, the Round disappears for a day. Nobody can read it, the
          Keeper included. Then it publishes and everyone sees it at the same time. The
          day is there so that publishing is an event rather than a page filling up over a
          week.
        </p>
      </section>

      <section>
        <h2>Whose name is on what</h2>
        <p>
          Questions and answers work differently, and this is the part people get wrong.
        </p>
        <NamingRule />
      </section>

      <section>
        <h2>What to write</h2>
        <p>
          Long answers work better here than short ones. Nobody is scrolling past you and
          everyone reading already knows who you are, so you can start in the middle.
          Write about one thing that happened rather than summarising the year.
        </p>
      </section>

      <section>
        <h2>If hardly anyone answers</h2>
        <p>
          A first Round will not publish empty. If nobody has written by the time answering
          closes, the window reopens for three more days and everyone is reminded. After
          that it publishes with whatever it has.
        </p>
      </section>

      <footer className="gd-close">
        <a className="gd-go" href="#">
          Start a Catch-up
        </a>
      </footer>
    </article>
  );
}
