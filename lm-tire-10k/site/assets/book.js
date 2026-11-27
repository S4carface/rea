/* Appointment request. Sends by text (always available) or online (only when the owner sets up delivery).
   Success is shown only when the server confirms it received the request. A request is never called a confirmed appointment.
   Remembering details is off unless the customer turns it on. */
(function () {
  'use strict';
  var X = window.LM_TXT, C = window.LM_CFG, box = document.querySelector('[data-book]');
  if (!box || !X || !C) return;
  var S = (window.LM && LM.store) || { get: function () { return null; }, set: function () {} };
  function go(u) { if (window.LM_TEST) { window.LM_last = u; return; } location.href = u; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var LOC = { en: 'en-US', pt: 'pt-BR', es: 'es-US' }[document.documentElement.lang] || 'en-US';
  var MAP = { 'new-tires': 'tires', 'used-tires': 'tires', 'flat-tire-repair': 'tires', 'wheel-alignment': 'align', brakes: 'brakes', 'oil-change': 'oil', suspension: 'susp', diagnostics: 'diag' };
  // next open days from the shop hours (holidays included)
  var days = '<option value="">' + esc(X.any_day) + '</option>';
  if (window.LM_HOURS) {
    for (var k = 0, n = 0; k < 30 && n < 12; k++) {
      if (!LM_HOURS.on(k)) continue;
      var ds = LM_HOURS.dateStr(k);
      var label = new Date(ds + 'T12:00:00Z').toLocaleDateString(LOC, { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' });
      days += '<option value="' + ds + '">' + esc(label.charAt(0).toUpperCase() + label.slice(1)) + '</option>'; n++;
    }
  }
  var langs = [['en', 'English'], ['pt', 'Português'], ['es', 'Español']];
  box.innerHTML =
    '<form id="bookForm" class="card" data-keep novalidate>' +
    '<p class="box-amber" style="margin-bottom:20px"><b>' + esc(X.is_request) + '</b></p>' +
    '<fieldset class="field"><legend class="lbl" style="font-size:1.15rem">' + esc(X.svc_q) + '</legend><div class="chips">' +
    X.svcs.map(function (s) { return '<label><input type="checkbox" name="svc" value="' + s[0] + '"><span>' + esc(s[1]) + '</span></label>'; }).join('') + '</div>' +
    '<div class="field" id="bOtherW" hidden style="margin-top:12px"><label for="bOther" class="sr">' + esc(X.other_ph) + '</label><textarea id="bOther" name="other" maxlength="400" placeholder="' + esc(X.other_ph) + '"></textarea></div></fieldset>' +
    '<h2 class="fh">' + esc(X.car_h) + ' <span class="opt">' + esc(X.opt) + '</span></h2><p class="hint">' + esc(X.car_why) + '</p><div data-veh style="margin-top:12px"></div>' +
    '<h2 class="fh">' + esc(X.when_h) + '</h2><div class="grid2">' +
    '<div class="field"><label for="bDay">' + esc(X.day) + '</label><select id="bDay" name="day">' + days + '</select></div>' +
    '<div class="field"><label for="bTime">' + esc(X.time) + '</label><select id="bTime" name="time"><option value="">' + esc(X.any_time) + '</option><option value="am">' + esc(X.morning) + '</option><option value="pm">' + esc(X.afternoon) + '</option></select></div></div>' +
    '<h2 class="fh">' + esc(X.you_h) + '</h2><div class="grid2">' +
    '<div class="field"><label for="bName">' + esc(X.name) + '</label><input id="bName" name="name" autocomplete="given-name" maxlength="60" placeholder="' + esc(X.name_ph) + '"></div>' +
    '<div class="field"><label for="bPhone">' + esc(X.phone) + ' <span class="opt" id="bPhoneOpt">' + esc(X.opt) + '</span></label><input id="bPhone" name="phone" type="tel" inputmode="tel" autocomplete="tel-national" maxlength="20" placeholder="' + esc(X.phone_ph) + '"></div>' +
    '<div class="field"><label for="bLang">' + esc(X.pref) + '</label><select id="bLang" name="lang">' + langs.map(function (l) { return '<option value="' + l[0] + '"' + (l[0] === document.documentElement.lang ? ' selected' : '') + ' lang="' + l[0] + '">' + l[1] + '</option>'; }).join('') + '</select></div>' +
    '<div class="field"><label for="bNotes">' + esc(X.notes) + ' <span class="opt">' + esc(X.opt) + '</span></label><input id="bNotes" name="notes" maxlength="200"></div></div>' +
    '<label class="check" style="margin-top:16px"><input type="checkbox" id="bRem"><span>' + esc(X.remember) + '</span></label>' +
    '<button type="button" class="link-btn" id="bForget" hidden>' + esc(X.forget) + '</button>' +
    '<input type="text" name="website" tabindex="-1" autocomplete="off" class="sr" aria-hidden="true">' +
    '<p class="err" id="bErr" role="alert"></p>' +
    '<div class="btn-row" style="margin-top:18px"><button class="btn btn-red" type="submit" id="bText">' + esc(X.send_text) + '</button>' +
    (C.wa ? '<button class="btn btn-ghost" type="button" id="bWa">' + esc(X.send_wa) + '</button>' : '') +
    (C.endpoint ? '<button class="btn btn-blue" type="button" id="bOnline">' + esc(X.send_online) + '</button>' : '') + '</div>' +
    '<p class="hint" id="bStatus" role="status" aria-live="polite" style="margin-top:12px"></p>' +
    '</form>';
  var f = box.querySelector('#bookForm'), veh = window.LM_vehicle(box.querySelector('[data-veh]'), 'bv');
  var other = f.querySelector('#bOtherW'), err = f.querySelector('#bErr'), st = f.querySelector('#bStatus');
  f.addEventListener('change', function (e) {
    if (e.target.name === 'svc') { other.hidden = !f.querySelector('[name=svc][value=other]').checked; }
  });
  var pre = new URLSearchParams(location.search).get('svc') || (location.hash.match(/svc=([\w-]+)/) || [])[1];
  if (pre && MAP[pre]) f.querySelector('[name=svc][value=' + MAP[pre] + ']').checked = true;
  if (window.LM) LM.restore();
  other.hidden = !f.querySelector('[name=svc][value=other]').checked;
  // remember me (off by default)
  var rem = f.querySelector('#bRem'), forget = f.querySelector('#bForget'), saved = null;
  try { saved = JSON.parse(S.get('lm-me') || 'null'); } catch (e) {}
  if (saved) {
    rem.checked = true; forget.hidden = false;
    if (!f.querySelector('#bName').value) f.querySelector('#bName').value = saved.n || '';
    if (!f.querySelector('#bPhone').value) f.querySelector('#bPhone').value = saved.p || '';
    if (saved.v && !veh.text()) veh.set(saved.v);
  }
  forget.addEventListener('click', function () { S.set('lm-me', null); rem.checked = false; forget.hidden = true; st.textContent = X.forgot; });
  rem.addEventListener('change', function () { if (!rem.checked) { S.set('lm-me', null); forget.hidden = true; } });
  function remember() {
    if (!rem.checked) return;
    S.set('lm-me', JSON.stringify({ n: f.querySelector('#bName').value.trim(), p: f.querySelector('#bPhone').value.trim(), v: veh.get() }));
    forget.hidden = false;
  }
  function picked() { return Array.prototype.map.call(f.querySelectorAll('[name=svc]:checked'), function (c) { return c.value; }); }
  function svcNames() {
    var p = picked(), names = X.svcs.filter(function (s) { return p.indexOf(s[0]) > -1 && s[0] !== 'other'; }).map(function (s) { return s[1]; });
    var o = f.querySelector('#bOther').value.trim(); if (p.indexOf('other') > -1 && o) names.push(o);
    return names.join(', ');
  }
  function when() {
    var d = f.querySelector('#bDay'), t = f.querySelector('#bTime');
    return d.options[d.selectedIndex].text + ' · ' + t.options[t.selectedIndex].text;
  }
  function check(online) {
    err.textContent = '';
    var p = picked();
    if (!p.length) { err.textContent = X.other_need; f.querySelector('[name=svc]').focus(); return false; }
    if (p.indexOf('other') > -1 && !f.querySelector('#bOther').value.trim() && p.length === 1) { err.textContent = X.other_need; f.querySelector('#bOther').focus(); return false; }
    if (online) {
      if (!f.querySelector('#bName').value.trim()) { err.textContent = X.name_need; f.querySelector('#bName').focus(); return false; }
      if (f.querySelector('#bPhone').value.replace(/\D/g, '').replace(/^1/, '').length !== 10) { err.textContent = X.phone_need; f.querySelector('#bPhone').focus(); return false; }
    }
    return true;
  }
  function message() {
    var l = [X.msg_book, X.msg_svc.replace('{v}', svcNames())], car = veh.text();
    if (car) l.push(X.msg_car.replace('{v}', car));
    l.push(X.msg_when.replace('{v}', when()));
    var nm = f.querySelector('#bName').value.trim(), ph = f.querySelector('#bPhone').value.trim(), no = f.querySelector('#bNotes').value.trim();
    if (nm) l.push(X.msg_name.replace('{v}', nm));
    if (ph) l.push(X.msg_phone.replace('{v}', ph));
    if (no) l.push(X.msg_notes.replace('{v}', no));
    return l.join('\n');
  }
  // texts go to the person who answers the language the customer picked for the reply
  function target() { var lg = f.querySelector('#bLang').value; return (C.route && C.route[lg]) || { num: C.text, label: C.textLabel, wa: C.wa }; }
  f.addEventListener('submit', function (e) {
    e.preventDefault(); if (!check(false)) return; remember();
    var t = target();
    if (window.LM_track) LM_track('Text request opened', { form: 'appointment' });
    go('sms:' + t.num + '?&body=' + encodeURIComponent(message()));
    st.textContent = X.opened.replace('{num}', t.label).replace('{shop}', C.shopLabel);
  });
  var wa = f.querySelector('#bWa');
  if (wa) wa.addEventListener('click', function () {
    if (!check(false)) return; remember();
    var t = target(); window.open('https://wa.me/' + String(t.wa || C.wa).replace(/\D/g, '') + '?text=' + encodeURIComponent(message()), '_blank', 'noopener');
  });
  var on = f.querySelector('#bOnline');
  if (on) on.addEventListener('click', function () {
    if (!check(true)) return; remember();
    on.disabled = true; st.textContent = X.sending;
    var body = { kind: 'appointment', lang: document.documentElement.lang, reply_lang: f.querySelector('#bLang').value, services: picked(), other: f.querySelector('#bOther').value.trim(),
      vehicle: veh.text(), day: f.querySelector('#bDay').value, time: f.querySelector('#bTime').value, name: f.querySelector('#bName').value.trim(),
      phone: f.querySelector('#bPhone').value.trim(), notes: f.querySelector('#bNotes').value.trim(), website: f.querySelector('[name=website]').value };
    var ctl = window.AbortController ? new AbortController() : null, tm = setTimeout(function () { if (ctl) ctl.abort(); }, 15000);
    fetch(C.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctl ? ctl.signal : undefined })
      .then(function (r) { return r.ok ? r.json() : { ok: false }; })
      .then(function (j) {
        clearTimeout(tm); on.disabled = false;
        if (j && j.ok === true) { st.textContent = X.sent_ok; if (window.LM_track) LM_track('Request delivered', { form: 'appointment' }); }
        else throw new Error('not delivered');
      })
      .catch(function () { clearTimeout(tm); on.disabled = false; st.textContent = ''; err.textContent = X.sent_fail.replace('{shop}', C.shopLabel); if (window.LM_track) LM_track('Request failed', { form: 'appointment' }); });
  });
})();
