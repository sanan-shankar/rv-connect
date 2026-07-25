"use client";

import { LabShell, Rule, Tell, Ledger, Mount, Bench, Verdict, Pick } from "../_kit";
import {
  ShippedBar,
  TickLadder,
  InvertedFrame,
  Seats,
  AMOUNTS,
  useRecovered,
} from "./_bars";
import { BirdAvatar } from "@/components/common/bird-avatar";

const DONORS = [
  "Anjali Rao",
  "Vikram Menon",
  "Sunita Iyer",
  "Rahul Nair",
  "Meera Krishnan",
  "Arjun Reddy",
  "Kavita Pillai",
  "Devi Subramanian",
];

export default function SupportRoom() {
  const { recovered, i, setI } = useRecovered();

  return (
    <LabShell
      title="The ask that argues against itself"
      lede="The Support page is honest, well written, and quietly talks you out of giving. Three separate decisions do it, and the worst of them is a progress bar you cannot see."
    >
      <Tell
        stats={[
          { n: "1.09:1", of: "contrast of the empty progress trough against its own card" },
          { n: "₹0", of: "of ₹4,00,000, animated with a 950ms count-up that counts to zero" },
          { n: "0", of: "places in the codebase that can write the reward this page promises" },
          {
            n: "172px",
            of: "further right than every sibling page, because it opts out of PageHeader",
          },
        ]}
      >
        <p>
          This is the one page in the product whose job is to change behaviour, so it is the one page
          where a soft edge has a price. Nothing on it is broken in a way you would file a bug for.
          The copy is genuinely good, better than most of the app. It is the <b>sequence</b> and the{" "}
          <b>shapes</b> that are working against the words.
        </p>
      </Tell>

      {/* ---------------------------------------------------------- */}
      <Rule>One · a bar that cannot move</Rule>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <p className="max-w-[62ch] text-[15px] leading-[1.7]">
          <code className="rounded bg-mist px-1.5 py-0.5 text-[13px]">BUILD_RECOVERED = 0</code> is a
          hardcoded constant. The bar renders 0% of ₹4,00,000, and the empty trough is{" "}
          <code className="rounded bg-mist px-1.5 py-0.5 text-[13px]">bg-mist</code> (#EEE8DA) on a{" "}
          <code className="rounded bg-mist px-1.5 py-0.5 text-[13px]">bg-card</code> (#F6F2E8) card.
          That is <b>1.09:1</b>. The widget is not a bar at zero, it is a faint dent.
        </p>
        <p className="max-w-[62ch] text-[15px] leading-[1.7]">
          It also animates. <code className="rounded bg-mist px-1.5 py-0.5 text-[13px]">useCountUpOnView</code>{" "}
          spends about 950ms counting from zero to zero, so the one moment of motion on the page is
          motion that visibly achieves nothing. And the caption directly under it ends: &quot;Nothing
          about the site changes if it never fills up.&quot; The last two things a reader takes in
          before the donate panel are a visible zero and a sentence saying their money does not
          matter.
        </p>
      </div>

      <div className="mt-8 mb-6 flex flex-wrap items-center gap-4">
        <Pick
          items={AMOUNTS.map((a, n) => ({
            k: String(n),
            label: a === 0 ? "₹0 (today)" : `₹${a.toLocaleString("en-IN")}`,
          }))}
          value={String(i)}
          onChange={(k) => setI(Number(k))}
        />
        <span className="text-[13px] text-muted-foreground">
          Move the amount. Watch which of these four is still legible at zero.
        </span>
      </div>

      <Bench cols={2}>
        <Mount
          tone="shipped"
          note="What ships. At ₹0 the trough is 1.09:1 against the card behind it."
        >
          <ShippedBar recovered={recovered} />
        </Mount>
        <Mount
          tone="option"
          label="A · a scale, not a bar"
          note="Eighty marks, one per ₹5,000. Structure survives being empty."
        >
          <TickLadder recovered={recovered} />
        </Mount>
        <Mount
          tone="pick"
          label="B · lead with the win"
          note="The monthly bill IS covered. Say that, and demote the one-off to a note with no bar."
        >
          <InvertedFrame recovered={recovered} />
        </Mount>
        <Mount
          tone="option"
          label="C · eighty seats"
          note="One seat per ₹5,000. Taking one seat is a complete act; filling 0.25% of a bar is not."
        >
          <Seats recovered={recovered} />
        </Mount>
      </Bench>

      <p className="mt-6 max-w-[74ch] text-[15px] leading-[1.7]">
        The general rule worth taking from this: <b>a progress bar is a promise that something
        moves.</b> At 0% it makes the opposite promise. Any quantity that starts empty and fills
        slowly should be drawn as a <b>scale with units</b>, where one contribution is a whole unit,
        rather than as a percentage, where one contribution is invisible. ₹5,000 is 1.25% of the
        goal. On the shipped bar that is 3 pixels.
      </p>

      {/* ---------------------------------------------------------- */}
      <Rule>Two · identical twins in opposite states</Rule>

      <p className="mb-6 max-w-[74ch] text-[15px] leading-[1.7]">
        The monthly card and the build-fund card are the same component shape: same{" "}
        <code className="rounded bg-mist px-1.5 py-0.5 text-[13px]">card-elevated</code>, same 16px
        radius, same padding, same 20px pill, stacked 16px apart. One is a solved fact at 100% in
        three brand colours. The other is an unfunded aspiration at 0%. Putting the same frame around
        both forces a comparison the second one cannot survive: full bar, empty bar, in that order,
        on a page asking for money.
      </p>

      <Ledger
        firstCol="30%"
        cols={["", "Monthly bill", "Build fund", "Same?"]}
        rows={[
          { k: "Card class", v: ["card-elevated", "card-elevated", "identical"], bad: [2] },
          { k: "Radius", v: ["16px", "16px", "identical"], bad: [2] },
          { k: "Bar", v: ["h-5 rounded-full bg-mist", "h-5 rounded-full bg-mist", "identical"], bad: [2] },
          { k: "State it describes", v: ["solved, recurring", "unfunded, one-off", "opposite"], good: [2] },
          { k: "Fill", v: ["100%", "0%", "opposite"], good: [2] },
        ]}
      />

      <p className="mt-5 max-w-[74ch] text-[15px] leading-[1.7] text-muted-foreground">
        Two facts in opposite states should not share a body plan. Option B above fixes this by
        refusing to give the one-off a card at all: it becomes a recessed note nested inside the
        monthly card, at 12px inside 16px, which is also the project&apos;s own box-in-a-box radius
        rule finally being obeyed.
      </p>

      {/* ---------------------------------------------------------- */}
      <Rule>Three · the reward is a paragraph, and it does not exist</Rule>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <p className="max-w-[62ch] text-[15px] leading-[1.7]">
            The page offers one thing in return: pick your own bird instead of the one you were
            given. On a product whose signature is fifty hand-drawn valley birds, that is a genuinely
            lovely perk. Three things are wrong with how it is delivered.
          </p>
          <ol className="mt-4 ml-5 max-w-[62ch] list-decimal space-y-2 text-[15px] leading-[1.65] marker:text-muted-foreground">
            <li>
              <b>It cannot be delivered.</b> <code className="rounded bg-mist px-1.5 py-0.5 text-[13px]">User.birdOverride</code>{" "}
              has no writer anywhere in the app. Every reference is a read. There is no picker in
              settings and none in admin.
            </li>
            <li>
              <b>It links to a dev scratch page.</b>{" "}
              <code className="rounded bg-mist px-1.5 py-0.5 text-[13px]">/preview/birds-rv</code>, on
              a route prefix whose own comment says &quot;temporary, remove before shipping&quot;.
            </li>
            <li>
              <b>It is four lines of running text, below the ask.</b> No card, no visual, no bird. The
              only motivator on the page is the least visual element on the page, and it arrives after
              the decision has already been made.
            </li>
          </ol>
        </div>

        <Mount
          tone="pick"
          label="Show the birds, above the ask"
          note="The same perk, made the thing it is about. Real BirdAvatars, deterministic per person, exactly as they render in the product."
        >
          <div className="rounded-xl bg-mist p-5">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-cinnamon">
              A little something back
            </div>
            <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
              {DONORS.map((name, n) => (
                <span
                  key={name}
                  style={{ opacity: n === DONORS.length - 1 ? 0.35 : 1 }}
                  className="shrink-0"
                >
                  <BirdAvatar user={{ id: `sl-bird-${n}`, name }} size={52} />
                </span>
              ))}
              <span className="text-[13px] font-semibold text-muted-foreground">+42 more</span>
            </div>
            <p className="mt-3.5 text-[14px] leading-[1.6]">
              Chip in and pick any of the fifty to wear as your avatar, instead of the one you were
              dealt.
            </p>
          </div>
        </Mount>
      </div>

      <Verdict>
        <p>
          <b>Never render a 0% bar.</b> Either lead with the fact that the monthly bill is already
          covered and demote the build cost to a note (option B, recommended), or redraw the one-off
          as a scale where ₹5,000 is a whole visible unit (options A and C). A bar at zero is worse
          than no bar, because it is a promise of movement that the page then explicitly withdraws.
        </p>
        <p>
          <b>Resequence to cost, then reward, then ask.</b> Today it is cost, ask, reward. The one
          thing that might persuade somebody arrives after the QR code. Move the birds above the UPI
          panel and make them the visual they deserve to be.
        </p>
        <p>
          <b>Then either build the bird picker or change the copy.</b> A promise the product cannot
          keep is worse than no perk at all, and this is the page where trust is the entire currency.
          A species grid in settings gated on a supporter flag is a small piece of work; the current
          state is a link to a mockup.
        </p>
        <p className="text-muted-foreground">
          One thing to keep exactly as it is: the writing. &quot;Two numbers, in rupees, exactly as
          they are&quot; and the refusal to inflate anything is the best copy in the product. The
          problem was never the honesty. It is that the layout makes the honesty read as an apology.
        </p>
      </Verdict>
    </LabShell>
  );
}
