/* L&M Tire: feature layer (100 rounds). Runs after the core hero script. */
(() => {
'use strict';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const SHOP = { tel: '+15088533322', text: '+13048066047', pt: '+17742889675' };
const sms = (num, body) => 'sms:' + num + '?&body=' + encodeURIComponent(body);
window.LM = { $, $$, reduced, SHOP, sms };

/* ---- shop clock (Worcester time) ---- */
const OPEN = { 1: [480, 1080], 2: [480, 1080], 3: [480, 1080], 4: [480, 1080], 5: [480, 1080], 6: [480, 720] };
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
function nyNow(){
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: 'numeric', month: 'numeric', day: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
  const g = t => (parts.find(p => p.type === t) || {}).value;
  return { day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(g('weekday')), mins: (+g('hour') % 24) * 60 + +g('minute'), month: +g('month'), date: +g('day') };
}
const fmt = m => { const h = Math.floor(m / 60), mm = m % 60, h12 = ((h + 11) % 12) + 1; return h12 + (mm ? ':' + String(mm).padStart(2, '0') : '') + (h < 12 ? ' AM' : ' PM'); };
const dur = m => (m >= 60 ? Math.floor(m / 60) + 'h ' : '') + (m % 60) + 'm';
/* R92: holiday closures from assets/notice.json ("closed_dates": ["2026-11-26"]) */
LM.closedDates = new Set();
const nyDateStr = k => { const d = new Date(Date.now() + k * 864e5); const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d); return p; };
function shopState(){
  const n = nyNow(), shut = k => LM.closedDates.has(nyDateStr(k));
  const t = shut(0) ? null : OPEN[n.day];
  if (t && n.mins >= t[0] && n.mins < t[1]) return { open: true, closesIn: t[1] - n.mins, closeAt: t[1], now: n };
  if (t && n.mins < t[0]) return { open: false, opensLabel: 'today', openAt: t[0], nextDay: n.day, now: n, holiday: false };
  let k = 0, d = n.day;
  do { k++; d = (n.day + k) % 7; } while ((!OPEN[d] || shut(k)) && k < 21);
  return { open: false, opensLabel: k === 1 ? 'tomorrow' : DAYS[d], openAt: OPEN[d][0], nextDay: d, now: n, holiday: shut(0) };
}
LM.shopState = shopState; LM.fmt = fmt; LM.nyNow = nyNow;

/* ---- R1: header status + time-aware CTAs ---- */
const hs = $('#hdrStatus');
let lastKey = '';
function applyState(){
  const s = shopState();
  const text = s.open ? (s.closesIn <= 90 ? 'Open · closes in ' + dur(s.closesIn) : 'Open now · until ' + fmt(s.closeAt))
                      : 'Closed · opens ' + s.opensLabel + ' ' + fmt(s.openAt);
  const key = s.open + text;
  if (key === lastKey) return; lastKey = key;
  document.body.classList.toggle('is-open', s.open);
  document.body.classList.toggle('is-closed', !s.open);
  if (hs) { hs.lastElementChild.textContent = text; hs.setAttribute('aria-label', text + '. See hours.'); }
  $$('[data-cta]').forEach(b => {
    const primary = s.open ? b.dataset.cta === 'call' : b.dataset.cta === 'book';
    b.classList.toggle('btn-red', primary); b.classList.toggle('btn-ghost', !primary);
  });
  $$('.closed-note').forEach(p => p.hidden = s.open);
  document.dispatchEvent(new CustomEvent('lm:state', { detail: s }));
}
applyState(); setInterval(applyState, 30000); LM.refreshState = () => { lastKey = ''; applyState(); };

/* ---- R2: symptom checker ---- */
const SYMP = {
  brakes: ['Brakes', 'Grinding or squealing when you stop usually means the brakes need a look. It is safer to check it soon.', 'Hi L&M Tire, my brakes are grinding or squealing. Can I book a time to check them?'],
  shake: ['Tire balancing', 'A shake at higher speeds is often a wheel that needs balancing. We can check the tires and balance them.', 'Hi L&M Tire, my car shakes at higher speeds. Can I book a tire check and balance?'],
  clunk: ['Suspension & steering', 'Clunks over bumps or loose steering point to parts under the car. We work on suspension and steering.', 'Hi L&M Tire, my car clunks over bumps / the steering feels loose. Can I book a check?'],
  light: ['Check engine light', 'A warning light is the car telling you something. Bring it in and we will check what the light means.', 'Hi L&M Tire, a warning light is on in my car. Can I book a check?'],
  pull: ['Wheel alignment', 'A car that pulls to one side, a steering wheel that sits off-center, or tires wearing on one edge often point to wheel alignment. We do alignments.', 'Hi L&M Tire, my car pulls to one side / the steering wheel is off-center. Can I book a wheel alignment?'],
  flat: ['Flat tire repair: plugs and patches', 'A tire that keeps losing air may have a puncture. We do plugs and patches. Bring it in and we will check which one fits, or if it needs a new tire.', 'Hi L&M Tire, I have a flat / a tire losing air. Can it be plugged or patched? When can I come in?'],
  tread: ['New, used or winter tires', 'Thin tread grips less, most of all on wet and snowy roads. We sell new, used and winter tires.', 'Hi L&M Tire, I need tires. My size is: '],
  oil: ['Oil change', 'Keeping up with oil changes keeps the engine healthy. Text us to pick a time.', 'Hi L&M Tire, I would like to book an oil change.'],
  other: ['Tell us about it', 'Describe what you hear, feel or see. A short text is enough, and we will tell you if it is something we fix.', 'Hi L&M Tire, my car is doing this: ']
};
const sBtns = $$('.symp-btn'), sRes = $('.symp-res'), sEmpty = $('.symp-empty');
sBtns.forEach(b => b.setAttribute('aria-pressed', 'false'));
sBtns.forEach(b => b.addEventListener('click', () => {
  const d = SYMP[b.dataset.s];
  sBtns.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  sEmpty.hidden = true; sRes.hidden = false;
  $('.symp-svc').textContent = d[0]; $('.symp-why').textContent = d[1];
  $('.symp-text').href = sms(SHOP.text, d[2]);
  sRes.classList.toggle('pop', false); void sRes.offsetWidth; sRes.classList.add('pop');
  if (innerWidth < 900) $('.symp-out').scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'center' });
}));

/* ---- R3: tire size decoder ---- */
const szIn = $('#sz'), szForm = $('#sizeForm'), szSend = $('.size-send'), szHint = $('.size-hint');
const segs = $$('.wall-text .seg'), legs = $$('.leg');
function parseSize(v){
  const m = String(v).toUpperCase().replace(/\s+/g, '').match(/^P?(\d{3})\/?(\d{2})Z?R?F?(\d{2})/);
  return m ? { w: m[1], a: m[2], d: m[3] } : null;
}
function hot(p){ segs.forEach(s => s.classList.toggle('hot', s.dataset.p === p)); legs.forEach(l => l.classList.toggle('hot', l.dataset.p === p)); }
legs.forEach(l => { l.addEventListener('mouseenter', () => hot(l.dataset.p)); l.addEventListener('mouseleave', () => hot(null)); });
function updSize(){
  const p = parseSize(szIn.value);
  const show = p || { w: '205', a: '55', d: '16' };
  ['w', 'a', 'd'].forEach(k => {
    const s = segs.find(x => x.dataset.p === k); if (s.textContent !== show[k]) s.textContent = show[k];
    const l = legs.find(x => x.dataset.p === k); l.firstElementChild.textContent = show[k];
  });
  const fd = new FormData(szForm);
  const size = p ? `${p.w}/${p.a}R${p.d}` : '';
  const body = size
    ? `Hi L&M Tire, can I get a quote? Tire size: ${size}. Kind: ${fd.get('kind')}. How many: ${fd.get('qty')}.`
    : `Hi L&M Tire, can I get a tire quote? Kind: ${fd.get('kind')}. How many: ${fd.get('qty')}. I'll send a photo of my tire size.`;
  szSend.href = sms(SHOP.text, body);
  szSend.textContent = size ? `Text ${size} for a quote` : 'Text us for a tire quote';
  szHint.textContent = szIn.value && !p ? 'That does not look like a full size yet. It should look like 205/55R16.' : 'Not sure of the size? Text us a photo of the side of your tire instead.';
  hot(szIn.value && p ? null : null);
}
szIn.addEventListener('input', updSize);
szIn.addEventListener('focus', () => hot('w'));
szIn.addEventListener('blur', () => hot(null));
szForm.addEventListener('change', updSize);
szForm.addEventListener('submit', e => { e.preventDefault(); location.href = szSend.href; });
updSize();

/* ---- R4: quick replies ---- */
const QR = {
  en: [['Book an appointment', 'Hi L&M Tire, I would like to book an appointment.'], ['Tire quote', 'Hi L&M Tire, can I get a tire quote? My tire size is: '], ['Flat tire help', 'Hi L&M Tire, I have a flat tire. When can I come in?'], ['Wheel alignment', 'Hi L&M Tire, I would like a wheel alignment.'], ['Brakes', 'Hi L&M Tire, I need my brakes checked.'], ['Oil change', 'Hi L&M Tire, I would like an oil change.'], ['Something else', 'Hi L&M Tire, ']],
  es: [['Hacer una cita', 'Hola L&M Tire, quiero hacer una cita.'], ['Precio de llantas', 'Hola L&M Tire, quiero un precio de llantas. Mi medida es: '], ['Llanta ponchada', 'Hola L&M Tire, tengo una llanta ponchada. ¿Cuándo puedo ir?'], ['Alineación', 'Hola L&M Tire, quiero una alineación.'], ['Frenos', 'Hola L&M Tire, necesito revisar mis frenos.'], ['Cambio de aceite', 'Hola L&M Tire, quiero un cambio de aceite.'], ['Otra cosa', 'Hola L&M Tire, ']],
  pt: [['Marcar horário', 'Olá L&M Tire, quero marcar um horário.'], ['Preço de pneus', 'Olá L&M Tire, quero um orçamento de pneus. A medida é: '], ['Pneu furado', 'Olá L&M Tire, estou com um pneu furado. Quando posso ir?'], ['Alinhamento', 'Olá L&M Tire, quero fazer um alinhamento.'], ['Freios', 'Olá L&M Tire, preciso verificar os freios.'], ['Troca de óleo', 'Olá L&M Tire, quero fazer a troca de óleo.'], ['Outra coisa', 'Olá L&M Tire, ']]
};
const qr = $('#qr'), qrFab = $('#qrFab'), qrSheet = $('#qrSheet'), qrList = $('.qr-list');
let qrLang = (navigator.language || 'en').slice(0, 2);
if (!QR[qrLang]) qrLang = 'en';
function qrRender(){
  const num = qrLang === 'pt' ? SHOP.pt : SHOP.text;
  qrList.innerHTML = '';
  QR[qrLang].forEach(([label, body]) => { const a = document.createElement('a'); a.href = sms(num, body); a.textContent = label; if (qrLang !== 'en') a.lang = qrLang; qrList.appendChild(a); });
  $$('.qr-langs button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.l === qrLang)));
}
$$('.qr-langs button').forEach(b => b.addEventListener('click', () => { qrLang = b.dataset.l; qrRender(); }));
function qrOpen(from){ qrRender(); qrSheet.hidden = false; qrFab.setAttribute('aria-expanded', 'true'); qrSheet.querySelector('.qr-langs button[aria-pressed="true"]').focus(); qrSheet._from = from; }
function qrClose(){ if (qrSheet.hidden) return; qrSheet.hidden = true; qrFab.setAttribute('aria-expanded', 'false'); (qrSheet._from || qrFab).focus(); }
LM.openQuick = qrOpen;
qrFab.addEventListener('click', () => qrSheet.hidden ? qrOpen(qrFab) : qrClose());
$('.qr-x').addEventListener('click', qrClose);
document.addEventListener('keydown', e => { if (e.key === 'Escape') qrClose(); });
document.addEventListener('click', e => { if (!qrSheet.hidden && !qr.contains(e.target) && !e.target.closest('[data-quick]')) qrClose(); });
const barBook = $('.bar [data-cta="book"]');
if (barBook) { barBook.dataset.quick = ''; barBook.addEventListener('click', e => { e.preventDefault(); qrOpen(barBook); }); }
let qrShown = null;
addEventListener('scroll', () => { const s = scrollY > innerHeight * 0.8; if (s !== qrShown) { qrShown = s; qr.classList.toggle('show', s); } }, { passive: true });

/* ---- R5: odometer digits roll into place ---- */
$$('.odo[data-n]').forEach(o => {
  const digits = o.dataset.n.split('');
  digits.forEach((d, i) => {
    const dg = document.createElement('span'); dg.className = 'dg';
    const col = document.createElement('i');
    const spins = 1 + i;                       // later digits spin more, like an odometer
    for (let k = 0; k <= 10 * spins + +d; k++) { const b = document.createElement('b'); b.textContent = k % 10; col.appendChild(b); }
    col.dataset.to = String(10 * spins + +d);
    dg.appendChild(col); o.appendChild(dg);
  });
});
const odoIO = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  e.target.querySelectorAll('.dg i').forEach((c, i) => {
    c.style.transitionDelay = (i * 120) + 'ms';
    c.style.transform = 'translateY(' + (-1.25 * +c.dataset.to) + 'em)';
  });
  odoIO.unobserve(e.target);
}), { threshold: .4 });
$$('.odo[data-n]').forEach(o => reduced() ? o.querySelectorAll('.dg i').forEach(c => { c.style.transition = 'none'; c.style.transform = 'translateY(' + (-1.25 * +c.dataset.to) + 'em)'; }) : odoIO.observe(o));

/* ---- R6: booking form becomes a 4-step wizard (progressive enhancement over the same form) ---- */
(() => {
  const form = $('#bookForm'); if (!form) return;
  const fields = form.querySelector('.fields');
  const fSvc = $('#f-svc'), fDay = $('#f-day'), fLang = $('#f-lang'), fName = $('#f-name'), fCar = $('#f-car');
  const field = el => el.closest('.field');
  function chipSet(select, legend, cls){
    const fs = document.createElement('fieldset'); fs.className = 'chips wz-chips ' + (cls || '');
    const lg = document.createElement('legend'); lg.className = 'wz-q'; lg.textContent = legend; fs.appendChild(lg);
    [...select.options].forEach((o, i) => {
      const l = document.createElement('label'); const r = document.createElement('input');
      r.type = 'radio'; r.name = 'wz-' + select.name; r.value = o.value; r.checked = i === select.selectedIndex;
      r.addEventListener('change', () => { select.value = o.value; });
      const s = document.createElement('span'); s.textContent = o.textContent;
      l.append(r, s); fs.appendChild(l);
    });
    field(select).hidden = true;
    return fs;
  }
  const mk = (title) => { const d = document.createElement('div'); d.className = 'wz-step'; d.dataset.title = title; return d; };
  const s1 = mk('Service'), s2 = mk('Day'), s3 = mk('You'), s4 = mk('Send');
  s1.append(chipSet(fSvc, 'What do you need?'), field(fSvc));
  const dayNote = document.createElement('p'); dayNote.className = 'form-note'; dayNote.textContent = 'We are open Monday to Friday 8 AM to 6 PM, and Saturday 8 AM to 12 PM.';
  s2.append(chipSet(fDay, 'Which day works for you?'), dayNote, field(fDay));
  const q3 = document.createElement('p'); q3.className = 'wz-q'; q3.textContent = 'Who is booking?';
  s3.append(q3, field(fName), field(fCar));
  const langNote = document.createElement('p'); langNote.className = 'form-note'; langNote.textContent = 'Português goes to 774-288-9675. English and Español go to 304-806-6047.';
  s4.append(chipSet(fLang, 'Which language should we text in?', 'wz-langs'), langNote, field(fLang), $('#f-err'), fields.querySelector('button[type="submit"]'), fields.querySelector('.form-note'));
  const two = fields.querySelector('.two'); if (two) two.hidden = true;
  const steps = [s1, s2, s3, s4];
  const prog = document.createElement('div'); prog.className = 'wz-prog';
  prog.innerHTML = '<ol>' + steps.map((s, i) => `<li><span>${i + 1}</span>${s.dataset.title}</li>`).join('') + '</ol><div class="wz-bar"><i></i></div>';
  const nav = document.createElement('div'); nav.className = 'wz-nav';
  nav.innerHTML = '<button type="button" class="btn btn-ghost btn-sm wz-back">Back</button><button type="button" class="btn btn-red wz-next">Next</button>';
  const live = document.createElement('p'); live.className = 'sr'; live.setAttribute('aria-live', 'polite');
  fields.prepend(prog); steps.forEach(s => fields.appendChild(s)); fields.append(nav, live);
  form.classList.add('wz');
  let cur = 0;
  function show(i, focus){
    cur = i;
    steps.forEach((s, k) => { s.hidden = k !== i; });
    prog.querySelectorAll('li').forEach((li, k) => { li.classList.toggle('on', k === i); li.classList.toggle('ok', k < i); });
    prog.querySelector('.wz-bar i').style.transform = `scaleX(${(i + 1) / steps.length})`;
    nav.querySelector('.wz-back').style.visibility = i ? 'visible' : 'hidden';
    nav.querySelector('.wz-next').hidden = i === steps.length - 1;
    live.textContent = `Step ${i + 1} of ${steps.length}: ${steps[i].dataset.title}`;
    steps[i].classList.remove('enter'); void steps[i].offsetWidth; steps[i].classList.add('enter');
    if (focus) { const f = steps[i].querySelector('input:checked, input, button'); if (f) f.focus(); }
  }
  nav.querySelector('.wz-back').addEventListener('click', () => show(Math.max(0, cur - 1), true));
  nav.querySelector('.wz-next').addEventListener('click', () => {
    if (cur === 2 && !fName.value.trim()) { $('#f-err').textContent = ''; fName.setAttribute('aria-invalid', 'true'); fName.focus(); fName.placeholder = 'Please add your name'; return; }
    fName.removeAttribute('aria-invalid');
    show(Math.min(steps.length - 1, cur + 1), true);
  });
  // picking a chip on steps 1 and 2 moves on by itself
  [s1, s2].forEach((s, k) => s.addEventListener('click', e => { if (e.target.matches('input[type=radio]') && e.detail !== 0) setTimeout(() => show(k + 1, true), 220); }));
  fName.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); nav.querySelector('.wz-next').click(); } });
  fCar.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); nav.querySelector('.wz-next').click(); } });
  $('#again').addEventListener('click', () => show(0));
  // pre-pick the service when someone arrives from a symptom or a service link
  LM.bookService = name => { const o = [...fSvc.options].find(x => x.text === name); if (o) { fSvc.value = o.value; const r = s1.querySelector(`input[value="${CSS.escape(o.value)}"]`); if (r) r.checked = true; show(1); } };
  show(0);
})();

/* ---- R7: every service is a one-tap booking shortcut ---- */
(() => {
  const ALIAS = { 'Oil changes': 'Oil change' };
  const goBook = name => {
    if (LM.bookService) LM.bookService(name);
    const b = $('#book'); b.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
    setTimeout(() => { const f = b.querySelector('.wz-step:not([hidden]) input:checked, .wz-step:not([hidden]) input'); if (f) f.focus({ preventScroll: true }); }, reduced() ? 0 : 700);
  };
  LM.goBook = goBook;
  $$('#services .card li').forEach(li => {
    const name = li.textContent.trim();
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'svc-go'; btn.innerHTML = `<span>${li.innerHTML}</span><em aria-hidden="true">Book →</em>`;
    btn.setAttribute('aria-label', 'Book ' + name);
    btn.addEventListener('click', () => goBook(ALIAS[name] || name));
    li.textContent = ''; li.appendChild(btn);
  });
  // symptom result gets a "Book it" path too
  const row = $('.symp-res .cta-row');
  if (row) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-ghost symp-book'; b.textContent = 'Book it in 4 taps';
    const MAP = { 'Brakes': 'Brakes', 'Tire balancing': 'Installation & balancing', 'Suspension & steering': 'Suspension & steering', 'Check engine light': 'Check engine light', 'Flat tire repair: plugs and patches': 'Flat tire repair: plugs and patches', 'Wheel alignment': 'Wheel alignment', 'New, used or winter tires': 'New tires', 'Oil change': 'Oil change', 'Tell us about it': 'Something else' };
    b.addEventListener('click', () => goBook(MAP[$('.symp-svc').textContent] || 'Something else'));
    row.appendChild(b);
  }
})();

/* ---- R8: save the shop to your phone's contacts (.vcf) ---- */
(() => {
  const vcf = [
    'BEGIN:VCARD', 'VERSION:3.0',
    'N:;L&M Tire Auto Repair;;;', 'FN:L&M Tire Auto Repair', 'ORG:L&M Tire Auto Repair',
    'TEL;TYPE=WORK,VOICE:+1-508-853-3322',
    'TEL;TYPE=CELL,TEXT:+1-304-806-6047',
    'TEL;TYPE=CELL:+1-774-288-9675',
    'ADR;TYPE=WORK:;;598 West Boylston Street;Worcester;MA;01606;USA',
    'NOTE:Shop 508-853-3322. Text to book 304-806-6047 (English\\, Español). Português 774-288-9675. Mon-Fri 8 AM-6 PM\\, Sat 8 AM-12 PM\\, Sun closed.',
    'END:VCARD'
  ].join('\r\n');
  const url = URL.createObjectURL(new Blob([vcf], { type: 'text/vcard;charset=utf-8' }));
  const make = cls => {
    const a = document.createElement('a'); a.href = url; a.download = 'LM-Tire.vcf'; a.className = cls;
    a.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/><path d="M19 3v6M16 6h6"/></svg><span>Save our number to your phone</span>';
    return a;
  };
  const card = $('.contact'); if (card) card.appendChild(make('btn btn-ghost save-contact'));
  const foot = $('.foot > div:last-child ul'); if (foot) { const li = document.createElement('li'); li.appendChild(make('save-link')); foot.appendChild(li); }
})();

/* ---- R9: week-at-a-glance hours chart with a live "now" line ---- */
(() => {
  const table = $('.hours'); if (!table) return;
  const START = 6 * 60, END = 20 * 60, SPAN = END - START;
  const ORDER = [1, 2, 3, 4, 5, 6, 0], SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const OPEN = { 1: [480, 1080], 2: [480, 1080], 3: [480, 1080], 4: [480, 1080], 5: [480, 1080], 6: [480, 720] };
  const wk = document.createElement('div'); wk.className = 'week'; wk.setAttribute('aria-hidden', 'true');
  wk.innerHTML = '<div class="wk-scale"><span>6a</span><span>9a</span><span>12p</span><span>3p</span><span>6p</span></div>' +
    ORDER.map(d => { const o = OPEN[d]; return `<div class="wk-row" data-d="${d}"><b>${SHORT[d]}</b><div class="wk-track">${o ? `<i style="left:${(o[0] - START) / SPAN * 100}%;width:${(o[1] - o[0]) / SPAN * 100}%"></i>` : '<em>Closed</em>'}<u class="wk-now"></u></div></div>`; }).join('');
  table.before(wk);
  function tick(){
    const n = LM.nyNow();
    wk.querySelectorAll('.wk-row').forEach(r => {
      const today = +r.dataset.d === n.day; r.classList.toggle('today', today);
      const u = r.querySelector('.wk-now');
      const show = today && n.mins >= START && n.mins <= END;
      u.style.display = show ? 'block' : 'none';
      if (show) u.style.left = ((n.mins - START) / SPAN * 100) + '%';
    });
  }
  tick(); setInterval(tick, 60000);
})();

