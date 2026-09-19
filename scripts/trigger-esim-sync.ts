import { runProviderSyncToCompletion } from "@/lib/provider-sync.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function main() {
  const { data: provider } = await supabaseAdmin
    .from("providers")
    .select("id")
    .eq("code", "ESIM_GO")
    .maybeSingle();

  if (!provider) {
    console.error("ESIM_GO provider not found");
    process.exit(1);
  }

  const result = await runProviderSyncToCompletion(supabaseAdmin, provider.id, "MANUAL", {
    overrideKillSwitch: true,
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
