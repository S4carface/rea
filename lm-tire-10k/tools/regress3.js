// Regression test for the Sprint 3 multi-page site. Usage: node regress3.js <baseURL> [paths...] (default: every page in sitemap + privacy + 404)
const { chromium, devices } = require('playwright');
const fs = require('fs');
const axeSrc = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const BASE = process.argv[2] || 'http://127.0.0.1:8140/';
const VIEWS = [
  ['small-phone', { viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 }],
  ['phone', { ...devices['iPhone 13'], deviceScaleFactor: 1 }],
  ['tablet', { viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 }],
  ['desktop', { viewport: { width: 1366, height: 800 }, deviceScaleFactor: 1 }],
];
const problems = []; let checks = 0;
const bad = (w, m) => problems.push(w + ': ' + m);
const ck = (cond, w, m) => { checks++; if (!cond) bad(w, m); };
(async () => {
  let PAGES = process.argv.slice(3);
  if (!PAGES.length) {
    const sm = await (await fetch(BASE + 'sitemap.xml')).text();
    PAGES = [...sm.matchAll(/<loc>[^<]*?\/\/[^/]+\/([^<]*)<\/loc>/g)].map(m => m[1]);
    PAGES.push('privacy/', 'pt/privacidade/', 'es/privacidad/', '404.html');
  }
  const b = await chromium.launch();
  for (const path of PAGES) for (const [vn, ctx] of VIEWS) {
    const w = (path || '/') + ' @' + vn;
    const c = await b.newContext({ ...ctx, serviceWorkers: 'block' });
    await c.route(/vpic\.nhtsa/, r => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"Results":[{"Model_Name":"Camry"}]}' }));
    const p = await c.newPage();
    p.on('pageerror', e => bad(w, 'JS error: ' + e.message));
    p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_/.test(m.text())) bad(w, 'console: ' + m.text().slice(0, 160)); });
    p.on('response', r => { if (r.url().startsWith(BASE) && r.status() >= 400 && !r.url().endsWith('404.html')) bad(w, 'HTTP ' + r.status() + ' ' + r.url()); });
    await p.goto(BASE + path, { waitUntil: 'load', timeout: 60000 }); await p.waitForTimeout(400);
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ck(ov <= 1, w, 'page scrolls sideways by ' + ov + 'px');
    const raw = await p.evaluate(() => { const t = document.body.innerText; const m = t.match(/<\/?[a-z][a-z0-9]*[\s>]|\$\{|undefined|NaN|\[object|\{[a-z_]+\}/); return m ? t.slice(Math.max(0, m.index - 40), m.index + 40) : ''; });
    ck(!raw, w, 'raw text on page: ' + JSON.stringify(raw));
    const dead = await p.evaluate(() => [...document.querySelectorAll('a[href^="#"]')].map(a => a.getAttribute('href')).filter(h => h.length > 1 && !document.getElementById(h.slice(1))));
    ck(!dead.length, w, 'links to missing ids: ' + dead.join(' '));
    if (vn === 'desktop') {
      const locals = await p.evaluate(() => [...new Set([...document.querySelectorAll('a[href]')].map(a => a.href).filter(h => h.startsWith(location.origin)).map(h => h.split('#')[0].split('?')[0]))]);
      for (const u of locals) { const r = await p.request.get(u); ck(r.status() < 400, w, 'broken link ' + u + ' ' + r.status()); }
    }
    const phones = await p.evaluate(() => [...document.querySelectorAll('a[href^="tel:"],a[href^="sms:"]')].map(a => a.getAttribute('href')).filter(h => !/^(tel|sms):\+1(5088533322|3048066047|7742889675)(\?&body=.+)?$/.test(h)));
    ck(!phones.length, w, 'unexpected phone links: ' + phones.join(' '));
    const small = await p.evaluate(() => { const o = []; document.querySelectorAll('body *').forEach(e => { if (!e.offsetParent && getComputedStyle(e).position !== 'fixed') return; if (![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 2)) return; const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || +cs.opacity === 0) return; const f = parseFloat(cs.fontSize); if (f > 0 && f < 14 && !e.closest('[aria-hidden="true"],.sr,svg')) o.push(Math.round(f) + 'px ' + e.tagName + ' "' + e.textContent.trim().slice(0, 24) + '"'); }); return o; });
    ck(!small.length, w, small.length + ' text items under 14px, e.g. ' + small.slice(0, 3).join(' | '));
    if (vn === 'phone' || vn === 'desktop') {
      await p.addScriptTag({ content: axeSrc });
      const ax = await p.evaluate(async () => (await axe.run(document, { resultTypes: ['violations'] })).violations.filter(v => ['serious', 'critical'].includes(v.impact)).map(v => v.id + ' x' + v.nodes.length + ' (' + v.nodes.slice(0, 2).map(n => n.target.join(' ')).join(', ') + ')'));
      checks++; ax.forEach(x => bad(w, 'a11y ' + x));
    }
    if (path !== '404.html') {
      const ln = await p.evaluate(() => [...document.querySelectorAll('header .lng a, .m-menu .lng a')].slice(0, 3).map(a => [a.getAttribute('hreflang'), a.href]));
      ck(ln.length === 3, w, 'expected 3 language links, got ' + ln.length);
      if (vn === 'desktop') for (const [l, u] of ln) { const r = await p.request.get(u); const t = await r.text(); ck(r.status() < 400 && t.includes('<html lang="' + l + '"'), w, 'language link ' + l + ' broken or wrong language'); }
      const alts = await p.evaluate(() => document.querySelectorAll('link[rel=alternate][hreflang]').length);
      ck(alts === 4, w, 'hreflang tags: ' + alts);
      const ld = await p.evaluate(() => [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => { try { JSON.parse(s.text); return 1; } catch (e) { return 0; } }));
      ck(!ld.includes(0), w, 'broken Google data (JSON-LD)');
    }
    // menu
    if (await p.locator('.menu-btn').isVisible()) {
      await p.click('.menu-btn'); await p.waitForTimeout(150);
      const n = await p.evaluate(() => [...document.querySelectorAll('#mMenu a')].filter(a => a.offsetParent).length);
      ck(n >= 11, w, 'phone menu shows ' + n + ' links');
      await p.keyboard.press('Escape'); await p.waitForTimeout(100);
      ck(await p.evaluate(() => document.getElementById('mMenu').hidden), w, 'menu did not close with Escape');
    }
    // search
    if (vn === 'phone' || vn === 'desktop') {
      await p.click('header [aria-controls=srch]'); await p.fill('#srchIn', { en: 'brake', pt: 'freio', es: 'freno' }[await p.evaluate(() => document.documentElement.lang)]);
      await p.waitForTimeout(500);
      const res = await p.evaluate(() => [...document.querySelectorAll('#srchRes a')].map(a => a.querySelector('.k').textContent + '|' + a.querySelector('b').textContent));
      ck(res.length > 0, w, 'search found nothing for brakes');
      ck(!res.some(r => /^(ACTION|SECTION|facts|page|service|tool|question|policy)\|/.test(r)), w, 'search shows a raw label: ' + res[0]);
      await p.keyboard.press('Escape');
    }
    const st = await p.evaluate(() => [...document.querySelectorAll('[data-status] span')].map(s => s.textContent.trim()));
    ck(!st.includes(''), w, 'open/closed status is empty');
    // phone bar steps aside while typing
    if ((vn === 'phone' || vn === 'small-phone') && await p.locator('main input:visible:not([type=radio]):not([type=checkbox]):not([type=range]):not(.sr)').count()) {
      await p.locator('main input:visible:not([type=radio]):not([type=checkbox]):not([type=range]):not(.sr)').first().focus(); await p.waitForTimeout(350);
      ck(await p.evaluate(() => document.getElementById('bar').classList.contains('away')), w, 'phone bar stays over the keyboard while typing');
    }
    await c.close();
  }
  await b.close();
  console.log(problems.length ? problems.join('\n') : 'ALL CHECKS PASSED'); console.log('pages: ' + PAGES.length + ' | checks run: ' + checks + ' | failed: ' + problems.length);
})();
