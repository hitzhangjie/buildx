import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/~api": "http://127.0.0.1:6610",
      "/~health": "http://127.0.0.1:6610",
      "/~icon": "http://127.0.0.1:6610",
      "/~img": "http://127.0.0.1:6610",
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
