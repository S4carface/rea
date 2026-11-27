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

  /* ---------- dashboard warning lights: tap a real-looking symbol ---------- */
  T.lights = function () {
    var IC = [
      ['a', '<path d="M8 27h6v-6h9v-5h14v5h7l4 6h5v-4h4v18h-4v-4h-5l-4 6H22l-6-6H8z"/><path d="M3 30v10"/>'],
      ['a', '<path d="M15 47C8 41 6 32 8 24c1.5-5 5-9 5-9h38s3.5 4 5 9c2 8 0 17-7 23"/><path d="M11 53h5m6 0h5m6 0h5m6 0h5m6 0h4"/><path d="M32 22v14"/><circle cx="32" cy="42.5" r="1.6" fill="currentColor"/>'],
      ['r', '<circle cx="32" cy="32" r="15"/><path d="M32 23v12"/><circle cx="32" cy="40.5" r="1.6" fill="currentColor"/><path d="M12 17a22 22 0 0 0 0 30M52 17a22 22 0 0 1 0 30"/>'],
      ['r', '<path d="M6 30h9l6-5h17l18-6-13 19H21l-6-6H6z"/><path d="M27 25v-5h-6M24 20h8"/><path d="M58 41c0 3-2 5-4 5s-4-2-4-5 4-8 4-8 4 5 4 8z" fill="currentColor"/>'],
      ['r', '<rect x="9" y="21" width="46" height="29" rx="3"/><path d="M17 21v-5h9v5M38 21v-5h9v5M17 35h9M39 35h9M43.5 30.5v9"/>'],
      ['r', '<path d="M32 9v25"/><circle cx="32" cy="41" r="6"/><path d="M36 15h6M36 21h6M36 27h6"/><path d="M7 53c4 3 8 3 12 0s9-3 13 0 9 3 13 0 8-3 12 0"/>']
    ];
    var items = X.items || [];
    root.innerHTML = '<div class="dash" role="group" aria-label="' + esc(X.cluster) + '"><svg class="dash-gauges" viewBox="0 0 600 150" aria-hidden="true"><path d="M40 140a120 120 0 0 1 220 -40" /><path d="M560 140a120 120 0 0 0 -220 -40"/>' +
      Array.apply(null, Array(9)).map(function (_, i) { var a = Math.PI * (1 - i / 10) - 0.25, x = 150 + 112 * Math.cos(a), y = 150 - 112 * Math.sin(a); return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="2.4"/><circle cx="' + (600 - x).toFixed(1) + '" cy="' + y.toFixed(1) + '" r="2.4"/>'; }).join('') + '</svg>' +
      '<div class="dash-row">' + items.map(function (it, i) {
        return '<button type="button" class="dl dl-' + IC[i][0] + '" aria-pressed="false" data-i="' + i + '"><svg viewBox="0 0 64 64" aria-hidden="true">' + IC[i][1] + '</svg><span class="sr">' + esc(it[0]) + '</span></button>';
      }).join('') + '</div><p class="dash-hint">' + esc(X.tap) + '</p></div>' +
      '<div class="dash-out card" aria-live="polite" hidden><span class="dash-badge"></span><h2></h2><p class="note"></p><button type="button" class="btn btn-ghost btn-sm dash-flash" hidden aria-pressed="false"></button></div>';
    var btns = root.querySelectorAll('.dl'), out = $('.dash-out'), fl = $('.dash-flash');
    function pick(i) {
      btns.forEach(function (b) { var on = +b.getAttribute('data-i') === i; b.classList.toggle('on', on); b.classList.remove('blink'); b.setAttribute('aria-pressed', on); });
      var red = IC[i][0] === 'r';
      out.hidden = false; out.className = 'dash-out card ' + (red ? 'is-r' : 'is-a');
      out.querySelector('.dash-badge').textContent = red ? X.red : X.amber;
      out.querySelector('h2').textContent = items[i][0]; out.querySelector('p').textContent = items[i][1];
      fl.hidden = i !== 0; fl.textContent = X.flash; fl.setAttribute('aria-pressed', 'false');
    }
    btns.forEach(function (b) { b.addEventListener('click', function () { pick(+b.getAttribute('data-i')); }); });
    fl.addEventListener('click', function () { var b = btns[0], on = !b.classList.contains('blink'); b.classList.toggle('blink', on); fl.textContent = on ? X.steady : X.flash; fl.setAttribute('aria-pressed', on); });
    // "bulb check": every light comes on for a moment, like turning the key
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) { root.classList.add('bulbs'); setTimeout(function () { root.classList.remove('bulbs'); }, 1400); }
  };

  /* ---------- symptom selector (restored from Sprint 2): tap what you notice ---------- */
  T.symptoms = function () {
    var out = $('.sy-out'), cur = null, curB = null;
    function stop() { if (cur) { cur.pause(); cur = null; } if (curB) curB.setAttribute('aria-pressed', 'false'); curB = null; d.dispatchEvent(new CustomEvent('lm:sfx', { detail: 'end' })); }
    root.querySelectorAll('.sy-b').forEach(function (b) {
      b.addEventListener('click', function () {
        root.querySelectorAll('.sy-b').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        stop(); out.hidden = false;
        $('.sy-svc').textContent = b.getAttribute('data-svc'); $('.sy-why').textContent = b.getAttribute('data-why');
        $('.sy-text').href = b.getAttribute('data-sms'); $('.sy-link').href = b.getAttribute('data-href');
        var snd = b.getAttribute('data-snd'), box = $('.sy-snds');
        $('.sy-hear').hidden = !snd; box.innerHTML = '';
        (snd ? snd.split(',') : []).forEach(function (pair) {
          var p = pair.split('|'), sb = d.createElement('button'); sb.type = 'button'; sb.className = 'btn btn-ghost btn-sm'; sb.setAttribute('aria-pressed', 'false'); sb.textContent = '▶ ' + p[0];
          sb.addEventListener('click', function () { var same = curB === sb; stop(); if (same) return; cur = new Audio(p[1]); cur.volume = 0.7; curB = sb; sb.setAttribute('aria-pressed', 'true'); d.dispatchEvent(new CustomEvent('lm:sfx', { detail: 'start' })); cur.addEventListener('ended', stop); cur.play().catch(stop); });
          box.appendChild(sb);
        });
        out.classList.remove('pop'); void out.offsetWidth; out.classList.add('pop');
        if (innerWidth < 900) out.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' });
      });
    });
    d.addEventListener('visibilitychange', function () { if (d.hidden) stop(); });
  };

  /* ---------- which tires fit you? (restored from Sprint 2) ---------- */
  T.chooser = function () {
    var f = $('.ch-form'), res = $('.ch-res'), R = X.res;
    f.addEventListener('change', function () {
      var v = {}; ['q1', 'q2', 'q3'].forEach(function (q) { var i = f.querySelector('[name=' + q + ']:checked'); v[q] = i ? i.value : ''; });
      var n = (v.q1 ? 1 : 0) + (v.q2 ? 1 : 0) + (v.q3 ? 1 : 0); f.querySelector('.ch-prog i').style.width = (n / 3 * 100) + '%';
      if (n < 3) return;
      var k = v.q1 === 'lots' ? 'winter' : (v.q2 === 'cost' && v.q3 !== 'long') ? 'used' : (v.q2 === 'grip' && v.q1 === 'some') ? 'grip' : (v.q2 === 'life' || v.q3 === 'long') ? 'new' : 'both';
      res.hidden = false; res.className = 'ch-res card k-' + k;
      res.querySelector('h2').textContent = R[k][0]; res.querySelector('.note').textContent = R[k][1];
      var tel = C.text || ''; var a = res.querySelector('.ch-text'); if (tel) a.href = 'sms:' + tel + '?&body=' + encodeURIComponent(fill(X.sms, { k: R[k][0].toLowerCase() })); else a.hidden = true;
      res.classList.remove('pop'); void res.offsetWidth; res.classList.add('pop');
      res.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' });
    });
  };

  /* ---------- tire care tips (Tire Help page): swipe cards + the rotation demo ---------- */
  T.tips = function () {
    var list = $('.tips');
    var step = function (dir) { var c = list.querySelector('.tip'); list.scrollBy({ left: dir * (c ? c.offsetWidth + 16 : 300), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); };
    $('.tips-p').addEventListener('click', function () { step(-1); }); $('.tips-n').addEventListener('click', function () { step(1); });
    var box = $('.rot'); if (!box) return;
    var POS = [[26, 38], [94, 38], [26, 112], [94, 112]], WEAR = ['#e8333b', '#e8333b', '#8a90ff', '#8a90ff'], state = [0, 1, 2, 3];
    var tires = box.querySelectorAll('.rot-t');
    tires.forEach(function (t, i) { t.querySelector('rect').style.fill = WEAR[i]; });
    var place = function () { tires.forEach(function (t, i) { var p = POS[state[i]]; t.style.transform = 'translate(' + p[0] + 'px,' + p[1] + 'px)'; }); };
    place();
    box.querySelector('.rot-go').addEventListener('click', function () {
      state = state.map(function (p) { return { 0: 2, 1: 3, 2: 1, 3: 0 }[p]; }); place();
      var sr = box.querySelector('.sr'); sr.textContent = sr.getAttribute('data-done');
    });
  };

  /* ---------- tire age from DOT ---------- */
  T.age = function () {
    var dot = '<svg class="sz-wall ag-wall" viewBox="0 0 600 200" aria-hidden="true"><defs><linearGradient id="agRub" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2c36"/><stop offset="1" stop-color="#0c0c10"/></linearGradient><path id="agArc" d="M40 200 A330 330 0 0 1 560 200"/></defs>' +
      '<path d="M0 210 A350 350 0 0 1 600 210 L560 210 A310 310 0 0 0 40 210Z" fill="url(#agRub)" stroke="#33364a" stroke-width="2"/>' +
      '<text class="ag-txt"><textPath href="#agArc" startOffset="50%" text-anchor="middle">DOT U2LL LMLR <tspan class="ag-box" id="agW">24</tspan><tspan class="ag-box" id="agY">19</tspan></textPath></text></svg>';
    root.innerHTML = '<div class="tool-card">' + dot + '<div class="field"><label for="agI">' + esc(X.label) + '</label><input id="agI" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" placeholder="' + esc(X.ph) + '" style="max-width:220px;font:500 1.5rem var(--mono);letter-spacing:.12em"></div><p class="tool-res" id="agR" aria-live="polite"></p></div>';
    var i = $('#agI'), r = $('#agR');
    i.addEventListener('input', function () {
      var v = i.value.replace(/\D/g, ''); i.value = v; r.className = 'tool-res'; r.textContent = '';
      var pv = (v + '2419'.slice(v.length)); $('#agW').textContent = pv.slice(0, 2); $('#agY').textContent = pv.slice(2, 4); root.querySelector('.ag-wall').classList.toggle('lit', v.length === 4);
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
    var wall = '<svg class="sz-wall" viewBox="0 0 600 230" role="img" aria-label="' + esc(X.a) + '"><defs><linearGradient id="szRub" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2c36"/><stop offset=".5" stop-color="#16171d"/><stop offset="1" stop-color="#0c0c10"/></linearGradient>' +
      '<path id="szArc" d="M40 215 A330 330 0 0 1 560 215"/></defs>' +
      '<path d="M-20 240 A390 390 0 0 1 620 240 L620 300 L-20 300Z" fill="#0d0e13"/><path d="M0 230 A350 350 0 0 1 600 230 L560 230 A310 310 0 0 0 40 230Z" fill="url(#szRub)" stroke="#33364a" stroke-width="2"/>' +
      '<path d="M20 230 A330 330 0 0 1 580 230" fill="none" stroke="#24263a" stroke-width="1" stroke-dasharray="2 7"/>' +
      '<text class="sz-txt"><textPath href="#szArc" startOffset="50%" text-anchor="middle"><tspan data-p="w">205</tspan><tspan>/</tspan><tspan data-p="a">55</tspan><tspan data-p="c">R</tspan><tspan data-p="d">16</tspan><tspan> </tspan><tspan data-p="li">91</tspan><tspan data-p="sr">V</tspan></textPath></text></svg>';
    var pop = ['205/55R16', '215/60R16', '225/65R17', '235/65R17', '225/45R17'];
    root.innerHTML = '<div class="tool-card">' + wall + '<div class="sz-pop">' + pop.map(function (x) { return '<button type="button" class="chip-b mono">' + x + '</button>'; }).join('') + '</div><div class="grid2"><div class="field"><label for="szA">' + esc(X.a) + '</label><input id="szA" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="' + esc(X.ph) + '"></div>' +
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
      var show = a || { w: 205, a: 55, c: 'R', rim: 16, li: 91, sr: 'V' }, map = { w: show.w, a: show.a, c: show.c === 'ZR' ? 'ZR' : show.c, d: show.rim, li: show.li || '', sr: show.sr || '' };
      root.querySelectorAll('.sz-txt tspan[data-p]').forEach(function (t) { t.textContent = map[t.getAttribute('data-p')]; });
      root.querySelector('.sz-wall').classList.toggle('lit', !!a);
    }
    root.addEventListener('input', run);
    root.querySelectorAll('.sz-pop button').forEach(function (b) { b.addEventListener('click', function () { $('#szA').value = b.textContent; run(); $('#szA').focus(); }); });
    run();
  };

  /* ---------- tire pressure + winter check: live Worcester temperature, a real gauge, winter checklist ---------- */
  T.pressure = function () {
    var month = new Date().getMonth(), winter = month >= 9 || month <= 3;
    var ticks = '';
    for (var p = 0; p <= 50; p += 5) { var a = Math.PI * (1 - p / 50), x1 = 150 + 112 * Math.cos(a), y1 = 150 - 112 * Math.sin(a), x2 = 150 + (p % 10 ? 102 : 94) * Math.cos(a), y2 = 150 - (p % 10 ? 102 : 94) * Math.sin(a);
      ticks += '<path d="M' + x1.toFixed(1) + ' ' + y1.toFixed(1) + 'L' + x2.toFixed(1) + ' ' + y2.toFixed(1) + '"/>' + (p % 10 ? '' : '<text x="' + (150 + 78 * Math.cos(a)).toFixed(1) + '" y="' + (155 - 78 * Math.sin(a)).toFixed(1) + '">' + p + '</text>'); }
    var sl = function (id, lab, min, max, val, unit) { return '<div class="pr-sl"><label for="' + id + '">' + esc(lab) + '</label><output for="' + id + '" id="' + id + 'O" class="mono">' + val + unit + '</output><input type="range" id="' + id + '" min="' + min + '" max="' + max + '" step="1" value="' + val + '"></div>'; };
    root.innerHTML =
      '<div class="pr-wx" hidden><div><small class="mono">' + esc(X.today) + '</small><b id="prWx">--°F</b><span>' + esc(X.out) + '</span></div><button type="button" class="btn btn-ghost btn-sm" id="prUse">' + esc(X.use) + '</button></div>' +
      '<p class="pr-snow" hidden>' + esc(X.snow) + '</p>' +
      '<div class="tool-card pr-card"><div class="pr-gauge"><svg viewBox="0 0 300 175" role="img" aria-labelledby="prGT"><title id="prGT">' + esc(X.gauge) + '</title>' +
      '<defs><radialGradient id="prFace" cx="50%" cy="85%" r="80%"><stop offset="0" stop-color="#1f2233"/><stop offset="1" stop-color="#090a10"/></radialGradient></defs>' +
      '<path d="M22 150a128 128 0 0 1 256 0" fill="url(#prFace)" stroke="#2b2f45" stroke-width="4"/>' +
      '<path id="prRed" class="pr-red" d=""/><g class="pr-ticks">' + ticks + '</g>' +
      '<path id="prSet" class="pr-set" d=""/>' +
      '<g id="prNeedle" class="pr-needle"><path d="M150 150L150 46" /><circle cx="150" cy="150" r="10"/></g>' +
      '</svg>' +
      '<p class="pr-cap"><b class="pr-big" id="prBig">35</b> <span class="pr-unit">PSI</span><br>' + esc(X.gauge) + '</p></div>' +
      '<div class="pr-sliders">' + sl('prS', X.set, 20, 50, 35, '') + sl('prT', X.then, -10, 100, 70, '°F') + sl('prN', X.now, -20, 100, 30, '°F') + '</div>' +
      '<p class="tool-res" id="prR" aria-live="polite"></p><p class="hint" id="prTp"></p></div>' +
      (winter ? '<div class="tool-card pr-win"><h2 class="th" style="margin-top:0">' + esc(X.win_h) + '</h2><ul class="pr-list">' + X.win_items.map(function (it, i) { return '<li><label><input type="checkbox" value="' + i + '"><span><b>' + esc(it[0]) + '</b><small>' + esc(it[1]) + '</small></span></label></li>'; }).join('') + '</ul><div class="pr-bar"><i></i></div><p class="pr-n" aria-live="polite"></p><a class="btn btn-red" id="prBook" href="#">' + esc(X.win_book) + '</a></div>' : '');
    function pt(p, r) { var a = Math.PI * (1 - Math.max(0, Math.min(50, p)) / 50); return [150 + r * Math.cos(a), 150 - r * Math.sin(a)]; }
    function arc(p0, p1, r) { var a = pt(p0, r), b = pt(p1, r); return 'M' + a[0].toFixed(1) + ' ' + a[1].toFixed(1) + 'A' + r + ' ' + r + ' 0 0 1 ' + b[0].toFixed(1) + ' ' + b[1].toFixed(1); }
    function run() {
      var S = +$('#prS').value, t = +$('#prT').value, n = +$('#prN').value;
      $('#prSO').textContent = S; $('#prTO').textContent = t + '°F'; $('#prNO').textContent = n + '°F';
      var est = Math.round(S - (t - n) / 10), drop = S - est, low = Math.round(S * 0.75);
      $('#prNeedle').style.transform = 'rotate(' + (Math.max(0, Math.min(50, est)) / 50 * 180 - 90) + 'deg)';
      $('#prBig').textContent = est;
      $('#prRed').setAttribute('d', arc(0, low, 116)); $('#prSet').setAttribute('d', arc(S - 0.6, S + 0.6, 116));
      var r = $('#prR');
      if (drop > 0) { r.className = 'tool-res ' + (est < low ? 'r-bad' : 'r-watch'); r.textContent = fill(X.r_low, { v: drop }); }
      else if (drop < 0) { r.className = 'tool-res r-ok'; r.textContent = fill(X.r_high, { v: -drop }); }
      else { r.className = 'tool-res r-ok'; r.textContent = X.r_same; }
      $('#prTp').textContent = fill(X.tpms, { v: low });
      root.classList.toggle('pr-low', est < low);
    }
    root.addEventListener('input', run); run();
    // today's temperature and the week's snow from Open-Meteo (no key, no personal data); cached for the visit
    var wx = $('.pr-wx'), temp = null;
    function gotTemp(v) { temp = Math.round(v); $('#prWx').textContent = temp + '°F'; wx.hidden = false; }
    $('#prUse').addEventListener('click', function () { if (temp == null) return; $('#prN').value = temp; run(); });
    try { var c = JSON.parse(sessionStorage.getItem('lm-wx') || 'null'); if (c && Date.now() - c.t < 1800000) { gotTemp(c.temp); $('#prN').value = c.temp; run(); if (c.snow) $('.pr-snow').hidden = false; } else throw 0; } catch (e) {
      fetch('https://api.open-meteo.com/v1/forecast?latitude=42.2626&longitude=-71.8023&current=temperature_2m&daily=snowfall_sum&temperature_unit=fahrenheit&timezone=America%2FNew_York&forecast_days=7')
        .then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
          if (!j || !j.current) return;
          var snow = (j.daily && j.daily.snowfall_sum || []).some(function (x) { return x >= 0.5; });
          gotTemp(j.current.temperature_2m); $('#prN').value = Math.round(j.current.temperature_2m); run();
          if (snow) $('.pr-snow').hidden = false;
          try { sessionStorage.setItem('lm-wx', JSON.stringify({ t: Date.now(), temp: Math.round(j.current.temperature_2m), snow: snow })); } catch (e2) {}
        }).catch(function () {});
    }
    var win = $('.pr-win');
    if (win) {
      var bk = d.querySelector('.btn-row a.btn-red'); $('#prBook').href = bk ? bk.getAttribute('href') : '#';
      var upd = function () { var n = win.querySelectorAll('input:checked').length; win.querySelector('.pr-bar i').style.width = (n / 5 * 100) + '%'; win.querySelector('.pr-n').textContent = fill(X.win_n, { n: n }); win.classList.toggle('done', n === 5); };
      win.addEventListener('change', upd); upd();
    }
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
    var d0 = new Date(); d0.setMonth(d0.getMonth() - 2); var def = d0.toISOString().slice(0, 10);
    var chips = function (name, opts, sel) { return '<div class="chips">' + opts.map(function (o) { return '<label><input type="radio" name="' + name + '" value="' + o[0] + '"' + (o[0] === sel ? ' checked' : '') + '><span>' + o[1] + '</span></label>'; }).join('') + '</div>'; };
    root.innerHTML = '<div class="tool-card ol-card"><div class="ol-in">' +
      '<div class="field"><label for="olL">' + esc(X.last) + '</label><input id="olL" type="date" max="' + today + '" value="' + def + '"></div>' +
      '<fieldset class="field"><legend class="lbl">' + esc(X.miles) + '</legend>' + chips('olM', [['100', '~100'], ['200', '~200'], ['350', '~350'], ['500', '500+']], '200') + '</fieldset>' +
      '<fieldset class="field"><legend class="lbl">' + esc(X.interval) + '</legend>' + chips('olI', [['3000', '3,000'], ['5000', '5,000'], ['7500', '7,500'], ['10000', '10,000']], '5000') + '</fieldset>' +
      '<p class="hint">' + esc(X.interval_help) + '</p></div>' +
      '<div class="ol-out"><div class="ol-life"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="50" class="ol-bg"/><circle cx="60" cy="60" r="50" class="ol-fg" id="olArc" pathLength="100"/></svg><b id="olPct">--</b><small>' + esc(X.life) + '</small></div>' +
      '<div class="ol-date"><small class="mono">' + esc(X.around) + '</small><b id="olD">--</b><span id="olIn"></span></div></div>' +
      '<p class="tool-res" id="olR" aria-live="polite">' + esc(X.pick) + '</p>' +
      '<div class="btn-row"><a class="btn btn-ghost" id="olCal" href="#" download="oil-change.ics" hidden>' + esc(X.cal) + '</a></div></div>';
    function val(n) { var i = root.querySelector('[name=' + n + ']:checked'); return i ? +i.value : 0; }
    function run() {
      var l = $('#olL').value, r = $('#olR'), cal = $('#olCal'); cal.hidden = true;
      if (!l || l > today) { r.className = 'tool-res'; r.textContent = X.pick; $('#olD').textContent = '--'; $('#olPct').textContent = '--'; $('#olIn').textContent = ''; return; }
      var days = Math.min(365, Math.round(val('olI') / val('olM') * 7));
      var start = new Date(l + 'T12:00:00Z'), due = new Date(start); due.setUTCDate(due.getUTCDate() + days);
      var left = Math.round((due - new Date()) / 864e5), pct = Math.max(0, Math.min(100, Math.round(left / days * 100)));
      $('#olArc').style.strokeDasharray = pct + ' 100'; $('#olPct').textContent = pct + '%';
      root.querySelector('.ol-life').className = 'ol-life ' + (pct <= 15 ? 'is-bad' : pct <= 35 ? 'is-low' : '');
      $('#olD').textContent = due.toLocaleDateString(LOC, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
      $('#olIn').textContent = left <= 0 ? '' : left > 60 ? fill(X.in_m, { n: Math.round(left / 30.4) }) : fill(X.in_w, { n: Math.max(1, Math.round(left / 7)) });
      if (due < new Date()) { r.className = 'tool-res r-bad'; r.textContent = X.past; return; }
      r.className = 'tool-res r-ok';
      r.textContent = fill(X.next, { d: due.toLocaleDateString(LOC, { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) });
      var ds = due.toISOString().slice(0, 10).replace(/-/g, ''), nx = new Date(due.getTime() + 864e5).toISOString().slice(0, 10).replace(/-/g, '');
      var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//LM Tire//Oil reminder//EN', 'BEGIN:VEVENT', 'UID:oil-' + ds + '@lmtire', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z',
        'DTSTART;VALUE=DATE:' + ds, 'DTEND;VALUE=DATE:' + nx, 'SUMMARY:' + X.cal_title, 'DESCRIPTION:' + fill(X.cal_desc, { num: C.textLabel || '' }),
        'LOCATION:598 West Boylston Street\\, Worcester\\, MA 01606', 'BEGIN:VALARM', 'TRIGGER:-P2D', 'ACTION:DISPLAY', 'DESCRIPTION:' + X.cal_title, 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
      cal.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics); cal.hidden = false;
    }
    run();
    root.addEventListener('input', run); root.addEventListener('change', run);
  };

  var k = root.getAttribute('data-tool'); if (T[k]) T[k]();
})();
