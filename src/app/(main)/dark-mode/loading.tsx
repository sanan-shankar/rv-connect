import { ButtonSkeleton, TextSkeleton } from "@/components/common/skeleton";

export default function DarkModeLoading() {
  /* Mirrors the real page's shape, which is a centred ceremony rather than a
     form: DarkGauntlet is `min-h-[70vh] max-w-[560px]` centred (and LightsOn,
     the already-dark case, is the same shape one size down). This file used to
     be called SettingsLoading and drew a settings card with three sections of
     labelled field rows -- the geometry of the /settings page, which was
     retired. So every cold load of /dark-mode flashed a form and then landed
     on a centred paragraph, which is the exact jump a skeleton exists to
     prevent.

     The intro step line for line (dark-gauntlet.tsx): the kicker, the 32px
     title at leading-tight, the paragraph's two 15px lines at relaxed, and
     "Go back" and "Start" as the real Buttons' boxes, 20px apart, so the block
     is its real 213px and centres on the same line. Placeholders, not the
     words, though the words never change: the step rises in on arrival, so
     words drawn here would vanish and rise in again. The two paragraph bars
     are the lines' own widths, 292px and 205px, measured on the page. */
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-[560px] flex-col justify-center py-8">
      <div className="space-y-5 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em]">
          <TextSkeleton>Appearance</TextSkeleton>
        </p>
        <div className="font-heading text-[32px] leading-tight tracking-[-0.02em]">
          <TextSkeleton>Dark mode</TextSkeleton>
        </div>
        <div className="mx-auto max-w-[40ch] text-[15px] leading-relaxed">
          {["w-[292px]", "w-[205px]"].map((w) => (
            <div key={w} className="flex h-[24.375px] items-center justify-center">
              <div className={`skeleton-warm h-3 max-w-full rounded-md ${w}`} />
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-2 pt-2">
          <ButtonSkeleton icon label="Go back" />
          <ButtonSkeleton label="Start" />
        </div>
      </div>
    </div>
  );
}
