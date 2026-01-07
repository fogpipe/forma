import { config as eslintConfig } from "@fogpipe/eslint-config/base";

export default [
  ...eslintConfig,
  {
    ignores: ["dist/**"],
  },
];
