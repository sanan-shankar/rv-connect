/* Temporary dependency-cruiser config for the simplification audit. Lives in raw/ so the
 * repo root stays clean. Rules are the dependency-cruiser "recommended" starter set. */
module.exports = {
  forbidden: [
    { name: "no-circular", severity: "error", from: {}, to: { circular: true } },
    { name: "no-orphans", severity: "warn",
      from: { orphan: true, pathNot: ["(^|/)\\.[^/]+\\.(js|cjs|mjs|ts|json)$", "\\.d\\.ts$", "(^|/)tsconfig\\.json$", "(^|/)(babel|webpack)\\.config\\.(js|cjs|mjs|ts|json)$", "/(page|layout|loading|error|not-found|template|default|route|global-error)\\.tsx?$", "\\.test\\.mjs$", "^src/app/(manifest|robots|sitemap|icon|apple-icon)"] }, to: {} },
    { name: "not-to-unresolvable", severity: "error", from: {}, to: { couldNotResolve: true } },
    { name: "no-duplicate-dep-types", severity: "warn", from: {}, to: { moreThanOneDependencyType: true, dependencyTypesNot: ["type-only"] } },
    { name: "not-to-spec", severity: "error", from: {}, to: { path: "\\.(spec|test)\\.(js|mjs|cjs|ts|tsx)$" } },
    { name: "not-to-dev-dep", severity: "error",
      from: { path: "^src", pathNot: "\\.(spec|test)\\.(js|mjs|cjs|ts|tsx)$" },
      to: { dependencyTypes: ["npm-dev"], dependencyTypesNot: ["type-only"], pathNot: ["node_modules/@types/"] } },
    { name: "no-non-package-json", severity: "error", from: {}, to: { dependencyTypes: ["npm-no-pkg", "npm-unknown"] } },
    { name: "optional-deps-used", severity: "info", from: {}, to: { dependencyTypes: ["npm-optional"] } },
    { name: "peer-deps-used", severity: "warn", from: {}, to: { dependencyTypes: ["npm-peer"] } },
  ],
  options: {
    doNotFollow: { path: ["node_modules", "src/generated"] },
    exclude: { path: ["src/generated", "\\.next", "e2e/\\.(report|output|auth)", "node_modules"] },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: { exportsFields: ["exports"], conditionNames: ["import", "require", "node", "default", "types"], mainFields: ["module", "main", "types", "typings"] },
    reporterOptions: { text: { highlightFocused: true } },
  },
};
