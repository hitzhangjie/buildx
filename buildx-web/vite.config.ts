import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const isRelease = process.env.BUILD_MODE === "RELEASE";

/** Proxy target for buildx-server; follows BUILDX_HTTP_ADDR (default :9910). */
function buildxApiOrigin(): string {
  const raw = (process.env.BUILDX_HTTP_ADDR || ":9910").trim();
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }
  let hostPort = raw;
  if (!hostPort.includes(":")) {
    hostPort = `:${hostPort}`;
  }
  if (hostPort.startsWith(":")) {
    return `http://127.0.0.1${hostPort}`;
  }
  return `http://${hostPort}`;
}

const apiOrigin = buildxApiOrigin();

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/~api": apiOrigin,
      "/~health": apiOrigin,
      "/~icon": apiOrigin,
      "/~img": apiOrigin,
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: !isRelease,
    minify: isRelease,
  },
});
