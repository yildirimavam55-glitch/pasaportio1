import { useState } from "react";
import "./unified-controls.css";
import { defaultStorefront,sanitizeStorefront,type StorefrontConfig,type NavigationLink } from '@/domain/storefront/registry';
import { sourceEdit,manualEdit } from '@/domain/storefront/translation-workflow';
import { UI_LOCALES,type UiLocale } from '@/i18n/locales';
import { StorefrontIcon,ICON_NAMES } from '@/domain/storefront/icons';
export function ChromeControls({value,onChange}:{value:StorefrontConfig;onChange:(value:StorefrontConfig)=>void}){
 const set=(patch:Partial<StorefrontConfig>)=>onChange(sanitizeStorefront({...value,...patch},'global'));
 const links=(key:'navigation'|'footerLinks')=><fieldset key={key}><legend>{key==='navigation'?'Masaüstü + mobil menü':'Footer'}</legend>
 {value[key].map((row,index)=>{const change=(patch:Partial<NavigationLink>)=>set({[key]:value[key].map(r=>r.id===row.id?{...r,...patch}:r)});const locked=defaultStorefront('global').footerLinks.some(required=>required.group==='legal'&&required.id===row.id);return <div className="border rounded p-2 grid gap-2" key={row.id}>
 <label>TR · {row.id}<input aria-label={`${key}-${index}-tr`} lang="tr" value={row.label.tr} onChange={e=>change({label:sourceEdit(row.label,e.target.value)})}/></label>
 <label>Hedef<input aria-label={`${key}-${index}-href`} value={row.href} disabled={locked} onChange={e=>change({href:e.target.value})}/></label>
 <label>Icon<select aria-label={`${key}-${index}-icon`} value={row.icon??'ChevronRight'} onChange={e=>change({icon:e.target.value})}>{ICON_NAMES.map(i=><option key={i}>{i}</option>)}</select></label>
 <label>Grup<select value={row.group??'help'} disabled={locked} onChange={e=>change({group:e.target.value as import('@/domain/storefront/registry').FooterGroup})}>{['services','help','legal'].map(g=><option key={g}>{g}</option>)}</select></label>
 <label><input type="checkbox" checked={row.visible} disabled={locked} onChange={e=>change({visible:e.target.checked})}/>Görünür</label>
 <div className="flex gap-2"><button type="button" disabled={index===0} onClick={()=>{const rows=[...value[key]];[rows[index-1],rows[index]]=[rows[index]!,rows[index-1]!];set({[key]:rows});}}>↑</button><button type="button" disabled={locked} onClick={()=>set({[key]:value[key].filter(r=>r.id!==row.id).map(r=>({...r}))})}>Sil</button></div>
 <details><summary>Manuel çeviri</summary><ChromeManual row={row} onChange={label=>change({label})}/></details>
 </div>;})}<button type="button" onClick={()=>set({[key]:[...value[key],{id:crypto.randomUUID().slice(0,12),href:'/esim',visible:true,label:{tr:'',de:'',en:''},icon:'Globe2',group:'help'}]})}>Bağlantı ekle · {key}</button></fieldset>;
 const account=value.accountPresentation??{title:{tr:'',de:'',en:''},text:{tr:'',de:'',en:''},visible:false,position:'after' as const};
 return <div className="admin-builder-controls grid gap-4">{links('navigation')}{links('footerLinks')}
 {value.footer.groupLabels&&(['services','help','legal'] as const).map(group=><ChromeCopy key={group} id={`group-${group}`} label={`Grup · ${group}`} value={value.footer.groupLabels![group]} onChange={text=>set({footer:{...value.footer,groupLabels:{...value.footer.groupLabels!,[group]:text}}})}/>)}
 <ChromeCopy id="footerText" label="Footer" value={value.footerText} onChange={footerText=>set({footerText})}/>
 <ChromeCopy id="copyright" label="Copyright" value={value.copyright} onChange={copyright=>set({copyright})}/>
 {(['newsletterTitle','newsletterDescription','newsletterPlaceholder','newsletterCta'] as const).map(key=><ChromeCopy key={key} id={key} label={key} value={value.footer[key]} onChange={text=>set({footer:{...value.footer,[key]:text}})}/>)}
 <fieldset><legend>Kundenkonto · yalnız sunum, zorunlu modüller değişmez</legend><ChromeCopy id="account-title" label="Bilgi başlığı" value={account.title} onChange={title=>set({accountPresentation:{...account,title}})}/><ChromeCopy id="account-text" label="Bilgi metni" value={account.text} onChange={text=>set({accountPresentation:{...account,text}})}/><label><input type="checkbox" aria-label="account-note-visible" checked={account.visible} onChange={e=>set({accountPresentation:{...account,visible:e.target.checked}})}/>Göster</label><select aria-label="account-note-position" value={account.position} onChange={e=>set({accountPresentation:{...account,position:e.target.value==='before'?'before':'after'}})}><option value="before">Önce</option><option value="after">Sonra</option></select></fieldset>
 </div>;
}
function ChromeManual({row,onChange}:{row:NavigationLink;onChange:(value:NavigationLink['label'])=>void}){const [target,setTarget]=useState<Exclude<UiLocale,'tr'>>('de');return <div><label>Zielsprache<select aria-label={`manual-locale-${row.id}`} value={target} onChange={e=>setTarget(e.target.value as typeof target)}>{UI_LOCALES.filter(l=>l!=='tr').map(locale=><option key={locale}>{locale}</option>)}</select></label><label>{target}<textarea aria-label={`manual-${row.id}-${target}`} value={row.label[target]??''} onChange={e=>onChange(manualEdit(row.label,target,e.target.value))}/></label></div>;}

export function ConfiguredNavigation({rows,locale,render}:{rows:NavigationLink[];locale:UiLocale;render:(row:NavigationLink,label:string,icon:React.ReactNode)=>React.ReactNode}){return <>{rows.filter(r=>r.visible&&r.href).map(row=><span key={row.id}>{render(row,row.label[locale]?.trim()||row.label.tr,<StorefrontIcon name={row.icon??'ChevronRight'} className="size-4"/>)}</span>)}</>;}

function ChromeCopy({id,label,value,onChange}:{id:string;label:string;value:NavigationLink['label'];onChange:(value:NavigationLink['label'])=>void}){return <fieldset><label>{label} · TR<textarea aria-label={`${id}-tr`} value={value.tr} lang="tr" onChange={e=>onChange(sourceEdit(value,e.target.value))}/></label><details><summary>Manuel çeviri · {label}</summary><ChromeManual row={{id,href:'',visible:true,label:value}} onChange={onChange}/></details></fieldset>;}
