import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, LoaderCircle, Plus, Save, Search } from "lucide-react";
import { AdminGate } from "@/components/AdminGate";
import { Button } from "@/components/ui/button";
import { listAllDeviceCompatibility, saveDeviceCompatibility } from "@/lib/device-compatibility.functions";
import {
  COMPATIBILITY_STATUSES,
  DEVICE_BRANDS,
  searchDevices,
  type CompatibilityStatus,
  type DeviceRecord,
} from "@/domain/esim/device-compatibility";

export const Route = createFileRoute("/_authenticated/admin/esim/devices")({ component: DeviceCompatibilityAdmin });

const STATUS_LABELS: Record<CompatibilityStatus, string> = {
  COMPATIBLE: "Uyumlu",
  UNCERTAIN: "Belirsiz",
  NOT_COMPATIBLE: "Uyumsuz",
};

type Draft = {
  id?: string;
  brand: string;
  family: string;
  model: string;
  aliases: string;
  status: CompatibilityStatus;
  notes: string;
  regionVariantWarning: boolean;
  active: boolean;
};

const EMPTY_DRAFT: Draft = {
  brand: "Apple", family: "", model: "", aliases: "", status: "UNCERTAIN", notes: "", regionVariantWarning: false, active: true,
};

function toDraft(device: DeviceRecord): Draft {
  return {
    id: device.id,
    brand: device.brand,
    family: device.family ?? "",
    model: device.model,
    aliases: device.aliases.join(", "),
    status: device.status,
    notes: device.notes ?? "",
    regionVariantWarning: device.regionVariantWarning,
    active: device.active,
  };
}

function DeviceCompatibilityAdmin() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [saved, setSaved] = useState(false);

  const { data: devices = [], isPending } = useQuery({
    queryKey: ["admin-device-compatibility"],
    queryFn: () => listAllDeviceCompatibility(),
  });

  const filtered = useMemo(() => searchDevices(devices, query).slice(0, 60), [devices, query]);

  const mutation = useMutation({
    mutationFn: () =>
      saveDeviceCompatibility({
        data: {
          id: draft.id,
          brand: draft.brand,
          family: draft.family,
          model: draft.model,
          aliases: draft.aliases.split(",").map((alias) => alias.trim()).filter(Boolean),
          status: draft.status,
          notes: draft.notes,
          regionVariantWarning: draft.regionVariantWarning,
          active: draft.active,
        },
      }),
    onSuccess: async () => {
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
      await queryClient.invalidateQueries({ queryKey: ["admin-device-compatibility"] });
      await queryClient.invalidateQueries({ queryKey: ["device-compatibility"] });
    },
  });

  return (
    <AdminGate title="eSIM · Cihaz uyumluluğu">
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <section className="rounded-card border border-border bg-card p-4">
          <label className="flex min-h-12 items-center gap-2 rounded-xl border border-border bg-secondary/60 px-3">
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Marka, model veya takma ad ara"
              aria-label="Cihaz ara"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </label>
          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">{devices.length} kayıt · liste küratörlü veri setinden toplu güncellenebilir.</span>
            <Button size="sm" variant="outline" onClick={() => setDraft(EMPTY_DRAFT)}><Plus />Yeni cihaz</Button>
          </div>

          {isPending ? (
            <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />Yükleniyor…</p>
          ) : (
            <ul className="mt-3 space-y-1.5">
              {filtered.map((device) => (
                <li key={device.id}>
                  <button
                    type="button"
                    onClick={() => setDraft(toDraft(device))}
                    className="flex w-full flex-wrap items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-left text-sm hover:border-primary/60"
                  >
                    <strong className="min-w-0 flex-1 truncate">{device.brand} · {device.model}</strong>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold">{STATUS_LABELS[device.status]}</span>
                    {!device.active && <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">Pasif</span>}
                  </button>
                </li>
              ))}
              {!filtered.length && <li className="py-6 text-sm text-muted-foreground">Kayıt bulunamadı.</li>}
            </ul>
          )}
        </section>

        <section className="rounded-card border border-border bg-card p-4">
          <h2 className="font-display text-lg font-bold">{draft.id ? "Cihazı düzenle" : "Yeni cihaz"}</h2>
          <div className="mt-3 space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold">Marka</span>
              <select
                value={draft.brand}
                onChange={(event) => setDraft({ ...draft, brand: event.target.value })}
                className="min-h-12 w-full rounded-xl border border-border bg-card px-3 text-sm"
              >
                {DEVICE_BRANDS.map((brand) => <option key={brand} value={brand}>{brand}</option>)}
              </select>
            </label>
            <TextField label="Seri (opsiyonel)" value={draft.family} onChange={(family) => setDraft({ ...draft, family })} />
            <TextField label="Model" value={draft.model} onChange={(model) => setDraft({ ...draft, model })} />
            <TextField label="Takma adlar (virgülle)" value={draft.aliases} onChange={(aliases) => setDraft({ ...draft, aliases })} />
            <label className="block">
              <span className="mb-1 block text-sm font-semibold">Durum</span>
              <select
                value={draft.status}
                onChange={(event) => setDraft({ ...draft, status: event.target.value as CompatibilityStatus })}
                className="min-h-12 w-full rounded-xl border border-border bg-card px-3 text-sm"
              >
                {COMPATIBILITY_STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
              </select>
            </label>
            <TextField label="Not (opsiyonel)" value={draft.notes} onChange={(notes) => setDraft({ ...draft, notes })} />
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={draft.regionVariantWarning} onChange={(event) => setDraft({ ...draft, regionVariantWarning: event.target.checked })} />
              Bölgesel varyant uyarısı göster
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} />
              Kayıt aktif
            </label>
          </div>

          <Button className="mt-4 w-full" disabled={!draft.model.trim() || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? <LoaderCircle className="animate-spin" /> : <Save />}Kaydet
          </Button>
          {saved && <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-primary"><CheckCircle2 className="size-4" />Kaydedildi.</p>}
          {mutation.error && <p className="mt-2 text-sm text-destructive">{(mutation.error as Error).message}</p>}
        </section>
      </div>
    </AdminGate>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none"
      />
    </label>
  );
}