/* ---- R10: live snow alert from the Worcester forecast (Open-Meteo, no key, no personal data) ---- */
(() => {
  const KEY = 'lm-snow-v1', DAYN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  function show(info){
    if (!info || !info.day || sessionStorage.getItem('lm-snow-x')) return;
    const bar = document.createElement('div'); bar.className = 'snow'; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Snow alert');
    bar.innerHTML = `<svg class="i snow-ic" aria-hidden="true"><use href="#i-snow"/></svg><p><b>Snow is in the Worcester forecast for ${info.day}.</b> <span>Get winter tires on before it lands.</span></p><a class="btn btn-red btn-sm" href="${sms(SHOP.text, 'Hi L&M Tire, I need winter tires before the snow. My tire size is: ')}">Text for winter tires</a><button type="button" class="snow-x" aria-label="Close snow alert">×</button>`;
    bar.querySelector('.snow-x').addEventListener('click', () => { bar.classList.add('bye'); sessionStorage.setItem('lm-snow-x', '1'); setTimeout(() => bar.hidden = true, 400); });
    document.body.appendChild(bar);
    requestAnimationFrame(() => requestAnimationFrame(() => bar.classList.add('in')));
  }
  const cached = sessionStorage.getItem(KEY);
  if (cached) { try { show(JSON.parse(cached)); } catch (e) {} return; }
  const url = 'https://api.open-meteo.com/v1/forecast?latitude=42.2626&longitude=-71.8023&daily=snowfall_sum&timezone=America%2FNew_York&forecast_days=7';
  const ctrl = new AbortController(); setTimeout(() => ctrl.abort(), 6000);
  fetch(url, { signal: ctrl.signal }).then(r => r.ok ? r.json() : null).then(j => {
    let info = { day: null };
    if (j && j.daily) {
      const i = j.daily.snowfall_sum.findIndex(v => v >= 0.5);
      if (i >= 0) { const d = new Date(j.daily.time[i] + 'T12:00:00'); info.day = i === 0 ? 'today' : i === 1 ? 'tomorrow' : DAYN[d.getDay()]; }
    }
    sessionStorage.setItem(KEY, JSON.stringify(info)); show(info);
  }).catch(() => {});
})();

/* ---- R11: whole-page language switch (EN / PT / ES) for the key parts ---- */
(() => {
  const D = {
    '.top nav a.link[href="#services"]': ['Serviços', 'Servicios'],
    '.top nav a.link[href="#visit"]': ['Horário', 'Horario'],
    '.top nav a.link[href="#faq"]': ['Dúvidas', 'Preguntas'],
    '.top .actions .btn-ghost': ['Agendar', 'Reservar'],
    '.top .actions .btn-red': ['Ligar', 'Llamar'],
    '.b1 .kicker': ['Desde 2013 · 598 West Boylston St, Worcester', 'Desde 2013 · 598 West Boylston St, Worcester'],
    '.b1 h1': ['Pneus. Freios. De volta à estrada.', 'Llantas. Frenos. De vuelta al camino.'],
    '.b1 .sub': ['Pneus novos e usados, e os reparos que mantêm seu carro rodando.', 'Llantas nuevas y usadas, y las reparaciones que mantienen su carro en marcha.'],
    '.b1 [data-cta="call"]': ['Ligue agora', 'Llame ahora'],
    '.b1 [data-cta="book"]': ['Marcar horário', 'Hacer una cita'],
    '.b1 .closed-note': ['Estamos fechados agora. Mande uma mensagem e marque seu horário.', 'Estamos cerrados ahora. Mande un mensaje y reserve su hora.'],
    '.b2 h2': ['Pneu furado? Pneu careca? Neve chegando?', '¿Llanta ponchada? ¿Llanta lisa? ¿Viene la nieve?'],
    '.b2 .sub': ['Passe aqui. A gente coloca você de volta na estrada.', 'Venga. Lo ponemos de nuevo en marcha.'],
    '.b3 .col.left h2': ['Aberto de segunda a sábado.', 'Abierto de lunes a sábado.'],
    '.b3 .col.left .sub .chip': ['Seg a sex 8h às 18h<br>Sáb 8h às 12h', 'Lun a vie 8 AM a 6 PM<br>Sáb 8 AM a 12 PM'],
    '.b3 .col.right h2': ['Mande mensagem para agendar.', 'Mándenos un texto para reservar.'],
    '.b3 .col.right .sub': ['Falamos inglês, português e espanhol.', 'Hablamos inglés, portugués y español.'],
    '.b3 .col.right .btn-red, .b3 .col.right .btn-ghost[href^="sms"]': ['Marcar horário', 'Hacer una cita'],
    '#services .kicker': ['Serviços', 'Servicios'],
    '#svc-h': ['Pneus primeiro. Reparos também.', 'Primero llantas. Reparaciones también.'],
    '#symptoms .kicker': ['Não sabe o que precisa?', '¿No sabe qué necesita?'],
    '#symp-h': ['O que seu carro está fazendo?', '¿Qué está haciendo su carro?'],
    '#size .kicker': ['Orçamento de pneus por mensagem', 'Precio de llantas por texto'],
    '#size-h': ['Digite a medida do pneu. Mande para nós.', 'Escriba la medida de su llanta. Mándenosla.'],
    '#how .kicker': ['Como agendar', 'Cómo reservar'],
    '#how-h': ['Agendar leva uma mensagem.', 'Reservar toma un solo mensaje.'],
    '#visit .kicker': ['Horário e endereço', 'Horario y dirección'],
    '#faq .kicker': ['Perguntas', 'Preguntas'],
    '#faq-h': ['Bom saber.', 'Bueno saber.'],
    '#book .kicker': ['Marcar horário', 'Hacer una cita'],
    '#book-h': ['Conte o que seu carro precisa.', 'Díganos qué necesita su carro.'],
    '.bar [data-cta="call"]': ['Ligue agora', 'Llame ahora'],
    '.bar [data-cta="book"]': ['Mensagem', 'Mandar texto']
  };
  const NOTE = { pt: 'Atendimento em português: ligue ou mande mensagem para 774-288-9675.', es: 'Atención en español: llame o mande un texto al 304-806-6047.' };
  const BOOK = { en: [SHOP.text, "Hi, I'd like to book an appointment at L&M Tire."], pt: [SHOP.pt, 'Olá, quero marcar um horário na L&M Tire.'], es: [SHOP.text, 'Hola, quiero hacer una cita en L&M Tire.'] };
  const textNode = el => [...el.childNodes].reverse().find(n => n.nodeType === 3 && n.textContent.trim());
  function setLabel(el, html){
    if (el.querySelector('svg')) { const t = textNode(el); if (t) t.textContent = html; return; }
    if (el.classList.contains('split')) return resplit(el, html);
    el.innerHTML = html;
  }
  function original(el){
    if (el.dataset.en !== undefined) return el.dataset.en;
    if (el.querySelector('svg')) { const t = textNode(el); el.dataset.en = t ? t.textContent : ''; }
    else if (el.classList.contains('split')) el.dataset.en = (el.querySelector('.sr') || el).textContent;
    else el.dataset.en = el.innerHTML;
    return el.dataset.en;
  }
  function resplit(el, text){
    const band = el.closest('.band'), fx = band ? band.className : '';
    const sr = document.createElement('span'); sr.className = 'sr'; sr.textContent = text;
    const vis = document.createElement('span'); vis.setAttribute('aria-hidden', 'true');
    const words = text.split(' '), total = text.replace(/ /g, '').length; let ci = 0;
    words.forEach((word, wi) => {
      const w = document.createElement('span'); w.className = 'w';
      if (fx.includes('fx-rise')) w.style.setProperty('--th', (wi / words.length * 0.42).toFixed(3));
      [...word].forEach(ch => {
        const c = document.createElement('span'); c.className = 'c'; c.textContent = ch;
        if (fx.includes('fx-roll')) c.style.setProperty('--th', (ci / total * 0.5).toFixed(3));
        if (fx.includes('fx-scatter')) { c.style.setProperty('--th', (Math.random() * .5).toFixed(3)); c.style.setProperty('--jx', ((Math.random() - .5) * 180).toFixed(1) + 'px'); c.style.setProperty('--jy', ((Math.random() - .5) * 110).toFixed(1) + 'px'); c.style.setProperty('--jr', ((Math.random() - .5) * 80).toFixed(1) + 'deg'); }
        w.appendChild(c); ci++;
      });
      vis.appendChild(w); if (wi < words.length - 1) vis.appendChild(document.createTextNode(' '));
    });
    el.replaceChildren(sr, vis);
  }
  let note;
  function setLang(l){
    Object.entries(D).forEach(([sel, tr]) => $$(sel).forEach(el => { const en = original(el); setLabel(el, l === 'en' ? en : tr[l === 'pt' ? 0 : 1]); }));
    $$('.b1 [data-cta="book"], .bar [data-cta="book"], .b3 .col.right a[href^="sms"]').forEach(a => { a.href = sms(BOOK[l][0], BOOK[l][1]); });
    document.documentElement.lang = l;
    $$('.lng button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lng === l)));
    if (!note) { note = document.createElement('p'); note.className = 'lng-note mono chip'; const ll = $('.b1 .langs-line'); ll.after(note); }
    note.hidden = l === 'en'; note.textContent = NOTE[l] || ''; if (l !== 'en') note.lang = l;
    try { localStorage.setItem('lm-lang', l); } catch (e) {}
    LM.lang = l; document.dispatchEvent(new CustomEvent('lm:lang', { detail: l }));
  }
  $$('.lng button').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lng)));
  let saved = null; try { saved = localStorage.getItem('lm-lang'); } catch (e) {}
  LM.setLang = setLang;
  if (saved && saved !== 'en') setLang(saved); else LM.lang = 'en';
})();

/* ---- R12: the clock speaks your language + phones set to PT/ES get a one-tap offer ---- */
(() => {
  const DN = { pt: ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'], es: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'] };
  const T = {
    pt: { openUntil: t => 'Aberto · até ' + t, closesIn: d => 'Aberto · fecha em ' + d, closed: (l, t) => 'Fechado · abre ' + l + ' ' + t, today: 'hoje', tomorrow: 'amanhã' },
    es: { openUntil: t => 'Abierto · hasta ' + t, closesIn: d => 'Abierto · cierra en ' + d, closed: (l, t) => 'Cerrado · abre ' + l + ' ' + t, today: 'hoy', tomorrow: 'mañana' }
  };
  const hs = $('#hdrStatus'); let enText = '';
  const t24 = m => Math.floor(m / 60) + 'h' + (m % 60 ? String(m % 60).padStart(2, '0') : '');
  function paint(){
    const l = LM.lang || 'en'; if (!hs) return;
    const span = hs.lastElementChild;
    if (l === 'en') { if (enText) span.textContent = enText; return; }
    if (!enText || !Object.values(T).some(x => span.textContent.startsWith(x.openUntil('').slice(0, 5)) || span.textContent.startsWith(x.closed('', '').slice(0, 6)))) enText = span.textContent;
    const s = LM.shopState(), L = T[l];
    let txt;
    if (s.open) txt = s.closesIn <= 90 ? L.closesIn((s.closesIn >= 60 ? Math.floor(s.closesIn / 60) + 'h ' : '') + s.closesIn % 60 + 'min') : L.openUntil(t24(s.closeAt));
    else { const lab = s.opensLabel === 'today' ? L.today : s.opensLabel === 'tomorrow' ? L.tomorrow : DN[l][s.nextDay]; txt = L.closed(lab, t24(s.openAt)); }
    span.textContent = txt; span.lang = l;
  }
  document.addEventListener('lm:lang', paint);
  document.addEventListener('lm:state', () => { enText = hs ? hs.lastElementChild.textContent : ''; paint(); });
  if (hs) enText = hs.lastElementChild.textContent;
  paint();

  // one-tap offer for phones/browsers set to Portuguese or Spanish
  let asked = null; try { asked = localStorage.getItem('lm-lang') || sessionStorage.getItem('lm-lang-asked'); } catch (e) {}
  const nav = (navigator.languages || [navigator.language || 'en']).map(x => x.slice(0, 2));
  const want = nav.find(x => x === 'pt' || x === 'es');
  if (!asked && want && nav[0] !== 'en') {
    const MSG = { pt: ['Prefere português?', 'Ver o site em português'], es: ['¿Prefiere español?', 'Ver el sitio en español'] }[want];
    const t = document.createElement('div'); t.className = 'lng-offer'; t.lang = want; t.setAttribute('role', 'dialog'); t.setAttribute('aria-label', MSG[0]);
    t.innerHTML = `<b>${MSG[0]}</b><button type="button" class="btn btn-red btn-sm">${MSG[1]}</button><button type="button" class="lng-offer-x" aria-label="No, thanks">×</button>`;
    const close = () => { t.classList.remove('in'); try { sessionStorage.setItem('lm-lang-asked', '1'); } catch (e) {} setTimeout(() => t.hidden = true, 400); };
    t.querySelector('.btn').addEventListener('click', () => { LM.setLang(want); close(); });
    t.querySelector('.lng-offer-x').addEventListener('click', close);
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('in'), 1200);
  }
})();

/* ---- R13: map on demand + pick your navigation app ---- */
(() => {
  const LAT = 42.3119935, LON = -71.7974734, ADDR = '598 West Boylston Street, Worcester, MA 01606';
  const fig = $('#visit .photo'); if (!fig) return;
  const mapBtn = document.createElement('button'); mapBtn.type = 'button'; mapBtn.className = 'map-btn';
  mapBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg><span>Show the map</span>';
  fig.appendChild(mapBtn);
  mapBtn.addEventListener('click', () => {
    if (fig.classList.contains('map-on')) { fig.classList.remove('map-on'); mapBtn.lastChild.textContent = 'Show the map'; return; }
    if (!fig.querySelector('iframe')) {
      const f = document.createElement('iframe');
      f.title = 'Map: L&M Tire Auto Repair, 598 West Boylston Street, Worcester';
      f.loading = 'lazy'; f.referrerPolicy = 'no-referrer';
      f.src = `https://www.openstreetmap.org/export/embed.html?bbox=${LON - .006},${LAT - .0035},${LON + .006},${LAT + .0035}&layer=mapnik&marker=${LAT},${LON}`;
      fig.appendChild(f);
    }
    fig.classList.add('map-on'); mapBtn.lastChild.textContent = 'Show the photo';
  });
  const dir = $('#visit a[href*="google.com/maps"]');
  if (dir) {
    const row = document.createElement('div'); row.className = 'nav-apps';
    const q = encodeURIComponent(ADDR);
    row.innerHTML = `<span class="mono">Open in</span>
      <a href="https://www.google.com/maps/dir/?api=1&destination=${q}" target="_blank" rel="noopener">Google Maps</a>
      <a href="https://maps.apple.com/?daddr=${q}" target="_blank" rel="noopener">Apple Maps</a>
      <a href="https://waze.com/ul?ll=${LAT},${LON}&navigate=yes" target="_blank" rel="noopener">Waze</a>`;
    dir.after(row);
  }
})();

/* ---- R14: speedometer scroll gauge (desktop) that names the section you're in; tap to go back to top ---- */
(() => { if (window.LM_CALM) return; // calm version: turned off
  const NAMES = { top: 'Start', facts: 'At a glance', start: 'Start here', services: 'Services', pick: 'Tire chooser', symptoms: 'Checker', size: 'Tire quote', patch: 'Plug or patch', tread: 'Penny test', winter: 'Winter', oil: 'Oil reminder', tips: 'Tire care', how: 'How to book', languages: 'Languages', visit: 'Hours', faq: 'FAQ', book: 'Book' };
  const g = document.createElement('button'); g.type = 'button'; g.className = 'gauge'; g.setAttribute('aria-label', 'Back to top');
  const ticks = Array.from({ length: 13 }, (_, i) => { const a = (-120 + i * 20) * Math.PI / 180, r1 = i % 3 ? 37 : 33; return `<line x1="${50 + Math.sin(a) * r1}" y1="${50 - Math.cos(a) * r1}" x2="${50 + Math.sin(a) * 41}" y2="${50 - Math.cos(a) * 41}"/>`; }).join('');
  g.innerHTML = `<svg viewBox="0 0 100 100" aria-hidden="true"><path class="g-arc" d="M14.5 70.5 A41 41 0 1 1 85.5 70.5"/><path class="g-fill" d="M14.5 70.5 A41 41 0 1 1 85.5 70.5" pathLength="100"/><g class="g-ticks">${ticks}</g><g class="g-needle"><line x1="50" y1="50" x2="50" y2="18"/><circle cx="50" cy="50" r="5"/></g></svg><span class="g-lbl">Start</span><span class="g-top" aria-hidden="true">↑ Top</span>`;
  document.body.appendChild(g);
  g.addEventListener('click', () => scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'smooth' }));
  const needle = g.querySelector('.g-needle'), fill = g.querySelector('.g-fill'), lbl = g.querySelector('.g-lbl');
  const secs = Object.keys(NAMES).map(id => document.getElementById(id)).filter(Boolean);
  let raf = null, lastP = -1, lastName = '', shown = null;
  function frame(){
    raf = null;
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
    if (Math.abs(p - lastP) > 0.002) { lastP = p; needle.style.transform = `rotate(${-120 + p * 240}deg)`; fill.style.strokeDashoffset = String(100 - p * 100); }
    const s = scrollY > innerHeight * 0.6; if (s !== shown) { shown = s; g.classList.toggle('show', s); }
    let cur = secs[0];
    for (const el of secs) if (el.getBoundingClientRect().top < innerHeight * 0.45) cur = el;
    const name = NAMES[cur.id];
    if (name !== lastName) { lastName = name; lbl.textContent = name; }
  }
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(frame); }, { passive: true });
  frame();
})();

/* ---- R15: penny tread test ---- */
(() => {
  const r = $('#tdRange'); if (!r) return;
  const out = $('#tdOut'), msg = $('#tdMsg'), rub = $('.td-rubber'), cta = $('.td-cta');
  function upd(){
    const v = +r.value;
    out.textContent = v + '/32"';
    // groove depth hides more of the penny as tread gets deeper: 10/32 hides to the forehead, 1/32 hides almost nothing
    rub.style.setProperty('--ty', (150 - (v - 1) * 4.6) + 'px');
    let t, c, body;
    if (v <= 2) { t = 'Replace now. At 2/32" or less you can see all of Lincoln\'s head, and the tire is at or below the Massachusetts minimum.'; c = 'bad'; body = 'Hi L&M Tire, my tread looks worn down (penny test shows Lincoln\'s whole head). I need tires. My size is: '; }
    else if (v <= 4) { t = 'Plan for new tires soon. Grip on wet and snowy roads drops as tread wears down.'; c = 'warn'; body = 'Hi L&M Tire, my tread is getting low. Can I get a tire quote? My size is: '; }
    else { t = 'Looks healthy. Check again every month or two, and before winter.'; c = ''; body = 'Hi L&M Tire, can I get a tire check? '; }
    msg.textContent = t; msg.className = 'td-msg ' + c;
    r.setAttribute('aria-valuetext', v + ' thirty-seconds of an inch');
    cta.href = sms(SHOP.text, body);
    cta.textContent = v <= 4 ? 'Text us for tires' : 'Text us for a tire check';
  }
  r.addEventListener('input', upd); upd();
})();

/* ---- R16: FAQ search that turns "no answer" into a text + FAQ rich results for Google ---- */
(() => {
  const list = $('.faq-list'); if (!list) return;
  const items = [...list.querySelectorAll('details')];
  const box = document.createElement('div'); box.className = 'faq-search rv in';
  box.innerHTML = `<label for="faqQ" class="sr">Search the questions</label><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><input id="faqQ" type="search" placeholder="Type a question, like winter tires or brakes" autocomplete="off">`;
  list.before(box);
  const none = document.createElement('div'); none.className = 'faq-none'; none.hidden = true;
  none.innerHTML = `<p><b>No answer here yet.</b> Ask us directly by text.</p><a class="btn btn-red" href="#">Text this question</a>`;
  list.after(none);
  const ask = document.createElement('p'); ask.className = 'faq-ask';
  ask.innerHTML = `Still have a question? <a href="${sms(SHOP.text, 'Hi L&M Tire, I have a question: ')}">Text it to us</a> or call <a href="tel:+15088533322">508-853-3322</a>.`;
  none.after(ask);
  const q = $('#faqQ'), norm = t => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  q.addEventListener('input', () => {
    const v = norm(q.value.trim()); let n = 0;
    items.forEach(d => { const hit = !v || norm(d.textContent).includes(v) || v.split(/\s+/).every(w => norm(d.textContent).includes(w)); d.hidden = !hit; if (hit) n++; if (v && hit && n === 1) d.open = true; });
    none.hidden = !(v && n === 0);
    if (!none.hidden) none.querySelector('a').href = sms(SHOP.text, 'Hi L&M Tire, I have a question: ' + q.value.trim());
  });
  // FAQPage structured data from the real answers on the page
  const ld = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: items.map(d => ({ '@type': 'Question', name: d.querySelector('summary').textContent.trim(), acceptedAnswer: { '@type': 'Answer', text: d.querySelector('.ans').textContent.trim() } })) };
  const sc = document.createElement('script'); sc.type = 'application/ld+json'; sc.textContent = JSON.stringify(ld); document.head.appendChild(sc);
})();

/* ---- R17: installable app + works offline ---- */
(() => {
  if ('serviceWorker' in navigator && location.protocol !== 'file:') addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  let deferred = null;
  addEventListener('beforeinstallprompt', e => {
    e.preventDefault(); deferred = e;
    if (localStorage.getItem('lm-install-x') || !matchMedia('(pointer: coarse)').matches) return;
    const b = document.createElement('div'); b.className = 'install'; b.setAttribute('role', 'region'); b.setAttribute('aria-label', 'Add to home screen');
    b.innerHTML = '<img src="assets/icon-192.png" alt="" width="44" height="44"><p><b>Keep L&amp;M Tire on your phone</b><span>One tap to call or book, even offline.</span></p><button type="button" class="btn btn-red btn-sm">Add</button><button type="button" class="install-x" aria-label="No, thanks">×</button>';
    b.querySelector('.btn').addEventListener('click', async () => { b.hidden = true; deferred.prompt(); await deferred.userChoice; deferred = null; });
    b.querySelector('.install-x').addEventListener('click', () => { b.hidden = true; localStorage.setItem('lm-install-x', '1'); });
    document.body.appendChild(b);
    setTimeout(() => b.classList.add('in'), 45000);
  });
})();

/* ---- R18: marquee: duplicate each track so it loops seamlessly past 2560px, run only on screen ---- */
(() => {
  const mq = $('.marquee'); if (!mq) return;
  mq.querySelectorAll('.mq-track').forEach(t => { const html = t.innerHTML; t.innerHTML = html + html + html + html; });
  new IntersectionObserver(([e]) => mq.classList.toggle('live', e.isIntersecting && !reduced())).observe(mq);
})();

/* ---- R19: cursor spotlight on panels + magnetic red buttons (mouse only) ---- */
(() => { if (window.LM_CALM) return; // calm version: turned off
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const SPOT = '.card, .symp-btn, .odo-card, .td-card, .contact, #bookForm, .symp-out, .size-form, .leg, .week';
  document.addEventListener('pointermove', e => {
    const el = e.target.closest && e.target.closest(SPOT);
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    el.classList.add('spot');
  }, { passive: true });
  document.addEventListener('pointerout', e => { const el = e.target.closest && e.target.closest(SPOT); if (el && !el.contains(e.relatedTarget)) el.classList.remove('spot'); });
  if (reduced()) return;
  $$('main .btn-red, .qr-fab').forEach(b => {
    b.classList.add('mag');
    b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); const x = (e.clientX - r.left - r.width / 2) / r.width, y = (e.clientY - r.top - r.height / 2) / r.height; b.style.setProperty('--tx', (x * 10).toFixed(1) + 'px'); b.style.setProperty('--ty', (y * 8).toFixed(1) + 'px'); });
    b.addEventListener('pointerleave', () => { b.style.setProperty('--tx', '0px'); b.style.setProperty('--ty', '0px'); });
  });
})();

