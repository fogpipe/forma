import { config as eslintConfig } from "@fogpipe/eslint-config/react";

export default [
  ...eslintConfig,
  {
    ignores: ["dist/**"],
  },
];
