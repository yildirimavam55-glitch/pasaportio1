import { runProviderSyncToCompletion } from "@/lib/provider-sync.server";
const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
const db:any = supabaseAdmin;
const f = await db.from("feature_flags").update({ enabled: true }).eq("key","esim_auto_publish").select("key,enabled");
console.log("FLAG", JSON.stringify(f.data), f.error?.message);
const { data: p } = await db.from("providers").select("id").eq("code","ESIM_GO").single();
const r = await runProviderSyncToCompletion(db, p.id, "MANUAL", { budgetMs: 540000 });
console.log("RESULT", JSON.stringify(r));
