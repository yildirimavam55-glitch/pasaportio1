/**
 * Scheduled provider balance checks (read-only). Called by an external
 * scheduler every few minutes with the server-only cron secret. Each provider
 * is checked only when its configured interval is due.
 */
import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/public/balance-monitor")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;
        const { runDueBalanceChecks } = await import("@/lib/balance-monitor.server");
        try {
          const result = await runDueBalanceChecks();
          return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" } });
        } catch (error) {
          console.error("balance-monitor failed", (error as Error).message);
          return new Response(JSON.stringify({ ok: false, error: "BALANCE_MONITOR_FAILED" }), { status: 500, headers: { "Content-Type": "application/json" } });
        }
      },
    },
  },
});
