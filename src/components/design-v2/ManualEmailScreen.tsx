import { ArrowLeft, Check, Copy, Mail, MoreHorizontal, Settings } from 'lucide-react';
import { useI18n } from '@/i18n';
import type { EducationScene } from './educational-installation';
import { TapIndicator } from './InstallationExperience';
import { MANUAL_DEMO } from './manual-phone-content';
import { MANUAL_EMAIL_COPY } from './manual-email-content';

export function ManualEmailScreen({ scene, android }: { scene: EducationScene; android: boolean }) {
 const { locale } = useI18n(); const t = MANUAL_EMAIL_COPY[locale];
 const target = scene.includes('lpa') ? 'lpa' : scene.includes('code') || scene === 'email-return' ? 'code' : 'address';
 const copying = scene.startsWith('email-copy-'); const copied = scene.startsWith('email-copied-');
 if (scene === 'switch-settings') return <div className="os-switch"><div className="os-switch-app"><Mail/><span>{t.mail}</span></div><ArrowLeft/><div className="os-switch-app os-row-target"><Settings/><span>{t.settings}</span><TapIndicator className="end-2 bottom-2"/></div><p>{t.demo}</p></div>;
 if (scene === 'email-inbox') return <div className="os-mail"><header className="os-mail-nav"><h3>{t.inbox}</h3><MoreHorizontal/></header><div className="os-mail-search">{t.mail}</div><div className="os-mail-message"><span className="os-mail-avatar">P</span><div><strong>Pasaport.io</strong><b>{t.subject}</b><small>{t.package}</small></div><TapIndicator className="end-3 bottom-1"/></div><p className="os-demo">{t.demo}</p></div>;
 const fields = android ? [{ key:'lpa', label:t.copyLpa, value:MANUAL_DEMO.lpa }] : [{ key:'address', label:t.copyAddress, value:MANUAL_DEMO.address }, { key:'code', label:t.copyCode, value:MANUAL_DEMO.code }];
 return <div className="os-mail"><header className="os-mail-nav"><ArrowLeft/><span>{t.inbox}</span><MoreHorizontal/></header><div className="os-mail-header"><h3>{t.subject}</h3><div><span className="os-mail-avatar">P</span><p><strong>Pasaport.io</strong><small>{t.to} · 09:41</small></p></div></div><div className="os-mail-body"><strong className="os-mail-brand">Pasaport.io</strong><p>{t.package}</p><span className="os-mail-link">{t.qr}</span><h4>{t.manual}</h4>{fields.map(field => <div key={field.key} className={`os-mail-credential ${(copying || copied) && target === field.key ? 'os-mail-selected' : ''}`}><code dir="ltr">{field.value}</code><div className="os-mail-copy">{copied && target === field.key ? <Check/> : <Copy/>}<span>{copied && target === field.key ? t.copied : field.label}</span>{copying && target === field.key && <TapIndicator className="end-1 bottom-0"/>}</div></div>)}{copied && <div className="os-copy-confirmation"><Check/>{t.copied}</div>}<p className="os-mail-disclaimer">{t.demo}</p></div></div>;
}