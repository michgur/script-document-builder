import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";

export default defineConfig({
  base: "script-document-builder",
  staged: {
    "*": "vp check --fix",
  },
  lint: {
    ignorePatterns: ["dist/**"],
    options: { typeAware: true, typeCheck: true },
  },
  fmt: {
    ignorePatterns: ["scripts-mds/**", "dist/**"],
    sortImports: {},
    sortTailwindcss: {
      stylesheet: "./src/index.css",
      functions: ["clsx", "cn"],
    },
  },
  plugins: [react(), tailwindcss()],
});