/* ---- R20: tire age from the DOT code ---- */
(() => {
  const inp = $('#dotIn'); if (!inp) return;
  const out = $('#dotOut'), tip = $('#dotTip');
  inp.addEventListener('input', () => {
    inp.value = inp.value.replace(/\D/g, '').slice(0, 4);
    const v = inp.value;
    tip.textContent = ''; tip.className = 'age-tip';
    if (v.length < 4) { out.textContent = 'Type the 4 numbers'; out.className = ''; return; }
    const wk = +v.slice(0, 2), yr = 2000 + +v.slice(2);
    const now = new Date();
    if (wk < 1 || wk > 53 || yr > now.getFullYear()) { out.textContent = 'Check the numbers'; out.className = 'bad'; return; }
    const made = new Date(yr, 0, 1 + (wk - 1) * 7);
    const months = Math.max(0, Math.round((now - made) / (1000 * 60 * 60 * 24 * 30.44)));
    const y = Math.floor(months / 12), m = months % 12;
    out.textContent = (y ? y + (y === 1 ? ' year' : ' years') : '') + (y && m ? ', ' : '') + (m || !y ? m + (m === 1 ? ' month' : ' months') : '') + ' old';
    out.className = y >= 10 ? 'bad' : y >= 5 ? 'warn' : 'ok';
    if (y >= 10) { tip.innerHTML = `Many tire makers say to replace tires by 10 years, even if the tread looks fine. <a href="${sms(SHOP.text, 'Hi L&M Tire, my tires are about ' + y + ' years old (DOT ' + v + '). I need a quote. My size is: ')}">Text us for a quote</a>`; tip.classList.add('bad'); }
    else if (y >= 5) { tip.innerHTML = `Many tire makers suggest a check every year once a tire is 5 years old. <a href="${sms(SHOP.text, 'Hi L&M Tire, my tires are about ' + y + ' years old. Can I book a tire check?')}">Book a tire check</a>`; tip.classList.add('warn'); }
    else tip.textContent = 'Age is fine. Keep an eye on the tread and the air pressure.';
  });
})();

/* ---- R21: booking success screen: message recap + calendar reminder ---- */
(() => {
  const form = $('#bookForm'), sent = $('#sent'); if (!form || !sent) return;
  const box = document.createElement('div'); box.className = 'sent-extra';
  sent.querySelector('h3').after(box);
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const pad = n => String(n).padStart(2, '0');
  const stamp = d => d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + 'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00';
  function ics(day, svc){
    const now = new Date(); let d = new Date(now);
    if (day === 'Any day') d.setDate(d.getDate() + 1);
    else { const want = DAYS.indexOf(String(day).split(',')[0].trim()); if (want < 0) d.setDate(d.getDate() + 1); else { let guard = 0; do { d.setDate(d.getDate() + 1); } while (d.getDay() !== want && ++guard < 8); } }
    d.setHours(8, 0, 0, 0); const end = new Date(d); end.setMinutes(30);
    const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//L&M Tire//Reminder//EN', 'BEGIN:VEVENT', 'UID:' + Date.now() + '@lmtire', 'DTSTAMP:' + stamp(now) + 'Z',
      'DTSTART:' + stamp(d), 'DTEND:' + stamp(end), 'SUMMARY:L&M Tire: ' + svc, 'LOCATION:598 West Boylston Street\\, Worcester\\, MA 01606',
      'DESCRIPTION:Reminder to confirm your time with L&M Tire. Shop 508-853-3322. Text 304-806-6047.', 'BEGIN:VALARM', 'TRIGGER:-PT30M', 'ACTION:DISPLAY', 'DESCRIPTION:L&M Tire', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    return { url: URL.createObjectURL(new Blob([body], { type: 'text/calendar' })), when: d };
  }
  form.addEventListener('submit', () => {
    if (!$('#f-name').value.trim()) return;
    const svc = $('#f-svc').value, day = $('#f-day').value, name = $('#f-name').value.trim(), car = $('#f-car').value.trim();
    const c = ics(day, svc);
    const whenTxt = c.when.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    box.innerHTML = `<dl class="recap"><div><dt>Service</dt><dd></dd></div><div><dt>Day</dt><dd></dd></div><div><dt>Name</dt><dd></dd></div>${car ? '<div><dt>Car</dt><dd></dd></div>' : ''}</dl>
      <a class="btn btn-ghost btn-sm cal" href="${c.url}" download="LM-Tire-reminder.ics">Add a reminder for ${whenTxt}</a>`;
    const dds = box.querySelectorAll('dd'); dds[0].textContent = svc; dds[1].textContent = day; dds[2].textContent = name; if (car) dds[3].textContent = car;
  });
})();

/* ---- R22: phone action bar gets directions + a live open/closed line ---- */
(() => {
  const bar = $('#bar'); if (!bar) return;
  const dir = document.createElement('a'); dir.className = 'btn btn-ghost bar-dir';
  dir.href = 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent('598 West Boylston Street, Worcester, MA 01606');
  dir.target = '_blank'; dir.rel = 'noopener'; dir.setAttribute('aria-label', 'Directions to the shop');
  dir.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>';
  bar.appendChild(dir);
  const line = document.createElement('p'); line.className = 'bar-line'; line.setAttribute('aria-live', 'off');
  bar.prepend(line);
  const paint = () => { const s = LM.shopState(); line.innerHTML = s.open ? `<i class="on"></i>Open now · until ${LM.fmt(s.closeAt)}` : `<i></i>Closed · opens ${s.opensLabel} ${LM.fmt(s.openAt)}`; };
  paint(); document.addEventListener('lm:state', paint);
})();

/* ---- R23: seasonal winter-ready checklist (shows November to March) ---- */
(() => {
  const sec = $('#winter'); if (!sec) return;
  const m = LM.nyNow().month;
  if (!(m >= 11 || m <= 3)) return;
  sec.hidden = false;
  const boxes = $$('.win-list input'), meter = $('.win-meter i'), score = $('.win-score'), send = $('.win-send');
  function upd(){
    const left = boxes.filter(b => !b.checked).map(b => b.value), done = boxes.length - left.length;
    meter.style.transform = `scaleX(${done / boxes.length})`;
    score.textContent = left.length ? `${done} of ${boxes.length} ready. ${left.length} left to do.` : 'All set for winter. Drive safe out there.';
    send.hidden = !left.length;
    send.href = sms(SHOP.text, 'Hi L&M Tire, I want to get my car ready for winter. Can I book: ' + left.join(', ') + '?');
    send.textContent = left.length === boxes.length ? 'Book a full winter check' : `Text us the ${left.length} left`;
  }
  boxes.forEach(b => b.addEventListener('change', upd)); upd();
})();

/* ---- R24: real menu: "Tools" dropdown on desktop, full-screen menu on phones ---- */
(() => {
  const nav = $('.top nav'); if (!nav) return;
  const LINKS = [
    ['#symptoms', 'What is my car doing?', 'Pick a symptom, get the service'],
    ['#size', 'Tire quote by text', 'Type your size, text it'],
    ['#patch', 'Plug, patch or new tire?', 'Tap where the nail is'],
    ['#tread', 'Penny test + tire age', 'Is the tread too thin?'],
    ['#winter', 'Winter check', 'Ready for snow?'],
    ['#book', 'Book in 4 taps', 'Opens a ready text']
  ].filter(l => { const el = $(l[0]); return el && !el.hidden; });
  // desktop dropdown
  let wrap = $('.tools');
  if (!wrap) { wrap = document.createElement('div'); wrap.className = 'tools'; wrap.innerHTML = '<button type="button" class="link tools-btn" aria-expanded="false" aria-controls="toolsMenu">Tools <span aria-hidden="true">▾</span></button>'; nav.querySelector('a.link[href="#services"]').after(wrap); }
  wrap.insertAdjacentHTML('beforeend', `<div class="tools-menu" id="toolsMenu" hidden>${LINKS.map(l => `<a href="${l[0]}"><b>${l[1]}</b><span>${l[2]}</span></a>`).join('')}</div>`);
  const tb = wrap.querySelector('.tools-btn'), tm = wrap.querySelector('.tools-menu');
  const setT = o => { tm.hidden = !o; tb.setAttribute('aria-expanded', String(o)); };
  tb.addEventListener('click', () => setT(tm.hidden));
  wrap.addEventListener('mouseleave', () => setT(false));
  tm.addEventListener('click', e => { if (e.target.closest('a')) setT(false); });
  document.addEventListener('click', e => { if (!wrap.contains(e.target)) setT(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { setT(false); closeM(); } });
  // phone menu
  let mb = $('.menu-btn'); const mbNew = !mb;
  if (mbNew) { mb = document.createElement('button'); mb.type = 'button'; mb.className = 'menu-btn'; mb.setAttribute('aria-expanded', 'false'); mb.setAttribute('aria-controls', 'mMenu'); mb.setAttribute('aria-label', 'Menu'); }
  if (mbNew) { mb.innerHTML = '<i></i><i></i><i></i>'; nav.appendChild(mb); }
  const mm = document.createElement('div'); mm.className = 'm-menu'; mm.id = 'mMenu'; mm.hidden = true; mm.setAttribute('role', 'dialog'); mm.setAttribute('aria-modal', 'true'); mm.setAttribute('aria-label', 'Menu');
  const ALL = window.LM_CALM ? [['#services', 'Services'], ['#help', 'Tire Help (free tools)'], ['#book', 'Book'], ['#visit', 'Hours & directions'], ['#faq', 'Questions']] : [['#services', 'Services'], ...LINKS.map(l => [l[0], l[1]]), ['#visit', 'Hours & directions'], ['#faq', 'Questions']];
  mm.innerHTML = `<nav aria-label="Menu">${ALL.map((l, i) => `<a href="${l[0]}" style="--i:${i}">${l[1]}</a>`).join('')}</nav>
    <div class="m-cta"><a class="btn btn-red" href="tel:+15088533322">Call 508-853-3322</a><a class="btn btn-ghost" href="${sms(SHOP.text, "Hi, I'd like to book an appointment at L&M Tire.")}">Text to book</a></div>
    <p class="m-addr">598 West Boylston Street, Worcester · Mon to Fri 8 to 6 · Sat 8 to 12</p>`;
  document.body.appendChild(mm);
  function openM(){ mm.hidden = false; mb.setAttribute('aria-expanded', 'true'); document.body.classList.add('menu-open'); requestAnimationFrame(() => mm.classList.add('in')); mm.querySelector('a').focus(); }
  function closeM(){ if (mm.hidden) return; mm.classList.remove('in'); mb.setAttribute('aria-expanded', 'false'); document.body.classList.remove('menu-open'); setTimeout(() => { mm.hidden = true; }, 300); }
  mb.addEventListener('click', () => mm.hidden ? openM() : closeM());
  mm.addEventListener('click', e => { if (e.target.closest('a')) closeM(); });
})();

/* ---- R25: "I need..." quick picks right in the hero ---- */
(() => {
  const row = $('.b1 .cta-row'); if (!row) return;
  let picks = $('.hero-picks'); const pNew = !picks; if (pNew) { picks = document.createElement('div'); picks.className = 'hero-picks'; }
  const P = [['Tires', 'New tires'], ['Flat fix', 'Flat tire repair: plugs and patches'], ['Alignment', 'Wheel alignment'], ['Brakes', 'Brakes'], ['Oil change', 'Oil change'], ['Warning light', 'Check engine light']];
  if (pNew) { picks.innerHTML = `<span class="mono">I need</span>` + P.map(p => `<button type="button" data-svc="${p[1]}">${p[0]}</button>`).join(''); row.after(picks); }
  picks.addEventListener('click', e => { const b = e.target.closest('button'); if (b && LM.goBook) LM.goBook(b.dataset.svc); });
})();

/* ---- R26: the language switch now reaches the tools, ledes, wizard and phone bar ---- */
(() => {
  const D = {
    '#symptoms .lede': ['Toque no que você nota. Mostramos o serviço certo, e você manda mensagem com um toque.', 'Toque lo que nota. Le mostramos el servicio correcto y nos manda un texto con un toque.'],
    '.symp-btn[data-s="brakes"] b': ['Rangendo ou chiando', 'Rechina o chirría'], '.symp-btn[data-s="brakes"] span': ['quando eu freio', 'cuando freno'],
    '.symp-btn[data-s="shake"] b': ['Tremendo ou vibrando', 'Tiembla o vibra'], '.symp-btn[data-s="shake"] span': ['em velocidade mais alta', 'a más velocidad'],
    '.symp-btn[data-s="clunk"] b': ['Barulho nos buracos', 'Golpes en los baches'], '.symp-btn[data-s="clunk"] span': ['ou a direção está solta', 'o la dirección está floja'],
    '.symp-btn[data-s="light"] b': ['Uma luz de aviso acendeu', 'Se prendió una luz'], '.symp-btn[data-s="light"] span': ['no painel', 'en el tablero'],
    '.symp-btn[data-s="pull"] b': ['Puxa para um lado', 'Se jala a un lado'], '.symp-btn[data-s="pull"] span': ['volante torto ou pneus gastando de um lado', 'volante chueco o llantas gastadas de un lado'],
    '.symp-btn[data-s="flat"] b': ['Pneu furado ou perdendo ar', 'Llanta ponchada o sin aire'], '.symp-btn[data-s="flat"] span': ['um pneu sempre fica baixo', 'una llanta se baja'],
    '.symp-btn[data-s="tread"] b': ['Pneu gasto ou neve chegando', 'Llanta gastada o viene nieve'], '.symp-btn[data-s="tread"] span': ['hora de pneus novos, usados ou de inverno', 'llantas nuevas, usadas o de invierno'],
    '.symp-btn[data-s="oil"] b': ['Hora de trocar o óleo', 'Toca cambio de aceite'], '.symp-btn[data-s="oil"] span': ['ou a luz do óleo acendeu', 'o se prendió la luz del aceite'],
    '.symp-btn[data-s="other"] b': ['Outra coisa', 'Otra cosa'], '.symp-btn[data-s="other"] span': ['conte com suas palavras', 'cuéntenos con sus palabras'],
    '.symp-empty p': ['Escolha uma opção.', 'Escoja una opción.'],
    '#size .lede': ['A medida está escrita na lateral do pneu e no adesivo da porta do motorista. Parece com 205/55R16.', 'La medida está en el costado de la llanta y en la etiqueta de la puerta del conductor. Se ve así: 205/55R16.'],
    'label[for="sz"]': ['Medida do pneu', 'Medida de la llanta'],
    '.hero-picks .mono': ['Preciso de', 'Necesito'],
    '.hero-picks [data-svc="New tires"]': ['Pneus', 'Llantas'], '.hero-picks [data-svc="Flat tire repair: plugs and patches"]': ['Pneu furado', 'Ponchadura'], '.hero-picks [data-svc="Wheel alignment"]': ['Alinhamento', 'Alineación'], '.hero-picks [data-svc="Brakes"]': ['Freios', 'Frenos'], '.hero-picks [data-svc="Oil change"]': ['Troca de óleo', 'Cambio de aceite'], '.hero-picks [data-svc="Check engine light"]': ['Luz de aviso', 'Luz de motor'],
    '#tread .kicker': ['O teste da moeda', 'La prueba del centavo'], '#td-h': ['Seu pneu está gasto?', '¿Su llanta está gastada?'],
    '#winter .kicker': ['Inverno em Worcester', 'Invierno en Worcester'], '#win-h': ['Seu carro está pronto para a neve?', '¿Su carro está listo para la nieve?'],
    '#book .lede': ['Quatro toques rápidos. Depois o app de mensagens abre com o texto pronto. Prefere falar? Ligue para a oficina.', 'Cuatro toques rápidos. Luego se abre su app de mensajes con el texto listo. ¿Prefiere hablar? Llame al taller.'],
    '.faq-search input': null,
    '.qr-fab span': ['Mensagem', 'Texto'],
    '.m-menu .m-addr': ['598 West Boylston Street, Worcester · Seg a sex 8 às 18 · Sáb 8 às 12', '598 West Boylston Street, Worcester · Lun a vie 8 a 6 · Sáb 8 a 12']
  };
  const PH = { '#faqQ': ['Digite uma pergunta', 'Escriba una pregunta'], '#sz': ['205/55R16', '205/55R16'] };
  function apply(l){
    Object.entries(D).forEach(([sel, tr]) => { if (!tr) return; $$(sel).forEach(el => { if (el.dataset.en === undefined) el.dataset.en = el.innerHTML; el.innerHTML = l === 'en' ? el.dataset.en : tr[l === 'pt' ? 0 : 1]; if (l !== 'en') el.lang = l; else el.removeAttribute('lang'); }); });
    Object.entries(PH).forEach(([sel, tr]) => { const el = $(sel); if (!el) return; if (el.dataset.enph === undefined) el.dataset.enph = el.placeholder; el.placeholder = l === 'en' ? el.dataset.enph : tr[l === 'pt' ? 0 : 1]; });
  }
  document.addEventListener('lm:lang', e => apply(e.detail));
  if (LM.lang && LM.lang !== 'en') apply(LM.lang);
})();

/* ---- R27: "pick up where you left off" for returning visitors ---- */
(() => { if (window.LM_CALM) return; // calm version: turned off
  const KEY = 'lm-intent';
  const save = (label, href) => { try { localStorage.setItem(KEY, JSON.stringify({ label, href, t: Date.now() })); } catch (e) {} };
  const sz = $('#sz');
  if (sz) sz.addEventListener('change', () => { const a = $('.size-send'); if (/\d{3}\/\d{2}R\d{2}/.test(a.textContent)) save('your ' + a.textContent.match(/\d{3}\/\d{2}R\d{2}/)[0] + ' tire quote', a.href); });
  $$('.symp-btn').forEach(b => b.addEventListener('click', () => setTimeout(() => save('help with ' + $('.symp-svc').textContent.toLowerCase(), $('.symp-text').href), 50)));
  $$('#bookForm .wz-chips input[name="wz-svc"]').forEach(r => r.addEventListener('change', () => save('booking ' + r.value.toLowerCase(), sms(SHOP.text, 'Hi L&M Tire, I would like to book: ' + r.value + '.'))));
  let it = null; try { it = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
  if (!it || Date.now() - it.t > 14 * 864e5 || Date.now() - it.t < 60e3) return;
  const c = document.createElement('div'); c.className = 'resume'; c.setAttribute('role', 'region'); c.setAttribute('aria-label', 'Welcome back');
  c.innerHTML = `<p><b>Welcome back.</b> <span></span></p><a class="btn btn-red btn-sm" href="${it.href}">Send it</a><button type="button" class="resume-x" aria-label="Dismiss">×</button>`;
  c.querySelector('span').textContent = 'Still need ' + it.label + '? The text is ready.';
  const bye = () => { c.classList.remove('in'); try { localStorage.removeItem(KEY); } catch (e) {} setTimeout(() => c.hidden = true, 400); };
  c.querySelector('.resume-x').addEventListener('click', bye);
  c.querySelector('a').addEventListener('click', () => setTimeout(bye, 300));
  document.body.appendChild(c);
  setTimeout(() => c.classList.add('in'), 2500);
})();

/* ---- R28: patch or replace? tap the damage spot ---- */
(() => {
  const svg = $('.patch-svg'); if (!svg) return;
  const R = {
    center: ['Often a plug or a patch', 'A small nail or screw in the middle of the tread can often be repaired. A plug works well here and is much quicker. A patch is also available. We check the tire first and tell you which one fits.', 'Hi L&M Tire, I have a nail in the middle of my tread. Can it be plugged or patched? When can I come in?', 480, 420],
    shoulder: ['Needs a closer look', 'The edge of the tread flexes a lot, so a plug or patch may not be safe there. Bring it in and we will check whether it can be repaired or needs a new tire.', 'Hi L&M Tire, my tire has damage near the edge of the tread. Can you check it? My size is: ', 322, 470],
    side: ['A new tire', 'Sidewall damage means a new tire: plugs and patches are not safe in the sidewall. We sell new and used tires and can help you pick one.', 'Hi L&M Tire, my tire sidewall is damaged. I need a tire. My size is: ', 858, 452]
  };
  const nail = svg.querySelector('.nail'), out = $('.patch-out'), res = $('.patch-res'), q = $('.patch-q');
  function pick(z, x, y){
    const d = R[z];
    svg.querySelectorAll('.pz').forEach(p => p.classList.toggle('on', p.dataset.z === z));
    nail.setAttribute('transform', `translate(${x != null ? x : d[3]},${y != null ? y : d[4]})`); nail.classList.remove('in'); void nail.getBoundingClientRect(); nail.classList.add('in');
    q.hidden = true; res.hidden = false;
    res.querySelector('h3').textContent = d[0]; res.querySelector('p').textContent = d[1];
    res.querySelector('a').href = sms(SHOP.text, d[2]);
    res.className = 'patch-res ' + z; void res.offsetWidth; res.classList.add('pop');
  }
  svg.addEventListener('click', e => {
    const p = e.target.closest('.pz'); if (!p) return;
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const loc = pt.matrixTransform(svg.getScreenCTM().inverse());
    pick(p.dataset.z, Math.round(loc.x), Math.round(loc.y));
  });
  svg.addEventListener('keydown', e => { const p = e.target.closest('.pz'); if (p && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pick(p.dataset.z); } });
})();

/* ---- R29: on computers, tapping a phone number also copies it and says so ---- */
(() => {
  const toast = document.createElement('div'); toast.className = 'toast'; toast.setAttribute('role', 'status'); toast.setAttribute('aria-live', 'polite');
  document.body.appendChild(toast);
  let tt;
  LM.toast = (html, ms = 4200) => { toast.innerHTML = html; toast.classList.add('in'); clearTimeout(tt); tt = setTimeout(() => toast.classList.remove('in'), ms); };
  if (matchMedia('(pointer: coarse)').matches) return;
  const pretty = n => n.replace(/^\+?1?(\d{3})(\d{3})(\d{4})$/, '$1-$2-$3');
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="tel:"], a[href^="sms:"]'); if (!a) return;
    const num = pretty(a.getAttribute('href').replace(/^(tel|sms):/, '').split('?')[0].replace(/\D/g, ''));
    const isText = a.getAttribute('href').startsWith('sms:');
    const done = () => LM.toast(`<b>${num}</b> copied. ${isText ? 'Text it from your phone, or your computer\'s messages app may open.' : 'Call it from your phone, or your computer\'s call app may open.'}`);
    if (navigator.clipboard) navigator.clipboard.writeText(num).then(done, () => LM.toast(`Our number: <b>${num}</b>`)); else LM.toast(`Our number: <b>${num}</b>`);
  });
})();

/* ---- R32: "Easy read" mode: bigger text, calmer motion, stronger contrast; remembered ---- */
(() => {
  const mk = cls => { const b = document.createElement('button'); b.type = 'button'; b.className = cls; b.setAttribute('aria-pressed', 'false'); b.innerHTML = '<span aria-hidden="true">Aa</span><em>Easy read</em>'; b.title = 'Bigger, easier text'; return b; };
  const lng = $('.lng'); const b1 = mk('easy-btn'); if (lng) lng.after(b1);
  const menu = $('#mMenu .m-cta'); const b2 = mk('easy-btn wide'); if (menu) menu.after(b2);
  const set = on => { document.documentElement.classList.toggle('easy', on); [b1, b2].forEach(b => b.setAttribute('aria-pressed', String(on))); try { localStorage.setItem('lm-easy', on ? '1' : '0'); } catch (e) {} };
  [b1, b2].forEach(b => b.addEventListener('click', () => set(!document.documentElement.classList.contains('easy'))));
  let on = false; try { on = localStorage.getItem('lm-easy') === '1'; } catch (e) {}
  if (on) set(true);
})();

