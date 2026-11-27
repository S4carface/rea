/* Privacy-friendly event counts: no cookies, no names, no phone numbers typed by customers, no message text.
   Off until tools/business.py SITE.analytics has a provider. Each event says WHICH line or tool, so the shop can see
   e.g. how many people texted the Portuguese line vs. called the shop. */
(function () {
  'use strict';
  var CFG = /*CFG*/{};
  var LINES = /*LINES*/{};
  if (!CFG.provider) { window.LM_track = function () {}; return; }
  var q = [], L = document.documentElement.lang || 'en';
  function send(name, props) {
    props = props || {}; props.page = location.pathname; props.lang = L;
    try {
      if (CFG.provider === 'plausible' && window.plausible) return window.plausible(name, { props: props });
      if (CFG.provider === 'umami' && window.umami) return window.umami.track(name, props);
      if (CFG.provider === 'goatcounter' && window.goatcounter && window.goatcounter.count) return window.goatcounter.count({ path: 'event-' + name.toLowerCase().replace(/\s+/g, '-'), title: name, event: true });
      q.push([name, props]);
    } catch (e) {}
  }
  window.LM_track = send;
  if (CFG.src) {
    var s = document.createElement('script'); s.defer = true; s.src = CFG.src;
    if (CFG.provider === 'plausible') s.setAttribute('data-domain', CFG.id);
    if (CFG.provider === 'umami') s.setAttribute('data-website-id', CFG.id);
    if (CFG.provider === 'goatcounter') s.setAttribute('data-goatcounter', CFG.id);
    s.onload = function () { var x; while ((x = q.shift())) send(x[0], x[1]); };
    document.head.appendChild(s);
  }
  function line(num) { num = String(num || '').replace(/[^\d+]/g, ''); return LINES[num] || 'other'; }
  var NAMED = { vcard: 'Save contact', 'share-shop': 'Share shop', acima: 'Acima' };
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('a[href],button'); if (!el) return;
    var h = el.getAttribute('href') || '', t = el.getAttribute('data-track'), place = (el.closest('[id]') || {}).id || '';
    if (t && NAMED[t]) return send(NAMED[t], { place: place });
    if (el.classList.contains('share-tool')) return send('Share tool', {});
    if (el.classList.contains('add-visit')) return send('My visit add', { tool: (document.querySelector('[data-tool]') || { getAttribute: function () { return ''; } }).getAttribute('data-tool') });
    if (el.classList.contains('visit-send')) return send('My visit send', { items: String((document.querySelectorAll('.visit-list li') || []).length) });
    if (el.id === 'olCal') return send('Calendar reminder', {});
    if (el.classList.contains('music-btn')) return send('Music button', {});
    if (el.classList.contains('video-lite')) return send('Video play', {});
    if (h.indexOf('tel:') === 0) return send('Call', { line: line(h.slice(4)), place: place });
    if (h.indexOf('sms:') === 0) return send('Text', { line: line(h.slice(4).split('?')[0]), place: place });
    if (/^https:\/\/wa\.me\//.test(h)) return send('WhatsApp', { line: line('+' + h.split('/')[3].split('?')[0]), place: place });
    if (h.indexOf('mailto:') === 0) return send('Email', { place: place });
    if (/maps\.google|google\.com\/maps|maps\.apple|waze\.com/.test(h)) return send('Directions', { place: place });
    if (/g\.page\/r\//.test(h)) return send('Review link', { place: place });
  }, true);
})();
