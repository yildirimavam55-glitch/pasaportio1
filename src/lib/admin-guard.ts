/** Shared admin guard + audit helper for admin-only server functions. */
export type AdminCtx = { supabase: any; userId: string };

export async function adminDb(context: AdminCtx) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Yönetici yetkisi gerekiyor.");
  return context.supabase;
}

/** Writes an audit record through the security-definer function. Never stores secrets. */
export async function audit(
  db: any,
  action: string,
  entityType: string,
  entityId: string | null,
  before: unknown,
  after: unknown,
) {
  const { error } = await db.rpc("log_admin_action", {
    _action: action,
    _entity_type: entityType,
    _entity_id: entityId ? String(entityId) : null,
    _before: before ?? null,
    _after: after ?? null,
  });
  if (error) throw new Error(error.message);
}
