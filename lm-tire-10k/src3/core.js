/* L&M Tire: shared script for every page (Sprint 3). Small on purpose; tools load their own script. */
(function () {
  'use strict';
  var d = document, H = d.documentElement, L = H.lang || 'en';
  var CFG = window.LM_CFG || {};
  var $ = function (s, r) { return (r || d).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  };

  /* ---------- display settings (saved on this device) ---------- */
  ['big', 'calm', 'contrast'].forEach(function (k) {
    var on = store.get('lm-' + k) === '1';
    H.classList.toggle(k, on);
    $$('[data-a11y="' + k + '"]').forEach(function (b) {
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.addEventListener('click', function () {
        on = !H.classList.contains(k); H.classList.toggle(k, on); store.set('lm-' + k, on ? '1' : null);
        $$('[data-a11y="' + k + '"]').forEach(function (x) { x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
        if (k === 'calm') heroVideo();
      });
    });
  });

  /* ---------- open / closed status ---------- */
  var T = {
    en: ['Open now · until ', 'Closed now · opens ', 'today', 'tomorrow', ' at ', 'Holiday hours', 'Closed', ' to '],
    pt: ['Aberto agora · até ', 'Fechado agora · abre ', 'hoje', 'amanhã', ' às ', 'Horário de feriado', 'Fechado', ' às '],
    es: ['Abierto ahora · hasta ', 'Cerrado ahora · abre ', 'hoy', 'mañana', ' a las ', 'Horario de días festivos', 'Cerrado', ' a ']
  }[L];
  var LOC = { en: 'en-US', pt: 'pt-BR', es: 'es-US' }[L];
  function fmt(m) {
    var h = Math.floor(m / 60), mm = m % 60, p = mm ? ':' + String(mm).padStart(2, '0') : '';
    if (L === 'pt') return h + (mm ? 'h' + String(mm).padStart(2, '0') : 'h');
    return ((h + 11) % 12 + 1) + p + (h < 12 ? ' AM' : ' PM');
  }
  function nowNY() {
    var p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
    var g = function (t) { for (var i = 0; i < p.length; i++) if (p[i].type === t) return +p[i].value; return 0; };
    return (g('hour') % 24) * 60 + g('minute');
  }
  function status() {
    var Hs = window.LM_HOURS; if (!Hs) return;
    var now = nowNY(), t = Hs.on(0), txt = '', open = false;
    if (t && now >= t[0] && now < t[1]) { open = true; txt = T[0] + fmt(t[1]); }
    else if (t && now < t[0]) txt = T[1] + T[2] + T[4] + fmt(t[0]);
    else {
      for (var k = 1; k < 21; k++) {
        var n = Hs.on(k);
        if (n) {
          var day = new Date(Hs.dateStr(k) + 'T12:00:00Z').toLocaleDateString(LOC, { weekday: 'long', timeZone: 'UTC' });
          txt = T[1] + (k === 1 ? T[3] : day) + T[4] + fmt(n[0]); break;
        }
      }
    }
    $$('[data-status]').forEach(function (el) { el.classList.toggle('open', open); var s = el.querySelector('span'); if (s) s.textContent = txt; });
    var wd = new Date(Hs.dateStr(0) + 'T12:00:00Z').getUTCDay();
    $$('.hours tr[data-days]').forEach(function (tr) { tr.classList.toggle('today', tr.getAttribute('data-days').split(',').indexOf(String(wd)) > -1); });
  }
  status(); setInterval(status, 60000);
  (function holidays() {
    var Hs = window.LM_HOURS; if (!Hs) return;
    $$('.hours').forEach(function (tb) {
      var rows = []; for (var k = 0; k <= 45; k++) if (Hs.isHoliday(k)) rows.push([Hs.dateStr(k), Hs.on(k)]);
      if (!rows.length) return;
      var box = d.createElement('div'); box.className = 'holi box-amber';
      var h = d.createElement('h3'); h.textContent = T[5]; box.appendChild(h);
      var ul = d.createElement('ul');
      rows.forEach(function (r) {
        var li = d.createElement('li'), b = d.createElement('b'), s = d.createElement('span');
        b.textContent = new Date(r[0] + 'T12:00:00Z').toLocaleDateString(LOC, { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });
        s.textContent = r[1] ? fmt(r[1][0]) + T[7] + fmt(r[1][1]) : T[6];
        li.append(b, s); ul.appendChild(li);
      });
      box.appendChild(ul); tb.after(box);
    });
  })();

  /* ---------- overlays: phone menu and search ---------- */
  var lastFocus = null;
  function openLayer(el, focusEl) {
    lastFocus = d.activeElement; el.hidden = false; d.body.style.overflow = 'hidden';
    (focusEl || el.querySelector('a,button,input')).focus();
  }
  function closeLayer(el) {
    if (el.hidden) return; el.hidden = true; d.body.style.overflow = '';
    $$('[aria-controls="' + el.id + '"]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function trap(el, e) {
    if (e.key !== 'Tab') return;
    var f = $$('a[href],button:not([disabled]),input,select,textarea', el).filter(function (x) { return x.offsetParent; });
    if (!f.length) return;
    if (e.shiftKey && d.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && d.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  }
  var menu = $('#mMenu');
  $$('.menu-btn').forEach(function (b) {
    b.addEventListener('click', function () { b.setAttribute('aria-expanded', 'true'); openLayer(menu); });
  });
  if (menu) {
    $$('[data-close]', menu).forEach(function (x) { x.addEventListener('click', function () { closeLayer(menu); }); });
    menu.addEventListener('keydown', function (e) { trap(menu, e); });
  }

  var sl = $('#srch'), si = $('#srchIn'), sr = $('#srchRes'), sp = $('#srchPop'), idx = null, loading = null, sel = -1;
  function fold(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9/ ]+/g, ' '); }
  function loadIdx() {
    if (idx || loading) return loading;
    loading = fetch(sl.getAttribute('data-index')).then(function (r) { return r.json(); }).then(function (j) {
      idx = j.items.map(function (it) { it._t = fold(it.t); it._x = fold(it.x + ' ' + (it.w || '')); return it; });
      idx.kinds = j.kinds; render();
    }).catch(function () { loading = null; });
    return loading;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function render() {
    if (!idx) return;
    var q = fold(si.value).trim(), words = q.split(/\s+/).filter(function (w) { return w.length > 1 || /\d/.test(w); });
    sp.hidden = !!q; sr.innerHTML = ''; sel = -1;
    if (!q) return;
    var out = [];
    idx.forEach(function (it) {
      var s = 0;
      for (var i = 0; i < words.length; i++) {
        var w = words[i], st = w.length > 4 ? w.slice(0, w.length - 1) : w;
        if (it._t.indexOf(w) > -1) s += 6; else if (it._t.indexOf(st) > -1) s += 4;
        else if (it._x.indexOf(st) > -1) s += 2; else { s = 0; break; }
      }
      if (s) out.push([s + (it.b || 0), it]);
    });
    out.sort(function (a, b) { return b[0] - a[0]; });
    if (!out.length) { sr.innerHTML = '<li class="srch-none">' + esc(sl.getAttribute('data-none')) + '</li>'; return; }
    sr.innerHTML = out.slice(0, 8).map(function (o, i) {
      var it = o[1];
      return '<li><a id="sres' + i + '" role="option" href="' + esc(it.u) + '"><span class="k">' + esc(idx.kinds[it.k] || '') + '</span><b>' + esc(it.t) + '</b><small>' + esc(it.x) + '</small></a></li>';
    }).join('');
  }
  function openSearch() {
    $$('[aria-controls="srch"]').forEach(function (b) { b.setAttribute('aria-expanded', 'true'); });
    if (menu && !menu.hidden) closeLayer(menu);
    openLayer(sl, si); loadIdx();
  }
  if (sl) {
    $$('[aria-controls="srch"]').forEach(function (b) { b.addEventListener('click', openSearch); });
    $$('[data-close]', sl).forEach(function (x) { x.addEventListener('click', function () { closeLayer(sl); }); });
    sl.addEventListener('click', function (e) { if (e.target === sl) closeLayer(sl); });
    sl.addEventListener('keydown', function (e) {
      trap(sl, e);
      var opts = $$('a', sr);
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && opts.length) {
        e.preventDefault(); sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + opts.length) % opts.length;
        opts.forEach(function (a, i) { a.setAttribute('aria-selected', i === sel ? 'true' : 'false'); });
        si.setAttribute('aria-activedescendant', opts[sel].id); opts[sel].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter' && d.activeElement === si && opts.length) { e.preventDefault(); location.href = opts[Math.max(sel, 0)].href; }
    });
    si.addEventListener('input', function () { loadIdx(); render(); });
    $$('button', sp).forEach(function (b) { b.addEventListener('click', function () { si.value = b.textContent; si.focus(); loadIdx(); render(); }); });
    d.addEventListener('keydown', function (e) {
      if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test((d.activeElement || {}).tagName) && sl.hidden) { e.preventDefault(); openSearch(); }
    });
  }
  d.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (sl && !sl.hidden) closeLayer(sl); else if (menu && !menu.hidden) closeLayer(menu);
  });

  /* ---------- phone contact bar: step aside while typing ---------- */
  var bar = $('#bar');
  if (bar) {
    var typing = function (el) { return el && (/^(TEXTAREA|SELECT)$/.test(el.tagName) || (el.tagName === 'INPUT' && !/^(button|submit|checkbox|radio|range|reset)$/.test(el.type))); };
    d.addEventListener('focusin', function (e) { if (typing(e.target)) bar.classList.add('away'); });
    d.addEventListener('focusout', function () { setTimeout(function () { if (!typing(d.activeElement)) bar.classList.remove('away'); }, 50); });
    if (window.visualViewport) visualViewport.addEventListener('resize', function () {
      var kb = window.innerHeight - visualViewport.height > 140; bar.classList.toggle('away', kb || typing(d.activeElement));
    });
  }

  /* ---------- keep typed form answers when switching language (this visit only) ---------- */
  function saveForms() {
    var data = {};
    $$('form[data-keep] [name]').forEach(function (f) {
      if (f.type === 'password' || f.type === 'file') return;
      if ((f.type === 'checkbox' || f.type === 'radio')) { if (f.checked) data[f.name] = (data[f.name] ? data[f.name] + '\n' : '') + f.value; }
      else if (f.value) data[f.name] = f.value;
    });
    try { sessionStorage.setItem('lm-carry', JSON.stringify({ k: location.pathname.split('/').length, d: data, t: Date.now() })); } catch (e) {}
  }
  $$('.lng a').forEach(function (a) { a.addEventListener('click', saveForms); });
  var carry = null;
  try { carry = JSON.parse(sessionStorage.getItem('lm-carry') || 'null'); sessionStorage.setItem('lm-carry', 'null'); } catch (e) {}
  if (carry && Date.now() - carry.t > 120000) carry = null;
  function restoreForms() {
    if (!carry) return;
    $$('form[data-keep] [name]').forEach(function (f) {
      var v = carry.d[f.name]; if (v == null) return;
      if (f.type === 'checkbox' || f.type === 'radio') f.checked = String(v).split('\n').indexOf(f.value) > -1;
      else f.value = v;
      f.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }
  restoreForms();

  /* ---------- home hero: looping tire video (skipped for less motion and data saver) ---------- */
  function heroVideo() {
    var v = $('#heroVid'); if (!v) return;
    var calm = H.classList.contains('calm') || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    var save = navigator.connection && (navigator.connection.saveData || /2g/.test(navigator.connection.effectiveType || ''));
    if (calm || save) { v.pause(); return; }
    if (!v.src) {
      v.src = innerWidth <= 760 ? v.getAttribute('data-sq') : v.getAttribute('data-wide');
      v.addEventListener('playing', function () { v.classList.add('on'); }, { once: true });
    }
    var p = v.play(); if (p && p.catch) p.catch(function () {});
  }
  if ($('#heroVid')) {
    var start = function () { setTimeout(heroVideo, 300); };
    if (d.readyState === 'complete') start(); else addEventListener('load', start, { once: true });
    d.addEventListener('visibilitychange', function () { var v = $('#heroVid'); if (!v) return; if (d.hidden) v.pause(); else heroVideo(); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { var v = $('#heroVid'); es.forEach(function (e) { if (!e.isIntersecting) v.pause(); else if (v.src) heroVideo(); }); }).observe($('#heroVid'));
  }

  /* ---------- quick tire size search ---------- */
  $$('form[data-size-go]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      var i = f.querySelector('input'); var v = (i.value || '').toUpperCase().trim();
      if (!v) { e.preventDefault(); i.focus(); return; }
      i.value = v;
      if (/htmlpreview/.test(f.action)) { e.preventDefault(); location.href = f.action + '#size=' + encodeURIComponent(v); }
    });
  });

  /* ---------- htmlpreview / in-page links: scroll without leaving the page ---------- */
  d.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]'); if (!a) return;
    var id = a.getAttribute('href').slice(1); if (!id) return;
    var t = d.getElementById(id); if (!t) return;
    e.preventDefault(); t.scrollIntoView({ behavior: H.classList.contains('calm') ? 'auto' : 'smooth' });
    if (!t.hasAttribute('tabindex')) t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true });
  });

  var y = $('[data-year]'); if (y) y.textContent = new Date().getFullYear();
  window.LM = { store: store, lang: L, fmt: fmt, nowNY: nowNY, restore: restoreForms };
})();
/* future LM Tire videos: load YouTube only when the visitor taps play */
document.addEventListener('click', function (e) {
  var b = e.target.closest && e.target.closest('.video-lite'); if (!b) return;
  var f = document.createElement('iframe');
  f.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(b.getAttribute('data-yt')) + '?autoplay=1&rel=0';
  f.title = b.textContent.trim(); f.allow = 'autoplay; encrypted-media; picture-in-picture'; f.allowFullscreen = true;
  f.style.cssText = 'width:100%;aspect-ratio:16/9;border:0;border-radius:18px';
  document.dispatchEvent(new CustomEvent('lm:sfx', { detail: 'start' }));
  b.replaceWith(f);
});

