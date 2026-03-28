import { defineConfig } from "tsup";
import path from "path";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "editor/index": "src/editor/index.ts",
    "templates/index": "src/templates/index.ts",
  },
  format: ["cjs", "esm"],
  dts: false, // Temporarily disabled
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom", "@tiptap/pm"],
  treeshake: true,
  esbuildOptions(options) {
    options.alias = {
      "@/blocks": path.resolve(__dirname, "./src/core/blocks"),
      "@/editor": path.resolve(__dirname, "./src/core/editor"),
      "@/extensions": path.resolve(__dirname, "./src/core/extensions"),
    };
  },
});
