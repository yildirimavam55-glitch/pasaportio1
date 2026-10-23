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
 it('keeps header interactions as caller-owned slots rather than replacing them',()=>{
  const html=renderToStaticMarkup(<PublicHeaderFrame reference brand={<img src="/unchanged-logo.svg" alt="Pasaport.io"/>} navigation={<a href="/blog">Blog</a>}><a href="/auth">Login</a><button>Picker</button><button>Menu</button></PublicHeaderFrame>);
  for(const value of ['/unchanged-logo.svg','/blog','/auth','Picker','Menu','data-reference-hero-header'])expect(html).toContain(value);
 });
});
