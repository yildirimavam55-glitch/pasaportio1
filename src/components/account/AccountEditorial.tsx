import { itemText,type StorefrontConfig } from '@/domain/storefront/registry';
import type { UiLocale } from '@/i18n/locales';
/** No identifiers, QR, credentials, role switches or ordering of business modules accepted. */
export function AccountEditorial({config,locale}:{config:StorefrontConfig;locale:UiLocale}){
 const note=config.accountPresentation;if(!note?.visible)return null;
 return <aside data-account-editorial className="rounded-2xl border border-border bg-card p-4"><h2 className="font-bold">{itemText(note.title,locale)}</h2><p>{itemText(note.text,locale)}</p></aside>;
}
