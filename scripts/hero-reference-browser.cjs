// No database, auth mutations, supplier requests or paid translation calls.
const {chromium}=require(process.env.BUILDER_BROWSER_MODULE);
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  const page=await browser.newPage();const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  fs.mkdirSync('artifacts/builder-preview',{recursive:true});
  for(const width of [390,768,1440]) {
   await page.setViewportSize({width,height:1000});
   await page.goto('http://127.0.0.1:8765/builder-preview/?canvas=1&reference=1');
   await page.locator('h1').waitFor();await page.evaluate(()=>document.fonts.ready);
   assert.equal(await page.locator('body').evaluate(e=>e.scrollWidth<=e.clientWidth),true,'reference page overflow');
   const localeSummary=page.locator('.public-header-language');
   assert.notEqual(await localeSummary.locator(':scope > :first-child').evaluate(e=>getComputedStyle(e).display),'none','language flag remains visible');
   assert.notEqual(await localeSummary.locator('.public-header-currency-separator').evaluate(e=>getComputedStyle(e).display),'none','currency separator remains visible');
   assert.equal(await page.locator('.final-hero-accent').innerText(),'Bağlantıda Kal');
   const search=await page.locator('.final-hero-search').boundingBox();assert.ok(search.height<=56,'compact search');
   const header=await page.locator('header').boundingBox();
   const title=await page.locator('h1').boundingBox();assert.ok(title.y>=header.y+header.height,'headline remains below header');assert.ok(title.height>30&&title.width<width,'heading visible');
   assert.equal(await page.locator('.reference-hero-benefits [data-registered-card]').count(),3,'three configured visible items; the fourth is retained, hidden');
   const strip=await page.locator('.reference-hero-benefits').boundingBox();const cards=await page.locator('.reference-hero-benefits [data-registered-card]').evaluateAll(rows=>rows.map(e=>({x:e.getBoundingClientRect().x,y:e.getBoundingClientRect().y,width:e.getBoundingClientRect().width})));
   assert.ok(strip.height<180,'trust strip stays compact');assert.ok(cards.at(-1).x>cards[0].x+strip.width/2,'cards fill the entire strip');assert.ok(cards.every(c=>Math.abs(c.y-cards[0].y)<2),'default trust items share one row');
   assert.ok(await page.locator('.final-hero-photo img').evaluate(e=>e.complete&&e.naturalWidth>0));
   await page.screenshot({path:`artifacts/builder-preview/hero-reference-${width}.png`,fullPage:true});
   const heroBox=await page.locator('[data-testid=pasaport-esim-hero]').boundingBox();
   await page.screenshot({path:`artifacts/builder-preview/hero-reference-top-${width}.png`,clip:{x:0,y:0,width,height:Math.ceil(heroBox.y+heroBox.height)}});
  }
  // Real admin controls -> sanitized message -> SAME V2 public heading, media and trust renderer.
  await page.setViewportSize({width:1840,height:1100});
  await page.goto('http://127.0.0.1:8765/builder-preview/?reference=1');
  const frame=page.frameLocator('iframe');await frame.locator('h1').waitFor();
  for(const locale of ['tr','de','ar']){await page.getByLabel('Vorschau in',{exact:true}).selectOption(locale);await frame.locator(`[data-locale=${locale}]`).waitFor();await page.locator('iframe').screenshot({path:`artifacts/builder-preview/hero-default-${locale}.png`});}
  await page.getByLabel('Vorschau in',{exact:true}).selectOption('tr');
  await page.getByRole('button',{name:'Design',exact:true}).click();
  await page.getByLabel('theme-applyToDark',{exact:true}).check();
  await page.getByLabel('theme-headingFont',{exact:true}).selectOption('Sora');
  await page.getByRole('button',{name:'Seiten',exact:true}).click();
  const trust=page.locator('[data-hero-trust-editor]');const support=trust.locator('[data-hero-trust-item="support"]');
  const card=frame.locator('[data-registered-card="support"]');
  await support.locator('[data-trust-typography] details').evaluateAll(rows=>rows.forEach(e=>e.open=true));
  await page.getByRole('button',{name:'390 px',exact:true}).click();
  await support.locator('[data-item-icon] button').first().click();await support.getByRole('button',{name:'ShieldCheck',exact:true}).click();
  await card.locator('.lucide-shield-check').waitFor();
  await page.locator('iframe').screenshot({path:'artifacts/builder-preview/trust-icon-changed.png'});
  await page.locator('iframe').screenshot({path:'artifacts/builder-preview/trust-font-before.png'});
  for(const [device,size]of [['mobile',15],['tablet',17],['desktop',19]])await support.getByLabel(`trust-support-${device}-titleSize`,{exact:true}).fill(String(size));
  await support.getByLabel('trust-support-base-titleFont',{exact:true}).selectOption('serif');
  await support.getByLabel('trust-support-base-bodyFont',{exact:true}).selectOption('mono');
  await support.getByLabel('trust-support-base-bodySize',{exact:true}).fill('12');
  await support.getByLabel('trust-support-base-bodyWeight',{exact:true}).fill('500');
  await support.getByLabel('trust-support-base-bodyLine',{exact:true}).fill('1.5');
  await support.getByLabel('trust-support-base-circleSize',{exact:true}).fill('44');
  await support.getByLabel('card-support-mobile-iconSize',{exact:true}).fill('28');
  await support.getByText('Manuel çeviri',{exact:true}).click();
  await support.getByLabel('item-manual-title-support-de',{exact:true}).fill('Meine manuelle Hilfe');
  await support.getByLabel('item-title-support',{exact:true}).fill('WhatsApp desteği');
  await support.getByLabel('item-text-support',{exact:true}).fill('Yolculuk için destek');
  await support.getByLabel('trust-support-mobile-showDescription',{exact:true}).selectOption('true');
  await card.locator('p').waitFor({state:'visible'});
  assert.notEqual(await card.locator('p').evaluate(e=>getComputedStyle(e).display),'none');
  assert.match(await card.locator('p').evaluate(e=>getComputedStyle(e).fontFamily),/monospace/);
  assert.equal(await card.locator('p').evaluate(e=>getComputedStyle(e).fontSize),'12px');
  assert.equal(await card.locator('p').evaluate(e=>getComputedStyle(e).lineHeight),'18px');
  assert.equal(await card.locator('.trust-icon-circle').evaluate(e=>getComputedStyle(e).width),'44px');
  assert.equal(await card.locator('.registered-card-icon').evaluate(e=>getComputedStyle(e).width),'28px');
  await support.getByLabel('trust-support-mobile-showDescription',{exact:true}).selectOption('false');
  await card.locator('p').waitFor({state:'hidden'});
  assert.equal(await card.locator('p').evaluate(e=>getComputedStyle(e).display),'none');
  for(const [width,size]of [[390,'15px'],[768,'17px'],[1440,'19px']]){
   await page.getByRole('button',{name:`${width} px`,exact:true}).click();
   await card.locator('h3').evaluate((e,size)=>{if(getComputedStyle(e).fontSize!==size)throw Error('Card font size overridden: '+getComputedStyle(e).fontSize)},size);
   assert.match(await card.locator('h3').evaluate(e=>getComputedStyle(e).fontFamily),/Georgia/);
   await page.locator('iframe').screenshot({path:`artifacts/builder-preview/trust-font-changed-${width}.png`});
  }
  await support.getByLabel('trust-support-mobile-visible',{exact:true}).selectOption('false');
  await page.getByRole('button',{name:'390 px',exact:true}).click();await card.waitFor({state:'hidden'});assert.equal(await card.isVisible(),false);
  await page.getByRole('button',{name:'1440 px',exact:true}).click();await card.waitFor({state:'visible'});assert.equal(await card.isVisible(),true);
  await support.getByLabel('trust-support-mobile-visible',{exact:true}).selectOption('');
  await trust.locator('[data-add-hero-trust]').click();const added=trust.locator('[data-hero-trust-item]').last();await added.locator(':scope > summary').click();
  const id=await added.getAttribute('data-hero-trust-item');await added.getByLabel(`item-title-${id}`,{exact:true}).fill('Bilgi');
  assert.equal(await frame.locator('.reference-hero-benefits [data-registered-card]').count(),4);
  await added.getByLabel('trust-visible-'+id,{exact:true}).uncheck();await frame.locator(`[data-registered-card="${id}"]`).waitFor({state:'detached'});assert.equal(await frame.locator('.reference-hero-benefits [data-registered-card]').count(),3);
  await support.getByLabel('trust-down-support',{exact:true}).click();await frame.locator('.reference-hero-benefits [data-registered-card="setup"]:first-child').waitFor();assert.equal(await frame.locator('.reference-hero-benefits [data-registered-card]').first().getAttribute('data-registered-card'),'setup');
  await page.getByLabel('Vorschau in',{exact:true}).selectOption('de');await frame.locator('[data-locale=de]').waitFor();assert.equal(await card.locator('h3').innerText(),'Meine manuelle Hilfe');
  await page.getByLabel('Vorschau in',{exact:true}).selectOption('tr');
  await page.setViewportSize({width:1440,height:1100});
  await trust.locator('[data-hero-trust-item]').evaluateAll(rows=>rows.forEach(e=>e.open=false));
  await support.evaluate(e=>e.open=true);
  await support.getByLabel('item-title-support',{exact:true}).scrollIntoViewIfNeeded();
  await page.screenshot({path:'artifacts/builder-preview/hero-trust-admin.png'});
  await support.getByLabel('trust-support-base-titleFont',{exact:true}).scrollIntoViewIfNeeded();
  await page.screenshot({path:'artifacts/builder-preview/hero-trust-typography-admin.png'});
  await page.getByLabel('TR:accent',{exact:true}).fill('Düzenlenen vurgu');
  await frame.locator('.final-hero-accent').filter({hasText:'Düzenlenen vurgu'}).waitFor();
  await page.getByLabel('accentColor',{exact:true}).fill('#80ffc0');
  assert.equal(await frame.locator('.final-hero-accent').evaluate(e=>getComputedStyle(e).color),'rgb(128, 255, 192)');
  for(const locale of ['tr','en','de','fr','es','it','pt','nl','pl','ar','ru','ja','ko','zh']) {
   await page.getByLabel('Vorschau in',{exact:true}).selectOption(locale);
   await frame.locator(`[data-locale=${locale}]`).waitFor();
   assert.equal(await frame.locator('html').getAttribute('dir'),locale==='ar'?'rtl':'ltr');
   assert.ok((await frame.locator('h1').innerText()).trim());
   assert.equal(await frame.locator('body').evaluate(e=>e.scrollWidth<=e.clientWidth),true);
   if(['de','fr','ar','ja','zh'].includes(locale))await page.locator('iframe').screenshot({path:`artifacts/builder-preview/hero-reference-${locale}.png`});
  }
  assert.deepEqual(errors,[]);
  fs.writeFileSync('artifacts/builder-preview/hero-reference-result.json',JSON.stringify({status:'PASS',widths:[390,768,1440],locales:14,trustEditFlow:{icon:'ShieldCheck',fontFamily:'Georgia',titleSizes:{mobile:15,tablet:17,desktop:19},mobileDescriptionHidden:true,deviceVisibilityIndependent:true,manualGermanPreserved:true,visibleAfterAdding:4,visibleAfterHiding:3,reordered:true},scope:'synthetic CMS preview with shared public presentation; real auth/search endpoints not called'},null,2));
  console.log('Hero reference browser PASS: 3 viewports, 14 locales, CMS accent binding, all configured trust items.');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
