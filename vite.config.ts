// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { Connect, Plugin } from "vite";

/** Local clone has no Lovable asset disk. Keep the published /__l5e URLs and serve the bytes. */
function pasaportPublishedAssets(): Plugin {
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
    name: "pasaport-published-assets",
    configureServer(server) {
      server.middlewares.use(handle);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handle);
    },
  };
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [pasaportPublishedAssets()],
  },
});
