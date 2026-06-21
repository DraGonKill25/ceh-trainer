import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Base path for GitHub Pages (repo name = ceh-trainer)
export default defineConfig({
  base: process.env.GITHUB_PAGES === "true" ? "/ceh-trainer/" : "/",
  plugins: [react()],
});
