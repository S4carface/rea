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

  /* ---------- penny test: a real penny standing in a real tread groove ----------
     Layers: tread photo (back) > penny > groove shadow > the same photo cut at the front rib's top edge (front).
     So the front rib really hides the lower part of the penny. Scale: penny = 24/32", so 1/32" = 1/24 of the penny. */
  T.penny = function () {
    var I = JSON.parse(root.getAttribute('data-img') || '{}');
    var EDGE = 52.4, D = 56; // front rib top edge and penny diameter, in % of the picture height
    var u = D / 24; // 1/32 inch in % of height
    var src = I.tread820, set = I.tread820 + ' 820w, ' + I.tread1400 + ' 1400w';
    var img = function (c) { return '<img class="' + c + '" src="' + esc(src) + '" srcset="' + esc(set) + '" sizes="(max-width:760px) 100vw, 720px" alt="" width="1400" height="791" decoding="async">'; };
    var ticks = ''; for (var n = 0; n <= 10; n += 2) ticks += '<span style="top:' + (EDGE + n * u) + '%"><i></i>' + n + '/32</span>';
    root.innerHTML =
      '<div class="tool-card pn-card"><div class="pn-stage" role="img" aria-label="' + esc(X.penny_img) + '">' + img('pn-bg') +
      '<div class="pn-coin" style="height:' + D + '%"><img src="' + esc(root.getAttribute('data-penny')) + '" alt="" width="520" height="520" decoding="async"><b class="pn-shine"></b></div>' +
      '<b class="pn-shade" style="top:' + (EDGE - 9) + '%"></b>' + img('pn-fg') +
      '<div class="pn-ghost" style="height:' + D + '%"></div><b class="pn-floor"><em>' + esc(X.floor) + '</em></b>' +
      '<b class="pn-surf" style="top:' + EDGE + '%"><em>' + esc(X.surface) + '</em></b>' +
      '<div class="pn-ruler" aria-hidden="true">' + ticks + '</div><small class="illus">' + esc(X.illus) + '</small></div>' +
      '<div class="pn-read"><label class="lbl" for="pnR">' + esc(X.depth) + '</label><output id="pnO" class="mono">6/32"</output><span id="pnH" class="pn-head"></span></div>' +
      '<input type="range" id="pnR" min="1" max="10" step="1" value="6" aria-describedby="pnM">' +
      '<div class="range-ticks" aria-hidden="true"><span>1/32"</span><span>4/32"</span><span>10/32" (' + esc(X.new) + ')</span></div>' +
      '<p class="tool-res" id="pnM" aria-live="polite"></p></div>';
    var st = $('.pn-stage'), coin = $('.pn-coin'), ghost = $('.pn-ghost'), floor = $('.pn-floor'), r = $('#pnR'), o = $('#pnO'), m = $('#pnM'), h = $('#pnH');
    st.style.setProperty('--edge', EDGE + '%');
    function draw() {
      var v = +r.value, top = EDGE - D + v * u; // penny bottom sits on the groove floor, v/32" below the surface
      coin.style.top = top + '%'; ghost.style.top = top + '%'; ghost.style.setProperty('--gm', ((EDGE - top) / D * 100) + '%'); floor.style.top = (EDGE + v * u) + '%';
      root.querySelectorAll('.pn-ruler span').forEach(function (s, i) { s.classList.toggle('on', i * 2 === v || (i * 2 === v - 1)); });
      o.textContent = v + '/32"'; r.setAttribute('aria-valuetext', v + '/32"');
      var k = v <= 2 ? 'bad' : v <= 4 ? 'low' : v <= 6 ? 'watch' : 'ok';
      m.className = 'tool-res r-' + k; m.textContent = X['r_' + k];
      h.textContent = v <= 2 ? X.head_vis : X.head_hid; h.className = 'pn-head ' + (v <= 2 ? 'vis' : '');
      coin.classList.remove('press'); void coin.offsetWidth; coin.classList.add('press');
    }
    r.addEventListener('input', draw); draw();
    // the penny drops into the groove when it first comes into view
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
      st.classList.add('pn-wait');
      var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); setTimeout(function () { st.classList.remove('pn-wait'); st.classList.add('pn-drop'); }, 200); } }, { threshold: 0.5 });
      io.observe(st);
    }
  };

  /* ---------- puncture: tap the damage on the tire picture ---------- */
  T.puncture = function () {
    var Z = X.zones, I = JSON.parse(root.getAttribute('data-img') || '{}');
    var ZOOM = { tread: I.zoomNail, shoulder: I.zoomShoulder, sidewall: I.zoomSide };
    var SPOT = { tread: [500, 560], shoulder: [622, 400], sidewall: [835, 620] };
    root.innerHTML =
      '<div class="tool-card pu-card"><div class="pu-stage"><svg class="pu-svg" viewBox="0 0 1200 904" role="group" aria-label="' + esc(X.pick) + '">' +
      '<defs><radialGradient id="puSpot" cx="38%" cy="30%" r="75%"><stop offset="0" stop-color="#fff" stop-opacity=".10"/><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>' +
      '<filter id="puGlow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="10" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
      '<filter id="puSh" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="5" dy="7" stdDeviation="5" flood-color="#000" flood-opacity=".75"/></filter></defs>' +
      '<image href="' + esc(I.tire) + '" x="0" y="0" width="1200" height="904" preserveAspectRatio="xMidYMid slice"/>' +
      '<rect width="1200" height="904" fill="url(#puSpot)" pointer-events="none"/>' +
      '<path class="pz" data-z="sidewall" tabindex="0" role="button" aria-label="' + esc(Z.sidewall) + '" fill-rule="evenodd" d="M752 14a128 438 0 1 1 0 876a128 438 0 1 1 0-876zM746 160a84 286 0 1 0 0 572a84 286 0 1 0 0-572z"/>' +
      '<path class="pz" data-z="shoulder" tabindex="0" role="button" aria-label="' + esc(Z.shoulder) + '" d="M408 62Q176 438 392 862L418 866Q299 444 432 46ZM598 22Q527.5 454 575 870L660 862Q638 452 684 34Z"/>' +
      '<path class="pz" data-z="tread" tabindex="0" role="button" aria-label="' + esc(Z.tread) + '" d="M432 46Q299 444 418 866L575 870Q527.5 454 598 22Z"/>' +
      '<g class="pu-lbl" aria-hidden="true"><text x="505" y="150" text-anchor="middle">' + esc(Z.tread.split(' (')[0]) + '</text><text x="250" y="300" text-anchor="middle">' + esc(Z.shoulder.split(' (')[0]) + '</text><path d="M300 312L404 372"/><text x="1035" y="470" text-anchor="middle">' + esc(Z.sidewall.split(' (')[0]) + '</text><path d="M975 452H880"/></g>' +
      '<g class="pu-nail" aria-hidden="true"><ellipse class="pu-ring" rx="44" ry="44"/><g class="pu-head" filter="url(#puSh)"><image href="' + esc(I.nailHead) + '" x="-40" y="-40" width="80" height="80"/></g><path class="pu-cut" d="M-34 6 C-14 -6 12 -8 34 -4" /></g>' +
      '</svg><small class="illus">' + esc(X.illus) + '</small></div>' +
      '<div class="pu-lens" hidden><div class="pu-lens-c"><img alt="" width="720" height="720" decoding="async"></div><p><span></span></p></div>' +
      '<form class="tool-form" onsubmit="return false">' +
      '<fieldset class="field"><legend class="lbl">' + esc(X.pick) + '</legend><div class="chips">' +
      ['tread', 'shoulder', 'sidewall'].map(function (z) { return '<label><input type="radio" name="zone" value="' + z + '"><span>' + esc(Z[z]) + '</span></label>'; }).join('') + '</div></fieldset>' +
      '<fieldset class="field"><legend class="lbl">' + esc(X.size_q) + '</legend><div class="chips"><label><input type="radio" name="hole" value="small" checked><span>' + esc(X.small) + '</span></label><label><input type="radio" name="hole" value="big"><span>' + esc(X.big) + '</span></label></div></fieldset>' +
      '<fieldset class="field"><legend class="lbl">' + esc(X.flat_q) + '</legend><div class="chips"><label><input type="radio" name="flat" value="no" checked><span>' + esc(X.no) + '</span></label><label><input type="radio" name="flat" value="yes"><span>' + esc(X.yes) + '</span></label></div></fieldset>' +
      '</form><p class="tool-res" id="puR" aria-live="polite">' + esc(X.pick) + '</p>' +
      '<a class="btn btn-ghost btn-photo" href="#">' + esc(X.photo) + '</a></div>';
    var svg = $('.pu-svg'), f = $('.tool-form'), res = $('#puR'), nail = $('.pu-nail'), lens = $('.pu-lens');
    var tel = C.text || '';
    var ph = $('.btn-photo'); if (tel) ph.href = 'sms:' + tel + '?&body=' + encodeURIComponent(X.photo_sms); else ph.hidden = true;
    function place(z, x, y) {
      var p = (x != null) ? [x, y] : SPOT[z];
      // flatten the nail head to follow the curve of the tire at that spot
      var sx = z === 'tread' ? 0.62 : z === 'shoulder' ? 0.42 : 0.9;
      nail.setAttribute('transform', 'translate(' + p[0] + ' ' + p[1] + ')');
      nail.querySelector('.pu-head').setAttribute('transform', 'scale(' + sx + ' 1)');
      nail.querySelector('.pu-cut').setAttribute('transform', 'rotate(-62) scale(.9 1)');
      nail.className.baseVal = 'pu-nail z-' + z; void nail.getBoundingClientRect(); nail.className.baseVal = 'pu-nail z-' + z + ' in';
    }
    function show(x, y) {
      var z = (f.querySelector('[name=zone]:checked') || {}).value, hole = f.querySelector('[name=hole]:checked').value, flat = f.querySelector('[name=flat]:checked').value;
      root.querySelectorAll('.pz').forEach(function (p) { p.classList.toggle('on', p.getAttribute('data-z') === z); p.setAttribute('aria-pressed', p.getAttribute('data-z') === z); });
      if (!z) return;
      if (x !== false) place(z, x, y);
      lens.hidden = false; lens.className = 'pu-lens z-' + z; lens.querySelector('img').src = ZOOM[z]; lens.querySelector('span').textContent = X.lens[z];
      void lens.offsetWidth; lens.classList.add('in');
      var msg = [], k;
      if (z === 'sidewall') { k = 'bad'; msg.push(X.r_sidewall); }
      else if (z === 'shoulder') { k = 'bad'; msg.push(X.r_shoulder); }
      else if (hole === 'big') { k = 'bad'; msg.push(X.r_big); }
      else { k = 'ok'; msg.push(X.r_tread); }
      if (flat === 'yes') { msg.push(X.r_flat); if (k === 'ok') k = 'watch'; }
      res.className = 'tool-res r-' + k; res.textContent = msg.join(' ');
      root.setAttribute('data-k', k);
    }
    function pick(z, x, y) { f.querySelector('[name=zone][value=' + z + ']').checked = true; show(x, y); }
    svg.addEventListener('click', function (e) {
      var p = e.target.closest('.pz'); if (!p) return;
      var pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
      var loc = pt.matrixTransform(svg.getScreenCTM().inverse());
      pick(p.getAttribute('data-z'), e.clientX || e.clientY ? Math.round(loc.x) : null, Math.round(loc.y));
    });
    svg.addEventListener('keydown', function (e) { var p = e.target.closest('.pz'); if (p && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pick(p.getAttribute('data-z')); } });
    f.addEventListener('change', function (e) { show(e.target.name === 'zone' ? null : false); });
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