/* ---- R33: a little tire rolls along the booking-steps line as you scroll, lighting each step it reaches ---- */
(() => { if (window.LM_CALM) return; // calm version: turned off
  const ol = $('#how .steps'); if (!ol) return;
  const t = document.createElement('div'); t.className = 'roller'; t.setAttribute('aria-hidden', 'true');
  t.innerHTML = '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" fill="#15161f" stroke="#e8333b" stroke-width="5"/><circle cx="20" cy="20" r="8" fill="none" stroke="#8a90ff" stroke-width="3"/><path d="M20 3v8M20 29v8M3 20h8M29 20h8" stroke="#2c2f45" stroke-width="3"/></svg>';
  ol.appendChild(t);
  const steps = [...ol.querySelectorAll('.step')];
  let raf = null, last = -1;
  function frame(){
    raf = null;
    const r = ol.getBoundingClientRect(), vh = innerHeight;
    const p = Math.min(1, Math.max(0, (vh * 0.8 - r.top) / (r.height + vh * 0.3)));
    if (Math.abs(p - last) < 0.003) return; last = p;
    const vertical = matchMedia('(max-width:760px)').matches;
    if (vertical) { const len = r.height - 40; t.style.transform = `translate(25px, ${p * len}px) rotate(${p * len * 2.9}deg)`; }
    else { const len = r.width * 0.84; t.style.transform = `translate(${r.width * 0.08 - 20 + p * len}px, 25px) rotate(${p * len * 2.9}deg)`; }
    steps.forEach((s, i) => s.classList.toggle('lit', p >= i / (steps.length - 1) - 0.02));
  }
  const go = () => { if (!raf) raf = requestAnimationFrame(frame); };
  addEventListener('scroll', go, { passive: true }); addEventListener('resize', () => { last = -1; go(); }); frame();
  if (reduced()) { steps.forEach(s => s.classList.add('lit')); }
})();

/* ---- R35: "Send us a photo" buttons where a picture says it best ---- */
(() => {
  const body = what => 'Hi L&M Tire, here is a photo of my ' + what + ' (photo attached):';
  const mk = (what, cls) => {
    const a = document.createElement('a'); a.className = 'photo-btn ' + (cls || '');
    a.href = sms(SHOP.text, body(what));
    a.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg><span>Send us a photo</span>';
    a.addEventListener('click', () => LM.toast && LM.toast('Your texting app opens. Tap the <b>camera</b> or <b>+</b> to add the photo, then send.', 6000));
    return a;
  };
  const hint = $('.size-hint'); if (hint) hint.after(mk('tire size (side of the tire)', 'center'));
  const pr = $('.patch-res'); if (pr) pr.appendChild(mk('flat tire'));
  const sr = $('.symp-res .cta-row'); if (sr) sr.appendChild(mk('car problem'));
  const qrList = $('.qr-list');
  if (qrList) { const p = mk('tire / car problem', 'qr-photo'); qrList.after(p); }
})();

/* ---- R36: kinetic section titles: words rise out of a mask, one after another ---- */
(() => { if (window.LM_CALM) return; // calm version: turned off
  if (reduced()) return;
  const heads = $$('main section:not(.hero) h2');
  function wrap(h){
    if (h.dataset.kin) return; h.dataset.kin = '1';
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            const o = document.createElement('span'); o.className = 'kw'; const i = document.createElement('span'); i.className = 'kwi'; i.textContent = part; o.appendChild(i); frag.appendChild(o);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    };
    walk(h);
    h.querySelectorAll('.kwi').forEach((w, k) => w.style.transitionDelay = (k * 70) + 'ms');
    h.classList.add('kin');
  }
  heads.forEach(wrap);
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('kin-in'); io.unobserve(e.target); } }), { threshold: .3 });
  heads.forEach(h => io.observe(h));
  // language switch replaces heading text: re-wrap and show at once
  document.addEventListener('lm:lang', () => setTimeout(() => heads.forEach(h => { if (!h.querySelector('.kw')) { delete h.dataset.kin; wrap(h); h.classList.add('kin-in'); } }), 0));
})();

/* ---- R37: the sidewall lights up like neon when a real size is typed; common sizes are one tap ---- */
(() => {
  const sz = $('#sz'), wall = $('.size-wall'); if (!sz || !wall) return;
  const ok = () => /^P?\d{3}\/?\d{2}Z?R?F?\d{2}/i.test(sz.value.replace(/\s+/g, ''));
  const upd = () => { const v = ok(); wall.classList.toggle('lit', v); };
  sz.addEventListener('input', upd);
  $$('.sz-pop button').forEach(b => b.addEventListener('click', () => { sz.value = b.textContent; sz.dispatchEvent(new Event('input')); sz.dispatchEvent(new Event('change', { bubbles: true })); $('#sizeForm').dispatchEvent(new Event('change')); }));
})();

/* ---- R38: live "cold tire" calculator with today's Worcester temperature ---- */
(() => {
  const host = $('.win-fact') || $('#tread .sec-head'); if (!host) return;
  const card = document.createElement('div'); card.className = 'psi rv in';
  card.innerHTML = `<p class="mono kicker">Today in Worcester</p>
    <div class="psi-row"><b class="psi-now">--°F</b><span>now outside</span></div>
    <label for="psiFill">Temperature when you last filled the tires: <output id="psiFillOut">70°F</output></label>
    <input type="range" id="psiFill" min="20" max="95" step="5" value="70">
    <p class="psi-res" aria-live="polite"></p>
    <a class="btn btn-ghost btn-sm psi-cta" href="#">Text us for a pressure check</a>`;
  host.after(card);
  const now = card.querySelector('.psi-now'), fill = $('#psiFill'), fo = $('#psiFillOut'), res = card.querySelector('.psi-res');
  card.querySelector('.psi-cta').href = sms(SHOP.text, 'Hi L&M Tire, can I come in for a tire pressure check?');
  let temp = null;
  function upd(){
    fo.textContent = fill.value + '°F';
    if (temp == null) { res.textContent = 'Each 10°F drop takes about 1 PSI out of a tire.'; return; }
    const drop = Math.round((+fill.value - temp) / 10);
    res.innerHTML = drop > 0 ? `Your tires may be about <b>${drop} PSI low</b> right now, just from the cold.` : drop < 0 ? `It is warmer now, so pressure may read about <b>${-drop} PSI higher</b> than when you filled.` : 'About the same temperature, so pressure should be close to where you set it.';
    res.className = 'psi-res' + (drop >= 4 ? ' warn' : '');
  }
  fill.addEventListener('input', upd); upd();
  const cached = sessionStorage.getItem('lm-temp');
  const set = t => { temp = Math.round(t); now.textContent = temp + '°F'; upd(); };
  if (cached) set(+cached);
  else fetch('https://api.open-meteo.com/v1/forecast?latitude=42.2626&longitude=-71.8023&current=temperature_2m&temperature_unit=fahrenheit&timezone=America%2FNew_York')
    .then(r => r.ok ? r.json() : null).then(j => { if (j && j.current) { sessionStorage.setItem('lm-temp', j.current.temperature_2m); set(j.current.temperature_2m); } else card.querySelector('.psi-row').hidden = true; })
    .catch(() => { card.querySelector('.psi-row').hidden = true; });
})();

/* ---- R39: "How far am I?" distance to the shop, worked out on the phone itself (location never leaves the device) ---- */
(() => {
  const apps = $('.nav-apps'); if (!apps || !('geolocation' in navigator)) return;
  const LAT = 42.3119935, LON = -71.7974734;
  const box = document.createElement('div'); box.className = 'far';
  box.innerHTML = `<button type="button" class="btn btn-ghost btn-sm far-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="8"/></svg>How far am I?</button><p class="far-out" aria-live="polite"></p>`;
  apps.after(box);
  const out = box.querySelector('.far-out'), btn = box.querySelector('.far-btn');
  const hav = (a, b, c, d) => { const R = 3958.8, t = x => x * Math.PI / 180; const dl = t(c - a), dn = t(d - b); const h = Math.sin(dl / 2) ** 2 + Math.cos(t(a)) * Math.cos(t(c)) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
  btn.addEventListener('click', () => {
    out.textContent = 'Finding you…'; btn.disabled = true;
    navigator.geolocation.getCurrentPosition(p => {
      btn.disabled = false;
      const mi = hav(p.coords.latitude, p.coords.longitude, LAT, LON);
      const road = mi * 1.3, mins = Math.max(2, Math.round(road / 25 * 60));
      out.innerHTML = mi < 0.15 ? '<b>You are right here.</b> Come on in.' : `<b>${mi < 10 ? mi.toFixed(1) : Math.round(mi)} miles away</b> in a straight line. Roughly ${mins < 90 ? mins + ' minutes' : Math.round(mins / 60) + ' hours'} by car, depending on traffic.`;
    }, () => { btn.disabled = false; out.textContent = 'Location is off. Use a map app above for directions.'; }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
  });
})();

/* ---- R40: "Send L&M Tire to a friend" (phone share sheet, or copy link on computers) ---- */
(() => {
  const data = { title: 'L&M Tire Auto Repair, Worcester', text: 'L&M Tire Auto Repair: new and used tires, brakes, oil changes. 598 West Boylston St, Worcester. Call 508-853-3322 or text 304-806-6047.', url: location.origin + location.pathname };
  const mk = cls => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'share-btn ' + cls;
    b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 10.5l6.8-4M8.6 13.5l6.8 4"/></svg><span>Send us to a friend who needs tires</span>';
    b.addEventListener('click', async () => {
      if (navigator.share) { try { await navigator.share(data); } catch (e) {} return; }
      try { await navigator.clipboard.writeText(data.text + ' ' + data.url); LM.toast && LM.toast('Link copied. Paste it in a message to a friend.'); }
      catch (e) { LM.toast && LM.toast('Share this link: <b>' + data.url + '</b>', 8000); }
    });
    return b;
  };
  const fin = $('.final-hours'); if (fin) fin.after(mk('in-final'));
  const mm = $('#mMenu .m-addr'); if (mm) mm.before(mk('in-menu'));
})();

/* ---- R41: "Which tires fit you?" 3-question chooser ---- */
(() => {
  const f = $('#quiz'); if (!f) return;
  const res = f.querySelector('.quiz-res');
  f.addEventListener('change', () => {
    const d = Object.fromEntries(new FormData(f));
    if (!d.q1 || !d.q2 || !d.q3) return;
    let t, w, kind;
    if (d.q1 === 'lots') { t = 'Winter tires'; kind = 'winter'; w = 'If you drive in snow a lot, winter tires grip far better on snow and ice. Many people keep a second set on wheels and switch each season.'; }
    else if (d.q2 === 'cost' && d.q3 !== 'long') { t = 'Used tires'; kind = 'used'; w = 'Good used tires keep the cost down, which makes sense if you will not keep the car long.'; }
    else if (d.q2 === 'grip' && d.q1 === 'some') { t = 'New tires, or winter tires'; kind = 'new or winter'; w = 'For the best grip with some snow driving, new tires with deep tread are a strong pick, and winter tires are better still in a snowy month.'; }
    else if (d.q2 === 'life' || d.q3 === 'long') { t = 'New tires'; kind = 'new'; w = 'New tires last the longest, which pays off when you keep the car for years.'; }
    else { t = 'New or used, we can show you both'; kind = 'new or used'; w = 'Your answers sit in the middle. Text us your size and we will tell you what we have.'; }
    res.querySelector('h3').textContent = t; res.querySelector('.quiz-why').textContent = w;
    res.querySelector('a').href = sms(SHOP.text, `Hi L&M Tire, I'm looking for ${kind} tires. My size is: `);
    res.hidden = false; res.classList.remove('pop'); void res.offsetWidth; res.classList.add('pop');
  });
})();

/* ---- R43: one gentle "before you go" card on desktop, once per visit ---- */
(() => { if (window.LM_CALM) return; // calm version: turned off
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  let armed = false; setTimeout(() => armed = true, 15000);
  const KEY = 'lm-exit';
  const show = () => {
    if (!armed || sessionStorage.getItem(KEY)) return; sessionStorage.setItem(KEY, '1');
    const d = document.createElement('div'); d.className = 'exit'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-labelledby', 'exitH');
    d.innerHTML = `<div class="exit-card"><button type="button" class="exit-x" aria-label="Close">×</button>
      <p class="mono kicker">Before you go</p><h2 id="exitH">Get a tire quote<br>without calling.</h2>
      <p>Type your size and tap Text it. Your texting app opens with the message ready.</p>
      <form class="exit-form"><label for="exSz" class="sr">Tire size</label><input id="exSz" placeholder="205/55R16" autocomplete="off"><button class="btn btn-red" type="submit">Text it</button></form>
      <p class="exit-alt">Or call <a href="tel:+15088533322">508-853-3322</a></p></div>`;
    document.body.appendChild(d);
    const last = document.activeElement;
    const close = () => { d.classList.remove('in'); setTimeout(() => d.remove(), 300); if (last) last.focus(); };
    d.addEventListener('click', e => { if (e.target === d) close(); });
    d.querySelector('.exit-x').addEventListener('click', close);
    d.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    d.querySelector('form').addEventListener('submit', e => { e.preventDefault(); const v = d.querySelector('#exSz').value.trim(); location.href = sms(SHOP.text, 'Hi L&M Tire, can I get a tire quote? My size is: ' + v); close(); });
    requestAnimationFrame(() => { d.classList.add('in'); d.querySelector('#exSz').focus(); });
  };
  document.addEventListener('mouseout', e => { if (!e.relatedTarget && e.clientY <= 0) show(); });
  LM.exitCard = () => { armed = true; sessionStorage.removeItem(KEY); show(); };
})();

/* ---- R44: Português / Español for the FAQ, the steps, hours, services and closing band ---- */
(() => {
  const FAQ = [
    [['Vocês vendem pneus usados?', 'Sim. Vendemos pneus novos e usados. Ligue ou mande mensagem e pergunte o que temos na sua medida.'], ['¿Venden llantas usadas?', 'Sí. Vendemos llantas nuevas y usadas. Llame o mande un texto y pregunte qué tenemos en su medida.']],
    [['Vocês têm pneus de inverno?', 'Sim. Vendemos pneus de inverno, e montamos e balanceamos para você.'], ['¿Tienen llantas de invierno?', 'Sí. Vendemos llantas de invierno, y se las montamos y balanceamos.']],
    [['Vocês consertam pneu furado?', 'Sim. Fazemos tarugo e remendo. O tarugo funciona bem para um furo pequeno na banda de rodagem e é bem mais rápido; o remendo também está disponível. Dano na lateral do pneu quer dizer pneu novo. Traga o carro e verificamos o pneu.'], ['¿Arreglan llantas ponchadas?', 'Sí. Hacemos tapones y parches. El tapón funciona bien para un hoyo pequeño en la banda de rodamiento y es mucho más rápido; también hay parche. Un daño en el costado de la llanta significa llanta nueva. Traiga el carro y revisamos la llanta.']],
    [['O que mais vocês consertam?', 'Alinhamento, freios, troca de óleo, suspensão e direção, e luz de injeção (check engine).'], ['¿Qué más arreglan?', 'Alineación, frenos, cambios de aceite, suspensión y dirección, y la luz de check engine.']],
    [['Vocês fazem funilaria ou pintura?', 'Não. Não fazemos funilaria nem pintura.'], ['¿Hacen hojalatería o pintura?', 'No. No hacemos hojalatería ni pintura.']],
    [['Quanto vai custar?', 'Depende do carro e da medida do pneu. Ligue ou mande mensagem e peça um orçamento.'], ['¿Cuánto va a costar?', 'Depende de su carro y de la medida de la llanta. Llame o mande un texto y pida un precio.']],
    [['Como eu agendo?', 'Em português, ligue ou mande mensagem para <a href="tel:+17742889675">774-288-9675</a>. Ou use o formulário abaixo.'], ['¿Cómo hago una cita?', 'Mande un texto al <a href="sms:+13048066047">304-806-6047</a> o llame al taller al <a href="tel:+15088533322">508-853-3322</a>. También puede usar el formulario.']],
    [['Vocês falam português ou espanhol?', 'Sim. Em português: <a href="tel:+17742889675">774-288-9675</a>. Em espanhol: <a href="tel:+13048066047">304-806-6047</a>.'], ['¿Hablan portugués o español?', 'Sí. En español: <a href="tel:+13048066047">304-806-6047</a>. En portugués: <a href="tel:+17742889675">774-288-9675</a>.']]
  ];
  const D = {
    '#services .lede': ['Na West Boylston Street desde 2013. Novo ou usado, verão ou inverno, colocamos o pneu certo no seu carro. E quando algo embaixo do carro precisa de reparo, a gente conserta também.', 'En West Boylston Street desde 2013. Nuevas o usadas, verano o invierno, le ponemos la llanta correcta. Y cuando algo debajo del carro necesita arreglo, también lo arreglamos.'],
    '#services .note': ['Não fazemos funilaria nem pintura.', 'No hacemos hojalatería ni pintura.'],
    '#how .step:nth-child(1) h3': ['Mande mensagem ou ligue', 'Texto o llamada'], '#how .step:nth-child(2) h3': ['Traga o carro', 'Traiga el carro'], '#how .step:nth-child(3) h3': ['Pronto para rodar', 'Listo para manejar'],
    '#how .step:nth-child(2) p': ['Venha à 598 West Boylston Street no seu horário.', 'Venga a 598 West Boylston Street a su hora.'],
    '#how .step:nth-child(3) p': ['Peça um orçamento antes de começarmos, para saber quanto vai pagar.', 'Pida un precio antes de empezar, para saber cuánto va a pagar.'],
    '.hours tr[data-days="1,2,3,4,5"] th': ['Segunda a sexta', 'Lunes a viernes'], '.hours tr[data-days="6"] th': ['Sábado', 'Sábado'], '.hours tr[data-days="0"] th': ['Domingo', 'Domingo'], '.hours tr[data-days="0"] td': ['Fechado', 'Cerrado'],
    '.contact h3': ['Para quem ligar', 'A quién llamar'],
    '.final .kicker': ['598 West Boylston Street · Worcester', '598 West Boylston Street · Worcester'],
    '#final-h': ['Traga o carro.<br><span class="ol">A gente coloca você na estrada.</span>', 'Tráigalo.<br><span class="ol">Lo ponemos en marcha.</span>'],
    '.final-hours': ['Seg a sex 8h às 18h · Sáb 8h às 12h · Dom fechado', 'Lun a vie 8 AM a 6 PM · Sáb 8 AM a 12 PM · Dom cerrado'],
    '.foot > div:first-child p': ['Atendendo Worcester desde 2013. Pneus novos e usados, e os reparos que mantêm seu carro rodando.', 'Sirviendo a Worcester desde 2013. Llantas nuevas y usadas, y las reparaciones que mantienen su carro en marcha.']
  };
  const dets = $$('.faq-list details');
  function apply(l){
    const k = l === 'pt' ? 0 : 1;
    dets.forEach((d, i) => {
      if (!FAQ[i]) return;
      const s = d.querySelector('summary'), a = d.querySelector('.ans'), pm = s.querySelector('.pm');
      if (d.dataset.enq === undefined) { d.dataset.enq = s.firstChild.textContent; d.dataset.ena = a.innerHTML; }
      s.firstChild.textContent = l === 'en' ? d.dataset.enq : FAQ[i][k][0];
      a.innerHTML = l === 'en' ? d.dataset.ena : FAQ[i][k][1];
      if (l === 'en') d.removeAttribute('lang'); else d.lang = l;
      if (pm && s.lastElementChild !== pm) s.appendChild(pm);
    });
    Object.entries(D).forEach(([sel, tr]) => $$(sel).forEach(el => {
      if (el.dataset.en44 === undefined) el.dataset.en44 = el.innerHTML;
      if (el.querySelector('svg') && sel === '#services .note') { const t = [...el.childNodes].reverse().find(n => n.nodeType === 3); if (t) { if (el.dataset.ent === undefined) el.dataset.ent = t.textContent; t.textContent = l === 'en' ? el.dataset.ent : tr[k]; } return; }
      el.innerHTML = l === 'en' ? el.dataset.en44 : tr[k];
    }));
    document.dispatchEvent(new CustomEvent('lm:relabel'));
  }
  document.addEventListener('lm:lang', e => apply(e.detail));
  if (LM.lang && LM.lang !== 'en') apply(LM.lang);
})();

/* ---- R45: garage-door reveal on the big tool panels ---- */
(() => { if (window.LM_CALM) return; // calm version: turned off
  const els = $$('.symp-out, .size-wall, .td-card, .win-card, #bookForm, .patch-svg, .quiz, .photo');
  els.forEach(e => e.classList.add('gdoor'));
  // panels that sit outside an observed section still open when seen
  const io = new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) { x.target.classList.add('open'); io.unobserve(x.target); } }), { threshold: .2 });
  els.forEach(e => io.observe(e));
})();

/* ---- R46: live text-message preview in the last booking step ---- */
(() => {
  const form = $('#bookForm'); if (!form) return;
  const step4 = form.querySelectorAll('.wz-step')[3]; if (!step4) return;
  const pv = document.createElement('div'); pv.className = 'sms-pv'; pv.setAttribute('aria-live', 'polite');
  pv.innerHTML = '<p class="mono">Your text will say</p><div class="sms-phone"><p class="sms-to"></p><div class="sms-bubble"></div></div>';
  step4.querySelector('.wz-q').after(pv);
  const NUMS = { en: '304-806-6047', es: '304-806-6047', pt: '774-288-9675' };
  const T = {
    en: v => `Hi L&M Tire, I'd like to book an appointment.\nName: ${v.name}${v.car ? '\nCar: ' + v.car : ''}\nService: ${v.svc}\nBest day: ${v.day}`,
    es: v => `Hola L&M Tire, quiero hacer una cita.\nNombre: ${v.name}${v.car ? '\nCarro: ' + v.car : ''}\nServicio: ${v.svc}\nDía: ${v.day}`,
    pt: v => `Olá L&M Tire, quero marcar um horário.\nNome: ${v.name}${v.car ? '\nCarro: ' + v.car : ''}\nServiço: ${v.svc}\nDia: ${v.day}`
  };
  function upd(){
    const v = { name: $('#f-name').value.trim() || '(your name)', car: $('#f-car').value.trim(), svc: $('#f-svc').value, day: $('#f-day').value, lang: $('#f-lang').value };
    pv.querySelector('.sms-to').textContent = 'To: ' + NUMS[v.lang];
    pv.querySelector('.sms-bubble').textContent = (T[v.lang] || T.en)(v);
  }
  form.addEventListener('input', upd); form.addEventListener('change', upd); form.addEventListener('click', () => setTimeout(upd, 0)); upd();
})();

/* ---- R47: printable glovebox card ---- */
(() => {
  const card = document.createElement('div'); card.className = 'glove'; card.setAttribute('aria-hidden', 'true');
  card.innerHTML = `<div class="glove-card"><img src="assets/logo.webp" alt="" width="160" height="97">
    <div><b>L&amp;M Tire Auto Repair</b><br>598 West Boylston Street, Worcester, MA 01606</div>
    <table><tr><td>Shop</td><td>508-853-3322</td></tr><tr><td>Text to book</td><td>304-806-6047 (English, Español)</td></tr><tr><td>Português</td><td>774-288-9675</td></tr></table>
    <div>Mon to Fri 8 AM to 6 PM · Sat 8 AM to 12 PM · Sun closed</div>
    <div class="glove-svc">New &amp; used tires · Winter tires · Flat repair: plugs and patches · Wheel alignment · Brakes · Oil changes · Suspension &amp; steering · Check engine light</div>
    <div class="glove-rev"><img src="assets/review-qr.svg" alt="" width="84" height="84"><span>Happy with us? Scan to leave a Google review.</span></div>
    <div class="glove-cut">Cut along the dashed line and keep in your glovebox</div></div>`;
  document.body.appendChild(card);
  const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-ghost btn-sm glove-btn';
  b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 9V3h12v6M6 18H4v-7h16v7h-2M6 14h12v7H6z"/></svg>Print a glovebox card';
  b.addEventListener('click', () => print());
  const sc = $('.save-contact'); if (sc) sc.after(b);
})();

/* ---- R48: smart header: slides away while reading down, comes back the moment you scroll up ---- */
(() => {
  const top = $('#topbar'); if (!top) return;
  let lastY = scrollY, hidden = false, raf = null;
  function frame(){
    raf = null;
    const y = scrollY, dy = y - lastY;
    const menuOpen = document.body.classList.contains('menu-open') || (document.activeElement && top.contains(document.activeElement)) || !($('#toolsMenu') || { hidden: true }).hidden;
    let h = hidden;
    if (y < innerHeight * 0.9 || menuOpen) h = false;
    else if (dy > 6) h = true;
    else if (dy < -6) h = false;
    if (h !== hidden) { hidden = h; top.classList.toggle('tuck', h); }
    lastY = y;
  }
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(frame); }, { passive: true });
})();

