import { sanitizeStorefront,type StorefrontConfig,type NavigationLink } from '@/domain/storefront/registry';
import { sourceEdit,manualEdit } from '@/domain/storefront/translation-workflow';
import { UI_LOCALES,type UiLocale } from '@/i18n/locales';
import { StorefrontIcon,ICON_NAMES } from '@/domain/storefront/icons';
export function ChromeControls({value,onChange}:{value:StorefrontConfig;onChange:(value:StorefrontConfig)=>void}){
 const set=(patch:Partial<StorefrontConfig>)=>onChange(sanitizeStorefront({...value,...patch},'global'));
 const links=(key:'navigation'|'footerLinks')=><fieldset key={key}><legend>{key==='navigation'?'Masaüstü + mobil menü':'Footer'}</legend>
 {value[key].map((row,index)=>{const change=(patch:Partial<NavigationLink>)=>set({[key]:value[key].map(r=>r.id===row.id?{...r,...patch}:r)});const locked=row.group==='legal';return <div className="border rounded p-2 grid gap-2" key={row.id}>
 <label>TR · {row.id}<input aria-label={`${key}-${index}-tr`} lang="tr" value={row.label.tr} onChange={e=>change({label:sourceEdit(row.label,e.target.value)})}/></label>
 <label>Hedef<input aria-label={`${key}-${index}-href`} value={row.href} disabled={locked} onChange={e=>change({href:e.target.value})}/></label>
 <label>Icon<select aria-label={`${key}-${index}-icon`} value={row.icon??'ChevronRight'} onChange={e=>change({icon:e.target.value})}>{ICON_NAMES.map(i=><option key={i}>{i}</option>)}</select></label>
 <label>Grup<select value={row.group??'help'} disabled={locked} onChange={e=>change({group:e.target.value as import('@/domain/storefront/registry').FooterGroup})}>{['services','help','legal'].map(g=><option key={g}>{g}</option>)}</select></label>
 <label><input type="checkbox" checked={row.visible} disabled={locked} onChange={e=>change({visible:e.target.checked})}/>Görünür</label>
 <div className="flex gap-2"><button type="button" disabled={index===0} onClick={()=>{const rows=[...value[key]];[rows[index-1],rows[index]]=[rows[index]!,rows[index-1]!];set({[key]:rows});}}>↑</button><button type="button" disabled={locked} onClick={()=>set({[key]:value[key].filter(r=>r.id!==row.id).map(r=>({...r}))})}>Sil</button></div>
 <details><summary>Manuel çeviri</summary><ChromeManual row={row} onChange={label=>change({label})}/></details>
 </div>;})}<button type="button" onClick={()=>set({[key]:[...value[key],{id:crypto.randomUUID().slice(0,12),href:'/esim',visible:true,label:{tr:'',de:'',en:''},icon:'Globe2',group:'help'}]})}>Bağlantı ekle · {key}</button></fieldset>;
 const account=value.accountPresentation??{title:{tr:'',de:'',en:''},text:{tr:'',de:'',en:''},visible:false,position:'after' as const};
 return <div className="grid gap-4">{links('navigation')}{links('footerLinks')}
 {value.footer.groupLabels&&(['services','help','legal'] as const).map(group=><label key={group}>Grup · {group}<input value={value.footer.groupLabels![group].tr} onChange={e=>set({footer:{...value.footer,groupLabels:{...value.footer.groupLabels!,[group]:sourceEdit(value.footer.groupLabels![group],e.target.value)}}})}/></label>)}
 <label>Footer · TR<textarea aria-label="footerText-tr" value={value.footerText.tr} onChange={e=>set({footerText:sourceEdit(value.footerText,e.target.value)})}/></label>
 <label>Copyright · TR<input value={value.copyright.tr} onChange={e=>set({copyright:sourceEdit(value.copyright,e.target.value)})}/></label>
 <fieldset><legend>Kundenkonto · yalnız sunum, zorunlu modüller değişmez</legend><label>Bilgi başlığı<input aria-label="account-title-tr" value={account.title.tr} onChange={e=>set({accountPresentation:{...account,title:sourceEdit(account.title,e.target.value)}})}/></label><label>Bilgi metni<textarea aria-label="account-text-tr" value={account.text.tr} onChange={e=>set({accountPresentation:{...account,text:sourceEdit(account.text,e.target.value)}})}/></label><label><input type="checkbox" aria-label="account-note-visible" checked={account.visible} onChange={e=>set({accountPresentation:{...account,visible:e.target.checked}})}/>Göster</label><select aria-label="account-note-position" value={account.position} onChange={e=>set({accountPresentation:{...account,position:e.target.value==='before'?'before':'after'}})}><option value="before">Önce</option><option value="after">Sonra</option></select></fieldset>
 </div>;
}
function ChromeManual({row,onChange}:{row:NavigationLink;onChange:(value:NavigationLink['label'])=>void}){return <div>{UI_LOCALES.filter(l=>l!=='tr').map(locale=><label key={locale}>{locale}<input aria-label={`manual-${row.id}-${locale}`} value={row.label[locale]??''} onChange={e=>onChange(manualEdit(row.label,locale,e.target.value))}/></label>)}</div>;}
export function ConfiguredNavigation({rows,locale,render}:{rows:NavigationLink[];locale:UiLocale;render:(row:NavigationLink,label:string,icon:React.ReactNode)=>React.ReactNode}){return <>{rows.filter(r=>r.visible&&r.href).map(row=><span key={row.id}>{render(row,row.label[locale]?.trim()||row.label.tr,<StorefrontIcon name={row.icon??'ChevronRight'} className="size-4"/>)}</span>)}</>;}
