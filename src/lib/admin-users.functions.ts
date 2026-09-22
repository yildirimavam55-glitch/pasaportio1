import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { adminDb, audit, type AdminCtx } from "@/lib/admin-guard";

export type AdminUserRow = {
  userId: string;
  email: string | null;
  name: string | null;
  role: "admin";
  status: "ACTIVE" | "PENDING" | "DISABLED";
  addedAt: string | null;
  lastActivityAt: string | null;
};

export type AdminInviteRow = {
  id: string;
  email: string;
  name: string | null;
  role: "admin";
  status: "PENDING";
  addedAt: string;
  expiresAt: string;
  delivery: "NOT_SENT" | "SENT";
};

/** Random invitation token; only its hash is stored, the token is never logged. */
async function newToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const token = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  const hash = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  return hash;
}

export const listAdminAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await adminDb(context as AdminCtx);
    const [{ data: admins, error: adminsError }, { data: invites, error: invitesError }] = await Promise.all([
      db.rpc("list_admin_users"),
      db
        .from("admin_invitations")
        .select("id, email, note, status, created_at, expires_at, delivery_state")
        .eq("status", "PENDING")
        .order("created_at", { ascending: false }),
    ]);
    if (adminsError) throw new Error(adminsError.message);
    if (invitesError) throw new Error(invitesError.message);

    const rows: AdminUserRow[] = (admins ?? []).map((row: any) => ({
      userId: row.user_id,
      email: row.email ?? null,
      name: row.full_name ?? null,
      role: "admin",
      status: row.email_confirmed ? "ACTIVE" : "DISABLED",
      addedAt: row.created_at ?? null,
      lastActivityAt: row.last_sign_in_at ?? null,
    }));
    const pending: AdminInviteRow[] = (invites ?? []).map((row: any) => ({
      id: row.id,
      email: row.email,
      name: row.note ?? null,
      role: "admin",
      status: "PENDING",
      addedAt: row.created_at,
      expiresAt: row.expires_at,
      delivery: row.delivery_state === "SENT" ? "SENT" : "NOT_SENT",
    }));
    return { admins: rows, pending, currentUserId: (context as AdminCtx).userId };
  });

export const inviteAdminUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { email: string; note?: string }) => input)
  .handler(async ({ data, context }) => {
    const db = await adminDb(context as AdminCtx);
    const email = data.email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Geçerli bir e-posta adresi girin.");
    const { data: result, error } = await db.rpc("invite_admin", {
      _email: email,
      _note: data.note?.trim() || null,
      _token_hash: await newToken(),
    });
    if (error) throw new Error(error.message);
    const outcome = result as { result: "GRANTED" | "PENDING" | "ALREADY_ADMIN" };
    await audit(db, "ADMIN_ROLE_CHANGE", "auth_user", email, null, { outcome: outcome.result ?? outcome });
    return outcome;
  });

export const cancelAdminInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const db = await adminDb(context as AdminCtx);
    const { error } = await db.rpc("cancel_admin_invitation", { _id: data.id });
    if (error) throw new Error(error.message);
    await audit(db, "ADMIN_ROLE_CHANGE", "admin_invitation", data.id, { status: "PENDING" }, { status: "CANCELLED" });
    return { ok: true };
  });

export const resendAdminInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const db = await adminDb(context as AdminCtx);
    const { error } = await db.rpc("refresh_admin_invitation", { _id: data.id, _token_hash: await newToken() });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const revokeAdminUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => input)
  .handler(async ({ data, context }) => {
    const ctx = context as AdminCtx;
    const db = await adminDb(ctx);
    const { error } = await db.rpc("revoke_admin", { _user_id: data.userId });
    if (error) throw new Error(error.message);
    await audit(db, "ADMIN_ROLE_CHANGE", "auth_user", data.userId, { role: "admin" }, { role: null });
    return { ok: true, selfRemoved: data.userId === ctx.userId };
  });
