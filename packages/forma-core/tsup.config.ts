import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/engine/index.ts",
    "src/feel/index.ts",
  ],
  format: ["esm", "cjs"],
  // Skip tsup's DTS bundling - we'll use tsc separately to preserve export type syntax
  dts: false,
  clean: true,
  sourcemap: true,
});
