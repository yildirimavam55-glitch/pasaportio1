import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Mail, ShieldCheck, UserPlus, X } from "lucide-react";
import { AdminGate } from "@/components/AdminGate";
import { AdminError, AdminLoading, AdminPanel, EmptyState, Field, StatusBadge } from "@/components/admin/AdminUi";
import { adminHead } from "@/components/admin/AdminSectionPage";
import { Button } from "@/components/ui/button";
import {
  cancelAdminInvite, inviteAdminUser, listAdminAccess, resendAdminInvite, revokeAdminUser,
} from "@/lib/admin-users.functions";

export const Route = createFileRoute("/_authenticated/admin/settings/users")({
  head: () => adminHead("Admin Kullanıcıları", "Yönetici erişimini güvenli şekilde yönetin."),
  component: AdminUsersPage,
});

function fmt(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString("tr-TR") : "—";
}

function AdminUsersPage() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["admin-access"], queryFn: () => listAdminAccess() });
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [confirmRevoke, setConfirmRevoke] = useState<{ userId: string; email: string | null } | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-access"] });
  const fail = (error: unknown) => toast.error(error instanceof Error ? error.message : "İşlem tamamlanamadı.");

  const invite = useMutation({
    mutationFn: () => inviteAdminUser({ data: { email, note } }),
    onSuccess: async (result) => {
      setEmail(""); setNote("");
      toast.success(
        result.result === "GRANTED" ? "Mevcut kullanıcıya yönetici yetkisi verildi."
          : result.result === "ALREADY_ADMIN" ? "Bu kullanıcı zaten yönetici."
            : "Davet oluşturuldu. E-posta gönderimi henüz yapılandırılmadığı için davet BEKLEMEDE.",
      );
      await refresh();
    },
    onError: fail,
  });
  const cancel = useMutation({ mutationFn: (id: string) => cancelAdminInvite({ data: { id } }), onSuccess: async () => { toast.success("Davet iptal edildi."); await refresh(); }, onError: fail });
  const resend = useMutation({ mutationFn: (id: string) => resendAdminInvite({ data: { id } }), onSuccess: async () => { toast.success("Davet yenilendi. Gönderim yapılandırılana kadar BEKLEMEDE kalır."); await refresh(); }, onError: fail });
  const revoke = useMutation({
    mutationFn: (userId: string) => revokeAdminUser({ data: { userId } }),
    onSuccess: async () => { setConfirmRevoke(null); toast.success("Yönetici yetkisi kaldırıldı."); await refresh(); },
    onError: (error) => { setConfirmRevoke(null); fail(error); },
  });

  const data = query.data;
  const onlyOneAdmin = (data?.admins.length ?? 0) <= 1;

  return (
    <AdminGate title="Admin Kullanıcıları">
      <div className="grid gap-4">
        {query.isPending ? <AdminLoading /> : query.error ? <AdminError error={query.error} /> : data && (
          <>
            <AdminPanel title="Yeni admin ekle">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
                <Field label="E-posta">
                  <input type="email" inputMode="email" autoComplete="off" className="admin-field mt-1 w-full" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ornek@sirket.com" />
                </Field>
                <Field label="İsim / not (opsiyonel)">
                  <input className="admin-field mt-1 w-full" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Operasyon ekibi" />
                </Field>
                <Button className="w-full sm:w-auto" disabled={invite.isPending || !email.trim()} onClick={() => invite.mutate()}><UserPlus />Davet gönder</Button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Kayıtlı bir hesaba ait e-posta girilirse yetki hemen atanır. Hesabı olmayan e-postalar için güvenli bir bekleyen davet oluşturulur; davet yalnızca doğrulanmış ve davet edilen hesap giriş yaptığında aktifleşir.</p>
            </AdminPanel>

            <AdminPanel title="Aktif yöneticiler">
              {!data.admins.length ? <EmptyState title="Kayıtlı yönetici yok." /> : (
                <div className="grid gap-2">
                  {data.admins.map((row) => (
                    <article key={row.userId} className="grid gap-2 rounded-md border border-border p-3 text-xs sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{row.name ?? row.email ?? "Yönetici"}</p>
                        <p className="truncate text-muted-foreground">{row.email ?? "—"}</p>
                        <p className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                          <StatusBadge value={row.status} /><span>Admin</span>
                          <span>Eklendi: {fmt(row.addedAt)}</span>
                          <span>Son etkinlik: {fmt(row.lastActivityAt)}</span>
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button variant="outline" size="sm" disabled={onlyOneAdmin || revoke.isPending} onClick={() => setConfirmRevoke({ userId: row.userId, email: row.email })}>Yetkiyi kaldır</Button>
                      </div>
                    </article>
                  ))}
                  {onlyOneAdmin && <p className="text-[11px] font-semibold text-warning">En az bir aktif yönetici hesabı bulunmalıdır.</p>}
                </div>
              )}
            </AdminPanel>

            <AdminPanel title="Bekleyen davetler">
              {!data.pending.length ? <EmptyState title="Bekleyen davet yok." /> : (
                <div className="grid gap-2">
                  {data.pending.map((row) => (
                    <article key={row.id} className="grid gap-2 rounded-md border border-border p-3 text-xs sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{row.email}</p>
                        {row.name && <p className="truncate text-muted-foreground">{row.name}</p>}
                        <p className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                          <StatusBadge value="PENDING" /><span>Oluşturuldu: {fmt(row.addedAt)}</span><span>Geçerlilik: {fmt(row.expiresAt)}</span>
                          {row.delivery === "NOT_SENT" && <span className="font-semibold text-warning"><Mail className="mr-1 inline size-3" />E-posta gönderimi yapılandırılmadı</span>}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <Button variant="outline" size="sm" disabled={resend.isPending} onClick={() => resend.mutate(row.id)}>Daveti tekrar gönder</Button>
                        <Button variant="outline" size="sm" disabled={cancel.isPending} onClick={() => cancel.mutate(row.id)}><X />Daveti iptal et</Button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </AdminPanel>

            <p className="flex items-start gap-2 rounded-md border border-border bg-secondary/40 p-3 text-[11px] text-muted-foreground"><ShieldCheck className="mt-0.5 size-3.5 shrink-0" />Tüm yetki değişiklikleri sunucu tarafında doğrulanır ve denetim kaydına yazılır. Davet anahtarları hiçbir ekranda veya kayıtta gösterilmez.</p>
          </>
        )}
      </div>

      {confirmRevoke && (
        <div className="fixed inset-0 z-[70] grid place-items-center p-4">
          <button type="button" aria-label="Kapat" className="absolute inset-0 bg-primary/45 backdrop-blur-sm" onClick={() => setConfirmRevoke(null)} />
          <div role="dialog" aria-modal="true" className="relative w-full max-w-sm rounded-lg border border-border bg-card p-5 shadow-panel">
            <h2 className="font-display text-lg font-bold">Yetkiyi kaldır</h2>
            <p className="mt-2 text-sm text-muted-foreground">{confirmRevoke.email ?? "Bu hesap"} için yönetici yetkisi kaldırılacak. Bu işlem denetim kaydına yazılır.</p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmRevoke(null)}>Vazgeç</Button>
              <Button variant="destructive" disabled={revoke.isPending} onClick={() => revoke.mutate(confirmRevoke.userId)}>Yetkiyi kaldır</Button>
            </div>
          </div>
        </div>
      )}
    </AdminGate>
  );
}
