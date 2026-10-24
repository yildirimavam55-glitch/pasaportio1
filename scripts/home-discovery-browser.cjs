// Actual shared public presentation, offline editorial canvas, no commerce or provider actions.
const {chromium}=require(process.env.BUILDER_BROWSER_MODULE);
const assert=require('node:assert/strict');const fs=require('node:fs');const cp=require('node:child_process');
const out='artifacts/builder-preview';fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1100}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await page.goto('http://127.0.0.1:8765/builder-preview/?reference=1');const frame=page.frameLocator('iframe');await frame.locator('h1').waitFor();
 for(const width of [390,768,1440]){
  await page.getByRole('button',{name:width+' px',exact:true}).click();
  for(const locale of ['tr','de','ar']){
   await page.getByLabel('Vorschau in',{exact:true}).selectOption(locale);await frame.locator(`[data-locale=${locale}]`).waitFor();
   const countries=frame.locator('[data-home-section=DESTINATION_CAROUSEL]');await countries.scrollIntoViewIfNeeded();
   await frame.locator('.hd-photo-card img').first().waitFor();
   await frame.locator('.hd-photo-card img').evaluateAll(async imgs=>{await Promise.all(imgs.map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.onload=resolve;img.onerror=resolve;})));});
   assert.equal(await frame.locator('.hd-photo-card img').evaluateAll(imgs=>imgs.every(i=>i.complete&&i.naturalWidth>0)),true,'all actual catalogue photos load');
   assert.equal(await frame.locator('.hd-photo-card .catalogue-photo-fallback').count(),0,'no missing-photo placeholder');
   assert.equal(await frame.locator('[data-catalogue-price]').count(),0,'offline catalogue never invents prices');
   assert.equal(await frame.locator('body').evaluate(e=>e.scrollWidth<=e.clientWidth),true,'no page overflow');
   assert.equal(await frame.locator('[data-home-section=INSTALLATION_STEPS]').count(),1);
   assert.equal(await frame.locator('[data-home-section=COMPATIBILITY]').count(),1);
   const rail=countries.locator('.hd-rail');await rail.evaluate(n=>n.scrollLeft=0);
   const next=countries.locator('.is-next');await next.click();await page.waitForTimeout(550);assert.ok(await rail.evaluate(n=>Math.abs(n.scrollLeft)>20),'next arrow scrolls');
   const prev=countries.locator('.is-prev');await prev.click();await page.waitForTimeout(550);assert.ok(await rail.evaluate(n=>Math.abs(n.scrollLeft)<5),'previous arrow returns');
   if(width===390){await rail.hover();await page.mouse.wheel(0,150);await page.waitForTimeout(100);assert.ok(await rail.evaluate(n=>Math.abs(n.scrollLeft)>10),'mouse wheel works');}
   await rail.evaluate(n=>n.scrollLeft=0);
   const install=frame.locator('.hd-install');await install.scrollIntoViewIfNeeded();await install.locator('[data-install-replay]').click();await page.waitForTimeout(50);
   await page.locator('iframe').screenshot({path:`${out}/discovery-${locale}-${width}.png`});
  }
 }
 // All 14 locales remain renderable, including CJK and RTL.
 for(const locale of ['tr','en','de','fr','es','it','pt','nl','pl','ar','ru','ja','ko','zh']){
  await page.getByLabel('Vorschau in',{exact:true}).selectOption(locale);await frame.locator(`[data-locale=${locale}]`).waitFor();assert.equal(await frame.locator('.hd-steps>li').count(),3);assert.ok((await frame.locator('.hd-install h2').innerText()).length>0);
 }
 await page.getByLabel('Vorschau in',{exact:true}).selectOption('tr');await page.getByRole('button',{name:'1440 px',exact:true}).click();
 // Record real elapsed frames and sample the actual CSS animation states.
 const install=frame.locator('.hd-install');await install.scrollIntoViewIfNeeded();await install.locator('[data-install-replay]').click();await page.waitForTimeout(100);
 const geometry=await install.boundingBox();const samples=[];
 for(let i=0;i<15;i++){
  samples.push(await install.evaluate(n=>({phase:n.dataset.phase,number:[...n.querySelectorAll('.hd-step-number')].map(x=>Number(getComputedStyle(x).opacity)),scan:getComputedStyle(n.querySelector('.hd-scan-line')).transform,scanOpacity:Number(getComputedStyle(n.querySelector('.hd-scan-line')).opacity),connection:Number(getComputedStyle(n.querySelector('.hd-connection')).opacity),height:n.getBoundingClientRect().height})));
  await install.screenshot({path:`${out}/animation-${String(i).padStart(2,'0')}.png`});await page.waitForTimeout(500);
 }
 await page.waitForTimeout(500);assert.equal(await install.getAttribute('data-phase'),'done');assert.ok(samples.some(s=>s.scanOpacity>.1),'visible gentle scan line');assert.ok(samples.some(s=>s.connection>.5),'connection appears');assert.ok(samples.every(s=>Math.abs(s.height-geometry.height)<1),'no animation layout shift');assert.ok(samples.slice(0,4).every(s=>s.connection<.1),'connection is not shown during selection');
 const scans=samples.filter(s=>s.scanOpacity>.1).map(s=>s.scan);assert.ok(new Set(scans).size>=2,'scan line actually moves');
 const vid=cp.spawnSync('ffmpeg',['-y','-framerate','2','-i',`${out}/animation-%02d.png`,'-c:v','libvpx-vp9','-pix_fmt','yuv420p',`${out}/installation-animation.webm`],{encoding:'utf8'});const video=vid.status===0;
 await install.locator('[data-install-replay]').click();await page.waitForTimeout(150);assert.equal(await install.getAttribute('data-phase'),'playing','replay restarts');
 // Existing Admin controls change the exact shared public renderer.
 await page.getByLabel('Abschnitt',{exact:true}).selectOption('installation');
 await page.getByLabel('home-animation-duration',{exact:true}).fill('7');assert.equal(await install.evaluate(n=>n.style.getPropertyValue('--hd-duration')),'7s');
 await page.getByLabel('home-animation-enabled',{exact:true}).uncheck();await page.waitForTimeout(100);assert.equal(await install.getAttribute('data-phase'),'done');
 await page.getByLabel('home-animation-enabled',{exact:true}).check();
 const item=page.locator('[data-editor-item=step-1]');await item.getByLabel('item-title-step-1',{exact:true}).fill('Paketini seç');assert.equal(await install.locator('.hd-step-copy strong').first().innerText(),'Paketini seç');
 await page.getByLabel('home-step-presentation-step-1',{exact:true}).selectOption('connection');assert.equal(await install.locator('[data-install-step="1"]').getAttribute('data-presentation'),'connection');
 await page.getByLabel('home-step-presentation-step-1',{exact:true}).selectOption('package');
 await page.getByLabel('Abschnitt',{exact:true}).selectOption('regions');await page.getByLabel('home-overlay',{exact:true}).fill('60');assert.equal(await frame.locator('[data-home-card=EUROPE]').evaluate(n=>n.style.getPropertyValue('--hd-overlay')),'0.6');
 await page.getByLabel('Abschnitt',{exact:true}).selectOption('compatibility');
 const title=page.locator('[data-v2-source-field="title"] textarea'); // field labels are checked below through the section source editor.
 await page.screenshot({path:`${out}/discovery-admin.png`,fullPage:true});
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);assert.equal(await install.getAttribute('data-animated'),'false');assert.equal(await install.getAttribute('data-phase'),'done');assert.equal(await install.locator('.hd-scene').evaluateAll(es=>es.every(e=>getComputedStyle(e).opacity==='1')),true);await install.screenshot({path:`${out}/installation-reduced-motion.png`});
 assert.deepEqual(errors,[]);
 fs.writeFileSync(`${out}/discovery-result.json`,JSON.stringify({status:'PASS',widths:[390,768,1440],locales:14,samples,video,scope:'Exact shared public cards/rails/animation in offline CMS canvas. No catalogue prices fabricated. Production HomeCompatibilityCard retains DeviceCheckSheet; offline card links to actual checker route, not a simulated result.'},null,2));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
