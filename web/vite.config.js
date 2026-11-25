import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The radio API and account API run on separate local Worker ports.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/graphql": "http://127.0.0.1:8788",
      "/account-api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/account-api/, ""),
      },
    },
  },
});
