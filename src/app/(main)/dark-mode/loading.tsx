export default function DarkModeLoading() {
  /* Mirrors the real page's shape, which is a centred ceremony rather than a
     form: DarkGauntlet is `min-h-[70vh] max-w-[560px]` centred (and LightsOn,
     the already-dark case, is the same shape one size down). This file used to
     be called SettingsLoading and drew a settings card with three sections of
     labelled field rows -- the geometry of the /settings page, which was
     retired. So every cold load of /dark-mode flashed a form and then landed
     on a centred paragraph, which is the exact jump a skeleton exists to
     prevent. */
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-[560px] flex-col items-center justify-center gap-5 py-8">
      <div className="skeleton-warm h-3 w-24 rounded-[var(--radius-sm)]" />
      <div className="skeleton-warm h-8 w-[280px] rounded-md" />
      <div className="w-full max-w-[40ch] space-y-2">
        <div className="skeleton-warm h-4 w-full rounded-md" />
        <div className="skeleton-warm mx-auto h-4 w-2/3 rounded-md" />
      </div>
    </div>
  );
}
