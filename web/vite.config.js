import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// In dev the API runs on `wrangler dev` (port 8787).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy: { "/graphql": "http://localhost:8787" } },
});
