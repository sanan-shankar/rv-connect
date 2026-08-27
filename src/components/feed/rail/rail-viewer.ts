/**
 * Who is looking. The rail's modules are server components that show real
 * content, so anything audience-scoped has to be scoped HERE too -- a teaser
 * is a disclosure (bug audit B-045).
 *
 * It sits beside the modules rather than in `feed-rail.tsx` because the rail
 * imports its modules and a module imported this type back -- the fifth of the
 * app's five real madge cycles. Type-only, so erased at runtime and harmless,
 * but a shared shape belongs with the things that share it.
 */
export type RailViewer = {
  /** UserPlace cities, for cityScope matching. */
  cities: string[];
  /** e.g. "ISC-2017", for targetBatches matching; null if they have no batch. */
  batch: string | null;
  /** Admins read everything, so they skip both filters. */
  isAdmin: boolean;
};
