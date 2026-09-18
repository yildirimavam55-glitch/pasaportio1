import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ICON_LIBRARY, StorefrontIcon } from "@/domain/storefront/icons";

/** Visual icon picker over the single approved icon family. */
export function IconPicker({ value, onChange, label = "Simge" }: { value: string; onChange: (name: string) => void; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="text-xs font-semibold">
      <span className="block">{label}</span>
      <button type="button" onClick={() => setOpen((current) => !current)} className="mt-1 flex w-full items-center gap-2 rounded-md border border-border bg-background p-2 text-left">
        <span className="grid size-9 place-items-center rounded-md bg-primary-soft text-primary"><StorefrontIcon name={value} className="size-4" /></span>
        <span className="flex-1 truncate font-normal text-muted-foreground">{open ? "Kapat" : "Simge seç"}</span>
      </button>
      {open && (
        <div className="mt-2 max-h-64 overflow-y-auto rounded-md border border-border bg-card p-2">
          {Object.entries(ICON_LIBRARY).map(([group, names]) => (
            <div key={group} className="mb-3 last:mb-0">
              <p className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">{group}</p>
              <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8">
                {names.map((name) => (
                  <button
                    key={name}
                    type="button"
                    title={name}
                    onClick={() => { onChange(name); setOpen(false); }}
                    className={`grid size-9 place-items-center rounded-md border ${value === name ? "border-primary bg-primary-soft text-primary" : "border-border bg-background"}`}
                  >
                    <StorefrontIcon name={name} className="size-4" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
