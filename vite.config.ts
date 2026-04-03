import { defineConfig } from "vite-plus";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  lint: {
    ignorePatterns: ["dist/**"],
    options: { typeAware: true, typeCheck: true },
  },
  fmt: {
    ignorePatterns: ["scripts-mds/**", "dist/**"],
    sortTailwindcss: {
      stylesheet: "./src/index.css",
      functions: ["clsx", "cn"],
    },
  },
  plugins: [react(), tailwindcss()],
});
