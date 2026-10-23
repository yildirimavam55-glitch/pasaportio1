// True browser test of fixed TR editing, explicit manual mode, offline fixture statuses and shared renderer.
const { chromium } = require(process.env.BUILDER_BROWSER_MODULE);
const assert = require('node:assert/strict');
const fs = require('node:fs');
let activeBrowser;
(async () => {
 const browser = await chromium.launch({ channel:'chrome', headless:true });activeBrowser=browser;
 const page = await browser.newPage({viewport:{width:1840,height:1100}});
 const errors=[],remote=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{const u=new URL(route.request().url());if(u.hostname==='127.0.0.1'||['data:','blob:'].includes(u.protocol))return route.continue();remote.push(u.hostname);return route.abort();});
 fs.mkdirSync('artifacts/builder-preview',{recursive:true});
 await page.goto('http://127.0.0.1:8765/builder-preview/?fixture=translation');
 const cdp=await page.context().newCDPSession(page);await cdp.send('DOM.enable');await cdp.send('CSS.enable');
 const verifyCJK=async()=>{
  const {root}=await cdp.send('DOM.getDocument',{depth:-1,pierce:true});
  const find=node=>node.nodeName==='IFRAME'&&node.contentDocument?node.contentDocument:(node.children??[]).map(find).find(Boolean);
  const doc=find(root);assert.ok(doc,'iframe DOM is available');
  const {nodeId}=await cdp.send('DOM.querySelector',{nodeId:doc.nodeId,selector:'.final-hero-heading h1'});
  const {fonts}=await cdp.send('CSS.getPlatformFontsForNode',{nodeId});
  assert.ok(fonts.some(font=>/Noto.*CJK/i.test(font.familyName)&&font.glyphCount>0),'CJK heading actually uses the pinned font');
 };
 const frame=page.frameLocator('iframe');await frame.locator('h1').waitFor();
 const source=page.getByLabel('TR:title',{exact:true});
 assert.equal(await source.inputValue(),'Yolculuğuna bağlı kal');
 assert.equal(await page.getByLabel('Vorschau in',{exact:true}).inputValue(),'tr');
 assert.equal(await page.locator('[data-translation-locale]').count(),13);
 // Español preview must never change the TR source input into an empty Spanish input.
 await page.getByLabel('Vorschau in',{exact:true}).selectOption('es');
 assert.equal(await source.inputValue(),'Yolculuğuna bağlı kal');
 await frame.locator('[data-preview-translation-warning]').waitFor();
 await page.getByRole('button',{name:'Tüm sayfayı 13 dile çevir (DEMO)',exact:true}).click();
 await frame.getByRole('heading',{name:'Mantente conectado durante tu viaje'}).waitFor();
 assert.equal(await page.locator('[data-translation-status=AUTO_TRANSLATED]').count(),13);
 assert.match(await page.locator('[data-page-translation-status]').innerText(),/DEMO.*DONE/);
 await frame.getByText('Comprueba tu dispositivo antes de viajar.',{exact:true}).waitFor();
 await frame.locator('[data-preview-translation-warning]').waitFor({state:'hidden'});
 await page.getByRole('button',{name:'Tüm sayfayı 13 dile çevir (DEMO)',exact:true}).click();
 assert.match(await page.locator('[data-page-translation-status]').innerText(),/0\/0.*0 istek/);
 await page.getByText('13 dil · Durum / Restliste',{exact:true}).click();
 await page.screenshot({path:'artifacts/builder-preview/page-status.png',fullPage:true});
 await page.getByText('13 dil · Durum / Restliste',{exact:true}).click();
 // Representative target previews are real translated fixtures; source remains Turkish.
 for(const [locale,heading] of [['de','Bleib auf deiner Reise verbunden'],['en','Stay connected on your journey'],['es','Mantente conectado durante tu viaje'],['ar','ابقَ على اتصال خلال رحلتك']]){
  await page.getByLabel('Vorschau in',{exact:true}).selectOption(locale);
  await frame.getByRole('heading',{name:heading}).waitFor();
  assert.equal(await source.inputValue(),'Yolculuğuna bağlı kal');
  await page.locator('iframe').screenshot({path:`artifacts/builder-preview/tr-source-preview-${locale}.png`});
 }
 // Existing MVP's typography / responsive media / NOTICE paths remain exercised.
 await page.getByLabel('headingColor',{exact:true}).fill('#76edc5');
 await page.getByLabel('Yazı ailesi',{exact:true}).selectOption('heading');
 for(const [device,size] of [['mobile',28],['tablet',36],['desktop',50]])await page.getByLabel(`${device}-headingSize`,{exact:true}).fill(String(size));
 await page.getByLabel('tablet-Bild',{exact:true}).selectOption('10000000-0000-4000-8000-000000000002');
 for(const [width,size]of [[390,'28px'],[768,'36px'],[1440,'50px']]){
  await page.setViewportSize({width:Math.max(1440,width+400),height:1100});
  await page.getByRole('button',{name:`${width} px`,exact:true}).click();
  assert.equal(await frame.locator('h1').evaluate(e=>getComputedStyle(e).fontSize),size);
  assert.equal(await frame.locator('h1').evaluate(e=>getComputedStyle(e).color),'rgb(118, 237, 197)');
  const img=frame.locator('.final-hero-photo img');await img.evaluate(e=>e.decode());
  assert.equal((await img.evaluate(e=>e.currentSrc)).includes('pasaport-mediterranean-terrace'),width===768);
  await page.locator('iframe').screenshot({path:`artifacts/builder-preview/translated-${width}.png`});
 }
 await page.getByLabel('Vorschau in',{exact:true}).selectOption('es');
 await page.getByRole('button',{name:'Übersetzung bearbeiten',exact:true}).click();
 assert.equal(await page.getByLabel('Korrektursprache',{exact:true}).inputValue(),'es');
 await page.getByLabel('MANUAL:title',{exact:true}).fill('Mi corrección manual');
 await frame.getByRole('heading',{name:'Mi corrección manual'}).waitFor();
 assert.equal(await page.locator('[data-translation-locale=es]').getAttribute('data-translation-status'),'MANUALLY_EDITED');
 // Unknown Turkish input must NOT be magically translated; manual values survive and become outdated.
 await source.fill('Bu yeni metin için örnek çeviri yok');
 assert.equal(await page.locator('[data-translation-locale=es]').getAttribute('data-translation-status'),'OUTDATED');
 await page.getByRole('button',{name:'Tüm sayfayı 13 dile çevir (DEMO)',exact:true}).click();
 await page.locator('[data-page-translation-status]').filter({hasText:'Keine Beispielübersetzung'}).waitFor();
 assert.equal(await page.getByLabel('MANUAL:title',{exact:true}).inputValue(),'Mi corrección manual');
 await frame.getByRole('heading',{name:'Mi corrección manual'}).waitFor();
 await page.locator('iframe').screenshot({path:'artifacts/builder-preview/manual-outdated.png'});
 await page.getByLabel('Abschnitt',{exact:true}).selectOption('builder-notice');
 await page.getByRole('button',{name:'Tüm sayfayı 13 dile çevir (DEMO)',exact:true}).click();
 await frame.getByText('Comprueba tu dispositivo antes de viajar.',{exact:true}).waitFor();
 await page.getByLabel('TR:title',{exact:true}).fill('Yeni bilgi');
 await page.getByLabel('headingColor',{exact:true}).fill('#f0cd7b');
 await page.getByLabel('mobile-headingSize',{exact:true}).fill('24');
 await page.getByLabel('Hintergrund',{exact:true}).fill('#173939');
 await page.getByLabel('Abstände',{exact:true}).selectOption('large');
 await page.getByRole('button',{name:'390 px',exact:true}).click();
 assert.equal(await frame.locator('[data-v2-heading]').evaluate(e=>getComputedStyle(e).fontSize),'24px');
 assert.equal(await frame.locator('[data-v2-heading]').evaluate(e=>getComputedStyle(e).color),'rgb(240, 205, 123)');
 // Reset discards fixture, manual and presentation edits; run all 14 locales, including CJK/RTL.
 await page.getByRole('button',{name:'Vorher / vollständig zurücksetzen'}).click();
 await page.getByLabel('Abschnitt',{exact:true}).selectOption('hero');
 await page.getByRole('button',{name:'Tüm sayfayı 13 dile çevir (DEMO)',exact:true}).click();
 for(const locale of ['tr','en','de','fr','es','it','pt','nl','pl','ar','ru','ja','ko','zh']){
  await page.getByLabel('Vorschau in',{exact:true}).selectOption(locale);
  await frame.locator(`[data-locale=${locale}]`).waitFor();
  assert.equal(await frame.locator('html').getAttribute('dir'),locale==='ar'?'rtl':'ltr');
  assert.ok((await frame.locator('h1').innerText()).trim());
  assert.equal(await frame.locator('body').evaluate(e=>e.scrollWidth<=e.clientWidth),true);
  assert.equal(await source.inputValue(),'Yolculuğuna bağlı kal');
  if(['ja','ko','zh'].includes(locale))await verifyCJK();
  if(['tr','fr','ar','ja','zh'].includes(locale))await page.locator('iframe').screenshot({path:`artifacts/builder-preview/locale-${locale}-390.png`});
 }
 await page.getByLabel('Vorschau in',{exact:true}).selectOption('tr');
 for(const width of [390,768,1440]){
  await page.setViewportSize({width,height:1000});
  await page.locator('.builder-workspace > aside').evaluate(e=>e.scrollTop=0);
  await page.screenshot({path:`artifacts/builder-preview/editor-${width}.png`,fullPage:true});
 }

 // Integrated acceptance uses the SAME new Admin controls as authenticated routes.
 await page.getByRole('button',{name:'Design',exact:true}).click();
 await page.getByLabel('theme-applyToDark',{exact:true}).check();
 await page.getByLabel('theme-primary',{exact:true}).fill('#18d9aa');
 await page.getByLabel('theme-headingFont',{exact:true}).selectOption('Sora');
 for(const [device,size]of [['mobile',31],['tablet',41],['desktop',55]])await page.getByLabel(`theme-${device}-headingSize`,{exact:true}).fill(String(size));
 for(const [width,size]of [[390,'31px'],[768,'41px'],[1440,'55px']]){
  await page.setViewportSize({width:Math.max(1440,width+400),height:1100});await page.getByRole('button',{name:`${width} px`,exact:true}).click();
  await frame.locator('h1').evaluate((e,size)=>{if(getComputedStyle(e).fontSize!==size)throw Error(`global responsive font: ${getComputedStyle(e).fontSize}, expected ${size}`)},size);
  assert.match(await frame.locator('h1').evaluate(e=>getComputedStyle(e).fontFamily),/Sora/);
 }
 await page.getByRole('button',{name:'Seiten',exact:true}).click();
 await page.getByRole('button',{name:'+ Yeni bölüm ekle',exact:true}).click();
 await page.getByRole('dialog',{name:'Bölüm kütüphanesi'}).getByRole('button',{name:'Bilgi kartları',exact:true}).click();
 await page.getByRole('button',{name:'Kart ekle',exact:true}).click();
 const legacyCardId=await page.locator('[data-editor-item]').first().getAttribute('data-editor-item');
 await page.getByLabel(`item-title-${legacyCardId}`,{exact:true}).fill('Bilgi');
 await page.getByLabel(`item-text-${legacyCardId}`,{exact:true}).fill('Seyahate çıkmadan önce cihazını kontrol et.');
 await page.getByLabel(`item-imageAlt-${legacyCardId}`,{exact:true}).fill('Bilgi');
 await page.getByLabel(`item-cta-${legacyCardId}`,{exact:true}).fill('Ülke ara');
 await page.getByLabel(`item-href-${legacyCardId}`,{exact:true}).selectOption('/esim');
 for(const [device,id]of [['desktop','10000000-0000-4000-8000-000000000001'],['tablet','10000000-0000-4000-8000-000000000002'],['mobile','10000000-0000-4000-8000-000000000001']])await page.getByLabel(`item-media-${legacyCardId}-${device}`,{exact:true}).selectOption(id);
 await page.getByRole('group',{name:'tablet',exact:true}).getByLabel('Ölçek / Zoom',{exact:true}).fill('120');
 await page.getByLabel('media-overlay',{exact:true}).fill('20');
 for(const width of [390,768,1440]){
  await page.getByRole('button',{name:`${width} px`,exact:true}).click();const picture=frame.locator('[data-responsive-media] img').first();await picture.waitFor({state:'visible'});
  await page.waitForFunction(({width})=>{const image=document.querySelector('iframe')?.contentDocument?.querySelector('[data-responsive-media] img');return image?.complete&&image.naturalWidth>0&&image.currentSrc.includes('pasaport-mediterranean-terrace')===(width===768);},{width});
  assert.equal((await picture.evaluate(e=>e.currentSrc)).includes('pasaport-mediterranean-terrace'),width===768);
  assert.equal(await frame.locator('body').evaluate(e=>e.scrollWidth<=e.clientWidth),true);
  await page.locator('iframe').screenshot({path:`artifacts/builder-preview/integrated-media-${width}.png`});
 }
 await page.getByRole('button',{name:'Menü & Footer',exact:true}).click();
 await page.getByLabel('navigation-0-tr',{exact:true}).fill('Bilgi');
 await frame.locator('[data-configured-header]').getByText('Bilgi',{exact:true}).waitFor();
 await page.getByLabel('footerText-tr',{exact:true}).fill('Bilgi');
 await frame.locator('[data-configured-footer]').getByText('Bilgi',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Tüm sayfayı 13 dile çevir (DEMO)',exact:true}).click();
 await page.getByLabel('Vorschau in',{exact:true}).selectOption('ja');
 await frame.locator('[data-configured-header]').getByText('情報',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Kundenkonto',exact:true}).click();
 await page.getByLabel('account-title-tr',{exact:true}).fill('Bilgi');
 await page.getByLabel('account-text-tr',{exact:true}).fill('Nur redaktioneller Hinweis');
 await page.getByLabel('account-note-visible',{exact:true}).check();
 await frame.locator('[data-account-editorial]').getByText('Nur redaktioneller Hinweis',{exact:true}).waitFor();
 assert.match(await frame.locator('[data-account-layout-preview]').innerText(),/Pflichtmodule/);
 await page.locator('iframe').screenshot({path:'artifacts/builder-preview/integrated-account-presentation.png'});
 await page.getByLabel('Vorschau in',{exact:true}).selectOption('tr');
 await page.getByRole('button',{name:'Versionen',exact:true}).click();
 await page.getByRole('button',{name:'Synthetischen Entwurf speichern',exact:true}).click();
 await page.getByRole('button',{name:'Seiten',exact:true}).click();await page.getByLabel('Abschnitt',{exact:true}).selectOption('hero');
 await page.getByLabel('TR:title',{exact:true}).fill('BROWSER_RELEASE_TITLE');
 await page.getByRole('button',{name:'Versionen',exact:true}).click();
 page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Synthetische Testfreigabe',exact:true}).click();
 await page.getByRole('button',{name:'Revision 1 · draft → Entwurf',exact:true}).click();
 await page.getByLabel('Entwurf oder Testfreigabe',{exact:true}).selectOption('published');
 await frame.getByRole('heading',{name:'BROWSER_RELEASE_TITLE',exact:true}).waitFor();
 await page.getByLabel('Entwurf oder Testfreigabe',{exact:true}).selectOption('draft');
 await frame.getByRole('heading',{name:'Yolculuğuna bağlı kal',exact:true}).waitFor();
 await page.reload();await page.getByRole('button',{name:'Versionen',exact:true}).click();await page.getByRole('button',{name:'Gespeicherten Entwurf laden',exact:true}).click();
 await page.getByLabel('Entwurf oder Testfreigabe',{exact:true}).selectOption('published');
 await frame.getByRole('heading',{name:'BROWSER_RELEASE_TITLE',exact:true}).waitFor();
 await page.getByLabel('Entwurf oder Testfreigabe',{exact:true}).selectOption('draft');
 await frame.getByRole('heading',{name:'Yolculuğuna bağlı kal',exact:true}).waitFor();
 for(const width of [390,768,1440]){await page.setViewportSize({width,height:1000});await page.waitForFunction(()=>{const el=document.querySelector('.admin-reference-sidebar');if(!el)return false;const css=getComputedStyle(el);if(css.position!=='fixed')return true;return el.classList.contains('is-open')?css.transform==='none':css.visibility==='hidden';});await page.waitForFunction(()=>document.body.scrollWidth<=document.body.clientWidth);assert.equal(await page.locator('body').evaluate(e=>e.scrollWidth<=e.clientWidth),true);await page.screenshot({path:`artifacts/builder-preview/integrated-admin-${width}.png`,fullPage:true});}
 // Complete original page, not the two-section translation fixture.
 await page.goto('http://127.0.0.1:8765/builder-preview/');
 await frame.locator('[data-complete-section="hero"]').waitFor();
 const sectionCount=await page.getByLabel('Abschnitt',{exact:true}).locator('option').count();
 assert.ok(sectionCount>=11,'complete original section registry is loaded');
 for(const id of ['hero','benefits','popular','trust-reviews','regions','installation','guides','faq'])assert.equal(await frame.locator(`[data-complete-section="${id}"]`).count(),1,`complete section ${id}`);
 assert.ok(await frame.locator('[data-live-content-unavailable]').count()>=3,'missing catalogue/reviews are explicit, no fake offers');
 await page.getByLabel('Abschnitt',{exact:true}).selectOption('faq');
 assert.ok(await page.getByLabel('TR:title',{exact:true}).count()===0 || await page.getByLabel('TR:title',{exact:true}).inputValue());
 await page.getByLabel('Abschnitt',{exact:true}).selectOption('hero');
 await page.getByLabel('TR:title',{exact:true}).fill('TAM SAYFA ÖNİZLEME');
 await frame.getByRole('heading',{name:'TAM SAYFA ÖNİZLEME',exact:true}).waitFor();
 for(const width of [390,768,1440]){
  await page.setViewportSize({width,height:1000});
  await page.getByRole('button',{name:'1440 px',exact:true}).click();
  await page.waitForFunction(()=>{const surface=document.querySelector('[data-preview-surface]'),container=document.querySelector('[data-preview-container]');return surface&&container&&surface.getBoundingClientRect().width<=container.getBoundingClientRect().width+1;});
  await page.waitForFunction(()=>document.body.scrollWidth<=document.body.clientWidth);
  assert.equal(await page.locator('body').evaluate(e=>e.scrollWidth<=e.clientWidth),true,'no Admin horizontal overflow');
  assert.equal(await frame.locator('html').evaluate(e=>e.clientWidth),1440,'desktop frame keeps full CSS viewport');
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:`artifacts/builder-preview/original-admin-${width}.png`,fullPage:true});
  await page.screenshot({path:`artifacts/builder-preview/original-editor-visible-${width}.png`});
  if(width<1024){
   await page.getByRole('button',{name:'Yönetim menüsünü aç',exact:true}).click();
   await page.getByRole('dialog',{name:'Yönetim bölümleri',exact:true}).waitFor();
   await page.waitForFunction(()=>{const drawer=document.querySelector('.admin-reference-sidebar.is-open');return drawer&&getComputedStyle(drawer).transform==='none'&&drawer.getBoundingClientRect().left===0&&drawer.getBoundingClientRect().right<=innerWidth;});
   const drawer=await page.getByRole('dialog',{name:'Yönetim bölümleri',exact:true}).boundingBox();
   assert.ok(drawer&&drawer.x>=0&&drawer.x+drawer.width<=width,'drawer fully inside mobile viewport');
   assert.ok(await page.getByRole('navigation',{name:'Yönetim navigasyonu'}).getByRole('link',{name:'Siparişler',exact:true}).isVisible());
   assert.ok(await page.getByRole('navigation',{name:'Yönetim navigasyonu'}).getByRole('link',{name:'Provider Hub',exact:true}).isVisible());
   await page.screenshot({path:`artifacts/builder-preview/original-sidebar-${width}.png`});
   await page.keyboard.press('Escape');
   assert.equal(await page.getByRole('button',{name:'Yönetim menüsünü aç',exact:true}).getAttribute('aria-expanded'),'false');
  }
 }
 const full=await browser.newPage({viewport:{width:390,height:1000}});
 full.on('pageerror',e=>errors.push(e.message));
 await full.route('**/*',route=>{const u=new URL(route.request().url());if(u.hostname==='127.0.0.1'||['data:','blob:'].includes(u.protocol))return route.continue();remote.push(u.hostname);return route.abort();});
 await full.goto('http://127.0.0.1:8765/builder-preview/?canvas=1');
 await full.locator('[data-complete-section="faq"]').waitFor();
 for(const width of [390,768,1440]){await full.setViewportSize({width,height:1000});assert.equal(await full.locator('body').evaluate(e=>e.scrollWidth<=e.clientWidth),true,'complete page overflow');await full.screenshot({path:`artifacts/builder-preview/complete-page-${width}.png`,fullPage:true});}
 await full.close();
 // Actual full-site target uses the existing named-frame protocol. HTTP receiver is synthetic here;
 // this deliberately does NOT claim a running Managed-Supabase/real-shop integration.
 await page.route('http://127.0.0.1:8765/esim?country=',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><html><body><h1>Protocol fixture only</h1><script>window.received={};addEventListener('message',event=>{if(event.origin===location.origin&&event.source===parent)window.received[event.data.type]=event.data});for(const type of ['v2-cms-ready','v2-theme-ready','v2-chrome-ready'])parent.postMessage({type},location.origin);</script></body></html>`}));
 await page.getByLabel('Önizleme kaynağı',{exact:true}).selectOption('website');
 await frame.locator('h1').filter({hasText:'Protocol fixture only'}).waitFor();
 await page.waitForFunction(()=>{const received=document.querySelector('iframe').contentWindow.received;return received?.['v2-cms-preview']?.config&&received?.['v2-theme-preview']?.theme&&received?.['v2-chrome-preview']?.config;});
 assert.equal(await page.locator('iframe').getAttribute('name'),'v2-cms-preview');
 assert.equal(await frame.locator('body').evaluate(()=>window.received['v2-cms-preview'].page),'esim');
 assert.equal(await frame.locator('body').evaluate(()=>window.received['v2-cms-preview'].config.sections.find(s=>s.type==='SEARCH_HERO').text.title.tr),'TAM SAYFA ÖNİZLEME');
 await page.getByLabel('Önizleme kaynağı',{exact:true}).selectOption('offline');
 await frame.locator('[data-complete-section="hero"]').waitFor();

 // Complete modular-card acceptance on the same existing Admin shell and actual public renderer.
 await page.getByRole('button',{name:'Seiten',exact:true}).click();
 await page.getByRole('button',{name:'Güven kartları ekle',exact:true}).click();
 const securityId=await page.getByLabel('Abschnitt',{exact:true}).inputValue();
 const beforeCount=await page.getByLabel('Abschnitt',{exact:true}).locator('option').count();
 const ids=[];
 for(const [index,title]of ['Bilgi','Ülke ara','eSIM'].entries()){
  await page.getByRole('button',{name:'Kart ekle',exact:true}).click();
  const editor=page.locator('[data-editor-item]').nth(index);const id=await editor.getAttribute('data-editor-item');ids.push(id);
  await editor.getByLabel(`item-title-${id}`,{exact:true}).fill(title);
  await editor.getByLabel(`item-text-${id}`,{exact:true}).fill('Seyahate çıkmadan önce cihazını kontrol et.');
  await editor.locator('[data-item-icon] button').first().click();
  await editor.getByRole('button',{name:['ShieldCheck','Zap','Smartphone'][index],exact:true}).click();
  await editor.getByLabel(`card-${id}-mobile-color`,{exact:true}).fill('#27caab');
  await editor.getByLabel(`card-${id}-desktop-color`,{exact:true}).fill('#1463ad');
  await editor.getByLabel(`card-${id}-mobile-iconSize`,{exact:true}).fill('22');
  await editor.getByLabel(`card-${id}-desktop-iconSize`,{exact:true}).fill('46');
 }
 await page.getByLabel('Kart yukarı: '+ids[2],{exact:true}).click();
 await page.getByLabel('Kart görünürlük: '+ids[0],{exact:true}).click();
 await page.getByRole('button',{name:'390 px',exact:true}).click();
 const cards=frame.locator(`[data-complete-section="${securityId}"] [data-registered-card]`);
 await cards.first().waitFor();assert.equal(await cards.count(),2);
 assert.deepEqual(await cards.evaluateAll(nodes=>nodes.map(n=>n.dataset.registeredCard)),[ids[2],ids[1]]);
 for(const [width,size]of [[390,'22px'],[768,'22px'],[1440,'46px']]){
  await page.getByRole('button',{name:`${width} px`,exact:true}).click();
  await page.waitForFunction(({width})=>document.querySelector('iframe').contentDocument.documentElement.clientWidth===width,{width});
  assert.equal(await cards.first().locator('.registered-card-icon').evaluate(e=>getComputedStyle(e).width),size);
  assert.equal(await cards.first().evaluate(e=>getComputedStyle(e).color),width===1440?'rgb(20, 99, 173)':'rgb(39, 202, 171)');
  assert.equal(await cards.first().locator('h3').evaluate(e=>getComputedStyle(e).color),width===1440?'rgb(20, 99, 173)':'rgb(39, 202, 171)');
  await frame.locator(`[data-complete-section="${securityId}"]`).screenshot({path:`artifacts/builder-preview/modular-cards-${width}.png`});
 }
 await page.getByRole('button',{name:'Tüm sayfayı 13 dile çevir (DEMO)',exact:true}).click();
 for(const locale of ['de','ar','ja','zh']){await page.getByLabel('Vorschau in',{exact:true}).selectOption(locale);await cards.first().waitFor();assert.equal(await frame.locator('html').getAttribute('dir'),locale==='ar'?'rtl':'ltr');await frame.locator(`[data-complete-section="${securityId}"]`).screenshot({path:`artifacts/builder-preview/modular-cards-${locale}.png`});}
 await page.getByRole('button',{name:'Versionen',exact:true}).click();
 await page.getByRole('button',{name:'Synthetischen Entwurf speichern',exact:true}).click();
 await page.reload();await page.getByRole('button',{name:'Versionen',exact:true}).click();await page.getByRole('button',{name:'Gespeicherten Entwurf laden',exact:true}).click();
 await page.getByRole('button',{name:'Seiten',exact:true}).click();
 assert.equal(await page.getByLabel('Abschnitt',{exact:true}).locator('option').count(),beforeCount);
 await page.getByLabel('Abschnitt',{exact:true}).selectOption(securityId);
 assert.equal(await frame.locator(`[data-complete-section="${securityId}"] [data-registered-card]`).count(),2);
 assert.equal(await page.locator('[data-editor-item]').count(),3,'hidden card and existing fields retained');
 await page.getByRole('button',{name:'Versionen',exact:true}).click();
 await page.getByRole('button',{name:/^Revision .* → Entwurf$/}).first().click();
 await page.getByRole('button',{name:'Seiten',exact:true}).click();
 await page.getByLabel('Abschnitt',{exact:true}).selectOption(securityId);
 assert.equal(await page.locator('[data-editor-item]').count(),3,'version restore preserves all cards');
 // Full free-section acceptance: existing Admin, shared actual public renderer, no database.
 await page.getByRole('button',{name:'Seiten',exact:true}).click();
 const originalOptions=await page.getByLabel('Abschnitt',{exact:true}).locator('option').evaluateAll(nodes=>nodes.map(n=>n.value));
 await page.getByRole('button',{name:'+ Yeni bölüm ekle',exact:true}).click();
 await page.getByRole('dialog',{name:'Bölüm kütüphanesi',exact:true}).getByRole('button',{name:'Boş bölüm',exact:true}).click();
 const freeSection=await page.getByLabel('Abschnitt',{exact:true}).inputValue();
 const freeIds=[];
 for(const type of ['HEADING','IMAGE','ICON','ICON','ICON','BUTTON','BUTTON']){
  await page.getByLabel('Öğe ekle',{exact:true}).selectOption(type);
  const node=page.locator('[data-free-editor-item]').last();const id=await node.getAttribute('data-free-editor-item');freeIds.push(id);
  if(type==='HEADING'||type==='ICON')await node.getByLabel(`free-${id}-title`,{exact:true}).fill('Bilgi');
  if(type==='IMAGE'){
   await node.getByLabel(`free-${id}-imageAlt`,{exact:true}).fill('Bilgi');
   await node.locator(`[data-free-media="${id}-desktop"]`).getByRole('combobox').selectOption('10000000-0000-4000-8000-000000000001');
  }
  if(type==='ICON'){
   await node.locator('[data-free-icon] button').first().click();
   await node.getByRole('button',{name:['ShieldCheck','Zap','Smartphone'][freeIds.length-3],exact:true}).click();
  }
  if(type==='BUTTON'){
   await node.getByLabel(`free-${id}-cta`,{exact:true}).fill('Ülke ara');
   await node.getByLabel(`free-${id}-href`,{exact:true}).selectOption('/esim');
  }
 }
 assert.equal(await page.locator('[data-free-editor-item]').count(),7);
 await page.getByLabel(`layout-${freeSection}-desktop`,{exact:true}).selectOption('image-left');
 await page.getByLabel(`layout-${freeSection}-tablet`,{exact:true}).selectOption('image-right');
 await page.getByLabel(`layout-${freeSection}-mobile`,{exact:true}).selectOption('image-top');
 for(const [width,device]of [[390,'mobile'],[768,'tablet'],[1440,'desktop']]){
  await page.getByRole('button',{name:`${width} px`,exact:true}).click();
  await page.waitForFunction(width=>document.querySelector('iframe').contentDocument.documentElement.clientWidth===width,width);
  const output=frame.locator(`[data-editorial-section="${freeSection}"]`);
  const elements=output.locator('[data-editorial-element]');await elements.first().waitFor();assert.equal(await elements.count(),7,'one DOM instance per element');
  assert.equal(await output.locator('[data-element-type="ICON"]').count(),3);assert.equal(await output.locator('a').count(),2);
  const picture=await output.locator('[data-element-type="IMAGE"]').boundingBox(),heading=await output.locator('[data-element-type="HEADING"]').boundingBox();
  assert.ok(picture&&heading);if(device==='desktop')assert.ok(picture.x<heading.x);if(device==='tablet')assert.ok(picture.x>heading.x);if(device==='mobile')assert.ok(picture.y<heading.y);
  assert.equal(await frame.locator('body').evaluate(e=>e.scrollWidth<=e.clientWidth),true,'free section no horizontal overflow');
  await output.screenshot({path:`artifacts/builder-preview/free-section-${width}.png`});
 }
 await page.getByRole('button',{name:'Yukarı: '+freeSection,exact:true}).click();
 const reordered=await page.getByLabel('Abschnitt',{exact:true}).locator('option').evaluateAll(nodes=>nodes.map(n=>n.value));assert.notEqual(reordered.at(-1),freeSection);
 await page.getByRole('button',{name:'Abschnitt duplizieren',exact:true}).click();
 const duplicateId=await page.getByLabel('Abschnitt',{exact:true}).inputValue();assert.notEqual(duplicateId,freeSection);
 const duplicateNodes=await page.locator('[data-free-editor-item]').evaluateAll(nodes=>nodes.map(n=>n.dataset.freeEditorItem));assert.equal(duplicateNodes.some(id=>freeIds.includes(id)),false,'duplicate gets fresh child IDs');
 await page.getByLabel('Şablon adı',{exact:true}).fill('Sicherheitsmerkmale');
 await page.getByRole('button',{name:'Kendi şablonum olarak kaydet',exact:true}).click();
 await page.getByRole('button',{name:'+ Yeni bölüm ekle',exact:true}).click();
 await page.getByRole('dialog',{name:'Bölüm kütüphanesi',exact:true}).getByRole('button',{name:'Sicherheitsmerkmale',exact:true}).click();
 const templateInstance=await page.getByLabel('Abschnitt',{exact:true}).inputValue();assert.notEqual(templateInstance,duplicateId);
 const templateTitle=page.locator('[data-free-editor-item]').first();const templateTitleId=await templateTitle.getAttribute('data-free-editor-item');
 await templateTitle.getByLabel(`free-${templateTitleId}-title`,{exact:true}).fill('eSIM');
 await templateTitle.getByText('Manuel çeviriler',{exact:true}).click();
 await templateTitle.getByLabel(`free-${templateTitleId}-title-de`,{exact:true}).fill('Meine Fassung');
 await page.getByRole('button',{name:'Tüm sayfayı 13 dile çevir (DEMO)',exact:true}).click();
 for(const code of ['en','de','fr','es','it','pt','nl','pl','ar','ru','ja','ko','zh'])assert.ok(await templateTitle.getByLabel(`free-${templateTitleId}-title-${code}`,{exact:true}).inputValue(),'new field translated or manually protected: '+code);
 assert.equal(await templateTitle.getByLabel(`free-${templateTitleId}-title-de`,{exact:true}).inputValue(),'Meine Fassung');
 for(const locale of ['de','ar','ja','zh']){await page.getByLabel('Vorschau in',{exact:true}).selectOption(locale);const output=frame.locator(`[data-editorial-section="${templateInstance}"]`);await output.getByRole('heading',{name:locale==='de'?'Meine Fassung':'eSIM',exact:true}).waitFor();assert.equal(await frame.locator('html').getAttribute('dir'),locale==='ar'?'rtl':'ltr');await output.screenshot({path:`artifacts/builder-preview/free-section-${locale}.png`});}
 await page.getByLabel('Vorschau in',{exact:true}).selectOption('tr');
 assert.equal(await frame.locator(`[data-editorial-section="${freeSection}"]`).getByRole('heading',{name:'Bilgi',exact:true}).count(),1,'template edit leaves source independent');
 assert.equal(await frame.locator(`[data-editorial-section="${duplicateId}"]`).getByRole('heading',{name:'Bilgi',exact:true}).count(),1,'template edit leaves duplicate independent');
 await page.getByRole('button',{name:'Yukarı: '+templateInstance,exact:true}).click();
 await page.getByRole('button',{name:'Versionen',exact:true}).click();
 await page.getByRole('button',{name:'Synthetischen Entwurf speichern',exact:true}).click();
 await page.reload();await page.getByRole('button',{name:'Versionen',exact:true}).click();await page.getByRole('button',{name:'Gespeicherten Entwurf laden',exact:true}).click();
 await page.getByRole('button',{name:/^Revision .* → Entwurf$/}).first().click();
 await page.getByRole('button',{name:'Seiten',exact:true}).click();
 const options=await page.getByLabel('Abschnitt',{exact:true}).locator('option').evaluateAll(nodes=>nodes.map(n=>n.value));for(const original of originalOptions)assert.ok(options.includes(original),'pre-existing sections retained');
 for(const id of [freeSection,duplicateId,templateInstance]){await page.getByLabel('Abschnitt',{exact:true}).selectOption(id);assert.equal(await page.locator('[data-free-editor-item]').count(),7);assert.equal(await frame.locator(`[data-editorial-section="${id}"] [data-element-type="IMAGE"] img`).getAttribute('src')!==null,true,'media reference retained');}
 await page.getByRole('button',{name:'+ Yeni bölüm ekle',exact:true}).click();await page.getByRole('dialog',{name:'Bölüm kütüphanesi',exact:true}).getByRole('button',{name:'Sicherheitsmerkmale',exact:true}).waitFor();await page.keyboard.press('Escape');
  assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
 fs.writeFileSync('artifacts/builder-preview/browser-result.json',JSON.stringify({result:'PASS',cjkPlatformFontVerified:true,sourceLocale:'tr',locales:14,viewports:[390,768,1440],remoteRequests:0,screenshots:fs.readdirSync('artifacts/builder-preview').filter(p=>p.endsWith('.png')).length,checks:['fixed Turkish fields','ES preview does not empty TR','whole page Hero+NOTICE in 13 languages','fresh second run zero calls','page summary','13 fixture statuses','explicit manual correction','stale source/manual protection','unknown fixture refuses fake AI','RTL/CJK text','Hero/NOTICE presentation','shared global theme controls','responsive item media 3 devices','configured menu/footer','presentation-only account note','synthetic save/reload/draft restore/publication isolation','original shared Admin shell and all module links','complete default page sections','scaled full frame without mobile clipping','mobile drawer and keyboard close','actual full-site target protocol (synthetic HTTP receiver only)','modular security cards full add/reorder/hide/design/translate/save/reload sequence','free section: create/add seven primitives/layouts/reorder/duplicate/template/reinsert/13 locales/save/reload/restore/independence'],limitation:'UI persistence is a clearly labelled synthetic browser adapter; real PostgreSQL/PostgREST isolation is separately reported; no managed Supabase/Auth, Storage write or paid provider test'},null,2));
 await browser.close();console.log('PASS: TR source / 14 previews / 13 statuses / manual protection / offline fixtures / shared Hero and NOTICE');
})().catch(async error=>{fs.mkdirSync('artifacts/builder-preview',{recursive:true});fs.writeFileSync('artifacts/builder-preview/browser-error.json',JSON.stringify({message:error.message,stack:error.stack},null,2));console.error(error);await activeBrowser?.close();process.exitCode=1;});
