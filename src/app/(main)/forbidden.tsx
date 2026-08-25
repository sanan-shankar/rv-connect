/* ------------------------------------------------------------------ *
 *  403. What a non-admin gets for asking for /admin.
 *
 *  Two words, and that is the whole brief (owner, 2026-08-25: "just have it
 *  say 'nice try'. no need for any other text"). No heading, no explanation,
 *  no link back -- it sits inside the (main) layout, so the sidebar is right
 *  there and a person who wandered in has an obvious way out without this
 *  page spelling one for them.
 *
 *  It lives HERE rather than at src/app/forbidden.tsx on purpose. The throw
 *  comes from requireAdminPage() in the admin LAYOUT, so the boundary has to
 *  sit in an ancestor segment; (main) is the nearest one that still carries
 *  the site's chrome. At the root it would render bare, and being turned away
 *  is not a reason to strip somebody's navigation.
 *
 *  Deliberately NOT the not-found boundary: three admin pages call notFound()
 *  for a row that is genuinely gone, and sharing one boundary would tell an
 *  admin "nice try" for a deleted thread.
 *
 *  Set in the same shape as /about's stub, which is the house pattern for a
 *  page whose entire content is one quiet line.
 *
 *  KNOWN DEV-ONLY NOISE, already chased down so nobody chases it twice: this
 *  page logs one React warning, "Encountered a script tag while rendering
 *  React component", and lights Next's "1 Issue" badge. It is not from here --
 *  this file renders a div and a p. forbidden() is caught by a CLIENT error
 *  boundary, so React re-renders the tree on the client and walks Next's own
 *  streaming `self.__next_f.push(...)` script tags on the way. Nothing to fix
 *  and nothing to hide: the string exists only in React's *.development.js
 *  builds, so it cannot fire in production. A real notFound() on the same
 *  layout is silent, which is what makes it look like ours. It is not.
 * ------------------------------------------------------------------ */

export default function Forbidden() {
  return (
    <div className="flex min-h-[75vh] items-center justify-center text-center">
      <p className="text-sm text-muted-foreground">nice try</p>
    </div>
  );
}
