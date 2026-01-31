import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    "index": "src/index.ts", 
    "war2-fnt": "src/cli.ts"
  },
  clean: true,
  format: ["cjs", "esm"],
  dts: true,
  minify: true
});
