"use client";

import type { Pairing } from "./_fonts";

/* One specimen, driven entirely by the pairing. Every size below is a size
   the product actually uses: 34px page title (the display step), 20px card
   title, 15px body, 12px eyebrow, plus a figures row, because counts and
   dates are everywhere in this app and nobody has looked at them. */

export function Specimen({ p }: { p: Pairing }) {
  const head: React.CSSProperties = { fontFamily: p.headVar, fontWeight: p.headWeight };
  const body: React.CSSProperties = { fontFamily: p.bodyVar };

  return (
    <div className="rounded-[16px] bg-card p-6">
      <div
        className="text-[11.5px] font-bold uppercase tracking-[0.16em] text-cinnamon"
        style={body}
      >
        The Valley Collection
      </div>

      <h3
        className="mt-2.5 text-[34px] leading-[1.08] tracking-[-0.025em] text-foreground"
        style={head}
      >
        Standing in all its glory
      </h3>

      <p className="mt-4 max-w-[52ch] text-[15px] leading-[1.68] text-foreground" style={body}>
        The banyan was already old when Krishnamurti walked under it. Somebody photographed it in
        1974 with a borrowed camera, and the print sat in a shoebox in Bengaluru for fifty years
        before it turned up here. If you were in Neem in the seventies, you will know the branch.
      </p>

      <h4 className="mt-6 text-[20px] leading-[1.25] tracking-[-0.02em] text-foreground" style={head}>
        Round 4 is open for answers
      </h4>
      <p className="mt-1.5 max-w-[52ch] text-[15px] leading-[1.68] text-muted-foreground" style={body}>
        Nine people have written in so far. It closes on Sunday.
      </p>

      <div
        className="mt-6 flex flex-wrap gap-x-7 gap-y-2 border-t border-border pt-4 text-[13px] tabular-nums text-muted-foreground"
        style={body}
      >
        <span>Batch of &apos;04</span>
        <span>1,284 members</span>
        <span>₹2,290 / month</span>
        <span>1974 to 1981</span>
        <span>18 Aug 2026</span>
      </div>

      <p className="mt-4 text-[15px] leading-[1.68] text-foreground" style={body}>
        And a real italic, drawn rather than sheared:{" "}
        <em style={{ fontFamily: p.bodyVar }}>a memory from the valley</em>.
      </p>
    </div>
  );
}
