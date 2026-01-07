import { config as eslintConfig } from "@formidable/eslint-config/base";

export default [
  ...eslintConfig,
  {
    ignores: ["dist/**"],
  },
];