/* ---- R49: one language choice everywhere: the Speak-your-language tabs, the header switch, the chat panel and the booking wizard stay in sync ---- */
(() => {
  const tabs = $$('#languages .tab'); const MAP = { 't-en': 'en', 't-pt': 'pt', 't-es': 'es' };
  let syncing = false;
  tabs.forEach(t => t.addEventListener('click', () => { if (syncing || !LM.setLang) return; const l = MAP[t.id]; if (l && l !== LM.lang) LM.setLang(l); }));
  document.addEventListener('lm:lang', e => {
    const l = e.detail; syncing = true;
    const tab = tabs.find(t => MAP[t.id] === l); if (tab && tab.getAttribute('aria-selected') !== 'true') tab.click();
    syncing = false;
    const fl = $('#f-lang'); if (fl) { fl.value = l; const r = $(`#bookForm input[name="wz-lang"][value="${l}"]`); if (r) r.checked = true; fl.dispatchEvent(new Event('change', { bubbles: true })); }
    const qb = $(`.qr-langs button[data-l="${l}"]`); if (qb) qb.click();
  });
  if (LM.lang && LM.lang !== 'en') document.dispatchEvent(new CustomEvent('lm:lang', { detail: LM.lang }));
})();

/* ---- R50: language sweep for the menus, tool titles and the little labels people tap most ---- */
(() => {
  const D = {
    '.tools-btn': ['Ferramentas <span aria-hidden="true">▾</span>', 'Herramientas <span aria-hidden="true">▾</span>'],
    '.tools-menu a[href="#symptoms"] b': ['O que meu carro tem?', '¿Qué tiene mi carro?'], '.tools-menu a[href="#symptoms"] span': ['Escolha o sintoma, veja o serviço', 'Escoja el síntoma, vea el servicio'],
    '.tools-menu a[href="#size"] b': ['Orçamento de pneus', 'Precio de llantas'], '.tools-menu a[href="#size"] span': ['Digite a medida e mande', 'Escriba la medida y mándela'],
    '.tools-menu a[href="#patch"] b': ['Tarugo, remendo ou pneu novo?', '¿Tapón, parche o llanta nueva?'], '.tools-menu a[href="#patch"] span': ['Toque onde está o prego', 'Toque donde está el clavo'],
    '.tools-menu a[href="#tread"] b': ['Teste da moeda + idade', 'Prueba del centavo + edad'], '.tools-menu a[href="#tread"] span': ['O pneu está gasto?', '¿La llanta está gastada?'],
    '.tools-menu a[href="#winter"] b': ['Checagem de inverno', 'Revisión de invierno'], '.tools-menu a[href="#winter"] span': ['Pronto para a neve?', '¿Listo para la nieve?'],
    '.tools-menu a[href="#book"] b': ['Agende em 4 toques', 'Reserve en 4 toques'], '.tools-menu a[href="#book"] span': ['Abre uma mensagem pronta', 'Abre un texto listo'],
    '#languages .kicker': ['Fale a sua língua', 'Hable su idioma'],
    '#pick .kicker': ['Novo, usado ou de inverno?', '¿Nueva, usada o de invierno?'], '#pick-h': ['Qual pneu combina com você?', '¿Qué llantas le convienen?'],
    '#patch .kicker': ['Pneu furado?', '¿Llanta ponchada?'], '#patch-h': ['Tarugo, remendo ou pneu novo?', '¿Tapón, parche o llanta nueva?'],
    '.m-menu nav a[href="#services"]': ['Serviços', 'Servicios'], '.m-menu nav a[href="#visit"]': ['Horário e endereço', 'Horario y dirección'], '.m-menu nav a[href="#faq"]': ['Perguntas', 'Preguntas'],
    '.m-menu nav a[href="#symptoms"]': ['O que meu carro tem?', '¿Qué tiene mi carro?'], '.m-menu nav a[href="#size"]': ['Orçamento de pneus', 'Precio de llantas'], '.m-menu nav a[href="#patch"]': ['Tarugo, remendo ou pneu novo?', '¿Tapón, parche o llanta nueva?'], '.m-menu nav a[href="#tread"]': ['Teste da moeda + idade', 'Prueba del centavo + edad'], '.m-menu nav a[href="#winter"]': ['Checagem de inverno', 'Revisión de invierno'], '.m-menu nav a[href="#book"]': ['Agende em 4 toques', 'Reserve en 4 toques'],
    '.m-cta .btn-red': ['Ligar 508-853-3322', 'Llamar 508-853-3322'], '.m-cta .btn-ghost': ['Mensagem para agendar', 'Texto para reservar'],
    '.wz-next': ['Próximo', 'Siguiente'], '.wz-back': ['Voltar', 'Atrás'],
    '.facts .odo-card:nth-child(1) p': ['O ano em que abrimos na West Boylston Street', 'El año en que abrimos en West Boylston Street'], '.facts .odo-card:nth-child(2) p': ['Línguas: inglês, português, espanhol', 'Idiomas: inglés, portugués, español'], '.facts .odo-card:nth-child(3) p': ['Dias por semana, de segunda a sábado', 'Días por semana, de lunes a sábado'], '.facts .odo-card:nth-child(4) p': ['Pneus, e também pneus de inverno', 'Llantas, y también de invierno']
  };
  function apply(l){
    const k = l === 'pt' ? 0 : 1;
    Object.entries(D).forEach(([sel, tr]) => $$(sel).forEach(el => { if (el.dataset.en50 === undefined) el.dataset.en50 = el.innerHTML; el.innerHTML = l === 'en' ? el.dataset.en50 : tr[k]; }));
  }
  document.addEventListener('lm:lang', e => apply(e.detail));
  if (LM.lang && LM.lang !== 'en') apply(LM.lang);
})();

/* ---- R51: "Does it sound like this?" brake sounds, made live in the browser (no audio files) ---- */
(() => {
  const host = $('.symp-out'); if (!host) return;
  const box = document.createElement('div'); box.className = 'snd';
  box.innerHTML = `<p class="mono">Hear it</p><div class="snd-row">
    <button type="button" data-s="squeal" aria-label="Play a brake squeal sound"><svg class="i" aria-hidden="true"><use href="#i-play"/></svg><span class="snd-l">Squeal</span></button>
    <button type="button" data-s="grind" aria-label="Play a brake grinding sound"><svg class="i" aria-hidden="true"><use href="#i-play"/></svg><span class="snd-l">Grind</span></button>
    <button type="button" data-s="clunk" aria-label="Play a clunk sound"><svg class="i" aria-hidden="true"><use href="#i-play"/></svg><span class="snd-l">Clunk</span></button></div>
    <p class="snd-note">Sounds like your car? Tap the matching problem above. Short real recordings, played quietly.</p>`;
  host.appendChild(box);
  const SFX = {};
  function play(kind, btn){
    let a = SFX[kind];
    if (!a) { a = SFX[kind] = new Audio(); a.crossOrigin = 'anonymous'; a.preload = 'auto'; a.src = 'assets/sfx-' + kind + '.mp3'; a.volume = 1; a.addEventListener('ended', () => done(kind)); a.addEventListener('pause', () => done(kind)); }
    Object.keys(SFX).forEach(k => { if (k !== kind && !SFX[k].paused) SFX[k].pause(); });
    try { a.currentTime = 0; } catch (e) {}
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    LM.sound && LM.sound.duck(true);
    const p = a.play(); if (p && p.catch) p.catch(() => done(kind));
    box.querySelectorAll('button[data-s]').forEach(x => x.classList.toggle('on', x === btn));
  }
  function done(kind){ const b = box.querySelector('button[data-s="' + kind + '"]'); if (b) b.classList.remove('on'); if (!Object.values(SFX).some(x => !x.paused)) LM.sound && LM.sound.duck(false); }
  box.addEventListener('click', e => { const b = e.target.closest('button[data-s]'); if (b) play(b.dataset.s, b); });
})();

/* ---- R52: next oil change date + calendar reminder ---- */
(() => {
  const f = $('#oilForm'); if (!f) return;
  const last = $('#oilLast'), dOut = f.querySelector('.oil-date'), left = f.querySelector('.oil-left'), cal = f.querySelector('.oil-cal'), book = f.querySelector('.oil-book');
  const today = new Date(); const iso = d => d.toISOString().slice(0, 10);
  const def = new Date(today); def.setMonth(def.getMonth() - 2); last.value = iso(def); last.max = iso(today);
  book.href = sms(SHOP.text, 'Hi L&M Tire, I would like to book an oil change.');
  let url = null;
  function upd(){
    const v = Object.fromEntries(new FormData(f));
    if (!last.value) { dOut.textContent = 'Pick a date above'; left.textContent = ''; return; }
    const weeks = +v.iv / +v.wk;
    const due = new Date(last.value + 'T09:00:00'); due.setDate(due.getDate() + Math.round(weeks * 7));
    const days = Math.round((due - today) / 864e5);
    dOut.textContent = due.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
    left.textContent = days < 0 ? `That was ${-days} days ago. Time to book.` : days === 0 ? 'That is today.' : `In about ${days < 60 ? days + ' days' : Math.round(days / 30.4) + ' months'}.`;
    f.classList.toggle('due', days <= 14);
    const st = new Date(Math.max(due, today.getTime() + 864e5)); st.setHours(9, 0, 0, 0);
    const pad = n => String(n).padStart(2, '0'), fm = d => d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + 'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00';
    const en = new Date(st); en.setMinutes(30);
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//L&M Tire//Oil//EN', 'BEGIN:VEVENT', 'UID:oil-' + Date.now() + '@lmtire', 'DTSTAMP:' + fm(new Date()), 'DTSTART:' + fm(st), 'DTEND:' + fm(en), 'SUMMARY:Oil change due (L&M Tire)', 'LOCATION:598 West Boylston Street\\, Worcester\\, MA 01606', 'DESCRIPTION:Text 304-806-6047 or call 508-853-3322 to book.', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    if (url) URL.revokeObjectURL(url); url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })); cal.href = url;
  }
  f.addEventListener('input', upd); f.addEventListener('change', upd); upd();
})();

/* ---- R53: smarter day picker: Today / Tomorrow tags, hours under each day, and a closed day can't be picked ---- */
(() => {
  const set = $('#bookForm .wz-chips input[name="wz-day"]') && $('#bookForm .wz-chips input[name="wz-day"]').closest('fieldset'); if (!set) return;
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  function paint(){
    const s = LM.shopState(), n = s.now;
    set.querySelectorAll('label').forEach(l => {
      const r = l.querySelector('input'), sp = l.querySelector('span'), d = DAYS.indexOf(r.value);
      if (!sp.dataset.base) sp.dataset.base = sp.textContent;
      let tag = '', sub = '';
      if (d >= 0) {
        sub = d === 6 ? '8 AM to 12 PM' : '8 AM to 6 PM';
        if (d === n.day) tag = s.open ? 'Today' : (n.mins < 480 ? 'Today' : '');
        if (d === (n.day + 1) % 7) tag = 'Tomorrow';
        const past = d === n.day && !s.open && n.mins >= 480;
        r.disabled = past; l.classList.toggle('past', past); if (past) sub = 'closed for today';
      }
      sp.innerHTML = '';
      const b = document.createElement('b'); b.textContent = sp.dataset.base; sp.appendChild(b);
      if (tag) { const t = document.createElement('i'); t.textContent = tag; sp.appendChild(t); }
      if (sub) { const sm = document.createElement('small'); sm.textContent = sub; sp.appendChild(sm); }
    });
    set.classList.add('days');
  }
  paint(); document.addEventListener('lm:state', paint);
})();

/* ---- R54: dashboard-style icons on the symptom buttons ---- */
(() => {
  const I = { brakes: 'brakelamp', shake: 'balance', clunk: 'spring', light: 'engine', flat: 'tpms', tread: 'tread', oil: 'oil', other: 'ask', pull: 'align' };
  $$('.symp-btn').forEach(b => {
    const ic = I[b.dataset.s]; if (!ic) return;
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('aria-hidden', 'true'); s.classList.add('i', 'symp-ic');
    s.innerHTML = '<use href="#i-' + ic + '"/>'; b.prepend(s); b.classList.add('has-ic');
  });
})();

/* ---- R55: services become illustrated: a big line-drawing at the top of each card that draws itself ---- */
(() => {
  const cards = $$('#services .card'); if (cards.length < 2) return;
  const ART = [
    // tire, side view: tread blocks around the outside, rim with five spokes
    '<circle cx="60" cy="60" r="52"/><circle cx="60" cy="60" r="40"/><circle cx="60" cy="60" r="26"/><circle cx="60" cy="60" r="7"/><path d="M60 8v12M86 15l-6 10.4M105 34l-10.4 6M112 60H100M105 86l-10.4-6M86 105l-6-10.4M60 112V100M34 105l6-10.4M15 86l10.4-6M8 60h12M15 34l10.4 6M34 15l6 10.4"/><path d="M60 34v19M84.7 52l-18 5.9M75.3 81l-11.1-15.4M44.7 81l11.1-15.4M35.3 52l18 5.9"/>',
    // brake rotor with drilled holes and the caliper clamped over the top right
    '<circle cx="54" cy="64" r="44"/><circle cx="54" cy="64" r="16"/><circle cx="54" cy="64" r="5"/><path d="M54 33v.1M75.9 42.1v.1M85 64v.1M75.9 85.9v.1M54 95v.1M32.1 85.9v.1M23 64v.1M32.1 42.1v.1"/><path d="M66 14h16a26 26 0 0 1 26 26v16a8 8 0 0 1-8 8h-2a8 8 0 0 1-8-8v-6a18 18 0 0 0-18-18h-6a8 8 0 0 1-8-8v-2a8 8 0 0 1 8-8z"/>'
  ];
  cards.forEach((c, i) => {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 120 120'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2.5'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true'); s.classList.add('card-art');
    s.innerHTML = ART[i % ART.length];
    s.querySelectorAll('*').forEach(p => { p.setAttribute('pathLength', '1'); });
    c.prepend(s);
  });
})();

/* ---- R56: offline? phones can still call, so say so ---- */
(() => {
  const bar = document.createElement('div'); bar.className = 'offline'; bar.setAttribute('role', 'status'); bar.hidden = true;
  bar.innerHTML = '<p><b>No internet right now.</b> You can still call us: <a href="tel:+15088533322">508-853-3322</a></p>';
  document.body.appendChild(bar);
  const upd = () => { bar.hidden = navigator.onLine; };
  addEventListener('online', upd); addEventListener('offline', upd); upd();
})();

/* ---- R57: returning customers: the wizard remembers name and car on this device, with a one-tap "forget me" ---- */
(() => {
  const n = $('#f-name'), c = $('#f-car'), form = $('#bookForm'); if (!n || !form) return;
  const KEY = 'lm-me';
  let me = null; try { me = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
  const s3 = form.querySelectorAll('.wz-step')[2];
  const note = document.createElement('p'); note.className = 'me-note'; note.hidden = true;
  note.innerHTML = '<span></span> <button type="button" class="me-forget">Not you? Clear</button>';
  if (s3) s3.querySelector('.wz-q').after(note);
  if (me && me.name) {
    n.value = me.name; if (me.car) c.value = me.car;
    note.hidden = false; note.querySelector('span').textContent = `Welcome back, ${me.name}. We filled in your details.`;
  }
  note.querySelector('.me-forget').addEventListener('click', () => { try { localStorage.removeItem(KEY); } catch (e) {} n.value = ''; c.value = ''; note.hidden = true; n.focus(); form.dispatchEvent(new Event('input')); });
  form.addEventListener('submit', () => { const v = n.value.trim(); if (!v) return; try { localStorage.setItem(KEY, JSON.stringify({ name: v, car: c.value.trim() })); } catch (e) {} });
  const fn = form.querySelector('.form-note'); if (fn) fn.insertAdjacentHTML('beforeend', ' Your name and car are kept only on this device, to save typing next time.');
})();

/* ---- R58: "Before you come in" checklist, tailored to the service you picked ---- */
(() => {
  const sent = $('#sent'); if (!sent) return;
  const box = document.createElement('div'); box.className = 'bring';
  sent.querySelector('.sent-extra') ? sent.querySelector('.sent-extra').after(box) : sent.querySelector('h3').after(box);
  const BASE = ['Your car keys', 'The address: 598 West Boylston Street'];
  const BY = {
    tires: ['Your wheel lock key, if your wheels have locks (often in the glovebox or trunk)', 'Your tire size, if you know it'],
    flat: ['Your wheel lock key, if you have one', 'If you can, the spare tire or the flat tire'],
    oil: ['The last oil change sticker or date, if you have it'],
    light: ['A photo of the dashboard light, if it went off'],
    brakes: ['When the noise happens (stopping, turning, cold mornings)']
  };
  const kind = s => /tire|balanc|rotation/i.test(s) && !/flat/i.test(s) ? 'tires' : /flat/i.test(s) ? 'flat' : /oil/i.test(s) ? 'oil' : /engine/i.test(s) ? 'light' : /brake/i.test(s) ? 'brakes' : null;
  $('#bookForm').addEventListener('submit', () => {
    const k = kind($('#f-svc').value);
    const items = [...(k ? BY[k] : []), ...BASE];
    box.innerHTML = '<p class="mono">Before you come in, bring</p><ul>' + items.map(i => '<li></li>').join('') + '</ul>';
    box.querySelectorAll('li').forEach((li, i) => li.textContent = items[i]);
  });
})();

/* ---- R62: language links: ?lang=pt or ?lang=es opens the site straight in that language (great for Leo and Cid to send to customers); the tab title follows ---- */
(() => {
  const TITLE = {
    en: document.title,
    pt: 'L&M Tire Auto Repair | Pneus novos e usados e reparos em Worcester, MA',
    es: 'L&M Tire Auto Repair | Llantas nuevas y usadas y reparaciones en Worcester, MA'
  };
  const md = document.querySelector('meta[name="description"]');
  const DESC = { en: md ? md.content : '', pt: 'L&M Tire Auto Repair, 598 West Boylston Street, Worcester, MA. Pneus novos e usados, pneus de inverno, conserto de pneu furado (tarugo e remendo), alinhamento, freios, troca de óleo. Falamos português: 774-288-9675.', es: 'L&M Tire Auto Repair, 598 West Boylston Street, Worcester, MA. Llantas nuevas y usadas, de invierno, ponchaduras (tapones y parches), alineación, frenos, cambio de aceite. Hablamos español: 304-806-6047.' };
  document.addEventListener('lm:lang', e => {
    const l = e.detail; document.title = TITLE[l] || TITLE.en; if (md) md.content = DESC[l] || DESC.en;
    const u = new URL(location.href); if (l === 'en') u.searchParams.delete('lang'); else u.searchParams.set('lang', l);
    history.replaceState(null, '', u.pathname + (u.search ? u.search : '') + u.hash);
  });
  const want = new URLSearchParams(location.search).get('lang');
  if (want && ['en', 'pt', 'es'].includes(want) && want !== LM.lang && LM.setLang) LM.setLang(want);
  else if (LM.lang && LM.lang !== 'en') document.dispatchEvent(new CustomEvent('lm:lang', { detail: LM.lang }));
})();

/* ---- R64: the background light changes mood with each part of the page (red for repairs and urgency, blue for tires and planning, green for "ready") ---- */
(() => { if (window.LM_CALM) return; // calm version: turned off
  const env = $('.env'); if (!env) return;
  const MOOD = { facts: 'blue', services: 'red', pick: 'blue', symptoms: 'red', size: 'blue', patch: 'red', tread: 'amber', winter: 'blue', oil: 'amber', how: 'red', book: 'green', languages: 'blue', visit: 'blue', faq: 'red' };
  const secs = Object.keys(MOOD).map(id => document.getElementById(id)).filter(Boolean);
  let cur = '';
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const m = MOOD[e.target.id] || ''; if (m === cur) return; cur = m;
    env.dataset.mood = m;
  }), { rootMargin: '-45% 0px -45% 0px' });
  secs.forEach(s => io.observe(s));
})();

/* ---- R65: footer becomes a map of the whole site: free tools column + back to top ---- */
(() => {
  const foot = $('.foot'); if (!foot) return;
  const col = document.createElement('div');
  const T = [['#pick', 'Which tires fit you?'], ['#symptoms', 'What is my car doing?'], ['#size', 'Tire quote by text'], ['#patch', 'Plug, patch or new tire?'], ['#tread', 'Penny test + tire age'], ['#oil', 'Oil change reminder'], ['#book', 'Book in 4 taps']].filter(t => document.querySelector(t[0]) && !document.querySelector(t[0]).hidden);
  col.innerHTML = '<h3>Free tools</h3><ul>' + T.map(t => `<li><a href="${t[0]}">${t[1]}</a></li>`).join('') + '</ul>';
  foot.appendChild(col);
  foot.classList.add('four');
  const fine = $('.fine'); if (fine) { const a = document.createElement('a'); a.href = '#top'; a.className = 'to-top'; a.textContent = 'Back to top ↑'; fine.appendChild(a); }
})();

/* ---- R66: booking "anything else?" note: a short note rides along in the text for any service ---- */
(() => {
  const form = $('#bookForm'); if (!form) return;
  const s3 = form.querySelectorAll('.wz-step')[2]; if (!s3) return;
  const f = document.createElement('div'); f.className = 'field';
  f.innerHTML = '<label for="f-note">Anything else? <small>(optional)</small></label><textarea id="f-note" rows="2" maxlength="240" placeholder="Like: noise started last week, car pulls to the right"></textarea>';
  s3.appendChild(f);
  const note = $('#f-note'), svc = $('#f-svc');
  // runs before the message is built: temporarily carry the note on the service line, then put things back
  form.addEventListener('submit', () => {
    const v = note.value.trim().replace(/\s+/g, ' '); if (!v) return;
    const prev = svc.value, opt = new Option(prev + '\nNote: ' + v, prev + '\nNote: ' + v, true, true);
    svc.appendChild(opt); svc.value = opt.value;
    setTimeout(() => { svc.value = prev; opt.remove(); }, 0);
  }, true);
  const pv = () => { const b = $('.sms-bubble'); if (!b) return; const v = note.value.trim().replace(/\s+/g, ' '); const base = b.textContent.replace(/\nNote: [^\n]*/, ''); b.textContent = v ? base.replace(/(Service|Servicio|Serviço): ([^\n]*)/, (m) => m + '\nNote: ' + v) : base; };
  note.addEventListener('input', pv); form.addEventListener('change', () => setTimeout(pv, 0)); form.addEventListener('click', () => setTimeout(pv, 5));
})();

/* ---- R67: "What changes a tire quote?" honest explainer under the tire-size tool (no prices, just what moves them) ---- */
(() => {
  const form = $('#sizeForm'); if (!form) return;
  const box = document.createElement('div'); box.className = 'qf rv in';
  const F = [
    ['Tire size', 'Bigger wheels and wider tires cost more.', 'rim'],
    ['New or used', 'Used tires cost less up front. New tires last longer.', 'tread'],
    ['Type of tire', 'All-season, winter, or performance tires are priced differently.', 'snow'],
    ['How many', 'One tire, a pair, or a full set of four.', 'four'],
    ['Installation', 'Mounting and balancing so the ride is smooth.', 'balance']
  ];
  box.innerHTML = '<h3>What changes a tire quote?</h3><ul>' + F.map(f => `<li><svg class="i" aria-hidden="true"><use href="#i-${f[2]}"/></svg><div><b>${f[0]}</b><span>${f[1]}</span></div></li>`).join('') + '</ul><p class="qf-note">Text us your size and ask for your options and the price.</p>';
  form.after(box);
})();

