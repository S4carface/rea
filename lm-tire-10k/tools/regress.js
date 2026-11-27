// Regression test for the L&M Tire site. Usage: node regress.js <baseURL> [page paths...]
const { chromium, devices } = require('playwright');
const fs = require('fs');
const axeSrc = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const BASE = process.argv[2] || 'http://localhost:8137/';
const PAGES = process.argv.slice(3).length ? process.argv.slice(3) : [''];
const VIEWS = [
  ['small-phone', { viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 }],
  ['phone', { ...devices['iPhone 13'], deviceScaleFactor: 1 }],
  ['tablet', { viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 }],
  ['desktop', { viewport: { width: 1366, height: 800 }, deviceScaleFactor: 1 }],
];
const problems = [];
const bad = (where, msg) => { problems.push(where + ': ' + msg); };

(async () => {
  const b = await chromium.launch();
  for (const path of PAGES) {
    for (const [vn, ctx] of VIEWS) {
      const where = (path || '/') + ' @' + vn;
      const c = await b.newContext({ ...ctx, serviceWorkers: 'block' });
      await c.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
      const p = await c.newPage();
      p.on('pageerror', e => bad(where, 'JS error: ' + e.message));
      p.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|ERR_NAME|net::ERR_CONNECTION|Failed to load resource/.test(m.text())) bad(where, 'console: ' + m.text().slice(0, 160)); });
      p.on('response', r => { const u = r.url(); if (u.startsWith(BASE) && r.status() >= 400) bad(where, 'HTTP ' + r.status() + ' ' + u); });
      await p.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await p.waitForTimeout(700);
      // 1. layout: no sideways scroll
      const ov = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (ov > 1) bad(where, 'page scrolls sideways by ' + ov + 'px');
      // 2. raw HTML / template text visible
      const raw = await p.evaluate(() => { const t = document.body.innerText; const m = t.match(/<\/?[a-z][a-z0-9]*[\s>]|\$\{|undefined|NaN|\[object/); return m ? t.slice(Math.max(0, m.index - 40), m.index + 40) : ''; });
      if (raw) bad(where, 'raw text on page: ' + JSON.stringify(raw));
      // 3. in-page links all have targets
      const dead = await p.evaluate(() => [...document.querySelectorAll('a[href^="#"]')].map(a => a.getAttribute('href')).filter(h => h.length > 1 && !document.getElementById(h.slice(1))));
      if (dead.length) bad(where, 'links to missing ids: ' + [...new Set(dead)].join(' '));
      // 4. local links resolve
      const locals = await p.evaluate(() => [...new Set([...document.querySelectorAll('a[href]')].map(a => a.href).filter(h => h.startsWith(location.origin)).map(h => h.split('#')[0]))]);
      for (const u of locals) { const r = await p.request.get(u); if (r.status() >= 400) bad(where, 'broken link ' + u + ' ' + r.status()); }
      // 5. tel/sms links well formed
      const phones = await p.evaluate(() => [...document.querySelectorAll('a[href^="tel:"],a[href^="sms:"]')].map(a => a.getAttribute('href')).filter(h => !/^(tel|sms):\+1(5088533322|3048066047|7742889675)(\?&body=.*|\?body=.*)?$/.test(h)));
      if (phones.length) bad(where, 'unexpected phone links: ' + phones.join(' '));
      // 6. small text
      const small = await p.evaluate(() => { const o = []; document.querySelectorAll('body *').forEach(e => { if (!e.offsetParent && getComputedStyle(e).position !== 'fixed') return; if (![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 2)) return; const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || +cs.opacity === 0) return; const fs = parseFloat(cs.fontSize); if (fs > 0 && fs < 14 && !e.closest('[aria-hidden="true"],.sr,svg')) o.push(Math.round(fs) + 'px ' + (e.className || e.tagName) + ' "' + e.textContent.trim().slice(0, 24) + '"'); }); return o; });
      if (small.length) bad(where, small.length + ' text items under 14px, e.g. ' + small.slice(0, 4).join(' | '));
      // 7. axe accessibility (contrast etc.)
      if (vn === 'phone' || vn === 'desktop') {
        await p.addScriptTag({ content: axeSrc });
        const ax = await p.evaluate(async () => { const r = await axe.run(document, { resultTypes: ['violations'] }); return r.violations.filter(v => ['serious', 'critical'].includes(v.impact)).map(v => v.id + ' x' + v.nodes.length + ' (' + v.nodes.slice(0, 2).map(n => n.target.join(' ')).join(', ') + ')'); });
        ax.forEach(x => bad(where, 'a11y ' + x));
      }
      // 8. language switching
      const isGen = await p.evaluate(() => document.body.classList.contains('pg'));
      if (!isGen) {
        for (const l of ['pt', 'es', 'en']) {
          const btn = p.locator('.lng button[data-lng="' + l + '"]').first();
          if (!(await btn.count())) { bad(where, 'no ' + l + ' button'); break; }
          if (await btn.isVisible()) { await btn.click(); } else { await p.evaluate(l => document.querySelector('.lng button[data-lng="' + l + '"]').click(), l); }
          await p.waitForTimeout(400);
          const lang = await p.evaluate(() => document.documentElement.lang);
          if (lang !== l) bad(where, 'language ' + l + ' did not switch (html lang=' + lang + ')');
          // generated blocks must follow the language
          const wrong = await p.evaluate(l => [...document.querySelectorAll('[data-l]')].filter(e => e.offsetParent && e.dataset.l !== l).length, l);
          if (wrong) bad(where, wrong + ' blocks in the wrong language visible for ' + l);
        }
        if (await p.locator('.menu-btn').isVisible()) {
          await p.locator('.menu-btn').click(); await p.waitForTimeout(400);
          const n = await p.evaluate(() => [...document.querySelectorAll('a[href^="#"]')].filter(a => a.offsetParent && a.closest('[role=dialog],.m-menu,#mMenu,.menu') && a.getAttribute('href').length > 1).length);
          if (!n) bad(where, 'phone menu has no section links');
          await p.keyboard.press('Escape');
        }
      } else {
        const ln = await p.evaluate(() => [...document.querySelectorAll('.lng a')].map(a => [a.getAttribute('hreflang'), a.href]));
        if (ln.length !== 3) bad(where, 'expected 3 language links, got ' + ln.length);
        for (const [l, u] of ln) { const r = await p.request.get(u); if (r.status() >= 400) bad(where, 'language link ' + l + ' broken'); else { const t = await r.text(); if (!t.includes('<html lang="' + l + '"')) bad(where, 'language link ' + l + ' goes to a page in another language'); } }
        const alts = await p.evaluate(() => [...document.querySelectorAll('link[rel=alternate][hreflang]')].length);
        if (alts !== 4) bad(where, 'hreflang tags: ' + alts);
        if (await p.locator('.menu-btn').isVisible()) {
          await p.locator('.menu-btn').click(); await p.waitForTimeout(300);
          const n = await p.evaluate(() => [...document.querySelectorAll('#mMenu a')].filter(a => a.offsetParent).length);
          if (n < 8) bad(where, 'phone menu shows ' + n + ' links');
          await p.keyboard.press('Escape'); await p.waitForTimeout(200);
          if (!(await p.evaluate(() => document.getElementById('mMenu').hidden))) bad(where, 'menu did not close with Escape');
        }
        const st = await p.evaluate(() => document.querySelector('[data-status]') ? document.querySelector('[data-status] span').textContent : 'none');
        if (!st.trim()) bad(where, 'open/closed status is empty');
        const ld = await p.evaluate(() => [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => { try { JSON.parse(s.text); return 'ok'; } catch (e) { return 'bad'; } }));
        if (ld.includes('bad') || !ld.length) bad(where, 'Google data (JSON-LD) missing or broken');
      }
      await c.close();
    }
  }
  await b.close();
  console.log(problems.length ? problems.join('\n') : 'ALL CHECKS PASSED');
})();
