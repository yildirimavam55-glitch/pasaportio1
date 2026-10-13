import { useState } from 'react';
import { createAccountDemo } from '@/domain/esim/account-demo';
import { useI18n } from '@/i18n';
import { ACCOUNT_DEMO_COPY } from './demo-copy';
import { CustomerEsimCard } from './CustomerEsimCard';
import { EsimCarousel } from './EsimCarousel';
import { demoEsimRecord } from './demo-presentation';

export function DemoEsimPackages() {
  const { locale } = useI18n();
  const [packages] = useState(() => createAccountDemo(new Date()));
  return <div data-account-demo>
    <p className="mb-3 text-xs text-muted-foreground">{ACCOUNT_DEMO_COPY[locale].disclaimer}</p>
    <EsimCarousel label={ACCOUNT_DEMO_COPY[locale].title}>
      {packages.map(d => <CustomerEsimCard key={d.id} esim={demoEsimRecord(d)} locale={locale} demo />)}
    </EsimCarousel>
  </div>;
}
