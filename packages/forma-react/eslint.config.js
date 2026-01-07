import { config as eslintConfig } from "@formidable/eslint-config/react";

export default [
  ...eslintConfig,
  {
    ignores: ["dist/**"],
  },
];
