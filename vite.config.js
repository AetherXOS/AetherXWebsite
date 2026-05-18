import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import jsconfigPaths from "vite-jsconfig-paths";

export default defineConfig({
  plugins: [
    reactRouter(),
    jsconfigPaths()
  ],
  server: {
    port: 3000,
    host: true,
  }
});
