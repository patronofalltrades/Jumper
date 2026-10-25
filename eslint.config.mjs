import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // An effect with an expression body returns the value of that expression, and React calls it as the cleanup.
    // Chrome 153 gives a Promise from scrollIntoView(), so such an effect stopped the page (issue #61).
    files: ["**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.name=/^use(Layout)?Effect$/] > ArrowFunctionExpression.arguments:first-child[expression=true]",
          message: "Put braces around the body of this effect. An effect must return a cleanup function or nothing.",
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
