import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { AdminError, AdminLoading, AdminPanel, AdminTable, EmptyState, Field, StatusBadge } from "@/components/admin/AdminUi";
import { Button } from "@/components/ui/button";
import {
  listProvisioningUnits,
  reconcileProvisioningUnit,
  retryProvisioningUnit,
  type ProvisioningUnitView,
} from "@/lib/commerce.functions";

const STATUSES = [
  { value: "ALL", label: "Tümü" },
  { value: "PENDING", label: "Bekleyen" },
  { value: "IN_PROGRESS", label: "İşlemde" },
  { value: "PROVISIONED", label: "Sağlandı" },
  { value: "FAILED", label: "Başarısız" },
  { value: "RESULT_UNKNOWN", label: "Sonuç bilinmiyor" },
];

const OUTCOME_LABEL: Record<string, string> = {
  PROVISIONED: "eSIM oluşturuldu.",
  ALREADY_PROVISIONED: "Bu birim zaten sağlanmış.",
  BUSY: "Başka bir işlem sürüyor.",
  NOT_PAID: "Sipariş ödenmedi — sağlama yapılmaz.",
  NEEDS_RECONCILIATION: "Tedarikçi sonucu bilinmiyor — önce mutabakat gerekiyor.",
  DISABLED: "Canlı tedarikçi siparişi kapalı (güvenlik anahtarı).",
  FAILED: "Sağlama başarısız.",
  NO_SUPPLIER_ORDER: "Tedarikçide sipariş yok — yeniden denenebilir.",
  STILL_UNKNOWN: "Tedarikçi durumu hâlâ belirsiz.",
  UNSUPPORTED: "Tedarikçi mutabakatı desteklemiyor.",
  NOT_FOUND: "Kayıt bulunamadı.",
};

/** Admin fulfillment controls for provisioning units. Shows no activation secret. */
export function ProvisioningPanel() {
  const [status, setStatus] = useState("ALL");
  const queryClient = useQueryClient();
  const units = useQuery({
    queryKey: ["admin-provisioning-units", status],
    queryFn: () => listProvisioningUnits({ data: { status } }),
  });

  const report = (result: { outcome?: { result: string }; reason?: string }) => {
    const key = result.outcome?.result ?? result.reason ?? "FAILED";
    toast.message(OUTCOME_LABEL[key] ?? key);
    void queryClient.invalidateQueries({ queryKey: ["admin-provisioning-units"] });
  };

  const retry = useMutation({
    mutationFn: (unitId: string) => retryProvisioningUnit({ data: { unitId } }),
    onSuccess: report,
    onError: (error: Error) => toast.error(error.message),
  });
  const reconcile = useMutation({
    mutationFn: (unitId: string) => reconcileProvisioningUnit({ data: { unitId } }),
    onSuccess: report,
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <AdminPanel title="Sağlama birimleri">
      <Field label="Durum">
        <select className="admin-field mt-1 w-full sm:w-64" value={status} onChange={(event) => setStatus(event.target.value)}>
          {STATUSES.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </Field>

      {units.isPending ? <AdminLoading /> : units.error ? <AdminError error={units.error} /> : !units.data?.length ? (
        <EmptyState title="Sağlama birimi yok." />
      ) : (
        <>
          <div className="mt-3 grid gap-2 lg:hidden">
            {units.data.map((unit: ProvisioningUnitView) => (
              <div key={unit.id} className="rounded-md border border-border p-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <strong>{unit.orderNumber ?? "—"} · #{unit.unitIndex}</strong>
                  <StatusBadge value={unit.status} />
                </div>
                <p className="mt-1 text-muted-foreground">{unit.productName ?? "—"}</p>
                <p className="mt-1 text-muted-foreground">Deneme: {unit.attemptCount} · Ref: {unit.providerReference ?? "—"}</p>
                {unit.errorCategory && <p className="mt-1 text-destructive">{unit.errorCategory}</p>}
                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant="outline" disabled={!unit.retryEligible || retry.isPending} onClick={() => retry.mutate(unit.id)}>Yeniden dene</Button>
                  <Button size="sm" variant="outline" disabled={!unit.needsReconciliation || reconcile.isPending} onClick={() => reconcile.mutate(unit.id)}>Mutabakat</Button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 hidden lg:block">
            <AdminTable head={["Sipariş", "Birim", "Ürün", "Provider", "Durum", "Referans", "Deneme", "Son deneme", "Hata", ""]}>
              {units.data.map((unit: ProvisioningUnitView) => (
                <tr key={unit.id}>
                  <td className="font-semibold">{unit.orderNumber ?? "—"}</td>
                  <td>#{unit.unitIndex}</td>
                  <td>{unit.productName ?? "—"}</td>
                  <td>{unit.providerCode ?? "—"}</td>
                  <td><StatusBadge value={unit.status} /></td>
                  <td className="font-mono text-[11px]">{unit.providerReference ?? "—"}</td>
                  <td>{unit.attemptCount}</td>
                  <td>{unit.lastAttemptAt ? new Date(unit.lastAttemptAt).toLocaleString("tr-TR") : "—"}</td>
                  <td>{unit.errorCategory ?? "—"}</td>
                  <td className="whitespace-nowrap">
                    <Button size="sm" variant="outline" disabled={!unit.retryEligible || retry.isPending} onClick={() => retry.mutate(unit.id)}>Yeniden dene</Button>
                    <Button size="sm" variant="outline" className="ml-2" disabled={!unit.needsReconciliation || reconcile.isPending} onClick={() => reconcile.mutate(unit.id)}>Mutabakat</Button>
                  </td>
                </tr>
              ))}
            </AdminTable>
          </div>
        </>
      )}
      <p className="mt-3 text-[10px] text-muted-foreground">
        Güvenlik: QR aktivasyon içeriği, ICCID ve API anahtarları bu ekranda gösterilmez. Sonucu belirsiz birimler yeniden satın alınmaz; önce tedarikçiyle mutabakat yapılır.
      </p>
    </AdminPanel>
  );
}
