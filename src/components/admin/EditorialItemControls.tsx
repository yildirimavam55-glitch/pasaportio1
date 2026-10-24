import "./unified-controls.css";
import { sourceEdit,manualEdit } from '@/domain/storefront/translation-workflow';
import { IconPicker } from './IconPicker';
import { ICON_NAMES } from '@/domain/storefront/icons';
import { V2_ITEM_LINKS,type V2Item } from '@/domain/storefront/v2';
import { UI_LOCALES } from '@/i18n/locales';
/** Only editorial values; destination/product/review callers must not use this form. */
export function EditorialItemControls({item,onChange}:{item:V2Item;onChange:(patch:Partial<V2Item>)=>void}){
 const labels={title:'Başlık / Titel',text:'Açıklama / Beschreibung',cta:'Bağlantı metni',imageAlt:'Görsel açıklaması'};
 return <fieldset className="admin-builder-controls"><legend>TR · İçerik / Icon / Buton</legend>{(['title','text','cta','imageAlt'] as const).map(key=><label key={key}>{labels[key]}<textarea aria-label={`item-${key}-${item.id}`} value={item[key].tr} onChange={e=>onChange({[key]:sourceEdit(item[key],e.target.value)})}/></label>)}
 <div data-item-icon={item.id}><IconPicker value={item.icon} onChange={icon=>onChange({icon})}/></div>
 <label>Buton hedefi<select aria-label={`item-href-${item.id}`} value={item.href} onChange={e=>onChange({href:e.target.value as V2Item['href']})}>{V2_ITEM_LINKS.map(v=><option key={v} value={v}>{v||'Yok'}</option>)}</select></label>
 {item.labels.map((label,index)=><label key={index}>Etiket {index+1}<input aria-label={`item-label-${item.id}-${index}`} value={label.tr} onChange={e=>onChange({labels:item.labels.map((v,i)=>i===index?sourceEdit(v,e.target.value):v)})}/></label>)}<button type="button" disabled={item.labels.length>=4} onClick={()=>onChange({labels:[...item.labels,{tr:'',de:'',en:''}]})}>Etiket ekle</button>
 <details><summary>Manuel çeviri</summary>{UI_LOCALES.filter(l=>l!=='tr').map(l=><fieldset key={l}><legend>{l}</legend>{(['title','text','cta','imageAlt'] as const).map(key=><label key={key}>{labels[key]}<textarea value={item[key][l]??''} onChange={e=>onChange({[key]:manualEdit(item[key],l,e.target.value)})}/></label>)}</fieldset>)}</details>
 </fieldset>;
}
