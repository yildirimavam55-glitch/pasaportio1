// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { Connect, Plugin } from "vite";
import { isPublishedAssetPath, PUBLISHED_ASSET_UPSTREAM } from "./src/lib/published-assets";

/** Local clone has no Lovable asset disk. Keep the published /__l5e URLs and serve the bytes. */
function pasaportPublishedAssets(): Plugin {
  const handle: Connect.NextHandleFunction = async (req, res, next) => {
    const path = req.url?.split("?")[0] ?? "";
    if (!path.startsWith("/__l5e/")) return next();
    if (!isPublishedAssetPath(path)) {
      res.statusCode = 404;
      res.end();
      return;
    }
    try {
      const response = await fetch(`${PUBLISHED_ASSET_UPSTREAM}${path}`);
      if (!response.ok) {
        res.statusCode = response.status;
        res.end();
        return;
      }
      const type = response.headers.get("content-type");
      if (type) res.setHeader("Content-Type", type);
      res.setHeader("Cache-Control", "public, max-age=86400, immutable");
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

function vercelNitroPreset(): { preset: string } | undefined {
  const requested = String(process.env["NITRO_PRESET"] ?? "").trim();
  if (requested === "vercel" || process.env["VERCEL"]) return { preset: "vercel" };
  return undefined;
}

const vercelNitro = vercelNitroPreset();

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  // Lovable builds keep the Cloudflare default. Vercel CI sets VERCEL=1 and pins Node serverless.
  nitro: vercelNitro ?? true,
  vite: {
    plugins: [pasaportPublishedAssets()],
  },
});