/* ---- R68: weather-aware first screen: snow in the forecast or a freezing day changes the hero's quick picks ---- */
(() => {
  const picks = $('.hero-picks'); if (!picks) return;
  let done = false;
  function apply(){
    if (done) return;
    let snow = null, temp = null;
    try { snow = JSON.parse(sessionStorage.getItem('lm-snow-v1') || 'null'); } catch (e) {}
    const t = sessionStorage.getItem('lm-temp'); if (t !== null) temp = +t;
    let label = null, svc = null, cls = '';
    if (snow && snow.day) { label = 'Snow ' + (snow.day === 'today' || snow.day === 'tomorrow' ? snow.day : 'on ' + snow.day) + ': winter tires'; svc = 'Winter tires'; cls = 'wx-snow'; }
    else if (temp !== null && temp <= 35) { label = temp + '°F today: tire pressure check'; svc = 'Installation & balancing'; cls = 'cold'; }
    if (!label) return;
    done = true;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'wx-pick ' + cls; b.dataset.svc = svc; b.textContent = label;
    picks.insertBefore(b, picks.children[1] || null);
  }
  apply();
  const iv = setInterval(() => { apply(); if (done) clearInterval(iv); }, 1000); setTimeout(() => clearInterval(iv), 12000);
})();

/* ---- R69: language sweep for the newer tools (oil reminder, tire chooser, penny test, winter list, quote explainer) ---- */
(() => {
  const D = {
    '#oil .kicker': ['Lembrete de troca de óleo', 'Recordatorio de cambio de aceite'], '#oil-h': ['Quando é a próxima troca de óleo?', '¿Cuándo es su próximo cambio de aceite?'],
    '#oil .lede': ['Diga mais ou menos quando trocou o óleo e quanto você dirige. Calculamos a data e colocamos um lembrete no calendário do seu celular.', 'Díganos más o menos cuándo cambió el aceite y cuánto maneja. Calculamos la fecha y ponemos un recordatorio en el calendario de su teléfono.'],
    'label[for="oilLast"]': ['Última troca de óleo', 'Último cambio de aceite'], '.oil-cal': ['Adicionar lembrete', 'Agregar recordatorio'], '.oil-book': ['Agendar a troca de óleo', 'Reservar el cambio de aceite'],
    '#pick .lede': ['Três perguntas rápidas. Não há resposta certa ou errada.', 'Tres preguntas rápidas. No hay respuestas buenas ni malas.'],
    '#quiz fieldset:nth-of-type(1) legend': ['Quanto você dirige na neve?', '¿Cuánto maneja en la nieve?'], '#quiz fieldset:nth-of-type(2) legend': ['O que mais importa?', '¿Qué es lo más importante?'], '#quiz fieldset:nth-of-type(3) legend': ['Por quanto tempo vai ficar com o carro?', '¿Cuánto tiempo va a tener este carro?'],
    '#tread .lede': ['Coloque uma moeda de 1 centavo no sulco, com a cabeça para baixo. Se aparecer o topo da cabeça de Lincoln, o sulco tem 2/32 de polegada ou menos, o mínimo da inspeção em Massachusetts.', 'Ponga un centavo en la ranura, con la cabeza hacia abajo. Si ve la parte de arriba de la cabeza de Lincoln, la llanta tiene 2/32 de pulgada o menos, el mínimo de la inspección en Massachusetts.'],
    '.age h3': ['Qual a idade dos seus pneus?', '¿Qué edad tienen sus llantas?'],
    '#win-h': ['Seu carro está pronto para a neve?', '¿Su carro está listo para la nieve?'],
    '.win-list li:nth-child(1) b': ['Pneus de inverno colocados', 'Llantas de invierno puestas'], '.win-list li:nth-child(2) b': ['Sulco com boa profundidade', 'Buena profundidad de ranura'], '.win-list li:nth-child(3) b': ['Calibragem verificada', 'Presión revisada'], '.win-list li:nth-child(4) b': ['Freios firmes', 'Frenos firmes'], '.win-list li:nth-child(5) b': ['Troca de óleo em dia', 'Cambio de aceite al día'],
    '.qf h3': ['O que muda o orçamento de pneus?', '¿Qué cambia el precio de las llantas?'],
    '.patch-res .btn-red': ['Mande mensagem sobre o pneu', 'Mándenos un texto sobre la llanta']
  };
  function apply(l){ const k = l === 'pt' ? 0 : 1; Object.entries(D).forEach(([sel, tr]) => $$(sel).forEach(el => { if (el.dataset.en69 === undefined) el.dataset.en69 = el.innerHTML; el.innerHTML = l === 'en' ? el.dataset.en69 : tr[k]; })); }
  document.addEventListener('lm:lang', e => apply(e.detail));
  if (LM.lang && LM.lang !== 'en') apply(LM.lang);
})();

/* ---- R70: race-start lights above the hero headline on first visit: five reds light up, then everything flips green ---- */
(() => { if (window.LM_CALM) return; // calm version: turned off
  const k = $('.b1 .kicker'); if (!k || reduced() || sessionStorage.getItem('lm-lights')) return;
  sessionStorage.setItem('lm-lights', '1');
  const row = document.createElement('div'); row.className = 'lights'; row.setAttribute('aria-hidden', 'true');
  row.innerHTML = '<i></i><i></i><i></i><i></i><i></i>';
  k.before(row);
  const L = [...row.children];
  L.forEach((l, i) => setTimeout(() => l.classList.add('red'), 250 + i * 220));
  setTimeout(() => { L.forEach(l => { l.classList.remove('red'); l.classList.add('go'); }); }, 250 + 5 * 220 + 350);
  setTimeout(() => row.classList.add('bye'), 3200);
  setTimeout(() => row.remove(), 3900);
})();

/* ---- R71: service dial: a big tire you turn to pick a service (click a label, use arrows, or drag on desktop) ---- */
(() => {
  const head = $('#services .sec-head'); if (!head) return;
  const S = ['New tires', 'Used tires', 'Winter tires', 'Installation & balancing', 'Flat tire repair: plugs and patches', 'Tire rotation', 'Wheel alignment', 'Brakes', 'Oil change', 'Suspension & steering', 'Check engine light'];
  const SHORT = ['New tires', 'Used tires', 'Winter', 'Balancing', 'Plug/patch', 'Rotation', 'Alignment', 'Brakes', 'Oil change', 'Suspension', 'Engine light'];
  const N = S.length, step = 360 / N;
  const wrap = document.createElement('div'); wrap.className = 'dial-wrap rv';
  const labels = SHORT.map((t, i) => { const a = (i * step - 90) * Math.PI / 180; return `<text x="${150 + Math.cos(a) * 112}" y="${150 + Math.sin(a) * 112}" transform="rotate(${i * step} ${150 + Math.cos(a) * 112} ${150 + Math.sin(a) * 112})" data-i="${i}">${t}</text>`; }).join('');
  const spokes = Array.from({ length: N }, (_, i) => `<line x1="150" y1="150" x2="${150 + Math.cos((i * step - 90 + step / 2) * Math.PI / 180) * 92}" y2="${150 + Math.sin((i * step - 90 + step / 2) * Math.PI / 180) * 92}"/>`).join('');
  wrap.innerHTML = `<div class="dial" role="listbox" tabindex="0" aria-label="Turn the dial to pick a service. Use the arrow keys." aria-activedescendant="">
      <svg viewBox="0 0 300 300" aria-hidden="true"><g class="dial-rot"><circle cx="150" cy="150" r="142" class="d-tire"/><circle cx="150" cy="150" r="128" class="d-band"/><circle cx="150" cy="150" r="96" class="d-rim"/>${spokes}<circle cx="150" cy="150" r="22" class="d-hub"/><g class="d-labels">${labels}</g></g><path d="M150 2 l-10 -0 l10 18 l10 -18 z" class="d-ptr"/></svg>
      <span class="sr" aria-live="polite"></span></div>
    <div class="dial-out"><p class="mono">Turn the dial</p><b class="dial-svc">New tires</b><button type="button" class="btn btn-red btn-sm dial-go">Book this</button></div>`;
  head.querySelector('.spin-ic') ? head.querySelector('.spin-ic').replaceWith(wrap) : head.prepend(wrap);
  const dial = wrap.querySelector('.dial'), rot = wrap.querySelector('.dial-rot'), out = wrap.querySelector('.dial-svc'), live = wrap.querySelector('.sr');
  let idx = 0, angle = 0;
  function go(i, fromDrag){
    idx = ((i % N) + N) % N;
    let target = -idx * step; while (target - angle > 180) target -= 360; while (target - angle < -180) target += 360; angle = target;
    rot.style.transform = `rotate(${angle}deg)`;
    out.textContent = S[idx]; live.textContent = S[idx];
    wrap.querySelectorAll('.d-labels text').forEach(t => t.classList.toggle('on', +t.dataset.i === idx));
  }
  wrap.querySelectorAll('.d-labels text').forEach(t => t.addEventListener('click', () => go(+t.dataset.i)));
  dial.addEventListener('keydown', e => { if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); go(idx + 1); } if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); go(idx - 1); } if (e.key === 'Enter') { e.preventDefault(); LM.goBook && LM.goBook(S[idx]); } });
  let dragging = false, startA = 0, startAngle = 0;
  const ang = e => { const r = dial.getBoundingClientRect(); return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI; };
  dial.addEventListener('pointerdown', e => { if (e.target.closest('text')) return; dragging = true; startA = ang(e); startAngle = angle; dial.setPointerCapture(e.pointerId); rot.style.transition = 'none'; });
  dial.addEventListener('pointermove', e => { if (!dragging) return; angle = startAngle + (ang(e) - startA); rot.style.transform = `rotate(${angle}deg)`; });
  dial.addEventListener('pointerup', () => { if (!dragging) return; dragging = false; rot.style.transition = ''; go(Math.round(-angle / step)); });
  wrap.querySelector('.dial-go').addEventListener('click', () => LM.goBook && LM.goBook(S[idx]));
  go(0);
})();

/* ---- R72: real social proof without making any up: one tap to read (or leave) L&M Tire reviews on Google ---- */
(() => {
  const url = 'https://g.page/r/CTVdw0UmvaHLEBM';
  const mk = cls => { const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener'; a.className = 'reviews-link ' + cls;
    a.innerHTML = '<span>See what customers say on Google</span><span class="sr"> (opens Google in a new tab)</span>'; return a; };
  const fin = $('.final-cta'); if (fin) fin.after(mk('in-final'));
  const contact = $('.contact'); if (contact) contact.after(mk('in-visit'));
})();

/* ---- R73: the "closed" note in the first screen now says exactly when we open next, in the visitor's language ---- */
(() => {
  const note = $('.b1 .closed-note'); if (!note) return;
  const DN = { en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], pt: ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'], es: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'] };
  function txt(){
    const s = LM.shopState(); if (s.open) return null;
    const l = LM.lang || 'en', n = s.now;
    const when = s.opensLabel === 'today' ? { en: 'today at 8 AM', pt: 'hoje às 8h', es: 'hoy a las 8 AM' }[l]
      : s.opensLabel === 'tomorrow' ? { en: 'tomorrow at 8 AM', pt: 'amanhã às 8h', es: 'mañana a las 8 AM' }[l]
      : { en: DN.en[s.nextDay] + ' at 8 AM', pt: DN.pt[s.nextDay] + ' às 8h', es: 'el ' + DN.es[s.nextDay] + ' a las 8 AM' }[l];
    const lead = n.day === 0 ? { en: 'Closed Sundays.', pt: 'Fechado aos domingos.', es: 'Cerrado los domingos.' }[l] : { en: 'Closed right now.', pt: 'Fechado agora.', es: 'Cerrado ahora.' }[l];
    return lead + ' ' + { en: `We open ${when}. Text now to book your time.`, pt: `Abrimos ${when}. Mande mensagem agora e marque seu horário.`, es: `Abrimos ${when}. Mande un texto ahora y reserve su hora.` }[l];
  }
  const paint = () => { const t = txt(); if (t) note.textContent = t; };
  paint(); document.addEventListener('lm:state', paint); document.addEventListener('lm:lang', () => setTimeout(paint, 0));
})();

/* ---- R74: tire-care tip cards you swipe through, each linking to the matching tool or booking ---- */
(() => {
  const tr = $('.tips-track'); if (!tr) return;
  const by = d => tr.scrollBy({ left: d * (tr.querySelector('.tip').offsetWidth + 16), behavior: reduced() ? 'auto' : 'smooth' });
  $('.tn-prev').addEventListener('click', () => by(-1)); $('.tn-next').addEventListener('click', () => by(1));
  tr.querySelectorAll('a[data-book]').forEach(a => a.addEventListener('click', e => { if (LM.goBook) { e.preventDefault(); LM.goBook(a.dataset.book); } }));
})();

/* ---- R76: language sweep 3: start tiles, tire-care tips, service dial, closing links ---- */
(() => {
  const D = {
    '#start-h': ['O que traz você aqui hoje?', '¿Qué lo trae hoy?'],
    '.st:nth-child(1) b': ['Preciso de pneus', 'Necesito llantas'], '.st:nth-child(1) small': ['Novo, usado ou de inverno: veja o que serve', 'Nuevas, usadas o de invierno: vea cuál le sirve'],
    '.st:nth-child(2) b': ['Estou com pneu furado', 'Tengo una ponchadura'], '.st:nth-child(2) small': ['Tarugo, remendo ou pneu novo? Toque e veja', '¿Tapón, parche o llanta nueva? Toque y vea'],
    '.st:nth-child(3) b': ['Tem um barulho estranho', 'Algo suena raro'], '.st:nth-child(3) small': ['Freios, tremores, batidas, luzes de aviso', 'Frenos, vibraciones, golpes, luces de aviso'],
    '.st:nth-child(4) b': ['Já sei o que preciso', 'Ya sé lo que necesito'], '.st:nth-child(4) small': ['Agende em 4 toques', 'Reserve en 4 toques'],
    '#tips .kicker': ['Cuidado com pneus em 30 segundos', 'Cuidado de llantas en 30 segundos'], '#tips-h': ['Cinco hábitos que economizam dinheiro.', 'Cinco hábitos que le ahorran dinero.'],
    '.tip:nth-child(1) h3': ['Calibre os pneus uma vez por mês', 'Revise la presión una vez al mes'], '.tip:nth-child(1) p': ['Use o número do adesivo na porta do motorista, não o do pneu. Calibre com os pneus frios.', 'Use el número de la etiqueta en la puerta del conductor, no el de la llanta. Revísela con las llantas frías.'],
    '.tip:nth-child(2) h3': ['Faça o rodízio dos pneus', 'Rote las llantas'], '.tip:nth-child(2) p': ['Trocar os pneus de lugar ajuda a gastar por igual, e o jogo dura mais. O manual diz a frequência.', 'Cambiar las llantas de lugar ayuda a que se gasten parejo y duren más. El manual dice cada cuánto.'],
    '.tip:nth-child(3) h3': ['Fique de olho no sulco', 'Vigile la ranura'], '.tip:nth-child(3) p': ['Pneu gasto escorrega na chuva e na neve. O teste da moeda leva dez segundos.', 'Una llanta gastada resbala con lluvia y nieve. La prueba del centavo toma diez segundos.'],
    '.tip:nth-child(4) h3': ['Não ignore o volante tremendo', 'No ignore la vibración'], '.tip:nth-child(4) p': ['Volante tremendo em velocidade muitas vezes é roda precisando de balanceamento.', 'Si el volante vibra a velocidad, muchas veces una rueda necesita balanceo.'],
    '.tip:nth-child(5) h3': ['Conserte furos pequenos cedo', 'Arregle ponchaduras pequeñas a tiempo'], '.tip:nth-child(5) p': ['Um vazamento lento por prego costuma ser mais fácil de resolver antes de rodar com o pneu vazio.', 'Una fuga lenta por un clavo suele ser más fácil de resolver antes de manejar con la llanta vacía.'],
    '.dial-out .mono': ['Gire o pneu', 'Gire la llanta'], '.dial-go': ['Agendar este', 'Reservar este'],
    '.reviews-link span:not(.sr)': ['Veja o que os clientes dizem no Google', 'Vea lo que dicen los clientes en Google'],
    '.share-btn span': ['Mande para um amigo que precisa de pneus', 'Mándelo a un amigo que necesita llantas']
  };
  function apply(l){ const k = l === 'pt' ? 0 : 1; Object.entries(D).forEach(([sel, tr]) => $$(sel).forEach(el => { if (el.dataset.en76 === undefined) el.dataset.en76 = el.innerHTML; el.innerHTML = l === 'en' ? el.dataset.en76 : tr[k]; })); }
  document.addEventListener('lm:lang', e => apply(e.detail));
  if (LM.lang && LM.lang !== 'en') apply(LM.lang);
})();

/* ---- R77: "My visit" list: add several jobs from the tools, then send them all in one text ---- */
(() => {
  const KEY = 'lm-visit';
  let items = []; try { items = JSON.parse(sessionStorage.getItem(KEY) || '[]'); } catch (e) {}
  const tray = document.createElement('div'); tray.className = 'visit'; tray.setAttribute('role', 'region'); tray.setAttribute('aria-label', 'My visit');
  tray.innerHTML = `<button type="button" class="visit-tab" aria-expanded="false"><b class="visit-n">0</b><span>My visit</span></button>
    <div class="visit-panel" hidden><p class="mono">My visit</p><ul class="visit-list"></ul><a class="btn btn-red btn-sm visit-send" href="#">Text all of it</a><button type="button" class="visit-clear">Clear list</button></div>`;
  document.body.appendChild(tray);
  const tab = tray.querySelector('.visit-tab'), panel = tray.querySelector('.visit-panel'), list = tray.querySelector('.visit-list');
  function save(){ try { sessionStorage.setItem(KEY, JSON.stringify(items)); } catch (e) {} }
  function render(bump){
    tray.querySelector('.visit-n').textContent = items.length;
    tray.classList.toggle('has', items.length > 0);
    list.innerHTML = '';
    items.forEach((t, i) => { const li = document.createElement('li'); li.textContent = t; const x = document.createElement('button'); x.type = 'button'; x.textContent = '×'; x.setAttribute('aria-label', 'Remove ' + t); x.addEventListener('click', () => { items.splice(i, 1); save(); render(); }); li.appendChild(x); list.appendChild(li); });
    tray.querySelector('.visit-send').href = sms(SHOP.text, "Hi L&M Tire, I'd like to book a visit for:\n" + items.map(t => '- ' + t).join('\n'));
    if (bump) { tab.classList.remove('bump'); void tab.offsetWidth; tab.classList.add('bump'); }
  }
  tab.addEventListener('click', () => { const o = panel.hidden; panel.hidden = !o; tab.setAttribute('aria-expanded', String(o)); });
  tray.querySelector('.visit-clear').addEventListener('click', () => { items = []; save(); render(); panel.hidden = true; tab.setAttribute('aria-expanded', 'false'); });
  LM.addToVisit = t => { if (!t || items.includes(t)) { LM.toast && LM.toast('Already in your visit list.'); return; } items.push(t); save(); render(true); LM.toast && LM.toast(`Added to your visit: <b>${t.replace(/</g, '&lt;')}</b>`); };
  const addBtn = (host, getLabel, where) => { if (!host) return; const b = document.createElement('button'); b.type = 'button'; b.className = 'add-visit'; b.innerHTML = '<span aria-hidden="true">+</span> Add to my visit'; b.addEventListener('click', () => LM.addToVisit(getLabel())); where === 'before' ? host.before(b) : host.appendChild(b); };
  addBtn($('.symp-res .cta-row'), () => $('.symp-svc').textContent);
  addBtn($('.patch-res'), () => 'Flat tire: ' + ($('.patch-res h3').textContent || 'check'));
  addBtn($('.size-form'), () => { const m = ($('.size-send').textContent.match(/\d{3}\/\d{2}R\d{2}/) || [])[0]; const f = new FormData($('#sizeForm')); return `Tires${m ? ' ' + m : ''} (${f.get('kind')}, x${f.get('qty')})`; });
  addBtn($('.oil-btns'), () => 'Oil change');
  addBtn($('.td-card'), () => 'Tread / tire check');
  render();
})();

/* ---- R78: shop notice the owner can change without touching code (assets/notice.json: holiday hours, "closed today", news) ---- */
(() => {
  if (location.protocol === 'file:') return;
  fetch('assets/notice.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).then(n => {
    if (!n || !(n.text || '').trim()) return;
    if (n.until && new Date(n.until + 'T23:59:59') < new Date()) return;
    const bar = document.createElement('div'); bar.className = 'notice'; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Shop notice');
    const p = document.createElement('p');
    const paint = () => { const l = LM.lang || 'en'; p.textContent = (l !== 'en' && (n[l] || '').trim()) ? n[l] : n.text; };
    paint(); document.addEventListener('lm:lang', paint);
    bar.append(p); document.body.classList.add('has-notice');
    document.body.prepend(bar);
  }).catch(() => {});
  LM.testNotice = t => { const b = document.createElement('div'); b.className = 'notice'; b.innerHTML = '<p></p>'; b.querySelector('p').textContent = t; document.body.classList.add('has-notice'); document.body.prepend(b); };
})();

/* ---- R79: "Find anything" search (Ctrl/⌘+K or "/" on computers, and in the Tools menu): tools, sections, FAQ answers and quick actions ---- */
(() => {
  const ACT = [
    ['Call the shop: 508-853-3322', 'tel:+15088533322', 'Action'], ['Text to book: 304-806-6047', sms(SHOP.text, "Hi, I'd like to book an appointment at L&M Tire."), 'Action'],
    ['Português: 774-288-9675', 'tel:+17742889675', 'Action'], ['Directions to 598 West Boylston St', 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent('598 West Boylston Street, Worcester, MA 01606'), 'Action']
  ];
  const SEC = [...document.querySelectorAll('main section[id]')].filter(s => !s.hidden && s.id !== 'top').map(s => { const h = s.querySelector('h2'); return [(h ? (h.querySelector('.sr') || h).textContent : s.id).trim(), '#' + s.id, 'Section', (s.querySelector('.kicker') || {}).textContent || '']; });
  const FAQ = [...document.querySelectorAll('.faq-list details')].map((d, i) => [d.querySelector('summary').textContent.trim(), '#faq', 'Question', d.querySelector('.ans').textContent, i]);
  const ALL = [...ACT, ...SEC, ...FAQ];
  const dlg = document.createElement('div'); dlg.className = 'cmdk'; dlg.hidden = true; dlg.setAttribute('role', 'dialog'); dlg.setAttribute('aria-modal', 'true'); dlg.setAttribute('aria-label', 'Find anything');
  dlg.innerHTML = '<div class="cmdk-box"><label class="sr" for="cmdkQ">Find anything</label><input id="cmdkQ" type="search" placeholder="Find anything: brakes, winter tires, hours…" autocomplete="off" role="combobox" aria-expanded="true" aria-controls="cmdkL"><ul id="cmdkL" role="listbox"></ul><p class="cmdk-hint">↑ ↓ to move · Enter to open · Esc to close</p></div>';
  document.body.appendChild(dlg);
  const q = dlg.querySelector('input'), ul = dlg.querySelector('ul'); let sel = 0, shown = [], last = null;
  const norm = t => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  function render(){
    const v = norm(q.value.trim());
    shown = (v ? ALL.filter(a => v.split(/\s+/).every(w => norm(a[0] + ' ' + (a[3] || '')).includes(w))) : ALL.slice(0, 9)).slice(0, 9);
    sel = Math.min(sel, Math.max(0, shown.length - 1));
    ul.innerHTML = shown.length ? shown.map((a, i) => `<li role="option" id="ck${i}" aria-selected="${i === sel}"><span class="ck-t"></span><span class="ck-k">${a[2]}</span></li>`).join('') : '<li class="ck-none">Nothing found. Try "tires" or "oil".</li>';
    ul.querySelectorAll('.ck-t').forEach((s, i) => s.textContent = shown[i][0]);
    q.setAttribute('aria-activedescendant', shown.length ? 'ck' + sel : '');
  }
  function pick(a){
    close();
    if (!a) return;
    if (a[1].startsWith('#')) { const el = $(a[1]); if (el) el.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth' }); if (a[2] === 'Question') { const d = $$('.faq-list details')[a[4]]; if (d) d.open = true; } }
    else location.href = a[1];
  }
  function open(){ last = document.activeElement; dlg.hidden = false; q.value = ''; sel = 0; render(); requestAnimationFrame(() => { dlg.classList.add('in'); q.focus(); }); }
  function close(){ if (dlg.hidden) return; dlg.classList.remove('in'); dlg.hidden = true; if (last && last.focus) last.focus(); }
  LM.find = open;
  q.addEventListener('input', () => { sel = 0; render(); });
  q.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(shown.length - 1, sel + 1); render(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); render(); }
    else if (e.key === 'Enter') { e.preventDefault(); pick(shown[sel]); }
    else if (e.key === 'Escape') close();
  });
  ul.addEventListener('click', e => { const li = e.target.closest('li[role=option]'); if (li) pick(shown[[...ul.children].indexOf(li)]); });
  dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
  document.addEventListener('keydown', e => {
    const typing = /INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '');
    if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing)) { e.preventDefault(); dlg.hidden ? open() : close(); }
  });
  const tm = $('#toolsMenu'); if (tm) tm.insertAdjacentHTML('afterbegin', '<a href="#" class="tm-find"><b>Find anything</b><span>Search the whole site (Ctrl+K)</span></a>');
  const tf = $('.tm-find'); if (tf) tf.addEventListener('click', e => { e.preventDefault(); open(); });
  const mm = $('#mMenu nav'); if (mm) { const b = document.createElement('a'); b.href = '#'; b.textContent = 'Find anything…'; b.style.setProperty('--i', 0); b.addEventListener('click', e => { e.preventDefault(); setTimeout(open, 350); }); mm.prepend(b); }
})();

