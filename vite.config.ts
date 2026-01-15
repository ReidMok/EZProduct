import "@shopify/shopify-api/adapters/node";
import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    remix({
      future: {
        v2_errorBoundary: true,
        v2_meta: true,
        v2_normalizeFormMethod: true,
        v2_routeConvention: true,
      },
    }),
  ],
  server: {
    port: 3000,
    strictPort: true,
    host: '0.0.0.0', // Listen on all interfaces to allow Shopify CLI proxy to connect
  },
});

