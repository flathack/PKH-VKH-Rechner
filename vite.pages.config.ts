import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: "standalone",
  base: "/PKH-VKH-Rechner/",
  plugins: [react()],
  build: {
    outDir: "../pages-dist",
    emptyOutDir: true,
  },
});
