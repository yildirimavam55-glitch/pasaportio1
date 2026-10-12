import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ESIM_ACCESS_CONFIRM, getEsimAccessCleanupSummary, purgeEsimAccessData } from "@/lib/esim-access-cleanup.functions";

/** Confirmed removal of cancelled eSIM Access data. eSIM Go and customer data stay untouched. */
export function EsimAccessCleanupPanel() {
  const client = useQueryClient();
  const q = useQuery({ queryKey: ["esim-access-cleanup"], queryFn: () => getEsimAccessCleanupSummary() });
  const [text, setText] = useState("");
  const purge = useMutation({
    mutationFn: () => purgeEsimAccessData({ data: { confirm: text } }),
    onSuccess: () => {
      toast.success("eSIM Access verileri silindi.");
      setText("");
      void client.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const s = q.data;
  if (!s || (!s.exists && !s.secretsPresent)) return null;
  const blocked = s.exists && (s.published > 0 || s.orderItems > 0 || s.units > 0);

  return (
    <section className="rounded-card border border-destructive/40 bg-card p-5 shadow-card">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold"><Trash2 className="size-4" /> eSIM Access verilerini kaldır</h2>
      <p className="mt-1 text-sm text-muted-foreground">eSIM Go ürünleri, siparişler ve müşteri verileri etkilenmez. Yayında ürün veya bağlı sipariş varsa işlem durur.</p>
      {s.exists ? (
        <ul className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
          <li>Taslak ürün: <b>{s.products}</b></li>
          <li>Ham kayıt: <b>{s.raw}</b></li>
          <li>Fiyat geçmişi: <b>{s.prices}</b></li>
          <li>Eşleştirme: <b>{s.mappings}</b></li>
          <li>Katalog değişikliği: <b>{s.changes}</b></li>
          <li>Senkron kaydı: <b>{s.runs}</b></li>
          <li>Bağlantı kaydı: <b>{s.connections}</b></li>
          <li>Yayında / sipariş: <b>{s.published} / {s.orderItems + s.units}</b></li>
        </ul>
      ) : <p className="mt-3 text-sm">Veritabanında eSIM Access kaydı kalmadı.</p>}
      {s.secretsPresent && (
        <p className="mt-2 text-xs text-muted-foreground">Kayıtlı giriş bilgileri (2 adet) uygulama içinden silinemez; asistandan silmesini isteyin.</p>
      )}
      {s.exists && !blocked && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Input className="max-w-xs" value={text} onChange={(e) => setText(e.target.value)} placeholder={`Onay için yazın: ${ESIM_ACCESS_CONFIRM}`} aria-label="Onay metni" />
          <Button variant="destructive" disabled={text !== ESIM_ACCESS_CONFIRM || purge.isPending} onClick={() => purge.mutate()}>
            {purge.isPending ? "Siliniyor…" : "Kalıcı olarak sil"}
          </Button>
        </div>
      )}
    </section>
  );
}
