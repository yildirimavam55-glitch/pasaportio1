// True browser test of fixed TR editing, explicit manual mode, offline fixture statuses and shared renderer.
const { chromium } = require(process.env.BUILDER_BROWSER_MODULE);
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
 const browser = await chromium.launch({ channel:'chrome', headless:true });
 const page = await browser.newPage({viewport:{width:1840,height:1100}});
 const errors=[],remote=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{const u=new URL(route.request().url());if(u.hostname==='127.0.0.1'||['data:','blob:'].includes(u.protocol))return route.continue();remote.push(u.hostname);return route.abort();});
 fs.mkdirSync('artifacts/builder-preview',{recursive:true});
 await page.goto('http://127.0.0.1:8765/builder-preview/');
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
  await page.locator('aside').evaluate(e=>e.scrollTop=0);
  await page.screenshot({path:`artifacts/builder-preview/editor-${width}.png`,fullPage:true});
 }
 assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
 fs.writeFileSync('artifacts/builder-preview/browser-result.json',JSON.stringify({result:'PASS',cjkPlatformFontVerified:true,sourceLocale:'tr',locales:14,viewports:[390,768,1440],remoteRequests:0,screenshots:fs.readdirSync('artifacts/builder-preview').filter(p=>p.endsWith('.png')).length,checks:['fixed Turkish fields','ES preview does not empty TR','whole page Hero+NOTICE in 13 languages','fresh second run zero calls','page summary','13 fixture statuses','explicit manual correction','stale source/manual protection','unknown fixture refuses fake AI','RTL/CJK text','Hero/NOTICE presentation'],limitation:'fixtures only; no paid provider, authentication or database-save integration executed'},null,2));
 await browser.close();console.log('PASS: TR source / 14 previews / 13 statuses / manual protection / offline fixtures / shared Hero and NOTICE');
})().catch(error=>{console.error(error);process.exitCode=1;});
