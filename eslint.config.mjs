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
