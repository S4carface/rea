/* Tire Help tools. One file, cached once; each page runs only its own tool (data-tool="..."). */
(function () {
  'use strict';
  var X = window.LM_TXT || {}, C = window.LM_CFG || {}, d = document;
  var root = d.querySelector('[data-tool]'); if (!root) return;
  var LOC = { en: 'en-US', pt: 'pt-BR', es: 'es-US' }[d.documentElement.lang] || 'en-US';
  function $(s, r) { return (r || root).querySelector(s); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fill(s, o) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return o[k] != null ? o[k] : m; }); }
  var T = {};

  /* ---------- penny test: true scale, 1/32 inch = 9 px, penny = 24/32 inch ---------- */
  T.penny = function () {
    var U = 9, yb = 262, R = 12 * U, cx = 170, cy = yb - R;
    root.innerHTML =
      '<div class="tool-card"><svg class="penny-svg" viewBox="0 0 400 290" role="img" aria-labelledby="pnT"><title id="pnT">' + esc(X.penny_img) + '</title>' +
      '<defs><linearGradient id="rub" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3c48"/><stop offset=".08" stop-color="#23242c"/><stop offset="1" stop-color="#14151a"/></linearGradient>' +
      '<pattern id="sipe" width="22" height="200" patternUnits="userSpaceOnUse"><rect width="22" height="200" fill="url(#rub)"/><path d="M11 0v200" stroke="#0c0c10" stroke-width="2" opacity=".55"/></pattern>' +
      '<clipPath id="pc"><circle cx="' + cx + '" cy="' + cy + '" r="' + R + '"/></clipPath></defs>' +
      '<rect x="0" y="0" width="400" height="290" fill="#0d0e18"/>' +
      '<rect x="20" y="' + (yb - 10 * U - 6) + '" width="300" height="' + (10 * U + 6) + '" fill="#0a0a0e" opacity=".9"/>' +
      '<g clip-path="url(#pc)"><image href="' + esc(root.getAttribute('data-penny')) + '" x="' + (cx - R) + '" y="' + (cy - R) + '" width="' + 2 * R + '" height="' + 2 * R + '" transform="rotate(180 ' + cx + ' ' + cy + ')"/></g>' +
      '<g id="pnRib"><rect id="pnRect" x="20" width="300" fill="url(#sipe)"/><rect id="pnTop" x="20" width="300" height="3" fill="#5b5e6e"/></g>' +
      '<rect x="20" y="' + yb + '" width="300" height="4" fill="#4a4c58"/>' +
      '<g font-family="JetBrains Mono, monospace" font-size="12" fill="#b9bbd1">' +
      [0, 2, 4, 6, 8, 10].map(function (n) { var y = yb - n * U; return '<path d="M332 ' + y + 'h12" stroke="#b9bbd1"/><text x="350" y="' + (y + 4) + '">' + n + '/32</text>'; }).join('') +
      '<path d="M338 ' + yb + 'V' + (yb - 10 * U) + '" stroke="#b9bbd1" opacity=".5"/>' +
      '<path id="pnHead" d="M24 ' + (yb - 2.6 * U) + 'H316" stroke="#ffd27a" stroke-dasharray="4 5" opacity=".7"/></g>' +
      '</svg>' +
      '<label class="lbl" for="pnR">' + esc(X.depth) + ': <output id="pnO">6/32"</output></label>' +
      '<input type="range" id="pnR" min="1" max="10" step="1" value="6" aria-describedby="pnM">' +
      '<div class="range-ticks" aria-hidden="true"><span>1/32"</span><span>4/32"</span><span>10/32" (' + esc(X.new) + ')</span></div>' +
      '<p class="tool-res" id="pnM" aria-live="polite"></p></div>';
    var r = $('#pnR'), rect = $('#pnRect'), top = $('#pnTop'), o = $('#pnO'), m = $('#pnM');
    function draw() {
      var v = +r.value, h = v * U;
      rect.setAttribute('y', yb - h); rect.setAttribute('height', h); top.setAttribute('y', yb - h);
      o.textContent = v + '/32"';
      var k = v <= 2 ? 'bad' : v <= 4 ? 'low' : v <= 6 ? 'watch' : 'ok';
      m.className = 'tool-res r-' + k; m.textContent = X['r_' + k];
    }
    r.addEventListener('input', draw); draw();
  };

  /* ---------- puncture: where is the damage ---------- */
  T.puncture = function () {
    var Z = X.zones;
    root.innerHTML =
      '<div class="tool-card"><svg class="punct-svg" viewBox="0 0 420 300" role="img" aria-labelledby="puT"><title id="puT">' + esc(X.pick) + '</title>' +
      '<defs><linearGradient id="tr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#34363f"/><stop offset="1" stop-color="#17181d"/></linearGradient></defs>' +
      // tire cross-section (cut view): outer casing and inner liner
      '<path d="M70 270 C58 200 52 140 64 96 C74 60 104 44 140 40 L280 40 C316 44 346 60 356 96 C368 140 362 200 350 270 L322 270 C330 210 334 150 324 110 C316 82 296 72 270 70 L150 70 C124 72 104 82 96 110 C86 150 90 210 98 270 Z" fill="url(#tr)" stroke="#5b5e6e" stroke-width="2"/>' +
      '<path d="M140 40 v-6 M170 40 v-6 M200 40 v-6 M230 40 v-6 M260 40 v-6" stroke="#0c0c10" stroke-width="6"/>' +
      '<path d="M98 270 h-34 M322 270 h34" stroke="#8a8ca0" stroke-width="5" stroke-linecap="round"/>' +
      // nail embedded in the tread: head flush on the surface, shaft through the rubber (cut view)
      '<g id="puNail" transform="translate(206 0)"><rect x="-2.2" y="38" width="4.4" height="40" fill="#9aa0ad"/><path d="M-2.2 78 L0 86 L2.2 78Z" fill="#9aa0ad"/><ellipse cx="0" cy="38" rx="9" ry="2.6" fill="#c8ccd6" stroke="#6b7080"/></g>' +
      // zones
      '<g class="zones" font-family="Barlow, sans-serif" font-size="15" font-weight="600">' +
      '<path data-z="tread" class="z" d="M140 30 L280 30 L280 80 L140 80 Z"/>' +
      '<path data-z="shoulder" class="z" d="M60 70 C70 44 100 30 140 30 L140 80 C112 82 96 96 90 120 L58 112 Z"/><path data-z="shoulder" class="z" d="M360 70 C350 44 320 30 280 30 L280 80 C308 82 324 96 330 120 L362 112 Z"/>' +
      '<path data-z="sidewall" class="z" d="M58 112 L90 120 C84 160 88 220 98 270 L66 270 C54 210 50 150 58 112 Z"/><path data-z="sidewall" class="z" d="M362 112 L330 120 C336 160 332 220 322 270 L354 270 C366 210 370 150 362 112 Z"/>' +
      '<text x="210" y="20" text-anchor="middle" fill="#f3f2f6">' + esc(Z.tread) + '</text>' +
      '<text x="30" y="58" fill="#f3f2f6">' + esc(Z.shoulder.split(' (')[0]) + '</text><text x="390" y="58" text-anchor="end" fill="#f3f2f6">' + esc(Z.shoulder.split(' (')[0]) + '</text>' +
      '<text x="12" y="200" fill="#f3f2f6">' + esc(Z.sidewall.split(' (')[0]) + '</text><text x="408" y="200" text-anchor="end" fill="#f3f2f6">' + esc(Z.sidewall.split(' (')[0]) + '</text>' +
      '</g></svg>' +
      '<form class="tool-form" onsubmit="return false">' +
      '<fieldset class="field"><legend class="lbl">' + esc(X.pick) + '</legend><div class="chips">' +
      ['tread', 'shoulder', 'sidewall'].map(function (z) { return '<label><input type="radio" name="zone" value="' + z + '"><span>' + esc(Z[z]) + '</span></label>'; }).join('') + '</div></fieldset>' +
      '<fieldset class="field"><legend class="lbl">' + esc(X.size_q) + '</legend><div class="chips"><label><input type="radio" name="hole" value="small" checked><span>' + esc(X.small) + '</span></label><label><input type="radio" name="hole" value="big"><span>' + esc(X.big) + '</span></label></div></fieldset>' +
      '<fieldset class="field"><legend class="lbl">' + esc(X.flat_q) + '</legend><div class="chips"><label><input type="radio" name="flat" value="no" checked><span>' + esc(X.no) + '</span></label><label><input type="radio" name="flat" value="yes"><span>' + esc(X.yes) + '</span></label></div></fieldset>' +
      '</form><p class="tool-res" id="puR" aria-live="polite">' + esc(X.pick) + '</p></div>';
    var f = $('.tool-form'), res = $('#puR'), nail = $('#puNail');
    var NAIL = { tread: 'translate(206 0)', shoulder: 'translate(318 64) rotate(52)', sidewall: 'translate(344 190) rotate(90)' };
    function show() {
      var z = (f.querySelector('[name=zone]:checked') || {}).value, hole = f.querySelector('[name=hole]:checked').value, flat = f.querySelector('[name=flat]:checked').value;
      root.querySelectorAll('.z').forEach(function (p) { p.classList.toggle('on', p.getAttribute('data-z') === z); });
      if (!z) return;
      nail.setAttribute('transform', NAIL[z]);
      var msg = [], k;
      if (z === 'sidewall') { k = 'bad'; msg.push(X.r_sidewall); }
      else if (z === 'shoulder') { k = 'bad'; msg.push(X.r_shoulder); }
      else if (hole === 'big') { k = 'bad'; msg.push(X.r_big); }
      else { k = 'ok'; msg.push(X.r_tread); }
      if (flat === 'yes') { msg.push(X.r_flat); if (k === 'ok') k = 'watch'; }
      res.className = 'tool-res r-' + k; res.textContent = msg.join(' ');
    }
    f.addEventListener('change', show);
    root.querySelectorAll('.z').forEach(function (p) {
      p.addEventListener('click', function () { var i = f.querySelector('[name=zone][value=' + p.getAttribute('data-z') + ']'); i.checked = true; show(); });
    });
  };

  /* ---------- tire age from DOT ---------- */
  T.age = function () {
    root.innerHTML = '<div class="tool-card"><div class="field"><label for="agI">' + esc(X.label) + '</label><input id="agI" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" placeholder="' + esc(X.ph) + '" style="max-width:220px;font:500 1.5rem var(--mono);letter-spacing:.12em"></div><p class="tool-res" id="agR" aria-live="polite"></p></div>';
    var i = $('#agI'), r = $('#agR');
    i.addEventListener('input', function () {
      var v = i.value.replace(/\D/g, ''); i.value = v; r.className = 'tool-res'; r.textContent = '';
      if (v.length < 4) return;
      var w = +v.slice(0, 2), y = 2000 + +v.slice(2), now = new Date();
      if (w < 1 || w > 53 || y > now.getFullYear()) { r.textContent = X.bad; return; }
      var made = new Date(Date.UTC(y, 0, 1 + (w - 1) * 7)), yrs = (now - made) / 31557600000;
      if (yrs < -0.1) { r.textContent = X.bad; return; }
      var a = yrs < 1 ? X.months : Math.floor(yrs) === 1 ? X.year1 : fill(X.years, { n: Math.floor(yrs) });
      var k = yrs < 5 ? 'new' : yrs < 6 ? 'mid' : 'old';
      r.className = 'tool-res r-' + (k === 'new' ? 'ok' : k === 'mid' ? 'watch' : 'bad');
      r.textContent = fill(X.made, { w: String(w).padStart(2, '0'), y: y, a: a }) + ' ' + X['r_' + k];
    });
  };

  /* ---------- tire size read and compare ---------- */
  T.size = function () {
    var LI = window.LM_LI || {}, SR = window.LM_SR || {};
    root.innerHTML = '<div class="tool-card"><div class="grid2"><div class="field"><label for="szA">' + esc(X.a) + '</label><input id="szA" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="' + esc(X.ph) + '"></div>' +
      '<div class="field"><label for="szB">' + esc(X.b) + '</label><input id="szB" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="215/50R17"></div></div>' +
      '<div id="szOut" aria-live="polite"></div></div>';
    function parse(v) {
      var s = String(v || '').toUpperCase().replace(/\s+/g, ' ').trim();
      var m = s.match(/^(P|LT)?\s*(\d{3})\s*[\/ -]?\s*(\d{2})\s*(Z?R|D|B)?\s*(\d{2})(?:\s*(\d{2,3})\s*([A-Z])?)?/);
      if (!m) return null;
      var w = +m[2], a = +m[3], rim = +m[5];
      if (w < 125 || w > 395 || a < 25 || a > 90 || rim < 12 || rim > 26) return null;
      var h = w * a / 100 / 25.4;
      return { w: w, a: a, c: m[4] || 'R', rim: rim, li: m[6] ? +m[6] : null, sr: m[7] || null, h: h, dia: 2 * h + rim };
    }
    function one(p) {
      var P = X.parts, rows = [[P.w, p.w, fill(X.w_d, { v: p.w })], [P.r, p.a, fill(X.r_d, { v: p.a, h: p.h.toFixed(1) })], [P.c, p.c, X.c_d], [P.d, p.rim, fill(X.d_d, { v: p.rim })]];
      if (p.li && LI[p.li]) rows.push([P.li, p.li, fill(X.li_d, { v: LI[p.li].toLocaleString(LOC) })]);
      if (p.sr && SR[p.sr]) rows.push([P.sr, p.sr, fill(X.sr_d, { v: SR[p.sr] })]);
      return '<table class="sz-t"><tbody>' + rows.map(function (r) { return '<tr><th scope="row">' + esc(r[0]) + '</th><td class="mono">' + esc(r[1]) + '</td><td>' + esc(r[2]) + '</td></tr>'; }).join('') + '</tbody></table><p class="hint">' + esc(fill(X.dia, { v: p.dia.toFixed(1) })) + '</p>';
    }
    function run() {
      var A = $('#szA').value, B = $('#szB').value, a = parse(A), b = parse(B), out = '';
      if (A.trim().length > 6 && !a) out += '<p class="tool-res r-bad">' + esc(X.bad) + '</p>';
      if (a) out += one(a);
      if (a && b) {
        var p = (b.dia - a.dia) / a.dia * 100, ap = Math.abs(p).toFixed(1);
        out += '<p class="tool-res r-' + (Math.abs(p) <= 3 ? 'ok' : 'bad') + '">' + esc(fill(Math.abs(p) <= 3 ? X.cmp_ok : X.cmp_bad, { p: ap })) + ' ' + esc(fill(X.speedo, { v: (60 * a.dia / b.dia).toFixed(1) })) + '</p>';
      } else if (B.trim().length > 6 && !b) out += '<p class="tool-res r-bad">' + esc(X.bad) + '</p>';
      $('#szOut').innerHTML = out;
    }
    root.addEventListener('input', run);
  };

  /* ---------- pressure and temperature ---------- */
  T.pressure = function () {
    root.innerHTML = '<div class="tool-card"><div class="grid3">' +
      '<div class="field"><label for="prS">' + esc(X.set) + '</label><input id="prS" type="number" inputmode="numeric" min="15" max="80" value="35"></div>' +
      '<div class="field"><label for="prT">' + esc(X.then) + '</label><input id="prT" type="number" inputmode="numeric" min="-30" max="120" value="70"></div>' +
      '<div class="field"><label for="prN">' + esc(X.now) + '</label><input id="prN" type="number" inputmode="numeric" min="-30" max="120" value="30"></div></div>' +
      '<p class="tool-res" id="prR" aria-live="polite"></p></div>';
    function run() {
      var t = +$('#prT').value, n = +$('#prN').value, drop = Math.round((t - n) / 10), r = $('#prR');
      if (drop > 0) { r.className = 'tool-res r-watch'; r.textContent = fill(X.r_low, { v: drop }); }
      else if (drop < 0) { r.className = 'tool-res r-ok'; r.textContent = fill(X.r_high, { v: -drop }); }
      else { r.className = 'tool-res r-ok'; r.textContent = X.r_same; }
    }
    root.addEventListener('input', run); run();
  };

  /* ---------- car sounds: one at a time; tells the music to pause ---------- */
  T.sounds = function () {
    var cur = null, curBtn = null;
    function stop() { if (cur) { cur.pause(); cur.currentTime = 0; } if (curBtn) { curBtn.setAttribute('aria-pressed', 'false'); curBtn.querySelector('span').textContent = X.play; } cur = curBtn = null; d.dispatchEvent(new CustomEvent('lm:sfx', { detail: 'end' })); }
    root.querySelectorAll('[data-sfx]').forEach(function (b) {
      b.addEventListener('click', function () {
        var same = curBtn === b; stop(); if (same) return;
        var a = new Audio(b.getAttribute('data-sfx')); a.volume = 0.7;
        if (/^https?:/.test(a.src) && a.src.indexOf(location.origin) !== 0) a.crossOrigin = 'anonymous';
        d.dispatchEvent(new CustomEvent('lm:sfx', { detail: 'start' }));
        cur = a; curBtn = b; b.setAttribute('aria-pressed', 'true'); b.querySelector('span').textContent = X.stop;
        a.addEventListener('ended', stop); var p = a.play(); if (p && p.catch) p.catch(stop);
      });
    });
    d.addEventListener('visibilitychange', function () { if (d.hidden) stop(); });
  };

  /* ---------- oil change reminder with calendar file ---------- */
  T.oil = function () {
    var today = new Date().toISOString().slice(0, 10);
    root.innerHTML = '<div class="tool-card"><div class="grid3">' +
      '<div class="field"><label for="olL">' + esc(X.last) + '</label><input id="olL" type="date" max="' + today + '"></div>' +
      '<div class="field"><label for="olM">' + esc(X.miles) + '</label><select id="olM"><option value="100">~100</option><option value="200" selected>~200</option><option value="350">~350</option><option value="500">500+</option></select></div>' +
      '<div class="field"><label for="olI">' + esc(X.interval) + '</label><select id="olI"><option value="3000">3,000</option><option value="5000" selected>5,000</option><option value="7500">7,500</option><option value="10000">10,000</option></select></div></div>' +
      '<p class="hint">' + esc(X.interval_help) + '</p><p class="tool-res" id="olR" aria-live="polite">' + esc(X.pick) + '</p>' +
      '<div class="btn-row"><a class="btn btn-ghost" id="olCal" href="#" download="oil-change.ics" hidden>' + esc(X.cal) + '</a></div></div>';
    function run() {
      var l = $('#olL').value, r = $('#olR'), cal = $('#olCal'); cal.hidden = true;
      if (!l) { r.className = 'tool-res'; r.textContent = X.pick; return; }
      var days = Math.min(365, Math.round(+$('#olI').value / +$('#olM').value * 7));
      var due = new Date(l + 'T12:00:00Z'); due.setUTCDate(due.getUTCDate() + days);
      if (due < new Date()) { r.className = 'tool-res r-bad'; r.textContent = X.past; return; }
      r.className = 'tool-res r-ok';
      r.textContent = fill(X.next, { d: due.toLocaleDateString(LOC, { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) });
      var ds = due.toISOString().slice(0, 10).replace(/-/g, ''), nx = new Date(due.getTime() + 864e5).toISOString().slice(0, 10).replace(/-/g, '');
      var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//LM Tire//Oil reminder//EN', 'BEGIN:VEVENT', 'UID:oil-' + ds + '@lmtire', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z',
        'DTSTART;VALUE=DATE:' + ds, 'DTEND;VALUE=DATE:' + nx, 'SUMMARY:' + X.cal_title, 'DESCRIPTION:' + fill(X.cal_desc, { num: C.textLabel || '' }),
        'LOCATION:598 West Boylston Street\\, Worcester\\, MA 01606', 'BEGIN:VALARM', 'TRIGGER:-P2D', 'ACTION:DISPLAY', 'DESCRIPTION:' + X.cal_title, 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
      cal.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics); cal.hidden = false;
    }
    root.addEventListener('input', run); root.addEventListener('change', run);
  };

  var k = root.getAttribute('data-tool'); if (T[k]) T[k]();
})();
