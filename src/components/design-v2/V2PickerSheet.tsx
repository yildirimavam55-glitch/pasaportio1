import { Check, Search } from "lucide-react";
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export type V2PickerItem = {
  id: string;
  label: string;
  detail?: string;
  price?: string;
  leading?: ReactNode;
};

export function V2PickerSheet({
  open,
  onOpenChange,
  title,
  searchLabel,
  query,
  onQueryChange,
  items,
  selectedId,
  onSelect,
  emptyLabel,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  searchLabel: string;
  query: string;
  onQueryChange: (value: string) => void;
  items: V2PickerItem[];
  selectedId?: string;
  onSelect: (id: string) => void;
  emptyLabel: string;
  children: ReactNode;
}) {
  const previousScroll = useRef<{ x: number; y: number } | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [inputFocused, setInputFocused] = useState(false);
  const [visibleViewport, setVisibleViewport] = useState<{ top: number; height: number } | null>(null);

  // The sticky search opens the controlled sheet directly (not via its
  // trigger), so capture that path too before the dialog's focus effects.
  useLayoutEffect(() => {
    if (open && !previousScroll.current) previousScroll.current = { x: window.scrollX, y: window.scrollY };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) {
      setInputFocused(false);
      setVisibleViewport(null);
      return;
    }

    const viewport = window.visualViewport;
    const update = () => {
      const next = {
        top: Math.max(0, Math.round(viewport?.offsetTop ?? 0)),
        height: Math.max(0, Math.round(viewport?.height ?? window.innerHeight)),
      };
      setVisibleViewport((current) => current?.top === next.top && current?.height === next.height ? current : next);
    };
    update();
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) previousScroll.current = { x: window.scrollX, y: window.scrollY };
    onOpenChange(nextOpen);
  };

  const keyboardOpen = inputFocused && window.innerWidth < 640;
  const keyboardStyle: CSSProperties | undefined = keyboardOpen && visibleViewport
    ? { top: visibleViewport.top, bottom: "auto", height: visibleViewport.height, maxHeight: visibleViewport.height }
    : undefined;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent
        data-v2-picker-sheet
        side="bottom"
        style={keyboardStyle}
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => {
          // The trigger may be far above the sticky search. Radix focusing it
          // after close scrolls the storefront back to the hero.
          event.preventDefault();
          const position = previousScroll.current;
          if (position) window.scrollTo(position.x, position.y);
          previousScroll.current = null;
        }}
        className={`w-full max-h-[88dvh] rounded-t-3xl border-border bg-background pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 sm:left-1/2 sm:max-w-xl sm:-translate-x-1/2 sm:rounded-3xl sm:border ${keyboardOpen ? "flex flex-col overflow-hidden !max-h-none" : ""}`}
      >
        <div className={`mx-auto h-1 w-10 rounded-full bg-border sm:hidden ${keyboardOpen ? "mb-2" : "mb-3"}`} />
        <SheetTitle className="pr-12 font-display text-xl font-bold">{title}</SheetTitle>
        <label className={`${keyboardOpen ? "mt-2" : "mt-4"} flex h-12 shrink-0 items-center gap-3 rounded-full border border-border bg-card px-4 focus-within:ring-2 focus-within:ring-ring`}>
          <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            placeholder={searchLabel}
            aria-label={searchLabel}
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>
        <div className={`${keyboardOpen ? "mt-2 min-h-28 max-h-none flex-1" : "mt-3 max-h-[calc(88dvh-9.5rem)]"} overflow-y-auto overscroll-contain rounded-2xl border border-border bg-card`}>
          {items.length ? (
            <ul className="divide-y divide-border">
              {items.map((item) => {
                const selected = item.id === selectedId;
                return (
                  <li key={item.id}>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => onSelect(item.id)}
                      className="grid h-auto min-h-14 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-none px-3 py-2 text-left"
                    >
                      {item.leading && <span className="shrink-0">{item.leading}</span>}
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-foreground">{item.label}</span>
                        {item.detail && <span className="block truncate text-xs font-normal text-muted-foreground">{item.detail}</span>}
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        {item.price && <span className="text-xs font-bold text-primary">{item.price}</span>}
                        {selected && <Check className="size-4 text-primary" aria-label="Selected" />}
                      </span>
                    </Button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">{emptyLabel}</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}