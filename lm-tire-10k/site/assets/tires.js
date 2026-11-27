/* Tire search: by size or by vehicle. Quote mode today (customers ask by text).
   When the shop app sends a public feed, the other display modes show stock and prices (see tools/inventory.py). */
(function () {
  'use strict';
  var X = window.LM_TXT, C = window.LM_CFG, box = document.querySelector('[data-tire-search]');
  if (!box || !X || !C) return;
  function go(u) { if (window.LM_TEST) { window.LM_last = u; return; } location.href = u; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function parse(v) {
    var s = String(v || '').toUpperCase().replace(/\s+/g, ' ').trim();
    var m = s.match(/^(P|LT)?\s*(\d{3})\s*[\/ -]?\s*(\d{2})\s*(Z?R|D|B|-|\s)?\s*(\d{2}(?:\.5)?)\b/);
    if (!m) return null;
    var w = +m[2], a = +m[3], r = m[5];
    if (w < 125 || w > 395 || a < 25 || a > 90 || +r < 12 || +r > 26) return null;
    return { w: w, a: a, r: r, txt: (m[1] || '') + w + '/' + a + 'R' + r };
  }
  var q = new URLSearchParams(location.search), start = q.get('size') || decodeURIComponent((location.hash.match(/size=([^&]+)/) || [])[1] || '');
  box.innerHTML =
    '<div class="card">' +
    '<div class="tabs" role="tablist">' +
    '<button type="button" role="tab" id="tabS" aria-controls="panS" aria-selected="true">' + esc(X.by_size) + '</button>' +
    '<button type="button" role="tab" id="tabC" aria-controls="panC" aria-selected="false" tabindex="-1">' + esc(X.by_car) + '</button></div>' +
    '<form id="tireForm" data-keep novalidate>' +
    '<div role="tabpanel" id="panS" aria-labelledby="tabS"><div class="field"><label for="tSize">' + esc(X.size) + '</label>' +
    '<input id="tSize" name="size" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="18" placeholder="' + esc(X.size_ph) + '" aria-describedby="tSizeH tSizeR">' +
    '<small class="hint" id="tSizeH">' + esc(X.size_help) + '</small><p class="hint" id="tSizeR" aria-live="polite"></p></div></div>' +
    '<div role="tabpanel" id="panC" aria-labelledby="tabC" hidden><span id="by-car"></span><div data-veh></div><p class="hint" style="margin-top:10px">' + esc(X.car_note) + '</p></div>' +
    '<div class="grid2" style="margin-top:16px">' +
    '<fieldset class="field"><legend class="lbl">' + esc(X.cond) + '</legend><div class="chips">' +
    [['new', X.cond_new], ['used', X.cond_used], ['any', X.cond_any]].map(function (o, i) { return '<label><input type="radio" name="cond" value="' + o[0] + '"' + (i === 2 ? ' checked' : '') + '><span>' + esc(o[1]) + '</span></label>'; }).join('') + '</div></fieldset>' +
    '<fieldset class="field"><legend class="lbl">' + esc(X.qty) + '</legend><div class="chips">' +
    ['1', '2', '4'].map(function (n) { return '<label><input type="radio" name="qty" value="' + n + '"' + (n === '4' ? ' checked' : '') + '><span>' + n + '</span></label>'; }).join('') + '</div></fieldset></div>' +
    '<div class="field" style="margin-top:16px"><label for="tNotes">' + esc(X.notes) + ' <span class="opt">' + esc(X.opt) + '</span></label><input id="tNotes" name="notes" maxlength="160" placeholder="' + esc(X.notes_ph) + '"></div>' +
    '<p class="err" id="tErr" role="alert"></p>' +
    '<div id="tRes"></div>' +
    '<div class="quote-box"><h2>' + esc(X.quote_h) + '</h2><p class="note">' + esc(X.quote_p) + '</p>' +
    '<div class="btn-row" style="margin-top:14px"><button class="btn btn-red" type="submit">' + esc(X.send_text) + '</button>' +
    (C.wa ? '<button class="btn btn-ghost" type="button" id="tWa">' + esc(X.send_wa) + '</button>' : '') +
    '<a class="btn btn-ghost" href="tel:' + C.shop + '">' + esc(X.or_call) + ' ' + esc(C.shopLabel) + '</a></div>' +
    '<p class="hint" id="tOpened" role="status" hidden></p></div>' +
    '</form></div>';
  var veh = window.LM_vehicle(box.querySelector('[data-veh]'), 'tv');
  var f = box.querySelector('#tireForm'), sz = f.querySelector('#tSize'), rd = f.querySelector('#tSizeR'), err = f.querySelector('#tErr');
  var tabs = [box.querySelector('#tabS'), box.querySelector('#tabC')], pans = [box.querySelector('#panS'), box.querySelector('#panC')], cur = 0;
  function tab(i, focus) {
    cur = i;
    tabs.forEach(function (t, k) { t.setAttribute('aria-selected', k === i ? 'true' : 'false'); t.tabIndex = k === i ? 0 : -1; pans[k].hidden = k !== i; });
    if (focus) tabs[i].focus();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { tab(i); });
    t.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); tab(1 - i, true); } });
  });
  if (location.hash === '#by-car') tab(1);
  if (window.LM) LM.restore();
  function readSize() {
    var p = parse(sz.value);
    rd.textContent = p ? X.size_read.replace('{w}', p.w).replace('{a}', p.a).replace('{r}', p.r) : (sz.value.trim().length > 6 ? X.size_bad : '');
    return p;
  }
  sz.addEventListener('input', readSize);
  if (start && !sz.value) sz.value = (parse(start) || { txt: start.toUpperCase() }).txt;
  if (sz.value) readSize();
  if (!sz.value && f.querySelector('#tvY').value) tab(1);

  /* ---- inventory display (only when a mode other than quote and a feed exists) ---- */
  var inv = null;
  if (C.inv && C.inv.mode !== 'quote' && C.inv.feed) {
    fetch(C.inv.feed).then(function (r) { return r.json(); }).then(function (j) { inv = j; show(); }).catch(function () {});
  }
  function money(n) { return '$' + Number(n).toFixed(2).replace(/\.00$/, ''); }
  function show() {
    var res = f.querySelector('#tRes'); res.innerHTML = '';
    var p = parse(sz.value); if (!inv || !p) return;
    var list = (inv.tires || []).filter(function (t) { return t.size === p.txt.replace(/^P/, ''); });
    if (!list.length) return;
    var m = C.inv.mode, L = X.inv || {};
    res.innerHTML = '<ul class="inv">' + list.map(function (t) {
      var bits = [esc(t.brand + ' ' + (t.model || '')), esc(t.condition === 'used' ? X.cond_used : X.cond_new)];
      if (t.condition === 'used' && t.tread_32nds) bits.push(t.tread_32nds + '/32"');
      var price = '';
      if ((m === 'tire_price' || m === 'both') && t.price_tire != null) price += '<b>' + money(t.price_tire) + '</b> ' + esc(L.each || '');
      if ((m === 'installed_price' || m === 'both') && t.price_installed != null) price += ' <b>' + money(t.price_installed) + '</b> ' + esc(L.installed || '');
      var avail = t.in_stock ? esc(L.in_stock || '') : esc(L.can_order || '');
      return '<li class="card">' + (t.photo ? '<img src="' + esc(t.photo) + '" alt="" loading="lazy" width="96" height="96">' : '') + '<div><b>' + bits.join(' · ') + '</b><p>' + avail + (price ? ' · ' + price : '') + '</p>' + (t.fees_note ? '<small class="hint">' + esc(t.fees_note) + '</small>' : '') + '</div></li>';
    }).join('') + '</ul>';
  }
  sz.addEventListener('change', show);

  function message() {
    var lines = [X.msg_tire], p = parse(sz.value), car = veh.text();
    if (cur === 0 && sz.value.trim()) lines.push(X.msg_size.replace('{v}', p ? p.txt : sz.value.trim()));
    if (car) lines.push(X.msg_car.replace('{v}', car));
    var cond = f.querySelector('[name=cond]:checked'), qty = f.querySelector('[name=qty]:checked');
    if (cond) lines.push(X.msg_cond.replace('{v}', { 'new': X.cond_new, used: X.cond_used, any: X.cond_new + ' / ' + X.cond_used }[cond.value]));
    if (qty) lines.push(X.msg_qty.replace('{v}', qty.value));
    var n = f.querySelector('#tNotes').value.trim(); if (n) lines.push(X.msg_notes.replace('{v}', n));
    return lines.join('\n');
  }
  function check() {
    err.textContent = '';
    if (!sz.value.trim() && !veh.text()) { err.textContent = X.need_one; (cur === 0 ? sz : f.querySelector('#tvY')).focus(); return false; }
    if (cur === 0 && sz.value.trim() && !parse(sz.value) && !veh.text()) { err.textContent = X.size_bad; sz.focus(); return false; }
    return true;
  }
  function opened() {
    var o = f.querySelector('#tOpened'); o.hidden = false;
    o.textContent = X.opened.replace('{num}', C.textLabel).replace('{shop}', C.shopLabel);
  }
  f.addEventListener('submit', function (e) {
    e.preventDefault(); if (!check()) return;
    if (window.LM_track) LM_track('Tire quote', { mode: cur ? 'vehicle' : 'size' });
    go('sms:' + C.text + '?&body=' + encodeURIComponent(message())); opened();
  });
  var wa = f.querySelector('#tWa');
  if (wa) wa.addEventListener('click', function () {
    if (!check()) return;
    window.open('https://wa.me/' + C.wa.replace(/\D/g, '') + '?text=' + encodeURIComponent(message()), '_blank', 'noopener'); opened();
  });
})();
