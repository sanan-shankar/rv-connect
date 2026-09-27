# Phase 0 gate runs (2026-09-24 ~01:10 BST, at 70570bcd) — raw output kept as the crawl baseline's evidence

## npm run check
```


  ok   TypeScript               no errors
  ok   ESLint                   clean
  ok   Shape + colour protocol  clean
  ok   Lab registry             65 routes registered
  ok   Unit tests               130/130 passing
  ok   Dependency advisories    clean
  ok   Security audit status    74 tracked, none open at high

52.9s
EXIT=0
```

## npm run verify:crawl (signed in as the owner's default admin session, dev server PID 75607)
```

OK 200      /feed
OK 200      /directory
OK 200      /letters
OK 200      /catchups
OK 200      /collection
OK 200      /about
OK 200      /support
OK 200      /donate
OK 200      /admin
OK 200      /messages
OK 200      /dark-mode
!! NAV-ERR  /birds  | nav: Navigation timeout of 25000 ms exceeded
OK 200      /pick-bird
OK 200      /welcome
!! NAV-ERR  /guide  | nav: Navigation timeout of 25000 ms exceeded
!! NAV-ERR  /profile/cmr1uahuj000004jx4dc4p8co  | nav: Navigation timeout of 25000 ms exceeded
!! NAV-ERR  /profile/cmr9awtu1000004jyd70tmxmu  | nav: Navigation timeout of 25000 ms exceeded
!! NAV-ERR  /  | nav: Navigation timeout of 25000 ms exceeded
!! NAV-ERR  /login  | nav: Navigation timeout of 25000 ms exceeded
!! NAV-ERR  /signup  | nav: Navigation timeout of 25000 ms exceeded
!! NAV-ERR  /lab  | nav: Navigation timeout of 25000 ms exceeded
CRAWL_EXIT=0
```

## npm run visual (summary lines)
```
  ✘   5 [desktop] › e2e/visual.spec.ts:307:7 › directory looks unchanged (8.7s)
  ✘   6 [desktop] › e2e/visual.spec.ts:307:7 › letters looks unchanged (1.1m)
  ✘  17 [mobile] › e2e/visual.spec.ts:307:7 › directory looks unchanged (6.2s)
    Error: expect(page).toHaveScreenshot(expected) failed
    e2e/.output/visual-directory-looks-unchanged-desktop/test-failed-1.png
    Error: expect(page).toHaveScreenshot(expected) failed
    e2e/.output/visual-letters-looks-unchanged-desktop/test-failed-1.png
    Error: expect(page).toHaveScreenshot(expected) failed
```

Explained in findings.md "Crawl baseline, explained" and the report's live-evidence section.
