import { defineConfig } from "vite";
import { resolve } from "path";

// `npm run dev`   → serves demo/ with HMR (import from ../src/ directly)
// `npm run build` → bundles src/index.js → extension/rebuild.js (IIFE)

export default defineConfig({
  build: {
    lib: {
      entry:   resolve(import.meta.dirname, "src/index.js"),
      name:    "PageRebuilder",
      formats: ["iife"],
      fileName: () => "rebuild.js",
    },
    outDir:      "extension",
    emptyOutDir: false,
    minify:      false,  // keep readable while developing
  },
});
