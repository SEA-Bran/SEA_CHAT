import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  if (mode === "widget") {
    return {
      plugins: [react()],
      define: {
        "process.env.NODE_ENV": JSON.stringify("production"),
        "process.env": "{}",
      },
      build: {
        outDir: "dist-widget",
        emptyOutDir: true,
        chunkSizeWarningLimit: 650,
        lib: {
          entry: resolve(__dirname, "src/embeddable.tsx"),
          name: "SeaChatWidget",
          fileName: () => "sea-chat-widget.js",
          formats: ["iife"],
        },
        rollupOptions: {
          output: {
            intro:
              "var process = globalThis.process || { env: { NODE_ENV: 'production' } };",
          },
        },
      },
    };
  }

  return {
    plugins: [react()],
  };
});
