import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: "standalone",
  base: "./",
  plugins: [react()],
  build: {
    outDir: "../single-dist",
    emptyOutDir: true,
    cssCodeSplit: false,
    modulePreload: { polyfill: false },
    rollupOptions: {
      output: {
        codeSplitting: false,
      },
    },
  },
});