/* Background music: off unless the visitor turns it on (remembered on this device). It picks up where it left off on the
   next page, waits for a tap where the browser blocks sound, pauses for diagnostic sounds and while the page is hidden. */
(function () {
  var btn = document.querySelector('.music-btn'), SRC = btn && btn.getAttribute('data-src');
  if (!SRC) return;
  var KEY = 'lm-music', POS = 'lm-music-t', a = null, want = false, sfx = false, saveT = null;
  function get(k, s) { try { return (s ? sessionStorage : localStorage).getItem(k); } catch (e) { return null; } }
  function put(k, v, s) { try { (s ? sessionStorage : localStorage).setItem(k, v); } catch (e) {} }
  function ui() { btn.setAttribute('aria-pressed', String(want)); btn.setAttribute('aria-label', btn.getAttribute(want ? 'data-on' : 'data-off')); btn.classList.toggle('on', want); }
  function save() { if (a && !isNaN(a.currentTime)) put(POS, String(a.currentTime), true); }
  function fade(to, ms, done) { var from = a.volume, t0 = performance.now(); (function step(t) { var k = Math.min(1, (t - t0) / ms); a.volume = Math.max(0, Math.min(1, from + (to - from) * k)); if (k < 1) requestAnimationFrame(step); else if (done) done(); })(t0); }
  function ensure() {
    if (a) return a;
    a = new Audio(SRC); a.loop = true; a.preload = 'auto'; a.crossOrigin = 'anonymous'; a.volume = 0;
    var t = +get(POS, true) || 0; a.addEventListener('loadedmetadata', function () { if (t && t < a.duration) a.currentTime = t; }, { once: true });
    return a;
  }
  function play() {
    if (!want || sfx || document.hidden) return;
    ensure(); var p = a.play();
    if (p && p.catch) p.then(function () { fade(0.35, 900); }).catch(function () { waitTap(); });
    clearInterval(saveT); saveT = setInterval(save, 2000);
  }
  function pause(soft) { if (!a) return; save(); clearInterval(saveT); if (soft) fade(0, 250, function () { a.pause(); }); else a.pause(); }
  function waitTap() { var go = function () { document.removeEventListener('pointerdown', go, true); document.removeEventListener('keydown', go, true); play(); }; document.addEventListener('pointerdown', go, true); document.addEventListener('keydown', go, true); }
  btn.addEventListener('click', function () { want = !want; put(KEY, want ? '1' : '0'); ui(); if (want) play(); else pause(true); });
  document.addEventListener('lm:sfx', function (e) { sfx = e.detail === 'start'; if (sfx) pause(true); else play(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); else play(); });
  addEventListener('pagehide', save);
  want = get(KEY) === '1'; ui(); if (want) play();
})();
