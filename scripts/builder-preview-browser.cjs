// Browser integration of the real shared controls, preview bridge, media and renderer. No remote requests.
const { chromium } = require(process.env.BUILDER_BROWSER_MODULE);
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [], remote = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1' || url.protocol === 'data:' || url.protocol === 'blob:') return route.continue();
    remote.push(url.hostname); return route.abort();
  });
  fs.mkdirSync('artifacts/builder-preview', { recursive: true });
  await page.goto('http://127.0.0.1:8765/builder-preview/');
  const frame = page.frameLocator('iframe');
  await frame.locator('h1').waitFor();
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width: Math.max(1440, width + 400), height: 1100 });
    await page.getByRole('button', { name: `${width} px`, exact: true }).click();
    await page.locator('iframe').screenshot({ path: `artifacts/builder-preview/before-${width}.png` });
    const size = await frame.locator('h1').evaluate(el => getComputedStyle(el).fontSize);
    assert.equal(size, width >= 1024 ? '52px' : '30px', `default size at ${width}`);
  }
  // Editing subtitle alone must no longer be overwritten by default title substitution.
  await page.getByLabel('Abschnittstext', { exact: true }).fill('Nur dieser Untertitel wurde im Editor geändert.');
  await frame.getByText('Nur dieser Untertitel wurde im Editor geändert.', { exact: true }).waitFor();
  await page.getByLabel('Überschrift', { exact: true }).fill('Dein nächstes Abenteuer');
  await page.getByLabel('headingColor', { exact: true }).fill('#76edc5');
  await page.getByLabel('Yazı ailesi', { exact: true }).selectOption('heading');
  for (const [device, size] of [['mobile', 28], ['tablet', 36], ['desktop', 50]]) await page.getByLabel(`${device}-headingSize`, { exact: true }).fill(String(size));
  const desktopCrop = page.locator('fieldset').filter({ has: page.locator('legend', { hasText: 'desktop · Bild' }) });
  const horizontal = desktopCrop.getByRole('slider', { name: 'Yatay konum', exact: true });
  await horizontal.focus(); await horizontal.press('Home'); await horizontal.press('ArrowRight');
  await page.waitForFunction(() => document.querySelector('iframe').contentWindow.getComputedStyle(document.querySelector('iframe').contentDocument.querySelector('.final-hero-photo img')).objectPosition.startsWith('1%'));
  await page.getByLabel('tablet-Bild', { exact: true }).selectOption('10000000-0000-4000-8000-000000000002');
  for (const [width, size] of [[390, '28px'], [768, '36px'], [1440, '50px']]) {
    await page.setViewportSize({ width: Math.max(1440, width + 400), height: 1100 });
    await page.getByRole('button', { name: `${width} px`, exact: true }).click();
    await frame.getByRole('heading', { name: 'Dein nächstes Abenteuer' }).waitFor();
    await page.waitForFunction(() => {
      const doc = document.querySelector('iframe').contentDocument;
      return doc?.querySelector('h1') && doc.defaultView.getComputedStyle(doc.querySelector('h1')).color === 'rgb(118, 237, 197)';
    });
    assert.equal(await frame.locator('h1').evaluate(el => getComputedStyle(el).fontSize), size);
    assert.match(await frame.locator('h1').evaluate(el => getComputedStyle(el).fontFamily), /Outfit/);
    const img = frame.locator('.final-hero-photo img');
    await img.evaluate(el => el.decode());
    const src = await img.evaluate(el => el.currentSrc);
    assert.equal(src.includes('pasaport-mediterranean-terrace'), width === 768, `tablet art direction ${width}`);
    assert.equal(await frame.locator('body').evaluate(el => el.scrollWidth <= el.clientWidth), true, `overflow ${width}`);
    await page.locator('iframe').screenshot({ path: `artifacts/builder-preview/after-${width}.png` });
  }
  await page.getByLabel('Sprache', { exact: true }).selectOption('tr');
  await frame.getByRole('heading', { name: 'Her Zaman Bağlantıda Kal' }).waitFor();
  await page.getByLabel('Sprache', { exact: true }).selectOption('de');
  await frame.getByRole('heading', { name: 'Dein nächstes Abenteuer' }).waitFor();
  await page.getByLabel('Abschnitt', { exact: true }).selectOption('builder-notice');
  await page.getByLabel('Überschrift', { exact: true }).fill('Editierbarer Hinweis');
  await page.getByLabel('Abschnittstext', { exact: true }).fill('Auch dieser Abschnitt übernimmt die Editorwerte.');
  await page.getByLabel('headingColor', { exact: true }).fill('#f0cd7b');
  await page.getByLabel('mobile-headingSize', { exact: true }).fill('24');
  await page.getByLabel('Hintergrund', { exact: true }).fill('#173939');
  await page.getByLabel('Abstände', { exact: true }).selectOption('large');
  await page.getByRole('button', { name: '390 px', exact: true }).click();
  await frame.getByText('Editierbarer Hinweis', { exact: true }).waitFor();
  await page.waitForTimeout(150);
  const notice = frame.locator('[data-v2-heading]');
  assert.equal(await notice.evaluate(el => getComputedStyle(el).fontSize), '24px');
  assert.equal(await notice.evaluate(el => getComputedStyle(el).color), 'rgb(240, 205, 123)');
  assert.equal(await frame.locator('[data-builder-section=notice]').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(23, 57, 57)');
  await page.locator('iframe').screenshot({ path: 'artifacts/builder-preview/notice-390.png' });
  // Reset restores defaults without persistence; inspect every locale/RTL and long wrapping.
  await page.getByRole('button', { name: 'Vorher / vollständig zurücksetzen' }).click();
  for (const locale of ['tr','en','de','fr','es','it','pt','nl','pl','ar','ru','ja','ko','zh']) {
    await page.getByLabel('Sprache', { exact: true }).selectOption(locale);
    await frame.locator(`[data-locale="${locale}"]`).waitFor();
    assert.equal(await frame.locator('html').getAttribute('dir'), locale === 'ar' ? 'rtl' : 'ltr');
    assert.ok((await frame.locator('h1').innerText()).trim(), `heading ${locale}`);
    assert.equal(await frame.locator('body').evaluate(el => el.scrollWidth <= el.clientWidth), true, `locale overflow ${locale}`);
    if (['tr','de','en','fr','ar','ja','zh'].includes(locale)) await page.locator('iframe').screenshot({ path: `artifacts/builder-preview/locale-${locale}-390.png` });
  }
  await page.getByLabel('Sprache', { exact: true }).selectOption('de');
  await page.getByRole('button', { name: '390 px', exact: true }).click();
  for (const width of [390,1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.screenshot({ path: `artifacts/builder-preview/editor-${width}.png`, fullPage: true });
  }
  assert.deepEqual(errors, [], 'browser errors');
  assert.deepEqual(remote, [], 'demo must not contact Supabase or any other external host');
  fs.writeFileSync('artifacts/builder-preview/browser-result.json', JSON.stringify({ result: 'PASS', viewports: [390,768,1440], locales: 14, remoteRequests: 0, screenshots: 16, checks: ['subtitle-only edit','heading/font/color/size controls','tablet art direction','NOTICE design','RTL','overflow','reset'], limitation: 'disconnected acceptance demo; no authenticated database save or shop search E2E' }, null, 2));
  await browser.close();
  console.log('PASS: builder controls → sanitized postMessage → shared renderers, 3 viewports, 14 locales, no remote requests');
})().catch(error => { console.error(error); process.exitCode = 1; });
