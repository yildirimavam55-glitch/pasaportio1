/**
 * Scheduled catalogue synchronisation entry point.
 * Called by the platform scheduler; authenticated with the cron secret.
 * Runs a full catalogue sync for every provider whose interval is due.
 */
import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/public/provider-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;

        const { runDueProviderSyncs } = await import("@/lib/provider-sync.server");
        try {
          const result = await runDueProviderSyncs();
          return new Response(JSON.stringify(result), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          return new Response(JSON.stringify({ ok: false, error: (error as Error).message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
