import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { EsimInstallGuide } from './EsimInstallGuide';
import { ACCOUNT_COPY } from './copy';
import { ACCOUNT_DEMO_COPY } from './demo-copy';
import type { Locale } from '@/domain/enums';

/** Shared account-only panel. The caller owns authenticated reads; demos pass no credentials. */
export function EsimInstallSheet({ open, onOpenChange, title, locale, esimId, qrPayload, installInfo, activationPolicy, expired, loading, demo = false }: {
  open: boolean; onOpenChange: (open: boolean) => void; title: string; locale: Locale;
  esimId: string; qrPayload: string | null; installInfo: unknown; activationPolicy?: string | null | undefined;
  expired?: boolean; loading?: boolean; demo?: boolean;
}) {
  return <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="bottom" className="account-install-sheet" overlayClassName="bg-foreground/40 motion-reduce:animate-none" onCloseAutoFocus={event => {
      event.preventDefault();
      document.querySelector<HTMLElement>('[data-install-trigger="' + esimId + '"]')?.focus({ preventScroll: true });
    }}>
      <SheetHeader className="pr-10 text-left">
        <SheetTitle>{ACCOUNT_COPY[locale].guide.title}</SheetTitle>
        <SheetDescription>{demo ? 'DEMO · ' : ''}{title}</SheetDescription>
      </SheetHeader>
      <div className="mt-5">
        {demo && <p className="mb-4 text-xs text-muted-foreground">{ACCOUNT_DEMO_COPY[locale].disclaimer}</p>}
        {loading ? <div className="mx-auto size-48 animate-pulse rounded-xl bg-secondary" aria-busy="true" /> :
          <EsimInstallGuide locale={locale} esimId={esimId} qrPayload={demo ? null : qrPayload} installInfo={demo ? null : installInfo} activationPolicy={demo ? null : activationPolicy ?? null} expired={expired ?? false} demo={demo} />}
      </div>
    </SheetContent>
  </Sheet>;
}