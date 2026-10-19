import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { createSeoMetadataPlugin } from "./build/seo-metadata-plugin";

export default defineConfig({
  root: "standalone",
  publicDir: false,
  base: "./",
  plugins: [react(), createSeoMetadataPlugin({ publicSite: false })],
  build: {
    outDir: "../single-dist",
    emptyOutDir: true,
    cssCodeSplit: false,
    assetsInlineLimit: Infinity,
    modulePreload: { polyfill: false },
    rollupOptions: {
      output: {
        codeSplitting: false,
      },
    },
  },
});
