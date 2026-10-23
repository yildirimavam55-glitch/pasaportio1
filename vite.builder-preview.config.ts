import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

// Separate static bundle: no app router, Supabase, server functions, login or save endpoints.
export default defineConfig({
  root: "builder-preview", base: "/builder-preview/", publicDir: false,
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  plugins: [tailwindcss(), react()],
  build: { outDir: "../public/builder-preview", emptyOutDir: true },
});
