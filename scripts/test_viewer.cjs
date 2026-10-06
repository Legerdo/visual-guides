/* Browser regression checks for the viewport-based Visual Guides reader.
 * Build first: python scripts/build_site.py
 * Run: node scripts/test_viewer.cjs
 * Playwright is a development-only tool; resolve it through PLAYWRIGHT_MODULE
 * or an existing installation. QA_BROWSER_PATH can select installed Edge/Chrome.
 * QA_BASE_URL can target an already running preview instead of the local build.
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const http = require('node:http');
const os = require('node:os');
let playwright;
for (const modulePath of [process.env.PLAYWRIGHT_MODULE, process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES && path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, 'playwright'), 'playwright'].filter(Boolean)) {
  try { playwright = require(modulePath); break; } catch (_) {}
}
if (!playwright) throw new Error('Playwright must be available through PLAYWRIGHT_MODULE, the shared runtime, or node_modules.');
let base = process.env.QA_BASE_URL || '';
let server;
let browser;
const out = process.env.QA_OUTPUT_DIR || fs.mkdtempSync(path.join(os.tmpdir(), 'visual-guides-qa-'));
fs.mkdirSync(out, { recursive: true });
const report = { base, browser: null, cases: [], geometries: [], consoleErrors: [] };
async function startPreview() {
  if (base) {
    base = base.endsWith('/') ? base : base + '/';
    report.base = base;
    return;
  }
  const root = path.resolve(process.env.QA_SITE_DIR || path.join(__dirname, '..', '_site'));
  assert.ok(fs.existsSync(path.join(root, 'catalog.json')), 'Run python scripts/build_site.py first');
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif' };
  server = http.createServer((request, response) => {
    let file;
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    } catch (_) {
      response.writeHead(400).end();
      return;
    }
    if (!file.startsWith(root + path.sep)) {
      response.writeHead(403).end();
      return;
    }
    fs.readFile(file, (error, content) => {
      if (error) {
        response.writeHead(404).end();
        return;
      }
      response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      response.end(content);
    });
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  base = 'http://127.0.0.1:' + server.address().port + '/';
  report.base = base;
}
const viewportSizes = [[1920, 1080], [1366, 768], [1280, 720], [390, 844], [320, 568], [844, 390], [601, 800], [620, 800]];
const urlFor = (guide, page = 1) => base + '#' + new URLSearchParams({ guide: guide.slug, page: String(page) });
const near = (a, b, tolerance = 1.1) => Math.abs(a - b) <= tolerance;
async function settle(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function imageLoaded(page) {
  await page.waitForFunction(() => {
    const image = document.getElementById('viewer-image');
    return image && image.complete && image.naturalWidth > 0 && image.getBoundingClientRect().width > 0 && getComputedStyle(image).visibility !== 'hidden' && document.getElementById('image-scroller').getAttribute('aria-busy') !== 'true';
  });
  await page.waitForFunction(() => {
    const canvas = document.getElementById('image-canvas');
    return !document.querySelector('.page-transition-ghost') &&
      (!canvas.getAnimations || canvas.getAnimations().every(animation => animation.playState === 'finished'));
  });
  await settle(page);
}
async function geometry(page) {
  return page.evaluate(() => {
    const image = document.getElementById('viewer-image');
    const stage = document.getElementById('image-scroller');
    const rect = element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
    return {
      viewport: [innerWidth, innerHeight],
      document: [document.documentElement.clientWidth, document.documentElement.clientHeight, document.documentElement.scrollWidth, document.documentElement.scrollHeight],
      scroll: [scrollX, scrollY], image: rect(image), natural: [image.naturalWidth, image.naturalHeight],
      stage: { ...rect(stage), clientWidth: stage.clientWidth, clientHeight: stage.clientHeight, scrollWidth: stage.scrollWidth, scrollHeight: stage.scrollHeight, scrollLeft: stage.scrollLeft, scrollTop: stage.scrollTop },
      fitPressed: document.getElementById('fit-button').getAttribute('aria-pressed'),
      widthPressed: document.getElementById('width-button').getAttribute('aria-pressed'),
      fitLabel: document.getElementById('fit-button').textContent.trim(),
      indicator: document.getElementById('page-indicator').textContent.trim(), hash: location.hash,
      controls: Array.from(document.querySelectorAll('#viewer-card .reader-header button, #viewer-card .viewer-toolbar button')).filter(element => element.getBoundingClientRect().width > 0 && getComputedStyle(element).visibility !== 'hidden').map(element => ({ id: element.id, text: element.textContent.trim(), ...rect(element) })),
    };
  });
}
function noDocumentOverflow(g) {
  assert.ok(g.document[2] <= g.viewport[0] + 1 && g.document[3] <= g.viewport[1] + 1, `document overflow: ${JSON.stringify(g)}`);
  assert.ok(near(g.scroll[0], 0) && near(g.scroll[1], 0), `document scrolled: ${g.scroll}`);
}
async function assertFit(page) {
  await imageLoaded(page);
  const g = await geometry(page);
  noDocumentOverflow(g);
  for (const control of g.controls) {
    assert.ok(control.x >= -1 && control.y >= -1 && control.right <= g.viewport[0] + 1 && control.bottom <= g.viewport[1] + 1, `reader control outside viewport: ${JSON.stringify(control)} in ${g.viewport}`);
  }
  assert.equal(g.fitPressed, 'true', 'default/reset mode must be screen fit');
  assert.ok(g.stage.scrollWidth <= g.stage.clientWidth + 1, `stage scrolls horizontally: ${JSON.stringify(g.stage)}`);
  assert.ok(g.stage.scrollHeight <= g.stage.clientHeight + 1, `stage scrolls vertically: ${JSON.stringify(g.stage)}`);
  assert.ok(g.image.x >= g.stage.x - 1 && g.image.y >= g.stage.y - 1 && g.image.right <= g.stage.x + g.stage.clientWidth + 1 && g.image.bottom <= g.stage.y + g.stage.clientHeight + 1, `image cropped in stage: ${JSON.stringify(g)}`);
  assert.ok(g.image.x >= -1 && g.image.y >= -1 && g.image.right <= g.viewport[0] + 1 && g.image.bottom <= g.viewport[1] + 1, `image outside viewport: ${JSON.stringify(g)}`);
  assert.ok(Math.abs(g.image.width / g.image.height - g.natural[0] / g.natural[1]) < .006, 'image aspect ratio changed');
  assert.ok(near(g.stage.scrollLeft, 0) && near(g.stage.scrollTop, 0), `fit not reset to origin: ${JSON.stringify(g.stage)}`);
  return g;
}
async function pageNumber(page, number, total) {
  await page.waitForFunction(([number, total]) => document.getElementById('page-indicator').textContent.trim() === `${number} / ${total}`, [number, total]);
  await imageLoaded(page);
}
async function expectFocus(page, id) {
  await page.waitForFunction(id => document.activeElement && document.activeElement.id === id, id);
}
async function run(name, fn) {
  try { await fn(); report.cases.push({ name, status: 'passed' }); console.log(`PASS ${name}`); }
  catch (error) { report.cases.push({ name, status: 'failed', error: error.stack || String(error) }); console.error(`FAIL ${name}: ${error.message}`); }
}
(async () => {
  await startPreview();
  const launch = { headless: true, args: ['--no-sandbox'] };
  if (process.env.QA_BROWSER_PATH) launch.executablePath = process.env.QA_BROWSER_PATH;
  browser = await playwright.chromium.launch(launch);
  report.browser = browser.version();
  const probe = await browser.newContext();
  const response = await probe.request.get(base + 'catalog.json');
  assert.ok(response.ok(), 'catalog must load');
  const catalog = await response.json();
  const guides = catalog.guides;
  const multi = guides.find(guide => guide.assets.length > 1);
  assert.ok(multi, 'navigation regression needs the existing multi-page guide');
  report.catalog = { guideCount: guides.length, pageCount: guides.reduce((n, guide) => n + guide.assets.length, 0) };
  await probe.close();
  async function fresh(options = {}) {
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, ...options });
    const page = await context.newPage();
    page.setDefaultTimeout(7000);
    page.on('pageerror', error => report.consoleErrors.push(String(error)));
    return { context, page };
  }
  for (const [width, height] of viewportSizes) {
    await run(`all actual images fit ${width}x${height}`, async () => {
      const { context, page } = await fresh({ viewport: { width, height }, isMobile: width < 500, hasTouch: width < 900 });
      try {
        for (const guide of guides) {
          await page.goto(urlFor(guide));
          for (let index = 0; index < guide.assets.length; index++) {
            if (index) await page.locator('#next-button').click();
            await pageNumber(page, index + 1, guide.assets.length);
            const g = await assertFit(page);
            report.geometries.push({ guide: guide.slug, page: index + 1, ...g });
          }
        }
        await page.goto(urlFor(multi)); await assertFit(page);
        await page.screenshot({ path: path.join(out, `reader-${width}x${height}.png`) });
      } finally { await context.close(); }
    });
  }
  await run('mouse wheel page turns animate, Ctrl+wheel zooms image, reset shortcuts', async () => {
    const { context, page } = await fresh();
    try {
      await page.goto(urlFor(multi)); const fit = await assertFit(page);
      const stage = fit.stage;
      await page.mouse.move(stage.x + stage.width * .5, stage.y + stage.height * .5);
      await page.mouse.wheel(0, 120);
      await page.waitForFunction(() => document.querySelector('.page-transition-ghost') || document.getElementById('image-canvas').getAnimations().length > 0);
      await pageNumber(page, 2, multi.assets.length); await assertFit(page);
      await page.waitForTimeout(340);
      await page.mouse.wheel(0, -120); await pageNumber(page, 1, multi.assets.length); await assertFit(page);

      const browserBefore = await page.evaluate(() => ({
        dpr: devicePixelRatio,
        width: innerWidth,
        height: innerHeight,
        visualScale: visualViewport ? visualViewport.scale : 1
      }));
      await page.keyboard.down('Control');
      await page.mouse.wheel(0, -180);
      await page.keyboard.up('Control');
      await settle(page);
      const zoomed = await geometry(page);
      assert.equal(zoomed.indicator, '1 / ' + multi.assets.length, 'Ctrl+wheel must not turn the page');
      assert.equal(zoomed.fitPressed, 'false', 'Ctrl+wheel must leave screen-fit mode');
      assert.ok(zoomed.image.width > fit.image.width + 20, 'Ctrl+wheel should enlarge the image');
      const browserAfter = await page.evaluate(() => ({
        dpr: devicePixelRatio,
        width: innerWidth,
        height: innerHeight,
        visualScale: visualViewport ? visualViewport.scale : 1
      }));
      assert.deepEqual(browserAfter, browserBefore, 'Ctrl+wheel must not change browser zoom');

      const scrollBefore = zoomed.stage.scrollTop;
      await page.mouse.wheel(0, 160); await settle(page);
      const panned = await geometry(page);
      assert.equal(panned.indicator, zoomed.indicator, 'normal wheel must pan instead of turning an enlarged image');
      assert.ok(panned.stage.scrollTop >= scrollBefore, 'normal wheel should remain available for enlarged-image panning');

      await page.keyboard.press('r'); await assertFit(page);
      await page.keyboard.down('Control'); await page.mouse.wheel(0, -180); await page.keyboard.up('Control'); await settle(page);
      assert.equal((await geometry(page)).fitPressed, 'false');
      await page.keyboard.press('Control+0'); await assertFit(page);
      assert.deepEqual(await page.evaluate(() => ({
        dpr: devicePixelRatio,
        width: innerWidth,
        height: innerHeight,
        visualScale: visualViewport ? visualViewport.scale : 1
      })), browserBefore, 'Ctrl+0 must reset the image without changing browser zoom');
    } finally { await context.close(); }
  });
  await run('buttons, keyboard, boundaries, cached image resets', async () => {
    const { context, page } = await fresh();
    try {
      await page.goto(urlFor(multi)); await assertFit(page);
      assert.ok(await page.locator('#prev-button').isDisabled());
      assert.ok(await page.locator('#stage-prev-button').isDisabled());
      await page.locator('#next-button').click(); await pageNumber(page, 2, multi.assets.length);
      assert.equal(new URLSearchParams((await geometry(page)).hash.slice(1)).get('page'), '2');
      await page.keyboard.press('ArrowRight'); await pageNumber(page, 3, multi.assets.length);
      await page.locator('#stage-prev-button').click(); await pageNumber(page, 2, multi.assets.length);
      await page.keyboard.press('ArrowLeft'); await pageNumber(page, 1, multi.assets.length);
      for (let i = 0; i < multi.assets.length + 1; i++) await page.keyboard.press('ArrowRight');
      await pageNumber(page, multi.assets.length, multi.assets.length);
      assert.ok(await page.locator('#next-button').isDisabled());
      assert.ok(await page.locator('#stage-next-button').isDisabled());
      await page.locator('#zoom-in-button').click(); await settle(page);
      assert.equal((await geometry(page)).fitPressed, 'false');
      await page.locator('#prev-button').click(); await pageNumber(page, multi.assets.length - 1, multi.assets.length); await assertFit(page);
      await page.keyboard.press('ArrowRight'); await pageNumber(page, multi.assets.length, multi.assets.length); await assertFit(page);
    } finally { await context.close(); }
  });
  await run('dialog modal behavior, Escape, focus return, thumbnail selection', async () => {
    const { context, page } = await fresh();
    try {
      await page.goto(urlFor(multi)); await assertFit(page);
      await page.locator('#pages-button').click();
      assert.equal(await page.locator('#page-dialog').evaluate(element => element.open), true);
      const before = (await geometry(page)).indicator;
      await page.keyboard.press('ArrowRight');
      assert.equal((await geometry(page)).indicator, before, 'reader shortcut must not run inside modal');
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.getElementById('page-dialog').open);
      await expectFocus(page, 'pages-button');
      assert.ok(await page.locator('#guide-view').isVisible());
      await page.locator('#info-button').click();
      assert.ok(await page.locator('#details-dialog').isVisible());
      await page.locator('#close-details-button').click(); await expectFocus(page, 'info-button');
      await page.locator('#pages-button').click();
      await page.locator('.thumbnail-button').nth(2).click();
      await pageNumber(page, 3, multi.assets.length);
      assert.equal(await page.locator('#page-dialog').evaluate(element => element.open), false);
      await assertFit(page);
      await page.locator('#info-button').click(); await page.keyboard.press('Escape');
      await expectFocus(page, 'info-button');
      assert.ok(await page.locator('#guide-view').isVisible());
    } finally { await context.close(); }
  });
  await run('width mode, zoom, complete pan bounds, double-click, resize', async () => {
    const { context, page } = await fresh();
    try {
      await page.goto(urlFor(multi)); const fit = await assertFit(page);
      await page.locator('#viewer-image').dblclick(); await settle(page);
      assert.equal((await geometry(page)).fitPressed, 'false', 'double-click should zoom');
      await page.locator('#viewer-image').dblclick(); await assertFit(page);
      await page.keyboard.press('w'); await settle(page);
      const width = await geometry(page); noDocumentOverflow(width);
      assert.equal(width.widthPressed, 'true');
      assert.ok(width.image.width > fit.image.width + 20, 'portrait must become larger in width mode');
      assert.ok(width.stage.scrollHeight > width.stage.clientHeight + 20, 'width mode should allow intentional vertical scroll');
      await page.keyboard.press('ArrowRight');
      assert.equal((await geometry(page)).indicator, fit.indicator, 'arrow keys must pan instead of turning an enlarged page');
      for (let i = 0; i < 6 && await page.locator('#zoom-in-button').isEnabled(); i++) await page.locator('#zoom-in-button').click();
      await settle(page);
      const zoom = await geometry(page); noDocumentOverflow(zoom);
      assert.ok(zoom.stage.scrollWidth > zoom.stage.clientWidth, 'zoomed image should allow horizontal pan');
      await page.locator('#image-scroller').evaluate(element => element.scrollTo({ left: 0, top: 0 }));
      await settle(page);
      const first = await geometry(page);
      assert.ok(first.image.x >= first.stage.x - 1 && first.image.y >= first.stage.y - 1, 'top and left image edges unreachable');
      const dragX = first.stage.x + first.stage.width * .55;
      const dragY = first.stage.y + first.stage.height * .5;
      await page.mouse.move(dragX, dragY); await page.mouse.down();
      await page.mouse.move(dragX - 120, dragY - 90, { steps: 5 }); await page.mouse.up();
      await settle(page);
      const dragged = await geometry(page);
      assert.ok(dragged.stage.scrollLeft > first.stage.scrollLeft + 100 && dragged.stage.scrollTop > first.stage.scrollTop + 70, `mouse drag did not pan image: ${JSON.stringify(dragged.stage)}`);
      await page.locator('#image-scroller').evaluate(element => element.scrollTo({ left: element.scrollWidth, top: element.scrollHeight }));
      await settle(page);
      const last = await geometry(page);
      assert.ok(last.image.right <= last.stage.x + last.stage.clientWidth + 1 && last.image.bottom <= last.stage.y + last.stage.clientHeight + 1, 'bottom and right image edges unreachable');
      await page.setViewportSize({ width: 390, height: 844 }); await settle(page); noDocumentOverflow(await geometry(page));
      await page.locator('#fit-button').click(); await assertFit(page);
      await page.setViewportSize({ width: 1280, height: 720 }); await assertFit(page);
      await page.keyboard.press('+'); await settle(page);
      await page.keyboard.press('0'); await assertFit(page);
    } finally { await context.close(); }
  });
  await run('native touch vertical/horizontal scroll gestures turn pages and enlarged images pan', async () => {
    const { context, page } = await fresh({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    try {
      await page.goto(urlFor(multi)); await assertFit(page);
      const cdp = await context.newCDPSession(page);
      const swipe = async (dx, dy) => {
        const stage = (await geometry(page)).stage;
        const x = stage.x + stage.width * .5;
        const y = stage.y + stage.height * .5;
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
        for (let step = 1; step <= 6; step++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx * step / 6, y: y + dy * step / 6 }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await settle(page);
      };
      await swipe(-144, 0); await pageNumber(page, 2, multi.assets.length); await assertFit(page);
      await swipe(144, 0); await pageNumber(page, 1, multi.assets.length); await assertFit(page);
      await swipe(0, -144); await pageNumber(page, 2, multi.assets.length); await assertFit(page);
      await swipe(0, 144); await pageNumber(page, 1, multi.assets.length); await assertFit(page);
      await page.locator('#width-button').click(); await settle(page);
      const widthGeometry = await geometry(page);
      const widthCanSwipe = widthGeometry.stage.scrollWidth <= widthGeometry.stage.clientWidth + 1 && widthGeometry.stage.scrollHeight <= widthGeometry.stage.clientHeight + 1;
      await swipe(0, -144); const expectedPage = widthCanSwipe ? 2 : 1;
      await pageNumber(page, expectedPage, multi.assets.length);
      for (let count = 0; count < 6; count++) {
        const g = await geometry(page);
        if (g.stage.scrollWidth > g.stage.clientWidth + 1 || g.stage.scrollHeight > g.stage.clientHeight + 1) break;
        await page.locator('#zoom-in-button').click(); await settle(page);
      }
      const enlarged = await geometry(page);
      assert.ok(enlarged.stage.scrollWidth > enlarged.stage.clientWidth + 1 || enlarged.stage.scrollHeight > enlarged.stage.clientHeight + 1, 'test image needs actual overflow for panning');
      await swipe(0, -144); await pageNumber(page, expectedPage, multi.assets.length);
      await cdp.detach();
    } finally { await context.close(); }
  });
  await run('fullscreen fit geometry, dialogs inside fullscreen, exit', async () => {
    const { context, page } = await fresh();
    try {
      await page.goto(urlFor(multi)); await assertFit(page);
      const supported = await page.evaluate(() => document.fullscreenEnabled);
      if (!supported) { report.cases.push({ name: 'fullscreen runtime capability', status: 'unavailable' }); return; }
      await page.locator('#fullscreen-button').click();
      await page.waitForFunction(() => document.fullscreenElement && document.fullscreenElement.id === 'viewer-card');
      await assertFit(page);
      await page.locator('#pages-button').click(); assert.ok(await page.locator('#page-dialog').isVisible());
      await page.locator('#close-pages-button').click();
      await page.locator('#fullscreen-button').click(); await page.waitForFunction(() => !document.fullscreenElement);
      await assertFit(page);
    } finally { await context.close(); }
  });
  for (const width of [320, 601, 620]) {
    await run(`fullscreen toolbar controls visible at ${width}px`, async () => {
      const { context, page } = await fresh({ viewport: { width, height: 800 }, screen: { width, height: 800 }, isMobile: width < 500, hasTouch: width < 500 });
      try {
        await page.goto(urlFor(multi)); await assertFit(page);
        if (!await page.evaluate(() => document.fullscreenEnabled)) { report.cases.push({ name: `fullscreen runtime capability ${width}px`, status: 'unavailable' }); return; }
        await page.locator('#fullscreen-button').click();
        await page.waitForFunction(() => document.fullscreenElement && document.fullscreenElement.id === 'viewer-card');
        const g = await assertFit(page);
        report.geometries.push({ fullscreen: true, ...g });
        await page.screenshot({ path: path.join(out, `reader-fullscreen-${width}px.png`) });
        await page.locator('#fullscreen-button').click(); await page.waitForFunction(() => !document.fullscreenElement);
      } finally { await context.close(); }
    });
  }
  await run('library search preserved, hash deep link, history back, invalid hash', async () => {
    const { context, page } = await fresh();
    try {
      await page.goto(base); await page.locator('.guide-row').first().waitFor();
      await page.locator('#search-input').fill(multi.title);
      assert.equal(await page.locator('.guide-row').count(), 1);
      await page.locator('.guide-row').click(); await pageNumber(page, 1, multi.assets.length); await assertFit(page);
      await page.locator('#next-button').click(); await pageNumber(page, 2, multi.assets.length);
      await page.goBack(); await pageNumber(page, 1, multi.assets.length); await assertFit(page);
      await page.locator('#back-button').click(); await page.locator('#library-view').waitFor({ state: 'visible' });
      assert.equal(await page.locator('#search-input').inputValue(), multi.title);
      assert.equal(await page.locator('.guide-row').count(), 1);
      assert.equal(await page.evaluate(() => document.body.classList.contains('is-reading')), false);
      await page.goto(urlFor(multi, 3)); await pageNumber(page, 3, multi.assets.length); await assertFit(page);
      await page.goto(base + '#guide=does-not-exist&page=2');
      await page.locator('#library-view').waitFor({ state: 'visible' });
      assert.equal(await page.evaluate(() => document.body.classList.contains('is-reading')), false);
    } finally { await context.close(); }
  });
  report.summary = { passed: report.cases.filter(c => c.status === 'passed').length, failed: report.cases.filter(c => c.status === 'failed').length, imagesMeasured: report.geometries.length, consoleErrors: report.consoleErrors.length };
  fs.writeFileSync(path.join(out, 'reader-regression.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report.summary));
  console.log('Report and screenshots: ' + out);
  if (report.summary.failed || report.summary.consoleErrors) process.exitCode = 1;
})().catch(error => { console.error(error); fs.writeFileSync(path.join(out, 'reader-regression.json'), JSON.stringify({ ...report, fatal: String(error) }, null, 2)); process.exitCode = 1; }).finally(async () => {
  try { if (browser) await browser.close(); }
  finally { if (server) server.close(); }
});