/* ---- R80: morning or afternoon? the day step now asks the time too (Saturday is mornings only) ---- */
(() => {
  const form = $('#bookForm'), day = $('#f-day'); if (!form || !day) return;
  const s2 = form.querySelectorAll('.wz-step')[1]; if (!s2) return;
  const fs = document.createElement('fieldset'); fs.className = 'chips tod';
  fs.innerHTML = '<legend>Best time?</legend><label><input type="radio" name="tod" value="" checked><span>Any time</span></label><label><input type="radio" name="tod" value="morning"><span>Morning</span></label><label><input type="radio" name="tod" value="afternoon"><span>Afternoon</span></label>';
  const note = s2.querySelector('.form-note'); note ? note.before(fs) : s2.appendChild(fs);
  const aft = fs.querySelector('input[value="afternoon"]');
  const sync = () => { const sat = day.value === 'Saturday'; aft.disabled = sat; aft.closest('label').classList.toggle('past', sat); if (sat && aft.checked) fs.querySelector('input[value=""]').checked = true; };
  form.addEventListener('change', sync); sync();
  const tod = () => (fs.querySelector('input:checked') || {}).value || '';
  form.addEventListener('submit', () => {
    const t = tod(); if (!t) return;
    const prev = day.value, v = prev + ', ' + t, o = new Option(v, v, true, true);
    day.appendChild(o); day.value = v; setTimeout(() => { day.value = prev; o.remove(); }, 0);
  }, true);
  const pv = () => { const b = $('.sms-bubble'); if (!b) return; const t = tod(); b.textContent = b.textContent.replace(/((Best day|Día|Dia): [^\n,]*)(, (morning|afternoon))?/, (m, a) => a + (t ? ', ' + t : '')); };
  form.addEventListener('change', () => setTimeout(pv, 10)); form.addEventListener('click', () => setTimeout(pv, 15));
})();

/* ---- R81: the scrolling hero's questions become doors: "Flat? Bald? Snow?" each opens its tool ---- */
(() => {
  const col = $('.b2 .col'); if (!col) return;
  const row = document.createElement('div'); row.className = 'b2-doors';
  [['Flat tire', '#patch'], ['Bald tread', '#tread'], ['Snow coming', '#winter']].filter(d => { const el = $(d[1]); return el && !el.hidden; })
    .forEach(([t, h]) => { const a = document.createElement('a'); a.href = h; a.textContent = t + ' →'; row.appendChild(a); });
  col.appendChild(row);
})();

/* ---- R82: tap "Rotate" and watch four worn tires swap places on a top-down car, so rotation makes sense at a glance ---- */
(() => {
  const tip = $$('.tip')[1]; if (!tip) return;
  const box = document.createElement('div'); box.className = 'rot';
  box.innerHTML = `<svg viewBox="0 0 120 150" aria-hidden="true"><rect x="32" y="12" width="56" height="126" rx="22" class="rot-car"/><rect x="40" y="34" width="40" height="26" rx="6" class="rot-glass"/><rect x="40" y="96" width="40" height="18" rx="5" class="rot-glass"/>
    <g class="rot-t" data-p="0"><rect x="-8" y="-14" width="16" height="28" rx="5"/></g><g class="rot-t" data-p="1"><rect x="-8" y="-14" width="16" height="28" rx="5"/></g><g class="rot-t" data-p="2"><rect x="-8" y="-14" width="16" height="28" rx="5"/></g><g class="rot-t" data-p="3"><rect x="-8" y="-14" width="16" height="28" rx="5"/></g></svg>
    <button type="button" class="btn btn-ghost btn-sm rot-go">Rotate</button><span class="sr" aria-live="polite"></span>`;
  tip.querySelector('p').after(box);
  const POS = [[26, 38], [94, 38], [26, 112], [94, 112]]; // front-left, front-right, rear-left, rear-right
  const WEAR = ['#e8333b', '#e8333b', '#8a90ff', '#8a90ff']; // front tires wear faster on many cars
  const tires = [...box.querySelectorAll('.rot-t')]; let state = [0, 1, 2, 3];
  tires.forEach((t, i) => t.querySelector('rect').style.fill = WEAR[i]);
  const place = () => tires.forEach((t, i) => { const p = POS[state[i]]; t.style.transform = `translate(${p[0]}px,${p[1]}px)`; });
  place();
  box.querySelector('.rot-go').addEventListener('click', () => {
    // a common pattern: fronts go straight back, rears cross to the front
    state = state.map(p => ({ 0: 2, 1: 3, 2: 1, 3: 0 })[p]); place();
    box.querySelector('.sr').textContent = 'Front tires moved to the back, back tires crossed to the front.';
  });
})();

/* ---- R83: four more real answers in the FAQ (Saturday, texting, where, since when), in all three languages ---- */
(() => {
  const X = {
    sat: [['Vocês abrem no sábado?', 'Sim. Sábado das 8h às 12h. Fechamos no domingo.'], ['¿Abren el sábado?', 'Sí. Sábado de 8 AM a 12 PM. Cerramos el domingo.']],
    text: [['Posso mandar mensagem em vez de ligar?', 'Sim. Em português, mande mensagem para <a href="sms:+17742889675">774-288-9675</a>. Em inglês ou espanhol, <a href="sms:+13048066047">304-806-6047</a>.'], ['¿Puedo mandar un texto en vez de llamar?', 'Sí. Mande un texto al <a href="sms:+13048066047">304-806-6047</a> para reservar, en inglés o español.']],
    where: [['Onde vocês ficam?', '598 West Boylston Street, Worcester, MA 01606. <a href="#visit">Veja o mapa e como chegar</a>.'], ['¿Dónde están?', '598 West Boylston Street, Worcester, MA 01606. <a href="#visit">Vea el mapa y cómo llegar</a>.']],
    since: [['Há quanto tempo vocês estão abertos?', 'Abrimos na West Boylston Street em 2013.'], ['¿Desde cuándo están abiertos?', 'Abrimos en West Boylston Street en 2013.']]
  };
  const dets = $$('.faq-list details[data-x]');
  function apply(l){
    const k = l === 'pt' ? 0 : 1;
    dets.forEach(d => {
      const tr = X[d.dataset.x]; if (!tr) return;
      const s = d.querySelector('summary'), a = d.querySelector('.ans'), pm = s.querySelector('.pm');
      if (d.dataset.enq === undefined) { d.dataset.enq = s.firstChild.textContent; d.dataset.ena = a.innerHTML; }
      s.firstChild.textContent = l === 'en' ? d.dataset.enq : tr[k][0]; a.innerHTML = l === 'en' ? d.dataset.ena : tr[k][1];
      if (pm && s.lastElementChild !== pm) s.appendChild(pm);
    });
  }
  document.addEventListener('lm:lang', e => apply(e.detail));
  if (LM.lang && LM.lang !== 'en') apply(LM.lang);
})();

/* ---- R84: section dividers become tire tracks that lay themselves down as you scroll ---- */
(() => { if (window.LM_CALM) return; // calm version: turned off
  $$('.tread').forEach(t => {
    if (t.querySelector('.tracks')) return;
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 1200 30'); s.setAttribute('preserveAspectRatio', 'none'); s.setAttribute('aria-hidden', 'true'); s.classList.add('tracks');
    s.innerHTML = '<path d="M0 9 C300 3 500 15 800 8 S1100 4 1200 9" pathLength="1"/><path d="M0 22 C300 16 500 28 800 21 S1100 17 1200 22" pathLength="1"/>';
    t.appendChild(s);
  });
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('laid'); io.unobserve(e.target); } }), { threshold: .6 });
  $$('.tread').forEach(t => io.observe(t));
})();

/* ---- R85: in Português, the header and phone-bar call buttons dial Leo's Portuguese line directly (the hero "Call Now" stays on the shop line) ---- */
(() => {
  const targets = $$('.top .actions .btn-red[href^="tel:"], .bar [data-cta="call"], .m-cta .btn-red');
  targets.forEach(a => { a.dataset.telEn = a.getAttribute('href'); });
  document.addEventListener('lm:lang', e => {
    const pt = e.detail === 'pt';
    targets.forEach(a => { a.setAttribute('href', pt ? 'tel:+17742889675' : a.dataset.telEn); a.setAttribute('aria-label', pt ? 'Ligar em português: 774-288-9675' : (a.textContent.trim() || 'Call the shop') + ': 508-853-3322'); });
  });
  if (LM.lang === 'pt') document.dispatchEvent(new CustomEvent('lm:lang', { detail: 'pt' }));
})();

/* ---- R86: tire size comparer: will a different size fit the same? diameter change and what your speedometer would read ---- */
(() => {
  const anchor = $('.qf') || $('#sizeForm'); if (!anchor) return;
  const box = document.createElement('details'); box.className = 'cmp';
  box.innerHTML = `<summary>Thinking about a different size? Compare two sizes</summary>
    <div class="cmp-in"><div class="cmp-row"><label>Now <input id="cmpA" placeholder="205/55R16" autocomplete="off"></label><span aria-hidden="true">→</span><label>New <input id="cmpB" placeholder="215/50R17" autocomplete="off"></label></div>
    <div class="cmp-vis" aria-hidden="true"><i class="ca"></i><i class="cb"></i></div>
    <p class="cmp-out" aria-live="polite">Type both sizes to compare.</p>
    <a class="btn btn-ghost btn-sm cmp-ask" href="#" hidden>Ask us if it fits your car</a></div>`;
  anchor.after(box);
  const p = v => { const m = String(v).toUpperCase().replace(/\s+/g, '').match(/^P?(\d{3})\/?(\d{2})Z?R?F?(\d{2})/); return m ? { w: +m[1], a: +m[2], r: +m[3], d: +m[3] + 2 * (+m[1] * +m[2] / 100) / 25.4, s: `${m[1]}/${m[2]}R${m[3]}` } : null; };
  const A = $('#cmpA'), B = $('#cmpB'), out = box.querySelector('.cmp-out'), ask = box.querySelector('.cmp-ask'), ca = box.querySelector('.ca'), cb = box.querySelector('.cb');
  function upd(){
    const a = p(A.value), b = p(B.value);
    if (!a || !b) { out.textContent = 'Type both sizes to compare.'; ask.hidden = true; return; }
    const diff = (b.d - a.d) / a.d * 100, sp = 60 * b.d / a.d;
    const max = Math.max(a.d, b.d); ca.style.setProperty('--s', a.d / max); cb.style.setProperty('--s', b.d / max);
    out.innerHTML = `<b>${a.s}</b> is ${a.d.toFixed(1)}" tall, <b>${b.s}</b> is ${b.d.toFixed(1)}" tall: <b class="${Math.abs(diff) > 3 ? 'warn' : 'ok'}">${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%</b>. At a real 60 mph your speedometer would show about <b>${(60 * 60 / sp).toFixed(1)} mph</b>. ${Math.abs(diff) <= 3 ? 'Within about 3%, which is usually called a close match.' : 'More than 3% apart, so ask us before you switch.'}`;
    ask.hidden = false; ask.href = sms(SHOP.text, `Hi L&M Tire, my tires are ${a.s}. Would ${b.s} work on my car? My car is: `);
  }
  A.addEventListener('input', upd); B.addEventListener('input', upd);
})();

/* ---- R87: a small burst of red, blue and white confetti when a booking text is ready (skipped for reduced motion) ---- */
(() => { if (window.LM_CALM) return; // calm version: turned off
  const form = $('#bookForm'); if (!form) return;
  function burst(){
    if (reduced()) return;
    const host = $('#sent') || form; const r = host.getBoundingClientRect();
    const c = document.createElement('canvas'); c.className = 'confetti'; c.width = innerWidth; c.height = innerHeight; c.setAttribute('aria-hidden', 'true'); document.body.appendChild(c);
    const g = c.getContext('2d'), COLORS = ['#e8333b', '#8a90ff', '#f3f2f6', '#3b3f9e'];
    const P = Array.from({ length: 90 }, () => ({ x: r.left + r.width / 2, y: r.top + 80, vx: (Math.random() - .5) * 12, vy: -Math.random() * 11 - 4, s: 4 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - .5) * .3, c: COLORS[Math.random() * 4 | 0] }));
    let t0 = performance.now();
    (function f(now){
      const t = now - t0; g.clearRect(0, 0, c.width, c.height);
      P.forEach(p => { p.vy += .35; p.x += p.vx; p.y += p.vy; p.r += p.vr; g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.globalAlpha = Math.max(0, 1 - t / 1800); g.fillStyle = p.c; g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); g.restore(); });
      if (t < 1800) requestAnimationFrame(f); else c.remove();
    })(t0);
  }
  form.addEventListener('submit', () => { if ($('#f-name').value.trim()) setTimeout(burst, 60); });
})();

/* ---- R90: when the shop is open, every Call button wears a live green "Open" badge; when closed, Text buttons get a "Book now" badge ---- */
(() => { if (window.LM_CALM) return; // calm version: turned off
  const calls = $$('a.btn[href^="tel:"]'), texts = $$('a.btn[href^="sms:"], .bar [data-cta="book"]');
  const add = (el, cls, t) => { let b = el.querySelector('.live-badge'); if (!b) { b = document.createElement('span'); b.className = 'live-badge'; b.setAttribute('aria-hidden', 'true'); el.appendChild(b); } b.className = 'live-badge ' + cls; b.textContent = t; };
  const del = el => { const b = el.querySelector('.live-badge'); if (b) b.remove(); };
  function paint(){
    const s = LM.shopState(), l = LM.lang || 'en';
    const OPEN = { en: 'Open', pt: 'Aberto', es: 'Abierto' }[l], NOW = { en: 'Book now', pt: 'Agende', es: 'Reserve' }[l];
    calls.forEach(c => s.open ? add(c, 'open', OPEN) : del(c));
    texts.forEach(t => (!s.open && t.matches('[data-cta="book"]')) ? add(t, 'closed', NOW) : del(t));
  }
  paint(); document.addEventListener('lm:state', paint); document.addEventListener('lm:lang', () => setTimeout(paint, 0));
})();

/* ---- R91: the floating "Text us" button reads the room: its label and ready-made text change with the section you're looking at ---- */
(() => { if (window.LM_CALM) return; // calm version: turned off
  const fab = $('#qrFab'); if (!fab) return;
  const lab = fab.querySelector('span'); const base = lab.textContent;
  const CTX = {
    size: ['Text my tire size', 'Hi L&M Tire, can I get a tire quote? My size is: '],
    patch: ['Text about my flat', 'Hi L&M Tire, I have a flat tire. Can you take a look?'],
    tread: ['Text for a tire check', 'Hi L&M Tire, my tread looks low. Can I book a tire check?'],
    winter: ['Text for winter tires', 'Hi L&M Tire, I need winter tires. My size is: '],
    oil: ['Text to book oil', 'Hi L&M Tire, I would like to book an oil change.'],
    symptoms: ['Describe the problem', 'Hi L&M Tire, my car is doing this: '],
    pick: ['Text for a tire quote', 'Hi L&M Tire, I need tires. My size is: ']
  };
  let cur = null;
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) { if (cur === e.target.id) set(null); return; }
    set(e.target.id);
  }), { rootMargin: '-40% 0px -40% 0px' });
  Object.keys(CTX).forEach(id => { const el = document.getElementById(id); if (el) io.observe(el); });
  function set(id){
    cur = id; const c = CTX[id];
    if ((LM.lang || 'en') !== 'en' || !c) { fab.classList.remove('ctx'); lab.textContent = (LM.lang && LM.lang !== 'en') ? lab.textContent : base; fab.onclick = null; return; }
    lab.textContent = c[0]; fab.classList.add('ctx');
  }
  // in a tool section, tapping the button sends straight to the matching text instead of opening the menu
  fab.addEventListener('click', e => { if (cur && CTX[cur] && fab.classList.contains('ctx')) { e.stopImmediatePropagation(); location.href = sms(SHOP.text, CTX[cur][1]); } }, true);
})();

/* ---- R92: holiday closures: dates listed in assets/notice.json ("closed_dates") make the live clock, buttons and day picker say closed ---- */
(() => {
  if (location.protocol === 'file:') return;
  fetch('assets/notice.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).then(n => {
    const list = (n && Array.isArray(n.closed_dates)) ? n.closed_dates.filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)) : [];
    if (!list.length) return;
    list.forEach(d => LM.closedDates.add(d));
    LM.refreshState && LM.refreshState();
    const s = LM.shopState();
    if (s.holiday) {
      const note = $('.b1 .closed-note'); if (note) note.hidden = false;
      document.body.classList.add('is-closed'); document.body.classList.remove('is-open');
    }
  }).catch(() => {});
})();

/* ---- R93: language sweep 4: tool answers (symptoms, patch, chooser) and booking chips now appear in Português / Español ---- */
(() => {
  const T = {
    'Brakes': ['Freios', 'Frenos'],
    'Grinding or squealing when you stop usually means the brakes need a look. It is safer to check it soon.': ['Rangido ou chiado ao frear geralmente quer dizer que os freios precisam de uma olhada. É mais seguro verificar logo.', 'Si rechina o chirría al frenar, normalmente hay que revisar los frenos. Es más seguro revisarlos pronto.'],
    'Tire balancing': ['Balanceamento', 'Balanceo'],
    'A shake at higher speeds is often a wheel that needs balancing. We can check the tires and balance them.': ['Tremor em velocidade alta muitas vezes é roda precisando de balanceamento. Podemos verificar e balancear.', 'Una vibración a más velocidad muchas veces es una rueda que necesita balanceo. Podemos revisar y balancear.'],
    'Suspension & steering': ['Suspensão e direção', 'Suspensión y dirección'],
    'Clunks over bumps or loose steering point to parts under the car. We work on suspension and steering.': ['Batidas nos buracos ou direção solta indicam peças embaixo do carro. Trabalhamos com suspensão e direção.', 'Golpes en los baches o dirección floja apuntan a piezas debajo del carro. Trabajamos en suspensión y dirección.'],
    'Check engine light': ['Luz de injeção (check engine)', 'Luz de check engine'],
    'A warning light is the car telling you something. Bring it in and we will check what the light means.': ['A luz de aviso é o carro dizendo algo. Traga o carro e verificamos o que a luz quer dizer.', 'La luz de aviso es el carro diciéndole algo. Tráigalo y revisamos qué significa.'],
    'Flat tire repair: plugs and patches': ['Conserto de pneu furado: tarugo e remendo', 'Reparación de ponchaduras: tapones y parches'],
    'A tire that keeps losing air may have a puncture. We do plugs and patches. Bring it in and we will check which one fits, or if it needs a new tire.': ['Um pneu que sempre perde ar pode estar furado. Fazemos tarugo e remendo. Traga e verificamos qual serve, ou se precisa de pneu novo.', 'Una llanta que pierde aire puede estar ponchada. Hacemos tapones y parches. Tráigala y revisamos cuál sirve, o si necesita llanta nueva.'],
    'Wheel alignment': ['Alinhamento', 'Alineación'],
    'A car that pulls to one side, a steering wheel that sits off-center, or tires wearing on one edge often point to wheel alignment. We do alignments.': ['Carro puxando para um lado, volante torto ou pneus gastando de um lado só geralmente indicam alinhamento. Fazemos alinhamento.', 'Un carro que se jala a un lado, el volante chueco o llantas gastadas de un lado suelen indicar alineación. Hacemos alineaciones.'],
    'New, used or winter tires': ['Pneus novos, usados ou de inverno', 'Llantas nuevas, usadas o de invierno'],
    'Thin tread grips less, most of all on wet and snowy roads. We sell new, used and winter tires.': ['Pneu gasto segura menos, principalmente na chuva e na neve. Vendemos pneus novos, usados e de inverno.', 'Una llanta gastada agarra menos, sobre todo con lluvia y nieve. Vendemos llantas nuevas, usadas y de invierno.'],
    'Oil change': ['Troca de óleo', 'Cambio de aceite'],
    'Keeping up with oil changes keeps the engine healthy. Text us to pick a time.': ['Trocar o óleo em dia mantém o motor saudável. Mande mensagem para escolher um horário.', 'Cambiar el aceite a tiempo mantiene el motor sano. Mándenos un texto para escoger una hora.'],
    'Tell us about it': ['Conte para nós', 'Cuéntenos'],
    'Describe what you hear, feel or see. A short text is enough, and we will tell you if it is something we fix.': ['Descreva o que você ouve, sente ou vê. Uma mensagem curta basta, e dizemos se é algo que consertamos.', 'Describa lo que oye, siente o ve. Un texto corto basta, y le decimos si es algo que arreglamos.'],
    'Often a plug or a patch': ['Muitas vezes tarugo ou remendo', 'Muchas veces tapón o parche'],
    'A small nail or screw in the middle of the tread can often be repaired. A plug works well here and is much quicker. A patch is also available. We check the tire first and tell you which one fits.': ['Um prego ou parafuso pequeno no meio da banda de rodagem muitas vezes tem conserto. O tarugo funciona bem aqui e é bem mais rápido. O remendo também está disponível. Verificamos o pneu antes e dizemos qual serve.', 'Un clavo o tornillo pequeño en el centro de la banda muchas veces tiene arreglo. El tapón funciona bien aquí y es mucho más rápido. También hay parche. Revisamos la llanta primero y le decimos cuál sirve.'],
    'Needs a closer look': ['Precisa de uma olhada de perto', 'Hay que verla de cerca'],
    'The edge of the tread flexes a lot, so a plug or patch may not be safe there. Bring it in and we will check whether it can be repaired or needs a new tire.': ['A borda da banda de rodagem flexiona muito, então tarugo ou remendo pode não ser seguro ali. Traga e verificamos se dá para consertar ou se precisa de pneu novo.', 'El borde de la banda se flexiona mucho, así que un tapón o parche puede no ser seguro ahí. Tráigala y revisamos si se puede reparar o si necesita llanta nueva.'],
    'A new tire': ['Pneu novo', 'Llanta nueva'],
    'Sidewall damage means a new tire: plugs and patches are not safe in the sidewall. We sell new and used tires and can help you pick one.': ['Dano na lateral quer dizer pneu novo: tarugo e remendo não são seguros na lateral. Vendemos pneus novos e usados e ajudamos você a escolher.', 'Un daño en el costado significa llanta nueva: los tapones y parches no son seguros en el costado. Vendemos llantas nuevas y usadas y le ayudamos a escoger.'],
    'Winter tires': ['Pneus de inverno', 'Llantas de invierno'], 'Used tires': ['Pneus usados', 'Llantas usadas'], 'New tires': ['Pneus novos', 'Llantas nuevas'],
    'New or used, we can show you both': ['Novo ou usado: mostramos os dois', 'Nuevas o usadas: le mostramos ambas'],
    'Installation & balancing': ['Montagem e balanceamento', 'Montaje y balanceo'], 'Tire rotation': ['Rodízio de pneus', 'Rotación de llantas'], 'Something else': ['Outra coisa', 'Otra cosa'],
    'Any day': ['Qualquer dia', 'Cualquier día'], 'Monday': ['Segunda', 'Lunes'], 'Tuesday': ['Terça', 'Martes'], 'Wednesday': ['Quarta', 'Miércoles'], 'Thursday': ['Quinta', 'Jueves'], 'Friday': ['Sexta', 'Viernes'], 'Saturday': ['Sábado', 'Sábado'],
    'Any time': ['Qualquer hora', 'Cualquier hora'], 'Morning': ['Manhã', 'Mañana'], 'Afternoon': ['Tarde', 'Tarde'],
    'Sounds like': ['Parece ser', 'Parece ser'], 'Our tip': ['Nossa dica', 'Nuestro consejo']
  };
  const REV = {}; Object.entries(T).forEach(([en, tr]) => { REV[tr[0]] = en; REV[tr[1]] = en; });
  const targets = () => $$('.symp-svc, .symp-why, .patch-res h3, .patch-res > p, .quiz-res h3, .symp-res .kicker, .quiz-res .kicker, #bookForm .wz-chips span, #bookForm .wz-chips span b, .tod span');
  let busy = false;
  function apply(){
    if (busy) return; busy = true;
    const l = LM.lang || 'en', k = l === 'pt' ? 0 : 1;
    targets().forEach(el => {
      if (el.children.length && !el.matches('b')) { const b = el.querySelector(':scope > b'); if (b) return; }
      const txt = el.textContent.trim(); const en = REV[txt] || txt;
      const want = l === 'en' ? en : (T[en] ? T[en][k] : txt);
      if (want !== txt) el.textContent = want;
    });
    busy = false;
  }
  document.addEventListener('lm:lang', () => setTimeout(apply, 0));
  const mo = new MutationObserver(() => { if ((LM.lang || 'en') !== 'en') apply(); });
  ['.symp-res', '.patch-res', '.quiz-res', '#bookForm .wz-steps', '#bookForm'].forEach(s => { const el = $(s); if (el) mo.observe(el, { childList: true, subtree: true, characterData: true }); });
  if (LM.lang && LM.lang !== 'en') apply();
})();

