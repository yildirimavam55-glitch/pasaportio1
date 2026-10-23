import type { ReactNode } from 'react';
import type { UiLocale } from '@/i18n/locales';
import type { V2Section } from '@/domain/storefront/v2';
import { StorefrontIcon } from '@/domain/storefront/icons';
import { V2SectionFrame } from '@/components/design-v2/V2SectionFrame';
import { V2Notice } from '@/components/design-v2/V2Notice';
import { V2EditorialGrid } from '@/components/design-v2/V2EditorialGrid';
import { V2EditorialFaq } from '@/components/design-v2/V2EditorialFaq';
import { TrustRow, HowItWorks, SectionTitle } from '@/components/design-v2/V2EditorialPrimitives';

// Preview disclosures only, never generated catalogue/products/reviews.
const EMPTY:Record<UiLocale,string>={tr:'Veri bağlantısı kapalı. Yayımlanmış içerik bu alanda gösterilir.',en:'Data connection disabled. Published content appears here.',de:'Datenverbindung deaktiviert. Hier erscheinen veröffentlichte Inhalte.',fr:'Connexion aux données désactivée. Le contenu publié apparaît ici.',es:'Conexión de datos desactivada. Aquí aparece el contenido publicado.',it:'Connessione dati disattivata. Qui appare il contenuto pubblicato.',pt:'Ligação de dados desativada. O conteúdo publicado aparece aqui.',nl:'Gegevensverbinding uitgeschakeld. Gepubliceerde inhoud verschijnt hier.',pl:'Połączenie z danymi wyłączone. Tutaj pojawia się opublikowana treść.',ar:'اتصال البيانات معطّل. يظهر المحتوى المنشور هنا.',ru:'Подключение к данным отключено. Здесь отображается опубликованный контент.',ja:'データ接続は無効です。公開済みのコンテンツがここに表示されます。',ko:'데이터 연결이 비활성화되었습니다. 게시된 콘텐츠가 여기에 표시됩니다.',zh:'数据连接已禁用。已发布内容显示在此处。'};
/** Complete existing section order; unavailable live slots are explicit, never fake offers/reviews. */
export function CompletePageSection({section:s,locale,resolve,hero,onSelect}:{section:V2Section;locale:UiLocale;resolve:(id?:string|null)=>string|undefined;hero:ReactNode;onSelect:(id:string)=>void}){
 const t=(key:string)=>s.text[key]?.[locale]||s.text[key]?.tr||'';
 const text=(value:Record<string,unknown>)=>String(value[locale]||value.tr||'');
 const items=s.items.filter(i=>i.visible);
 let content:ReactNode;
 switch(s.type){
 case 'SEARCH_HERO':content=hero;break;
 case 'NOTICE':content=<V2Notice section={s} title={t('title')} text={t('text')}/>;break;
 case 'FAQ':content=<V2SectionFrame section={s}><V2EditorialFaq title={t('title')} questions={items.map(i=>[text(i.title),text(i.text)])}/></V2SectionFrame>;break;
 case 'BENEFIT_ROW':content=<V2SectionFrame section={s}><TrustRow items={items.map(i=>({icon:<StorefrontIcon name={i.icon}/>,label:text(i.title)}))}/></V2SectionFrame>;break;
 case 'HOW_IT_WORKS':case 'INSTALLATION_STEPS':content=<V2SectionFrame section={s}><HowItWorks title={t('title')} steps={items.map(i=>({t:text(i.title),s:text(i.text),image:resolve(i.mediaId)}))}/></V2SectionFrame>;break;
 case 'INFO_GRID':case 'INFO_CAROUSEL':content=<V2EditorialGrid section={s} locale={locale} resolve={resolve}/>;break;
 case 'SPACER':content=<div aria-hidden style={{height:s.height==='tall'?40:24}}/>;break;
 default:content=<V2SectionFrame section={s}><section className="complete-page-data-slot"><SectionTitle>{t('title')}</SectionTitle>{t('subtitle')&&<p>{t('subtitle')}</p>}<p data-live-content-unavailable>{EMPTY[locale]}</p></section></V2SectionFrame>;
 }
 return <div data-complete-section={s.id} data-section-type={s.type} onDoubleClick={()=>onSelect(s.id)}>{content}</div>;
}
