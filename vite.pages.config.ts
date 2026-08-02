import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { createSeoMetadataPlugin } from "./build/seo-metadata-plugin";

export default defineConfig({
  root: "standalone",
  base: "/PKH-VKH-Rechner/",
  plugins: [react(), createSeoMetadataPlugin({ publicSite: true })],
  build: {
    outDir: "../pages-dist",
    emptyOutDir: true,
  },
});
