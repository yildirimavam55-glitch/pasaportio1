import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import type { Connect, Plugin } from "vite";

/**
 * Dev/preview only. Lovable country photos are stored as /__l5e URLs.
 * This does not run during `vite build` or on Vercel.
 */
function pasaportDevAssetProxy(): Plugin {
  const upstream = "https://pasaportio1.lovable.app";
  const handle: Connect.NextHandleFunction = async (req, res, next) => {
    const path = req.url?.split("?")[0] ?? "";
    if (!path.startsWith("/__l5e/")) return next();
    try {
      const response = await fetch(`${upstream}${path}`);
      if (!response.ok) {
        res.statusCode = response.status;
        res.end();
        return;
      }
      const type = response.headers.get("content-type");
      if (type) res.setHeader("Content-Type", type);
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.statusCode = 200;
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch {
      res.statusCode = 502;
      res.end();
    }
  };
  return {
    name: "pasaport-dev-asset-proxy",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(handle);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handle);
    },
  };
}

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    tailwindcss(),
    tanstackStart({
      server: { entry: "server" },
    }),
    nitro(),
    viteReact(),
    pasaportDevAssetProxy(),
  ],
});
