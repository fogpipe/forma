import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/defaults/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ["react", "@fogpipe/forma-core"],
  onSuccess:
    "mkdir -p dist/defaults/styles && cp src/defaults/styles/forma-defaults.css dist/defaults/styles/forma-defaults.css",
});
