import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import jsconfigPaths from "vite-jsconfig-paths";
import netlifyReactRouter from "@netlify/vite-plugin-react-router";

export default defineConfig({
  plugins: [
    reactRouter(),
    netlifyReactRouter(),
    jsconfigPaths()
  ],
  server: {
    port: 3020,
    host: true,
  }
});
