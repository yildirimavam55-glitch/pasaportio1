import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { audit, privilegedAdminDb } from "@/lib/admin-guard";
import { deletionTransitionAllowed } from "@/domain/account/deletion-workflow";

export const DELETION_CONFIRM_TEXT = "HESABI ANONIMLESTIR";

/** Admin-only list of customer deletion requests. */
export const listDeletionRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await privilegedAdminDb(context);
    const { data, error } = await db
      .from("account_deletion_requests")
      .select("id, user_id, status, reason, requested_at, processed_at")
      .order("requested_at", { ascending: false })
      .limit(200);
    if (error) throw new Error("Silme talepleri yüklenemedi.");
    const ids = [...new Set((data ?? []).map((row: any) => row.user_id))];
    const { data: profiles } = ids.length
      ? await db.from("profiles").select("id, email, full_name").in("id", ids)
      : { data: [] };
    const byId = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    return (data ?? []).map((row: any) => ({ ...row, email: byId.get(row.user_id)?.email ?? null, full_name: byId.get(row.user_id)?.full_name ?? null }));
  });

/**
 * Moves a request through REQUESTED → IN_REVIEW → COMPLETED/REJECTED.
 * COMPLETED anonymises personal data and blocks sign-in; orders, payments,
 * refunds and invoices are retained for legal/financial retention.
 */
export const processDeletionRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), status: z.enum(["IN_REVIEW", "REJECTED", "COMPLETED"]), confirm: z.string().optional() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const db = await privilegedAdminDb(context);
    const { data: request, error } = await db
      .from("account_deletion_requests")
      .select("id, user_id, status")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !request) throw new Error("Talep bulunamadı.");
    if (!deletionTransitionAllowed(request.status, data.status)) throw new Error("Bu durum geçişine izin verilmiyor.");
    if (data.status === "COMPLETED") {
      if (data.confirm !== DELETION_CONFIRM_TEXT) throw new Error(`Onay için "${DELETION_CONFIRM_TEXT}" yazın.`);
      const { data: isAdmin } = await db.rpc("has_role", { _user_id: request.user_id, _role: "admin" });
      if (isAdmin === true) throw new Error("Yönetici hesapları bu akışla anonimleştirilemez.");
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const anonEmail = `deleted+${request.user_id}@deleted.invalid`;
      await db.from("profiles").update({ full_name: null, country_iso: null, email: null }).eq("id", request.user_id);
      await db.from("travelers").delete().eq("customer_id", request.user_id);
      await db.from("customer_notification_preferences").delete().eq("user_id", request.user_id);
      const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(request.user_id, {
        email: anonEmail,
        ban_duration: "876000h",
        user_metadata: {},
      });
      if (banError) throw new Error("Hesap girişi kapatılamadı; talep tamamlanmadı.");
    }
    const { error: updateError } = await db
      .from("account_deletion_requests")
      .update({ status: data.status, processed_at: data.status === "IN_REVIEW" ? null : new Date().toISOString() })
      .eq("id", data.id);
    if (updateError) throw new Error("Talep güncellenemedi.");
    await audit(db, `ACCOUNT_DELETION_${data.status}`, "account_deletion_request", data.id, { status: request.status }, { status: data.status });
    return { ok: true };
  });
