import type { V2SectionDesign } from "@/domain/storefront/v2";

/** Presentation-only controls shared by the existing Admin and the disconnected acceptance demo. */
export function V2TypographyControls({ design, onChange }: { design: V2SectionDesign; onChange: (design: V2SectionDesign) => void }) {
  const set = (patch: Partial<V2SectionDesign>) => onChange({ ...design, ...patch });
  return <fieldset className="mt-3 grid gap-3 rounded-md border border-border p-3 sm:grid-cols-2">
    <legend className="text-xs font-bold">Hero / Bilgi kutusu · Yazı ve renk</legend>
    <label className="text-xs">Yazı ailesi<select aria-label="Yazı ailesi" className="admin-field mt-1 w-full" value={design.font} onChange={event => set({ font: event.target.value as V2SectionDesign["font"] })}>
      <option value="theme">Tema varsayılanı</option><option value="heading">Başlık yazı tipi</option><option value="body">Gövde yazı tipi</option>
    </select></label>
    {(["headingColor", "bodyColor", "accentColor"] as const).map((key, index) => <label key={key} className="text-xs">{["Başlık rengi", "Metin rengi", "Vurgu rengi"][index]}
      <span className="flex gap-2"><input aria-label={key} type="color" className="mt-1 h-8 w-16" value={design[key] ?? (key === "accentColor" ? "#00d9ad" : "#ffffff")} onChange={event => set({ [key]: event.target.value })} />
      <button type="button" className="text-xs underline" onClick={() => set({ [key]: undefined })}>Varsayılan</button></span>
    </label>)}
    {(["mobile", "tablet", "desktop"] as const).map(device => <div key={device} className="space-y-2"><strong className="text-xs">{device}</strong>
      {(["headingSize", "bodySize"] as const).map(key => <label key={key} className="block text-xs">{key === "headingSize" ? "Başlık px" : "Metin px"}
        <input aria-label={`${device}-${key}`} type="number" min={key === "headingSize" ? 18 : 11} max={key === "headingSize" ? 80 : 28} className="admin-field mt-1 w-full" value={design[device]?.[key] ?? ""} placeholder="Varsayılan" onChange={event => set({ [device]: { ...design[device], [key]: event.target.value ? Number(event.target.value) : undefined } })} />
      </label>)}
    </div>)}
  </fieldset>;
}
