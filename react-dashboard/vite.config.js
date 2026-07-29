import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  // Required when the built React module is placed
  // inside the main HTML project.
  base: "./",

  build: {
    // Generate the final React application directly
    // inside the main LifeLine-AI project.
    outDir: "../react-analytics-app",

    // Clear only the old React build folder
    // before generating a fresh build.
    emptyOutDir: true,
  },
});