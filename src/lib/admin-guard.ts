/** Shared admin guard + audit helper for admin-only server functions. */
export type AdminCtx = { supabase: any; userId: string };

/**
 * SECURITY BASELINE (docs/security/SECURITY_BASELINE.md):
 * Verifies the admin role server-side through the caller's own session, then
 * returns a client whose table access runs server-side with full privileges
 * (supplier cost columns are not readable by browser roles), while `.rpc()`
 * keeps the caller's identity so audit/role functions still see auth.uid().
 * Never call this before the role check; never expose the result to a client.
 */
export async function assertAdminRole(context: AdminCtx) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (data !== true) throw new Error("Yönetici yetkisi gerekiyor.");
}

export async function privilegedAdminDb(context: AdminCtx) {
  await assertAdminRole(context);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin: any = supabaseAdmin;
  return new Proxy(context.supabase, {
    get(target, prop) {
      if (prop === "from") return admin.from.bind(admin);
      const value = target[prop];
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

export async function adminDb(context: AdminCtx) {
  return privilegedAdminDb(context);
}

/** Keys whose values must never reach the audit log. */
const SENSITIVE_KEY = /(api[-_]?key|secret|token|password|passwd|credential|authorization|bearer|qr|activation_code|matching_id|smdp|iccid|cvv|card)/i;

/**
 * Removes secret-bearing fields before an audit payload is stored.
 * Applied recursively; long opaque values are dropped rather than truncated.
 */
export function redactSensitive(value: unknown, depth = 0): unknown {
  if (value == null || depth > 6) return value ?? null;
  if (Array.isArray(value)) return value.slice(0, 50).map((entry) => redactSensitive(entry, depth + 1));
  if (typeof value !== "object") return value;
  const output: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEY.test(key)) {
      output[key] = "[redacted]";
      continue;
    }
    output[key] = redactSensitive(entry, depth + 1);
  }
  return output;
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
    _before: redactSensitive(before) ?? null,
    _after: redactSensitive(after) ?? null,
  });
  if (error) throw new Error(error.message);
}
