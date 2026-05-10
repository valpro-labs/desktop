import path from "node:path";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { uniwind } from "uniwind/vite";

const rootDir = fileURLToPath(new URL(".", import.meta.url));
const desktopRoot = path.resolve(rootDir, "src/desktop");

export default defineConfig(({ mode }) => ({
  root: desktopRoot,
  base: "./",
  plugins: [
    react(),
    tailwindcss(),
    uniwind({
      cssEntryFile: path.resolve(desktopRoot, "styles.css"),
      dtsFile: path.resolve(rootDir, "src/desktop/uniwind-types.d.ts")
    })
  ],
  css: {
    transformer: "postcss"
  },
  define: {
    __DEV__: JSON.stringify(mode !== "production")
  },
  resolve: {
    alias: {
      "react-native": "react-native-web"
    },
    extensions: [
      ".web.tsx",
      ".web.ts",
      ".web.jsx",
      ".web.js",
      ".tsx",
      ".ts",
      ".jsx",
      ".js",
      ".mjs",
      ".json"
    ]
  },
  optimizeDeps: {
    include: ["@rn-primitives/progress", "@rn-primitives/slot"],
    esbuildOptions: {
      loader: {
        ".js": "jsx",
        ".mjs": "jsx"
      }
    }
  },
  build: {
    outDir: path.resolve(rootDir, "dist/windows/desktop"),
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(desktopRoot, "desktop.html")
    }
  }
}));
