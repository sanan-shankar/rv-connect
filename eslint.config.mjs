import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Design-system guardrails (docs/spec/DESIGN-SYSTEM.md, "How to use this doc").
// Deliberately "warn", never "error" — these nudge, they never break the build.
const transitionAllMessage =
  "Animate only transform/opacity (docs/spec/DESIGN-SYSTEM.md sec. 7). Use transition-transform/transition-opacity instead of transition-all.";
const cubicBezierMessage =
  "Don't hand-type cubic-bezier(...). Import EASE_POP / EASE_SPRING / SPRINGS from src/components/common/motion.tsx (docs/spec/DESIGN-SYSTEM.md sec. 7).";
const bgWhiteMessage =
  "Surfaces are never pure white (docs/spec/DESIGN-SYSTEM.md sec. 2). Use bg-card or bg-float instead of bg-white.";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "warn",
        {
          selector: "Literal[value=/(?:^|\\s)transition-all(?:\\s|$)/]",
          message: transitionAllMessage,
        },
        {
          selector: "TemplateElement[value.raw=/(?:^|\\s)transition-all(?:\\s|$)/]",
          message: transitionAllMessage,
        },
        {
          selector: "Literal[value=/cubic-bezier\\(/]",
          message: cubicBezierMessage,
        },
        {
          selector: "TemplateElement[value.raw=/cubic-bezier\\(/]",
          message: cubicBezierMessage,
        },
        {
          selector: "Literal[value=/(?:^|\\s)bg-white(?:\\s|$)/]",
          message: bgWhiteMessage,
        },
        {
          selector: "TemplateElement[value.raw=/(?:^|\\s)bg-white(?:\\s|$)/]",
          message: bgWhiteMessage,
        },
      ],
    },
  },
  {
    // Lab rooms explore freely. src/app/lab/_registry.ts calls them the place
    // that is NOT the product, and scripts/qa/protocol-audit.mjs already exempts
    // them from the same protocol for the same reason ("lab rooms explore
    // freely"). A variant landing that tries pure white, or a throwaway mockup
    // that uses <img> because LCP is meaningless on a page no member will load,
    // is the lab doing its job. Keeping these warnings on meant 12 of the 25
    // warnings on 2026-08-08 were rooms behaving correctly, which is how the 2
    // real violations in PRODUCTION code (a hand-typed easing curve inside the
    // shared Button, bg-white in the landing hero) stayed invisible for months.
    // Real dead code is still reported here: this turns off the design rules
    // and the image hint, not the unused-variable checks.
    files: ["src/app/lab/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": "off",
      "@next/next/no-img-element": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