/* ---- R94: last English bits on phones now follow the language too: the phone bar status line, My visit, Hear it, Add to my visit, Send us a photo ---- */
(() => {
  const line = $('.bar-line');
  const DN = { pt: ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'], es: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'] };
  function bar(){
    if (!line) return; const l = LM.lang || 'en'; if (l === 'en') return;
    const s = LM.shopState(), h = m => Math.floor(m / 60) + 'h';
    const lab = s.opensLabel === 'today' ? { pt: 'hoje', es: 'hoy' }[l] : s.opensLabel === 'tomorrow' ? { pt: 'amanhã', es: 'mañana' }[l] : DN[l][s.nextDay];
    line.innerHTML = s.open ? `<i class="on"></i>${{ pt: 'Aberto · até ', es: 'Abierto · hasta ' }[l]}${h(s.closeAt)}` : `<i></i>${{ pt: 'Fechado · abre ', es: 'Cerrado · abre ' }[l]}${lab} ${h(s.openAt)}`;
  }
  const D = {
    '.visit-tab span': ['Minha visita', 'Mi visita'], '.visit-panel .mono': ['Minha visita', 'Mi visita'], '.visit-send': ['Mandar tudo por mensagem', 'Mandar todo por texto'], '.visit-clear': ['Limpar lista', 'Borrar lista'],
    '.add-visit': ['<span aria-hidden="true">+</span> Adicionar à minha visita', '<span aria-hidden="true">+</span> Agregar a mi visita'],
    '.photo-btn span': ['Mande uma foto', 'Mándenos una foto'], '.snd .mono': ['Ouça', 'Escuche'], '.snd-note': ['Parece com o seu carro? Toque no problema acima. Gravações reais e curtas, em volume baixo.', '¿Suena como su carro? Toque el problema de arriba. Grabaciones reales y cortas, a volumen bajo.'], '.snd-row [data-s="squeal"] .snd-l': ['Chiado', 'Chillido'], '.snd-row [data-s="grind"] .snd-l': ['Rangido', 'Rechinido'], '.snd-row [data-s="clunk"] .snd-l': ['Batida', 'Golpe'],
    '.symp-text': ['Mande mensagem sobre isso', 'Mándenos un texto sobre esto'], '.symp-book': ['Agende em 4 toques', 'Reserve en 4 toques']
  };
  function apply(l){ const k = l === 'pt' ? 0 : 1; Object.entries(D).forEach(([sel, tr]) => $$(sel).forEach(el => { if (el.dataset.en94 === undefined) el.dataset.en94 = el.innerHTML; el.innerHTML = l === 'en' ? el.dataset.en94 : tr[k]; })); bar(); if (l === 'en') document.dispatchEvent(new CustomEvent('lm:state', { detail: LM.shopState() })); }
  document.addEventListener('lm:lang', e => setTimeout(() => apply(e.detail), 0));
  document.addEventListener('lm:state', () => setTimeout(bar, 0));
  if (LM.lang && LM.lang !== 'en') apply(LM.lang);
})();

/* ---- R95: every tool has a "Share this tool" link (handy for Cid and Leo to text a customer the penny test, tire quote or oil reminder) ---- */
(() => {
  const IDS = ['pick', 'symptoms', 'size', 'patch', 'tread', 'winter', 'oil', 'tips', 'book'];
  IDS.forEach(id => {
    const sec = document.getElementById(id); if (!sec || sec.hidden) return;
    const k = sec.querySelector('.kicker'); if (!k) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'tool-link'; b.title = 'Share this tool';
    b.setAttribute('aria-label', 'Share a link to this tool');
    b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>';
    b.addEventListener('click', async () => {
      const u = new URL(location.href); u.hash = id; const url = u.toString();
      const title = ((sec.querySelector('h2 .sr') || sec.querySelector('h2') || {}).textContent || 'L&M Tire').trim();
      if (navigator.share && matchMedia('(pointer: coarse)').matches) { try { await navigator.share({ title: title + ' | L&M Tire', url }); } catch (e) {} return; }
      try { await navigator.clipboard.writeText(url); LM.toast && LM.toast('Link to this tool copied. Paste it in a text to a customer.'); } catch (e) { LM.toast && LM.toast('Link: <b>' + url + '</b>', 8000); }
    });
    k.after(b);
  });
  // opening the site with #tread etc. lands on the tool after everything has loaded
  if (location.hash && IDS.includes(location.hash.slice(1))) setTimeout(() => { const el = document.getElementById(location.hash.slice(1)); if (el) el.scrollIntoView({ block: 'start' }); }, 600);
})();

/* ---- R97: "Will we still be open when you get here?" added to the How-far-am-I answer ---- */
(() => {
  const out = $('.far-out'); if (!out) return;
  const mo = new MutationObserver(() => {
    const m = out.textContent.match(/Roughly (\d+) minutes/); if (!m || out.querySelector('.arrive')) return;
    const mins = +m[1], s = LM.shopState(), now = s.now.mins, arrive = now + mins;
    const p = document.createElement('span'); p.className = 'arrive';
    if (s.open && arrive < s.closeAt - 10) p.innerHTML = ` <b class="ok">You'd get here around ${LM.fmt(arrive)}, while we're open.</b> <a href="tel:+15088533322">Call ahead</a>`;
    else if (s.open) p.innerHTML = ` <b class="warn">You'd get here around ${LM.fmt(Math.min(arrive, 1439))}, close to or after closing (${LM.fmt(s.closeAt)}).</b> <a href="tel:+15088533322">Call first</a> or <a href="${sms(SHOP.text, 'Hi L&M Tire, I would like to book a time.')}">text to book</a>.`;
    else p.innerHTML = ` <b class="warn">We're closed now and open ${s.opensLabel} at ${LM.fmt(s.openAt)}.</b> <a href="${sms(SHOP.text, 'Hi L&M Tire, I would like to book a time.')}">Text to book</a>.`;
    out.appendChild(p);
  });
  mo.observe(out, { childList: true, characterData: true, subtree: true });
})();

/* ---- R98: Visit section reorganized: photo/map stays in view while you read, and "Who to call" moves up next to the address ---- */
(() => {
  const col = $('#visit .visit-grid > div:last-child'); if (!col) return;
  const contact = col.querySelector('.contact'), save = col.querySelector('.save-contact'), glove = col.querySelector('.glove-btn'), rev = col.querySelector('.reviews-link.in-visit');
  const far = col.querySelector('.far'), apps = col.querySelector('.nav-apps');
  const anchor = far || apps; if (!contact || !anchor) return;
  // contact card (with its buttons) goes right after the directions block
  anchor.after(contact);
  if (save) contact.appendChild(save);
  if (glove) contact.appendChild(glove);
  if (rev) contact.after(rev);
  $('#visit .photo') && $('#visit .photo').classList.add('stick');
})();

/* ---- R99: grow real reviews over time: after booking, and in the footer, customers are invited to leave a Google review ---- */
(() => {
  const url = 'https://g.page/r/CTVdw0UmvaHLEBM/review';
  const T = { en: ['After your visit, a Google review helps other drivers find us.', 'Leave a review'], pt: ['Depois da visita, uma avaliação no Google ajuda outros motoristas a nos encontrar.', 'Deixar avaliação'], es: ['Después de su visita, una reseña en Google ayuda a otros conductores a encontrarnos.', 'Dejar una reseña'] };
  const mk = () => { const p = document.createElement('p'); p.className = 'ask-review'; p.innerHTML = '<span></span> <a target="_blank" rel="noopener"></a>'; p.querySelector('a').href = url; return p; };
  const a = mk(), b = mk();
  const sent = $('#sent'); if (sent) { const again = sent.querySelector('#again'); again ? again.before(a) : sent.appendChild(a); }
  const fine = $('.fine'); if (fine) fine.before(b);
  const q = document.createElement('a'); q.className = 'review-qr'; q.href = url; q.target = '_blank'; q.rel = 'noopener';
  q.innerHTML = '<img src="assets/review-qr.svg" width="112" height="112" alt="QR code for the L&M Tire Google review page" loading="lazy"><span></span>';
  b.after(q);
  const QT = { en: 'Scan with your phone camera to leave a review', pt: 'Aponte a câmera do celular para avaliar', es: 'Escanee con la cámara del teléfono para dejar una reseña' };
  const paint = () => { const t = T[LM.lang || 'en'] || T.en; [a, b].forEach(p => { p.firstChild.textContent = t[0]; p.querySelector('a').textContent = t[1] + ' →'; }); const qs = q.querySelector('span'); if (qs) qs.textContent = QT[LM.lang || 'en'] || QT.en; };
  paint(); document.addEventListener('lm:lang', () => setTimeout(paint, 0));
})();


/* ==== Review fixes (after round 100) ==== */

/* RF1: one custom line-art icon set (sprite in index.html, ids "i-*"). Swap the leftover generic icons; drop the purely decorative ones. */
(() => {
  const icon = n => '<svg class="i" aria-hidden="true"><use href="#i-' + n + '"/></svg>';
  LM.icon = icon;
  const SWAP = { '.save-contact': 'contact', '.save-link': 'contact', '.map-btn': 'pin', '.bar-dir': 'pin', '.far-btn': 'locate', '.photo-btn': 'camera', '.glove-btn': 'print', '.faq-search': 'search', '.tool-link': 'link' };
  Object.entries(SWAP).forEach(([sel, n]) => $$(sel).forEach(el => { const s = el.querySelector(':scope > svg:not(.i)'); if (s) s.outerHTML = icon(n); }));
  $$('.share-btn > svg').forEach(s => s.remove());
})();

/* RF2: sound. Real recordings for squeal / grind / clunk, plus an optional calm ambient loop behind a header "Sound" toggle.
   On by default (starts on the first tap or key press, since browsers block sound before that), remembered on this device, pauses when the tab is hidden, ducks under the samples. */
(() => {
  const KEY = 'lm-sound';
  const AC = window.AudioContext || window.webkitAudioContext;
  let ctx = null, master = null, ambGain = null, on = false, ducked = false, waiting = false;
  const amb = new Audio(); amb.crossOrigin = 'anonymous'; amb.preload = 'none'; amb.loop = true; amb.src = 'assets/ambient-loop.mp3';
  const AMB_VOL = 0.25, DUCK_VOL = 0.05;
  const pending = [];
  function graph(){
    if (ctx || !AC) return ctx;
    try {
      ctx = new AC(); master = ctx.createGain(); master.connect(ctx.destination);
      ambGain = ctx.createGain(); ambGain.gain.value = 0; ambGain.connect(master);
      ctx.createMediaElementSource(amb).connect(ambGain);
      pending.splice(0).forEach(([el, v]) => wire(el, v));
    } catch (e) { ctx = null; }
    return ctx;
  }
  function wire(el, v){
    if (el._wired) return;
    if (!ctx) { el.volume = v; return; }
    try { const g = ctx.createGain(); g.gain.value = v; ctx.createMediaElementSource(el).connect(g); g.connect(master); el._wired = true; } catch (e) { el.volume = v; }
  }
  // volume ramp: Web Audio gain where we have it (works on iPhone), element volume as a fallback
  function ramp(to, ms){
    if (ctx && ambGain) { const t = ctx.currentTime; ambGain.gain.cancelScheduledValues(t); ambGain.gain.setValueAtTime(ambGain.gain.value, t); ambGain.gain.linearRampToValueAtTime(to, t + ms / 1000); return; }
    const from = amb.volume, t0 = performance.now();
    (function f(now){ const p = Math.min(1, (now - t0) / ms); amb.volume = Math.max(0, Math.min(1, from + (to - from) * p)); if (p < 1) requestAnimationFrame(f); })(t0);
  }
  const level = () => (ducked ? DUCK_VOL : AMB_VOL);
  function start(){
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    graph(); if (ctx && ctx.state === 'suspended') ctx.resume();
    if (!ctx) amb.volume = 0;
    const p = amb.play(); if (p && p.then) p.then(() => ramp(level(), 1200)).catch(() => {}); else ramp(level(), 1200);
  }
  function stop(){ ramp(0, 600); setTimeout(() => { if (!on || document.hidden) amb.pause(); }, 650); }
  const btns = [];
  const LBL = { en: ['Sound', 'Sound on', 'Sound off'], pt: ['Som', 'Som ligado', 'Som desligado'], es: ['Sonido', 'Sonido activado', 'Sonido apagado'] };
  function paint(){
    const t = LBL[LM.lang || 'en'] || LBL.en;
    btns.forEach(b => {
      b.setAttribute('aria-pressed', String(on));
      b.querySelector('use').setAttribute('href', on ? '#i-sound' : '#i-mute');
      b.querySelector('em').textContent = t[0];
      b.title = on ? t[1] : t[2];
      b.setAttribute('aria-label', t[0] + ': ' + (on ? t[1] : t[2]).toLowerCase());
    });
  }
  function set(v, user){
    on = v; try { localStorage.setItem(KEY, v ? '1' : '0'); } catch (e) {}
    paint();
    if (v && (user || !waiting)) start(); else if (!v) stop();
  }
  const mk = cls => { const b = document.createElement('button'); b.type = 'button'; b.className = 'snd-btn ' + cls; b.innerHTML = '<svg class="i" aria-hidden="true"><use href="#i-mute"/></svg><em>Sound</em>'; b.addEventListener('click', () => set(!on, true)); btns.push(b); return b; };
  const top = $('.top .easy-btn') || $('.lng'); if (top) top.after(mk('in-top'));
  const menuEasy = $('#mMenu .easy-btn'); if (menuEasy) menuEasy.after(mk('wide'));
  // remembered "on": wait for the visitor's first tap or key press on the page, never start by itself
  // Music is ON by default (Netto asked for it to play right away). Browsers block sound until the visitor
  // touches the page, so we try once on load and otherwise start on the first tap, click or key press.
  // A visitor who turns it off with the Sound button stays off on this device.
  let saved = false; try { saved = localStorage.getItem(KEY) === '1'; } catch (e) {} // calm version: music off until the visitor turns it on
  if (saved) {
    on = true; waiting = true; paint();
    const EV = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'];
    const go = e => { if (e && e.target && e.target.closest && e.target.closest('.snd-btn')) return; waiting = false; EV.forEach(t => removeEventListener(t, go, true)); if (on && !document.hidden) start(); };
    EV.forEach(t => addEventListener(t, go, true));
    try { const p = amb.play(); if (p && p.then) p.then(() => { if (!waiting) return; waiting = false; EV.forEach(t => removeEventListener(t, go, true)); amb.pause(); start(); }).catch(() => {}); } catch (e) {}
  } else paint();
  document.addEventListener('visibilitychange', () => { if (document.hidden) { if (!amb.paused) { ramp(0, 200); setTimeout(() => amb.pause(), 220); } } else if (on && !waiting) start(); });
  document.addEventListener('lm:lang', () => setTimeout(paint, 0));
  LM.sound = {
    attach(el, v){ if (graph()) wire(el, v); else pending.push([el, v]) && (el.volume = v); },
    duck(d){ ducked = d; if (on && !amb.paused) ramp(level(), d ? 250 : 900); }
  };
})();

/* RF3: penny test: the real 2013 Lincoln cent drops head-first into the groove when the card comes into view, and presses in a little each time the depth changes */
(() => {
  const card = $('.td-card'), pen = $('.td-penny'), r = $('#tdRange'); if (!card || !pen) return;
  if (reduced()) { pen.classList.add('down'); return; }
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { setTimeout(() => pen.classList.add('down'), 250); io.disconnect(); } }), { threshold: .45 });
  io.observe(card);
  if (r) r.addEventListener('input', () => { pen.classList.remove('press'); void pen.getBoundingClientRect(); pen.classList.add('press'); });
})();

/* RF4: Português / Español for the services list, marquee, service dial, patch tool, sound buttons and the other new bits */
(() => {
  const SV = {
    'Tires': ['Pneus', 'Llantas'], 'Repairs': ['Reparos', 'Reparaciones'],
    'New tires': ['Pneus novos', 'Llantas nuevas'], 'Used tires': ['Pneus usados', 'Llantas usadas'], 'Winter tires': ['Pneus de inverno', 'Llantas de invierno'],
    'Installation & balancing': ['Montagem e balanceamento', 'Montaje y balanceo'], 'Flat tire repair: plugs and patches': ['Conserto de pneu furado: tarugo e remendo', 'Reparación de ponchaduras: tapones y parches'],
    'Tire rotation': ['Rodízio de pneus', 'Rotación de llantas'], 'Wheel alignment': ['Alinhamento', 'Alineación'], 'Brakes': ['Freios', 'Frenos'], 'Oil changes': ['Troca de óleo', 'Cambios de aceite'],
    'Oil change': ['Troca de óleo', 'Cambio de aceite'], 'Suspension & steering': ['Suspensão e direção', 'Suspensión y dirección'], 'Check engine light': ['Luz de injeção (check engine)', 'Luz de check engine'],
    // marquee
    'Balancing': ['Balanceamento', 'Balanceo'], 'Plugs & patches': ['Tarugo e remendo', 'Tapones y parches'], 'Rotation': ['Rodízio', 'Rotación'], 'Suspension': ['Suspensão', 'Suspensión'], 'Steering': ['Direção', 'Dirección'], 'Since 2013': ['Desde 2013', 'Desde 2013'],
    // dial short labels
    'Winter': ['Inverno', 'Invierno'], 'Plug/patch': ['Tarugo/remendo', 'Tapón/parche'], 'Alignment': ['Alinhamento', 'Alineación'], 'Engine light': ['Luz do motor', 'Luz de motor'],
    // patch photo labels
    'middle': ['meio', 'centro'], 'edge': ['borda', 'borde'], 'sidewall': ['lateral', 'costado']
  };
  const REV = {}; Object.entries(SV).forEach(([en, t]) => { REV[en] = en; REV[t[0]] = en; REV[t[1]] = en; });
  const tr = (txt, l) => { const en = REV[txt.trim()]; if (!en) return null; return l === 'en' ? en : SV[en][l === 'pt' ? 0 : 1]; };
  const D = {
    '#patch .lede': ['Toque na foto onde está o prego ou o dano. Fazemos tarugo e remendo, e o lugar decide qual serve, ou se precisa de pneu novo. Só olhando o pneu pessoalmente dá para ter certeza.', 'Toque la foto donde está el clavo o el daño. Hacemos tapones y parches, y el lugar decide cuál sirve, o si necesita llanta nueva. Solo viendo la llanta en persona se puede saber con seguridad.'],
    '.patch-q': ['Toque no pneu da foto: o meio da banda de rodagem, a borda ou a lateral.', 'Toque la llanta en la foto: el centro de la banda, el borde o el costado.'],
    '.svc-go em': ['Agendar →', 'Reservar →']
  };
  const SEL = '#services .card h3, #services .card .svc-go > span, .marquee span, .d-labels text, .dial-svc, .plabels text';
  function apply(l){
    const k = l === 'pt' ? 0 : 1;
    $$(SEL).forEach(el => {
      const node = el.matches('h3') ? [...el.childNodes].reverse().find(n => n.nodeType === 3 && n.textContent.trim()) : el;
      if (!node) return;
      if (el.dataset.enSv === undefined) { const en = REV[node.textContent.trim()]; if (!en) return; el.dataset.enSv = en; }
      const en = el.dataset.enSv, want = l === 'en' ? en : SV[en][k];
      if (want !== node.textContent.trim()) node.textContent = want;
    });
    Object.entries(D).forEach(([sel, t]) => $$(sel).forEach(el => { if (el.dataset.enRf === undefined) el.dataset.enRf = el.innerHTML; el.innerHTML = l === 'en' ? el.dataset.enRf : t[k]; }));
  }
  document.addEventListener('lm:lang', e => setTimeout(() => apply(e.detail), 0));
  // the dial writes the English name each time it turns: follow it
  const ds = $('.dial-svc'); if (ds) new MutationObserver(() => { if ((LM.lang || 'en') !== 'en' && SV[ds.textContent]) { ds.dataset.enSv = ds.textContent; ds.textContent = SV[ds.textContent][LM.lang === 'pt' ? 0 : 1]; } }).observe(ds, { childList: true, characterData: true, subtree: true });
  if (LM.lang && LM.lang !== 'en') apply(LM.lang);
})();

/* CALM1: two views on one page. "Tire Help" holds the tools (sections marked data-tab="help"); everything else is the shop view.
   Any link to a section in the other view switches views first, then scrolls there. */
(() => {
  const root = document.documentElement;
  const HELP = new Set([...document.querySelectorAll('main section[data-tab="help"]')].map(s => s.id).filter(Boolean));
  if (!HELP.size) return;
  const isHelp = () => root.classList.contains('view-help');
  function show(id, smooth){
    const want = HELP.has(id);
    const changed = want !== isHelp();
    root.classList.toggle('view-help', want);
    const el = id && document.getElementById(id);
    if (changed) window.scrollTo(0, 0);
    if (el && !(changed && (id === 'help' || id === 'top'))) requestAnimationFrame(() => el.scrollIntoView({ behavior: smooth && !changed ? 'smooth' : 'auto' }));
    if (changed) window.dispatchEvent(new Event('scroll'));
  }
  window.LM.showView = show;
  if (window.LM.goBook) { const g = window.LM.goBook; window.LM.goBook = (...args) => { if (isHelp()) show('book', false); return g(...args); }; }
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href^="#"]'); if (!a) return;
    const id = a.getAttribute('href').slice(1); if (!id || id === 'main') return;
    if (HELP.has(id) === isHelp()) return;            // same view: let the normal link do its thing
    if (!HELP.has(id) && !document.getElementById(id)) return;
    e.preventDefault();
    setTimeout(() => show(id, true), 0);
  }, true);
  const h = decodeURIComponent((location.hash || '').slice(1));
  if (HELP.has(h)) show(h, false);
})();

})();
