import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEFAULT_IMAGE_DISPLAY, type ImageDisplay } from "@/domain/storefront/image-display";

export function ImageDisplayControls({ value, onChange, defaults = DEFAULT_IMAGE_DISPLAY, title = "Görsel ayarları" }: {
  value: ImageDisplay | undefined;
  onChange: (value: ImageDisplay) => void;
  defaults?: ImageDisplay;
  title?: string;
}) {
  const current = value ?? defaults;
  const slider = (label: string, key: "zoom" | "x" | "y", min: number, max: number, left: string, right: string) => (
    <label className="block space-y-1 text-xs font-medium text-foreground">
      <span className="flex justify-between"><span>{label}</span><span>{current[key]}%</span></span>
      <input type="range" min={min} max={max} value={current[key]} onChange={(event) => onChange({ ...current, [key]: Number(event.target.value) })} className="w-full accent-primary" aria-label={label} />
      <span className="flex justify-between text-[10px] text-muted-foreground"><span>{left}</span><span>{right}</span></span>
    </label>
  );
  return (
    <div className="space-y-3 rounded-md border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <strong className="text-xs">{title}</strong>
        <Button type="button" size="sm" variant="ghost" onClick={() => onChange({ ...defaults })}><RotateCcw className="size-3.5" /> Sıfırla</Button>
      </div>
      {slider("Ölçek / Zoom", "zoom", 100, 180, "100%", "180%")}
      {slider("Yatay konum", "x", 0, 100, "Sol", "Sağ")}
      {slider("Dikey konum", "y", 0, 100, "Üst", "Alt")}
      <label className="block text-xs font-medium">Görsel uyumu
        <select value={current.fit} onChange={(event) => onChange({ ...current, fit: event.target.value as ImageDisplay["fit"] })} className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm">
          <option value="cover">Kapla (Cover)</option><option value="contain">Sığdır (Contain)</option>
        </select>
      </label>
    </div>
  );
}