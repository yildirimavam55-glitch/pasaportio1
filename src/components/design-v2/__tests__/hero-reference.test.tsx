import {resolveTrustDesign,sanitizeCardDesign} from '@/domain/storefront/card-design';
import {sourceEdit} from '@/domain/storefront/translation-workflow';
import {afterEach,describe,expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {createV2Section,defaultV2Page,sanitizeV2Page} from '@/domain/storefront/v2';
import {UI_LOCALES} from '@/i18n/locales';
import {setActiveUiLocale} from '@/i18n/overlay';
import {HeroHeading} from '../HeroHeading';
import {HeroTrustCards} from '../HeroTrustCards';
import {V2HeroView} from '../V2HeroView';
import {PublicHeaderFrame} from '@/components/travel/PublicHeaderFrame';
import {pageFields} from '@/domain/storefront/page-translation';

afterEach(()=>setActiveUiLocale('tr'));
describe('Reference Hero uses the existing V2 contract',()=>{
 for(const locale of UI_LOCALES) it(`preserves editable ${locale} heading, accent and alt through sanitation`,()=>{
  setActiveUiLocale(locale);
  const page=structuredClone(defaultV2Page('esim'));const hero=page.sections.find(s=>s.type==='SEARCH_HERO')!;
  hero.text['accent']={tr:'Bağlantıda kal',de:'Verbunden bleiben',en:'Stay connected',[locale]:'Manual '+locale,_src:{de:'Prior source'}};
  hero.text['imageAlt']={tr:'Seyahat fotoğrafı',de:'Reisefoto',en:'Travel photo',[locale]:'Photo '+locale};
  hero.heroTextMode={[locale]:'custom'};
  const clean=sanitizeV2Page(page,'esim');const section=clean.sections.find(s=>s.type==='SEARCH_HERO')!;
  const heading=<HeroHeading section={section} locale={locale} title={'Title '+locale} subtitle="" defaultSubtitle=""/>;
  const html=renderToStaticMarkup(<V2HeroView section={section} image="/photo.jpg" heading={heading} subtitle=""><button>Existing search</button></V2HeroView>);
  expect(html).toContain('Manual '+locale);expect(html).toContain('Title '+locale);expect(html).toContain('Photo '+locale);
  expect(section.text['accent']?._src?.de).toBe('Prior source');
  expect(pageFields(clean).some(f=>f.path.at(-1)==='accent')).toBe(true);
 });
 it('renders all visible benefit entries in saved order, with no three-item restriction',()=>{
  const benefits=createV2Section('BENEFIT_ROW');const template=benefits.items[0]??defaultV2Page('esim').sections.find(s=>s.type==='BENEFIT_ROW')!.items[0]!;
  benefits.items=Array.from({length:6},(_,i)=>({...structuredClone(template),id:'trust-'+i,visible:i!==2,title:{tr:'Kart '+i,de:'Karte '+i,en:'Card '+i}}));
  benefits.items.reverse();const html=renderToStaticMarkup(<HeroTrustCards section={benefits} locale="tr"/>);
  expect(html.match(/data-registered-card=/g)).toHaveLength(5);expect(html).not.toContain('Kart 2');expect(html.indexOf('Kart 5')).toBeLessThan(html.indexOf('Kart 0'));
  benefits.visible=false;expect(renderToStaticMarkup(<HeroTrustCards section={benefits} locale="tr"/>)).toBe('');
 });
 it('keeps custom legacy copy unchanged and does not fabricate an accent',()=>{
  const section=defaultV2Page('esim').sections.find(s=>s.type==='SEARCH_HERO')!;section.heroTextMode={tr:'custom'};
  expect(renderToStaticMarkup(<HeroHeading section={section} locale="tr" title="Yurt dışında bağlantıda kal." subtitle="" defaultSubtitle=""/>)).toBe('Yurt dışında bağlantıda kal.');
 });
 it('lets an explicit accent override legacy title presentation without changing the title',()=>{
  const section=defaultV2Page('esim').sections.find(s=>s.type==='SEARCH_HERO')!;section.text['accent']={tr:'Özel vurgu',de:'',en:''};
  const html=renderToStaticMarkup(<HeroHeading section={section} locale="tr" title="Yurt dışında bağlantıda kal." subtitle="" defaultSubtitle=""/>);
  expect(html).toContain('Yurt dışında bağlantıda kal.');expect(html).toContain('Özel vurgu');
 });
 it('keeps header interactions as caller-owned slots rather than replacing them',()=>{
  const html=renderToStaticMarkup(<PublicHeaderFrame reference brand={<img src="/unchanged-logo.svg" alt="Pasaport.io"/>} navigation={<a href="/blog">Blog</a>}><a href="/auth">Login</a><button>Picker</button><button>Menu</button></PublicHeaderFrame>);
  for(const value of ['/unchanged-logo.svg','/blog','/auth','Picker','Menu','data-reference-hero-header'])expect(html).toContain(value);
 });
});

describe('Trust design persistence and precedence',()=>{
 it('keeps section -> item -> device precedence and explicit false values',()=>{
  const section={titleSize:12,titleFont:'body',mobile:{titleSize:13},desktop:{titleSize:16}};
  const item={titleSize:18,titleFont:'serif',mobile:{titleSize:15,showDescription:false},desktop:{titleSize:19,visible:false}};
  expect(resolveTrustDesign(section,item,'mobile')).toMatchObject({titleSize:15,titleFont:'serif',showDescription:false});
  expect(resolveTrustDesign(section,item,'desktop')).toMatchObject({titleSize:19,visible:false});
  expect(resolveTrustDesign(section,{titleSize:20},'desktop').titleSize).toBe(20);
 });
 it('round trips all supported trust properties and preserves old user values',()=>{
  const page=structuredClone(defaultV2Page('esim'));const benefits=page.sections.find(s=>s.type==='BENEFIT_ROW')!;
  benefits.items[0]!.cardDesign={color:'#123456',titleFont:'serif',bodyFont:'sans',titleSize:18,bodySize:13,titleWeight:700,bodyWeight:400,titleLine:1.2,bodyLine:1.5,iconColor:'#abcdef',circleColor:'#112233',circleSize:44,iconSize:25,mobile:{visible:false,showDescription:false,titleSize:14},desktop:{titleSize:19}};
  const clean=sanitizeV2Page(page,'esim');expect(clean.sections.find(s=>s.type==='BENEFIT_ROW')!.items[0]!.cardDesign).toEqual(benefits.items[0]!.cardDesign);
  expect(sanitizeCardDesign({titleFont:'url(javascript:x)',iconColor:'red',titleSize:999})).toEqual({titleSize:48});
 });
 it('TR editing keeps manual German translations and their provenance',()=>{
  const value={tr:'Eski',de:'Meine Korrektur',en:'Manual correction',_src:{de:'Eski'}};
  expect(sourceEdit(value,'Yeni')).toMatchObject({de:'Meine Korrektur',en:'Manual correction',_src:{de:'Eski'}});
 });
});
