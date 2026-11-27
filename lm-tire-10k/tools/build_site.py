#!/usr/bin/env python3
"""Builds the generated parts of the L&M Tire site from tools/business.py and tools/content.py.

  python3 tools/build_site.py              # writes into the site folder (production links like /brakes/)
  python3 tools/build_site.py --preview D  # writes a full copy into folder D with links ending in index.html
                                           # (for previews on hosts that don't open folder links)

What it writes: assets/hours.js, assets/page.css, assets/track.js, service pages and policies pages in
EN/PT/ES, marked regions of index.html, Google data (JSON-LD), sitemap.xml, robots.txt, .htaccess, 404.html.
"""
import html, json, os, re, shutil, sys
from urllib.parse import quote

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from business import SITE, BUSINESS as B, HOURS, PHOTOS, PHOTO_SLOTS, DEPOSIT, POLICIES, ACIMA, REVIEWS, PHOTO_TEXT  # noqa
from content import UI, SERVICES, LANGS, NEARBY  # noqa

PREVIEW = '--preview' in sys.argv
OUT = sys.argv[sys.argv.index('--preview') + 1] if PREVIEW else ROOT
DOMAIN = (SITE['domain'] or 'https://YOUR-LIVE-DOMAIN').rstrip('/')
E = lambda s: html.escape(str(s), quote=True)
SVC = {s['key']: s for s in SERVICES}
POLICY_SLUG = {'en': 'policies', 'pt': 'politicas', 'es': 'politicas'}
LOCALE = {'en': 'en_US', 'pt': 'pt_BR', 'es': 'es_US'}
HREFLANG = {'en': 'en', 'pt': 'pt', 'es': 'es'}


def write(rel, text):
    p = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(p) or '.', exist_ok=True)
    with open(p, 'w', encoding='utf-8') as f:
        f.write(text)


def path_of(lang, slug):
    """site path (no leading slash, trailing slash) for a page"""
    return (slug + '/') if lang == 'en' else f'{lang}/{slug}/'


def rel(frm, to):
    """relative link from page path `frm` to page path `to` ('' = home)"""
    up = '../' * frm.count('/')
    target = up + to
    if PREVIEW and (to == '' or to.endswith('/')):
        target += 'index.html'
    return target or './'


def home_link(frm, lang, hash_=''):
    t = rel(frm, '')
    if lang != 'en':
        t += ('&' if '?' in t else '?') + 'lang=' + lang
    return t + hash_


def sms(num, body):
    return 'sms:' + num + '?&body=' + quote(body, safe='')


def text_num(lang):
    return B['phone']['pt'] if lang == 'pt' else B['phone']['text']


def text_label(lang):
    return B['phone_label']['pt'] if lang == 'pt' else B['phone_label']['text']


# ---------------------------------------------------------------- shared data

def hours_spec():
    days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    groups = {}
    for d, (o, c) in sorted(HOURS['weekly'].items()):
        groups.setdefault((o, c), []).append(days[d])
    out = [{'@type': 'OpeningHoursSpecification', 'dayOfWeek': ds, 'opens': o, 'closes': c} for (o, c), ds in groups.items()]
    return out


def special_spec():
    out = []
    for ds, v in sorted(HOURS['holidays'].items()):
        o, c = (v if isinstance(v, (list, tuple)) else ('00:00', '00:00'))
        out.append({'@type': 'OpeningHoursSpecification', 'validFrom': ds, 'validThrough': ds, 'opens': o, 'closes': c})
    return out


def business_ld(url_home):
    d = {
        '@context': 'https://schema.org', '@type': 'AutoRepair', '@id': DOMAIN + '/#shop',
        'name': B['name'], 'url': DOMAIN + '/', 'telephone': '+1-508-853-3322', 'foundingDate': B['founded'],
        'address': {'@type': 'PostalAddress', 'streetAddress': B['street'], 'addressLocality': B['city'], 'addressRegion': B['region'], 'postalCode': B['zip'], 'addressCountry': B['country']},
        'geo': {'@type': 'GeoCoordinates', 'latitude': B['geo'][0], 'longitude': B['geo'][1]},
        'hasMap': B['google_maps_url'],
        'openingHoursSpecification': hours_spec(),
        'paymentAccepted': ', '.join(B['payment']),
        'knowsLanguage': ['en', 'pt', 'es'],
        'areaServed': [{'@type': 'City', 'name': n + ', MA'} for n in NEARBY],
        'image': DOMAIN + '/assets/og-card.jpg', 'logo': DOMAIN + '/assets/icon-512.png',
        'contactPoint': [
            {'@type': 'ContactPoint', 'telephone': '+1-508-853-3322', 'contactType': 'customer service', 'availableLanguage': ['English']},
            {'@type': 'ContactPoint', 'telephone': '+1-304-806-6047', 'contactType': 'reservations', 'availableLanguage': ['English', 'Spanish']},
            {'@type': 'ContactPoint', 'telephone': '+1-774-288-9675', 'contactType': 'customer service', 'availableLanguage': ['Portuguese']},
        ],
        'hasOfferCatalog': {'@type': 'OfferCatalog', 'name': 'Tire and auto repair services', 'itemListElement': [
            {'@type': 'Offer', 'itemOffered': {'@type': 'Service', 'name': s['en']['name'], 'url': DOMAIN + '/' + path_of('en', s['slug']['en'])}} for s in SERVICES]},
    }
    if special_spec():
        d['specialOpeningHoursSpecification'] = special_spec()
    if B['google_rating'] and B['google_review_count']:
        d['aggregateRating'] = {'@type': 'AggregateRating', 'ratingValue': B['google_rating'], 'reviewCount': B['google_review_count']}
    return d


# ---------------------------------------------------------------- hours.js

def build_hours_js():
    weekly = {str(k): list(v) for k, v in HOURS['weekly'].items()}
    hol = {k: (v if v == 'closed' else list(v)) for k, v in HOURS['holidays'].items()}
    js = f"""/* GENERATED by tools/build_site.py from tools/business.py (HOURS). Change hours there, then rebuild.
   Times are Worcester time. holidays: 'YYYY-MM-DD': 'closed' or ['08:00','12:00'] override the weekly hours. */
window.LM_HOURS = {{
  weekly: {json.dumps(weekly)},
  holidays: {json.dumps(hol)},
  holidayNames: {json.dumps(HOURS['holiday_names'])}
}};
(function (H) {{
  var m = function (t) {{ var p = String(t).split(':'); return +p[0] * 60 + (+p[1] || 0); }};
  var ny = function (k) {{ return new Intl.DateTimeFormat('en-CA', {{ timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }}).format(new Date(Date.now() + (k || 0) * 864e5)); }};
  H.on = function (k) {{
    var ds = ny(k), h = H.holidays[ds];
    if (h === 'closed' || h === null) return null;
    if (h && h.length === 2) return [m(h[0]), m(h[1])];
    var wd = new Date(ds + 'T12:00:00Z').getUTCDay(), w = H.weekly[wd];
    return w ? [m(w[0]), m(w[1])] : null;
  }};
  H.dateStr = ny;
  H.isHoliday = function (k) {{ return Object.prototype.hasOwnProperty.call(H.holidays, ny(k)); }};
}})(window.LM_HOURS);
"""
    write('assets/hours.js', js)


# ---------------------------------------------------------------- analytics (track.js)

def build_track_js():
    a = SITE['analytics']
    js = """/* GENERATED by tools/build_site.py. Privacy-friendly event counts: no cookies, no names, no phone numbers.
   Counts taps on Call, Text/Book, Directions, Tire quote and Acima, and appointment form sends.
   Turned on only when tools/business.py SITE.analytics has a provider. */
(function () {
  var CFG = %s;
  var q = [];
  function send(name, props) {
    try {
      if (CFG.provider === 'plausible' && window.plausible) return window.plausible(name, { props: props });
      if (CFG.provider === 'umami' && window.umami) return window.umami.track(name, props);
      if (CFG.provider === 'goatcounter' && window.goatcounter && window.goatcounter.count) return window.goatcounter.count({ path: 'event-' + name.toLowerCase().replace(/\\s+/g, '-'), title: name, event: true });
      if (CFG.provider) q.push([name, props]);
    } catch (e) {}
  }
  window.LM_track = send;
  if (CFG.provider && CFG.src) {
    var s = document.createElement('script'); s.defer = true; s.src = CFG.src;
    if (CFG.provider === 'plausible') s.setAttribute('data-domain', CFG.id);
    if (CFG.provider === 'umami') s.setAttribute('data-website-id', CFG.id);
    if (CFG.provider === 'goatcounter') s.setAttribute('data-goatcounter', CFG.id);
    s.onload = function () { var x; while ((x = q.shift())) send(x[0], x[1]); };
    document.head.appendChild(s);
  }
  function kind(a) {
    var h = a.getAttribute('href') || '', t = a.dataset.track;
    if (t) return t;
    if (h.indexOf('tel:') === 0) return 'call';
    if (h.indexOf('sms:') === 0) return /acima/i.test(h) ? 'acima' : /quote|or%%C3%%A7amento|precio/i.test(h) ? 'quote' : 'text';
    if (/maps\\.google|google\\.com\\/maps|maps\\.apple|waze\\.com/.test(h)) return 'directions';
    if (/g\\.page\\/r\\//.test(h)) return 'review';
    return '';
  }
  var NAME = { call: 'Call', text: 'Text', quote: 'Tire quote', directions: 'Directions', acima: 'Acima', review: 'Review link', book: 'Appointment request' };
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
    var k = kind(a); if (!k) return;
    send(NAME[k] || k, { page: location.pathname, place: (a.closest('[id]') || {}).id || '' });
  }, true);
  document.addEventListener('submit', function (e) {
    var f = e.target; if (!f || !f.id) return;
    if (f.id === 'bookForm') send('Appointment request', { page: location.pathname });
    if (f.id === 'sizeForm') send('Tire quote', { page: location.pathname });
  }, true);
})();
""" % json.dumps({'provider': a.get('provider', ''), 'id': a.get('id', ''), 'src': a.get('src', '')})
    write('assets/track.js', js)


# ---------------------------------------------------------------- page.css (shared look for generated pages)

def build_page_css(index_html):
    a = index_html.index('<style>') + 7
    b = index_html.index('</style>')
    base = index_html[a:b]
    base = base.replace('url(assets/hero-poster.webp)', 'url(hero-poster.webp)')
    extra = """
/* ===== generated pages (services, policies) ===== */
.pg main{padding-top:96px}
.pg .top{background:rgba(12,13,22,.86);backdrop-filter:blur(14px);box-shadow:0 1px 0 var(--line)}
.pg .top .brand img{width:96px}
.pg section{padding:clamp(40px,6vw,80px) clamp(20px,5vw,72px)}
.crumbs{max-width:1100px;margin:0 auto;padding:12px clamp(20px,5vw,72px) 0;font-size:.95rem;color:var(--text-secondary)}
.crumbs ol{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:6px}
.crumbs li+li::before{content:"›";margin-right:6px;color:var(--text-secondary)}
.crumbs a{color:var(--text-primary)}
.pg-hero{max-width:1100px;margin:0 auto}
.pg-hero .ic{width:56px;height:56px;border-radius:16px;display:grid;place-items:center;background:var(--accent-muted);margin-bottom:18px}
.pg-hero .ic svg{width:30px;height:30px}
.pg-hero h1{font-size:clamp(2.2rem,6vw,4.2rem);max-width:18ch}
.pg-hero .lede{margin-top:18px;font-size:1.2rem;color:var(--text-secondary);max-width:58ch}
.pg-hero .cta-row{display:flex;flex-wrap:wrap;gap:12px;margin-top:26px}
.pg-hero .status{display:inline-flex;align-items:center;gap:8px;margin-top:18px;color:var(--text-secondary)}
.status i{width:10px;height:10px;border-radius:50%;background:#8f91aa}
.status.open i{background:#35d07f;box-shadow:0 0 0 4px rgba(53,208,127,.18)}
.pg-grid{max-width:1100px;margin:0 auto;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}
.pg-card{background:linear-gradient(170deg,var(--panel-2),var(--panel));border:1px solid var(--line);border-radius:20px;padding:26px}
.pg-card h2{font-size:1.5rem;margin-bottom:14px}
.pg-card ul{margin:0;padding:0;list-style:none;display:grid;gap:10px}
.pg-card li{position:relative;padding-left:26px}
.pg-card li::before{content:"";position:absolute;left:4px;top:.6em;width:9px;height:9px;border-radius:2px;transform:rotate(45deg);background:var(--accent)}
.pg-card.blue li::before{background:var(--blue-bright)}
.pg-steps{max-width:1100px;margin:0 auto}
.pg-steps h2,.pg-faq h2,.pg-visit h2,.pg-rel h2{font-size:clamp(1.6rem,3.4vw,2.4rem);margin-bottom:18px}
.pg-steps ol{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;counter-reset:s}
.pg-steps li{counter-increment:s;background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:18px 18px 18px 64px;position:relative;font-weight:600}
.pg-steps li::before{content:counter(s);position:absolute;left:18px;top:50%;transform:translateY(-50%);width:32px;height:32px;border-radius:50%;display:grid;place-items:center;background:var(--accent-btn);color:#fff;font:600 .95rem var(--mono)}
.pg-note{margin-top:14px;color:var(--text-secondary);max-width:70ch}.pg-note a{color:var(--text-primary);font-weight:600}
@media (max-width:560px){.pg-hero .cta-row .btn{flex:1 1 100%;white-space:normal;text-align:center}}
.pg-tool{max-width:1100px;margin:18px auto 0}
.pg-tool a{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:18px 22px;border-radius:16px;border:1px dashed var(--line-strong);color:var(--text-primary);text-decoration:none;font-weight:600}
.pg-tool a::after{content:"→";color:var(--accent)}
.pg-faq{max-width:900px;margin:0 auto}
.pg-faq details{border-bottom:1px solid var(--line)}
.pg-faq summary{cursor:pointer;list-style:none;padding:18px 0;font-weight:600;font-size:1.1rem;display:flex;justify-content:space-between;gap:16px;min-height:48px}
.pg-faq summary::-webkit-details-marker{display:none}
.pg-faq summary::after{content:"+";font:600 1.4rem/1 var(--mono);color:var(--text-secondary)}
.pg-faq details[open] summary::after{content:"−"}
.pg-faq details p,.pg-faq details ul{padding:0 0 18px;color:var(--text-secondary);margin:0}
.pg-faq details ul{padding-left:20px;display:grid;gap:8px}
.pg-visit{max-width:1100px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:24px}
.pg-visit .addr{font-size:1.2rem;font-weight:600;margin-bottom:14px}
.pg-visit table{width:100%;border-collapse:collapse;margin-top:16px}
.pg-visit th,.pg-visit td{text-align:left;padding:10px 0;border-bottom:1px solid var(--line);font-weight:500}
.pg-visit td{text-align:right;font-family:var(--mono);font-size:.95rem}
.pg-visit .person{display:flex;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px solid var(--line)}
.pg-visit .person small{display:block;color:var(--text-secondary)}
.pg-visit .person a{font-family:var(--mono);color:var(--text-primary);white-space:nowrap}
.pg-visit .area{margin-top:18px;color:var(--text-secondary)}
.holi{margin-top:16px;padding:14px 16px;border:1px solid rgba(255,200,80,.35);border-radius:14px;background:rgba(255,200,80,.06)}
.holi h3{font-size:1rem;margin:0 0 8px;color:#ffd27a}
.holi ul{list-style:none;margin:0;padding:0;display:grid;gap:6px}
.holi li{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}
.pg-rel{max-width:1100px;margin:0 auto}
.pg-rel ul{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}
.pg-rel a{display:flex;align-items:center;gap:12px;padding:16px 18px;border-radius:14px;background:var(--panel);border:1px solid var(--line);color:var(--text-primary);text-decoration:none;font-weight:600;min-height:56px}
.pg-rel a svg{width:24px;height:24px;flex:none;color:var(--accent)}
.pg-rel a:hover{border-color:var(--line-strong)}
.i{width:1.2em;height:1.2em;fill:none;stroke:currentColor;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round}
.dep{max-width:900px;margin:0 auto 8px;padding:18px 20px;border-radius:16px;border:1px solid rgba(138,144,255,.4);background:rgba(59,63,158,.16)}
.dep h2{font-size:1.2rem;margin-bottom:8px}
.dep p{color:var(--text-secondary)}
.law{max-width:900px;margin:22px auto 0;color:var(--text-secondary);font-size:.95rem}
.m-menu{position:fixed;inset:0;z-index:60;background:rgba(8,8,15,.97);padding:84px 24px 40px;overflow:auto}
.m-menu[hidden]{display:none}
.m-menu ul{list-style:none;margin:0 auto;padding:0;max-width:520px;display:grid;gap:4px}
.m-menu a{display:block;padding:14px 4px;border-bottom:1px solid var(--line);color:var(--text-primary);text-decoration:none;font-weight:600;font-size:1.15rem}
.m-menu .x{position:absolute;top:18px;right:18px;width:48px;height:48px;border-radius:50%;border:1px solid var(--line-strong);background:transparent;color:var(--text-primary);font-size:1.6rem;cursor:pointer}
.menu-btn{display:none;width:48px;height:48px;border-radius:50%;border:1px solid var(--line-strong);background:rgba(12,13,22,.6);cursor:pointer;flex-direction:column;align-items:center;justify-content:center;gap:5px}
.menu-btn i{display:block;width:20px;height:2px;background:var(--text-primary);border-radius:2px}
@media (max-width:900px){.menu-btn{display:flex}}
.lng{display:inline-flex;gap:2px;padding:3px;border-radius:999px;border:1px solid var(--line)}
.lng a{display:grid;place-items:center;min-width:40px;height:40px;border-radius:999px;font:600 .875rem var(--mono);text-decoration:none;color:var(--text-secondary)}
.lng a[aria-current="true"]{background:var(--blue);color:#fff}
.pg footer .foot{grid-template-columns:1.2fr 1fr 1fr 1fr}

@media (max-width:860px){.pg-grid,.pg-visit{grid-template-columns:1fr}.pg-steps ol{grid-template-columns:1fr}}
@media (max-width:760px){.pg footer .foot{grid-template-columns:1fr 1fr}.pg footer .foot>div:first-child{grid-column:1/-1}}
@media (max-width:720px){.pg .bar{transform:none}}
@media (max-width:420px){.pg .top{padding-left:12px;padding-right:12px;gap:8px}.pg .top .brand img{width:72px}.pg .top .actions{display:none}.lng a{min-width:36px}}
"""
    write('assets/page.css', '/* GENERATED by tools/build_site.py: base styles copied from index.html plus page layouts */\n' + base + extra)


# ---------------------------------------------------------------- pieces of generated pages

def sprite(index_html):
    a = index_html.index('<svg class="i-sprite"')
    b = index_html.index('</svg>', a) + 6
    return index_html[a:b]


def icon(n):
    return f'<svg class="i" aria-hidden="true"><use href="#i-{n}"/></svg>'


def head(lang, title, desc, here, alternates, extra_ld):
    up = '../' * here.count('/')
    canon = DOMAIN + '/' + here
    alt = ''.join(f'<link rel="alternate" hreflang="{HREFLANG[l]}" href="{DOMAIN}/{p}">\n' for l, p in alternates.items())
    if 'en' in alternates:
        alt += f'<link rel="alternate" hreflang="x-default" href="{DOMAIN}/{alternates["en"]}">\n'
    ld = '\n'.join('<script type="application/ld+json">' + json.dumps(x, ensure_ascii=False) + '</script>' for x in extra_ld)
    return f"""<!doctype html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{E(title)}</title>
<meta name="description" content="{E(desc)}">
<link rel="canonical" href="{canon}">
{alt}<meta name="theme-color" content="#0c0d16">
<link rel="icon" href="{up}assets/icon-192.png">
<link rel="apple-touch-icon" href="{up}assets/icon-180.png">
<meta property="og:type" content="website">
<meta property="og:title" content="{E(title)}">
<meta property="og:description" content="{E(desc)}">
<meta property="og:url" content="{canon}">
<meta property="og:image" content="{DOMAIN}/assets/og-card.jpg">
<meta property="og:locale" content="{LOCALE[lang]}">
<meta property="og:site_name" content="{E(B['name'])}">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@125,800;125,900&family=Barlow:wght@400;500;600&family=JetBrains+Mono:wght@500&display=swap">
<link rel="stylesheet" href="{up}assets/page.css">
<script src="{up}assets/hours.js"></script>
<script src="{up}assets/track.js" defer></script>
<script src="{up}assets/site.js" defer></script>
{ld}
</head>
"""


def header(lang, here, lang_links):
    u = UI[lang]
    home = home_link(here, lang)
    svc_home = home_link(here, lang, '#services')
    cur = ' aria-current="true"'
    lng = ''.join(f'<a href="{E(lang_links[l])}" hreflang="{l}" lang="{l}"{cur if l == lang else ""}>{l.upper()}</a>' for l in LANGS)
    return f"""<a class="skip" href="#main">{E(u['skip'])}</a>
<div class="env" aria-hidden="true"></div>
<header class="top solid" id="topbar">
  <a class="brand" href="{E(home)}"><img src="{'../' * here.count('/')}assets/logo.webp" alt="{E(B['name'])}, {E(u['home'])}" width="440" height="266"></a>
  <nav aria-label="Main">
    <a class="link" href="{E(svc_home)}">{E(u['services'])}</a>
    <a class="link" href="{E(home_link(here, lang, '#help'))}">{E(u['help'])}</a>
    <a class="link" href="{E(home_link(here, lang, '#visit'))}">{E(u['hours'])}</a>
    <div class="lng" role="group" aria-label="{E(u['langs_label'])}">{lng}</div>
    <div class="actions"><a class="btn btn-red btn-sm" href="tel:{B['phone']['shop']}">{icon('phone')}{E(u['call'])}</a></div>
    <button type="button" class="menu-btn" aria-expanded="false" aria-controls="mMenu" aria-label="{E(u['menu'])}"><i></i><i></i><i></i></button>
  </nav>
</header>
<div class="m-menu" id="mMenu" hidden>
  <button type="button" class="x" aria-label="{E(u['close'])}">×</button>
  <ul>
    <li><a href="{E(home)}">{E(u['home'])}</a></li>
    {''.join(f'<li><a href="{E(rel(here, path_of(lang, s["slug"][lang])))}">{E(s[lang]["name"])}</a></li>' for s in SERVICES)}
    <li><a href="{E(home_link(here, lang, '#help'))}">{E(u['help'])}</a></li>
    <li><a href="{E(rel(here, path_of(lang, POLICY_SLUG[lang])))}">{E(POLICIES[lang]['title'])}</a></li>
    <li><a href="{E(home_link(here, lang, '#visit'))}">{E(u['hours'])}</a></li>
  </ul>
</div>
"""


def visit_block(lang, here):
    u = UI[lang]
    rows = ''.join(f'<tr><th scope="row">{E(a)}</th><td>{E(b)}</td></tr>' for a, b in u['hours_rows'])
    maps = 'https://www.google.com/maps/dir/?api=1&destination=' + quote(f"{B['street']}, {B['city']}, {B['region']} {B['zip']}")
    return f"""<section class="pg-visit-wrap" id="visit" aria-labelledby="visit-h">
  <div class="pg-visit">
    <div>
      <h2 id="visit-h">{E(u['visit'])}</h2>
      <p class="addr">{E(B['street'])}<br>{E(B['city'])}, {B['region']} {B['zip']}</p>
      <a class="btn btn-ghost" href="{E(maps)}" target="_blank" rel="noopener">{icon('pin')}{E(u['directions'])}</a>
      <table class="hours"><caption class="sr">{E(u['hours'])}</caption><tbody>{rows}</tbody></table>
      <p class="area"><b>{E(u['area_title'])}.</b> {E(u['area'])}</p>
    </div>
    <div>
      <h2>{E(u['who'])}</h2>
      <div class="person"><div><b>{E(u['shop'])}</b><small>{E(u['langs_shop'])}</small></div><a href="tel:{B['phone']['shop']}">{B['phone_label']['shop']}</a></div>
      <div class="person"><div><b>{E(u['owner'])}</b><small>{E(u['langs_owner'])}</small></div><a href="tel:{B['phone']['text']}">{B['phone_label']['text']}</a></div>
      <div class="person"><div><b>{E(u['partner'])}</b><small lang="pt">{E(u['langs_partner'])}</small></div><a href="tel:{B['phone']['pt']}">{B['phone_label']['pt']}</a></div>
      <p class="area">{E(u['speak'])} {E(u['no_body'])}</p>
    </div>
  </div>
</section>
"""


def footer(lang, here):
    u = UI[lang]
    svc = ''.join(f'<li><a href="{E(rel(here, path_of(lang, s["slug"][lang])))}">{E(s[lang]["name"])}</a></li>' for s in SERVICES)
    rows = ''.join(f'<li>{E(a)}: {E(b)}</li>' for a, b in u['hours_rows'])
    return f"""<footer>
  <div class="foot">
    <div>
      <img src="{'../' * here.count('/')}assets/logo.webp" alt="{E(B['name'])}" width="440" height="266" loading="lazy">
      <p style="margin-top:14px">{E(u['since'])} {E(u['footer_line'])}</p>
    </div>
    <div><h3>{E(u['services'])}</h3><ul>{svc}</ul></div>
    <div><h3>{E(u['visit'])}</h3><ul><li>{E(B['street'])}</li><li>{E(B['city'])}, {B['region']} {B['zip']}</li>{rows}</ul></div>
    <div><h3>{E(u['who'])}</h3><ul>
      <li>{E(u['shop'])}: <a href="tel:{B['phone']['shop']}">{B['phone_label']['shop']}</a></li>
      <li>{E(u['text_book'])}: <a href="{E(sms(text_num(lang), u['sms_book'].format(svc='')))}">{text_label(lang)}</a></li>
      <li><span lang="pt">Português</span>: <a href="tel:{B['phone']['pt']}">{B['phone_label']['pt']}</a></li>
      <li><a href="{E(rel(here, path_of(lang, POLICY_SLUG[lang])))}">{E(POLICIES[lang]['title'])}</a></li>
    </ul></div>
  </div>
  <div class="fine"><span>© 2026 {E(B['name'])}, {E(B['city'])}, {B['region']}</span></div>
</footer>
<div class="bar show" id="bar" aria-label="Quick contact">
  <a class="btn btn-red" data-cta="call" href="tel:{B['phone']['shop']}">{E(u['call_now'])}</a>
  <a class="btn btn-ghost" data-cta="book" href="{E(sms(text_num(lang), u['sms_book'].format(svc='')))}">{E(u['text_book'])}</a>
</div>
"""


def faq_ld(pairs):
    return {'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [
        {'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in pairs]}


def crumbs_ld(items):
    return {'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
        {'@type': 'ListItem', 'position': i + 1, 'name': n, 'item': DOMAIN + '/' + p} for i, (n, p) in enumerate(items)]}


# ---------------------------------------------------------------- service pages

def build_service(s, lang, spr):
    u, c = UI[lang], s[lang]
    here = path_of(lang, s['slug'][lang])
    alts = {l: path_of(l, s['slug'][l]) for l in LANGS}
    lang_links = {l: rel(here, alts[l]) for l in LANGS}
    service_ld = {'@context': 'https://schema.org', '@type': 'Service', 'name': c['name'], 'serviceType': s['schema'],
                  'description': c['desc'], 'url': DOMAIN + '/' + here, 'inLanguage': lang,
                  'provider': {'@id': DOMAIN + '/#shop', '@type': 'AutoRepair', 'name': B['name'], 'telephone': '+1-508-853-3322',
                               'address': {'@type': 'PostalAddress', 'streetAddress': B['street'], 'addressLocality': B['city'], 'addressRegion': B['region'], 'postalCode': B['zip'], 'addressCountry': 'US'}},
                  'areaServed': [{'@type': 'City', 'name': n + ', MA'} for n in NEARBY]}
    lds = [service_ld, faq_ld(c['faq']), crumbs_ld([(u['home'], ''), (c['name'], here)])]
    book_sms = sms(text_num(lang), u['sms_book'].format(svc=c['name'].lower()))
    if s.get('tire'):
        cta2 = f'<a class="btn btn-ghost" data-track="quote" href="{E(home_link(here, lang, "#size"))}">{icon("tread")}{E(u["quote_tires"])}</a>'
    else:
        cta2 = f'<a class="btn btn-ghost" href="tel:{B["phone"]["shop"]}">{icon("phone")}{E(u["call"])} {B["phone_label"]["shop"]}</a>'
    tool = ''
    if c.get('tool'):
        tool = f'<div class="pg-tool"><a href="{E(home_link(here, lang, "#" + c["tool"][1]))}">{E(c["tool"][0])}</a></div>'
    related = ''.join(f'<li><a href="{E(rel(here, path_of(lang, SVC[k]["slug"][lang])))}">{icon(SVC[k]["icon"])}{E(SVC[k][lang]["name"])}</a></li>' for k in c['related'])
    faq = ''.join(f'<details><summary>{E(q)}</summary><p>{E(a)}</p></details>' for q, a in c['faq'])
    dep = ''
    if not s.get('tire'):
        d = DEPOSIT[lang]
        dep = f'<p class="pg-note">{E(d["short"])} {E(d["confirm"])} <a href="{E(rel(here, path_of(lang, POLICY_SLUG[lang])))}">{E(POLICIES[lang]["title"])}</a></p>'
    acima = ''
    if s['key'] in ('new-tires', 'used-tires', 'brakes', 'suspension'):
        a = ACIMA[lang]
        acima = f'<p class="pg-note"><b>{E(a["kicker"])}:</b> {E(a["body"])} <a href="{E(home_link(here, lang, "#acima"))}">Acima →</a></p>'
    body = f"""<body class="pg">
{spr}
{header(lang, here, lang_links)}
<nav class="crumbs" aria-label="Breadcrumb"><ol><li><a href="{E(home_link(here, lang))}">{E(u['home'])}</a></li><li><a href="{E(home_link(here, lang, '#services'))}">{E(u['services'])}</a></li><li aria-current="page">{E(c['name'])}</li></ol></nav>
<main id="main" tabindex="-1">
<section aria-labelledby="h1">
  <div class="pg-hero">
    <div class="ic">{icon(s['icon'])}</div>
    <h1 id="h1">{E(c['h1'])}</h1>
    <p class="lede">{E(c['intro'])}</p>
    <div class="cta-row">
      <a class="btn btn-red" href="{E(book_sms)}">{icon('text')}{E(u['text_book'])} {text_label(lang)}</a>
      {cta2}
    </div>
    <p class="status" data-status role="status"><i></i><span></span></p>
  </div>
  {tool}
</section>
<section aria-label="{E(u['what_we_do'])}">
  <div class="pg-grid">
    <div class="pg-card"><h2>{E(u['what_we_do'])}</h2><ul>{''.join(f'<li>{E(x)}</li>' for x in c['do'])}</ul></div>
    <div class="pg-card blue"><h2>{E(u['signs'])}</h2><ul>{''.join(f'<li>{E(x)}</li>' for x in c['signs'])}</ul></div>
  </div>
</section>
<section aria-labelledby="how-h">
  <div class="pg-steps">
    <h2 id="how-h">{E(u['how'])}</h2>
    <ol>{''.join(f'<li>{E(x)}</li>' for x in u['how_steps'])}</ol>
    <p class="pg-note">{E(u['price_note'])}</p>
    {dep}
    {acima}
  </div>
</section>
<section aria-labelledby="faq-h">
  <div class="pg-faq"><h2 id="faq-h">{E(u['questions'])}</h2>{faq}</div>
</section>
{visit_block(lang, here)}
<section aria-labelledby="rel-h">
  <div class="pg-rel"><h2 id="rel-h">{E(u['other'])}</h2><ul>{related}<li><a href="{E(home_link(here, lang, '#services'))}">{icon('rim')}{E(u['all_services'])}</a></li></ul></div>
</section>
</main>
{footer(lang, here)}
</body>
</html>
"""
    write(here + 'index.html', head(lang, c['title'], c['desc'], here, alts, lds) + body)
    return here, alts


# ---------------------------------------------------------------- policies pages

def build_policies(lang, spr):
    u, p, d = UI[lang], POLICIES[lang], DEPOSIT[lang]
    here = path_of(lang, POLICY_SLUG[lang])
    alts = {l: path_of(l, POLICY_SLUG[l]) for l in LANGS}
    lang_links = {l: rel(here, alts[l]) for l in LANGS}
    cats = [(d['title'], d['items'])] + p['cats']
    blocks = ''.join(f'<details{" open" if i == 0 else ""} id="p{i}"><summary>{E(t)}</summary><ul>{"".join(f"<li>{E(x)}</li>" for x in items)}</ul></details>' for i, (t, items) in enumerate(cats))
    a = ACIMA[lang]
    acima = f'<details id="p-acima"><summary>Acima</summary><ul><li>{E(a["body"])}</li>{"".join(f"<li>{E(x)}</li>" for x in a["points"][1:])}</ul></details>'
    lds = [crumbs_ld([(u['home'], ''), (p['title'], here)])]
    body = f"""<body class="pg">
{spr}
{header(lang, here, lang_links)}
<nav class="crumbs" aria-label="Breadcrumb"><ol><li><a href="{E(home_link(here, lang))}">{E(u['home'])}</a></li><li aria-current="page">{E(p['title'])}</li></ol></nav>
<main id="main" tabindex="-1">
<section aria-labelledby="h1">
  <div class="pg-hero">
    <h1 id="h1">{E(p['h1'])}</h1>
    <p class="lede">{E(p['intro'])}</p>
  </div>
</section>
<section aria-label="{E(p['title'])}">
  <div class="pg-faq">{blocks}{acima}</div>
  <p class="law">{E(p['law'])}</p>
</section>
{visit_block(lang, here)}
</main>
{footer(lang, here)}
</body>
</html>
"""
    write(here + 'index.html', head(lang, p['title'] + ' | ' + B['name'], p['desc'], here, alts, lds) + body)
    return here, alts


# ---------------------------------------------------------------- index.html marked regions

def tri(fn):
    """same block in 3 languages; CSS shows the one that matches <html lang>"""
    return ''.join(f'<div data-l="{l}"{" lang=" + chr(34) + l + chr(34) if l != "en" else ""}>{fn(l)}</div>' for l in LANGS)


def svc_link(l, s):
    return rel('', path_of(l, s['slug'][l]))


def region_services_links():
    def f(l):
        lis = ''.join(f'<li><a href="{E(svc_link(l, s))}">{icon(s["icon"])}<span>{E(s[l]["name"])}</span></a></li>' for s in SERVICES)
        return f'<ul class="svc-links">{lis}</ul>'
    return tri(f)


def region_reviews():
    rv = B['google_rating'] and B['google_review_count']
    def f(l):
        r = REVIEWS[l]
        stars = f'<p class="rv-score">{E(r["rating"].format(r=B["google_rating"], n=B["google_review_count"]))}</p>' if rv else ''
        return f'''<div class="rv-row">{stars}<a class="btn btn-ghost btn-sm" href="{E(B["google_maps_url"])}" target="_blank" rel="noopener">{E(r["read"])}</a><a class="btn btn-ghost btn-sm" href="{E(B["google_review_url"])}" target="_blank" rel="noopener">{E(r["write"])}</a></div>'''
    return tri(f)


def region_acima():
    def f(l):
        a = ACIMA[l]
        href = B['acima_url'] or sms(text_num(l), a['sms'])
        label = a['cta_apply'] if B['acima_url'] else a['cta']
        ext = ' target="_blank" rel="noopener"' if B['acima_url'] else ''
        pts = ''.join(f'<li>{E(x)}</li>' for x in a['points'])
        return f'''<p class="kicker mono">{E(a["kicker"])}</p><h2>{E(a["title"])}</h2><p class="lede">{E(a["body"])}</p><ul class="ac-pts">{pts}</ul><div class="ac-cta"><a class="btn btn-red" data-track="acima" href="{E(href)}"{ext}>{icon("text")}{E(label)}</a><a class="btn btn-ghost" href="tel:{B["phone"]["shop"]}">{icon("phone")}{B["phone_label"]["shop"]}</a></div>'''
    return tri(f)


def region_deposit():
    def f(l):
        d = DEPOSIT[l]
        return f'<p><b>{E(d["title"])}.</b> {E(d["short"])} {E(d["confirm"])} <a href="{E(rel("", path_of(l, POLICY_SLUG[l])))}">{E(POLICIES[l]["title"])} →</a></p>'
    return tri(f)


def region_confirm():
    return tri(lambda l: f'<p class="conf">{E(DEPOSIT[l]["confirm"])}</p>')


def region_photos():
    if not PHOTOS:
        return ''
    def f(l):
        t = PHOTO_TEXT[l]
        figs = ''.join(f'<figure><img src="assets/photos/{E(fn)}" alt="{E(alt[l])}" loading="lazy" decoding="async"><figcaption>{E(t["cats"].get(cat, ""))}</figcaption></figure>' for fn, alt, cat in PHOTOS)
        return f'<p class="kicker mono">{E(t["kicker"])}</p><h2>{E(t["title"])}</h2><div class="ph-grid">{figs}</div>'
    return f'<section id="photos" class="photos" aria-label="Photos"><div class="wrap">{tri(f)}</div></section>'


def region_footer_links():
    def f(l):
        svc = ''.join(f'<li><a href="{E(svc_link(l, s))}">{E(s[l]["name"])}</a></li>' for s in SERVICES)
        return f'<h3>{E(UI[l]["services"])}</h3><ul>{svc}<li><a href="{E(rel("", path_of(l, POLICY_SLUG[l])))}">{E(POLICIES[l]["title"])}</a></li></ul>'
    return tri(f)


def region_hours_rows():
    return ''.join(f'<tr data-days="{d}"><th scope="row">{a}</th><td>{b}</td></tr>' for d, (a, b) in zip(['1,2,3,4,5', '6', '0'], UI['en']['hours_rows']))


def replace_region(h, name, content):
    pat = re.compile(r'(<!--BEGIN:%s-->)(.*?)(<!--END:%s-->)' % (name, name), re.S)
    if not pat.search(h):
        raise SystemExit('missing region ' + name + ' in index.html')
    return pat.sub(lambda m: m.group(1) + content + m.group(3), h)


def build_index(h):
    h = replace_region(h, 'svc-links', region_services_links())
    h = replace_region(h, 'reviews', region_reviews())
    h = replace_region(h, 'acima', region_acima())
    h = replace_region(h, 'deposit', region_deposit())
    h = replace_region(h, 'confirm', region_confirm())
    h = replace_region(h, 'photos', region_photos())
    h = replace_region(h, 'foot-links', region_footer_links())
    # Google data for the shop
    ld = '<script type="application/ld+json">\n' + json.dumps(business_ld(DOMAIN + '/'), ensure_ascii=False) + '\n</script>'
    h = re.sub(r'<script type="application/ld\+json">\s*\{"@context":"https://schema.org","@type":"AutoRepair".*?</script>', lambda m: ld, h, count=1, flags=re.S)
    # canonical, og:url, og:image
    h = re.sub(r'<link rel="canonical" href="[^"]*">\n?', '', h)
    h = h.replace('<meta name="theme-color"', f'<link rel="canonical" href="{DOMAIN}/">\n<meta name="theme-color"', 1)
    h = re.sub(r'<meta property="og:url" content="[^"]*">', f'<meta property="og:url" content="{DOMAIN}/">', h)
    h = re.sub(r'<meta property="og:image" content="[^"]*">', f'<meta property="og:image" content="{DOMAIN}/assets/og-card.jpg">', h)
    h = h.replace('<!-- DEPLOY STEP: replace both placeholders below with the live absolute URL before zipping -->\n', '')
    if 'assets/track.js' not in h:
        h = h.replace('<script src="assets/hours.js"></script>', '<script src="assets/hours.js"></script>\n<script src="assets/track.js" defer></script>', 1)
    if PREVIEW:
        h = re.sub(r'href="((?:pt/|es/)?[a-z-]+/)"', r'href="\1index.html"', h)
    return h


# ---------------------------------------------------------------- site.js for generated pages

SITE_JS = r"""/* GENERATED by tools/build_site.py: small script for service and policy pages */
(function () {
  var L = document.documentElement.lang || 'en';
  var T = { en: ['Open now · until ', 'Closed now · opens ', 'today', 'tomorrow', ' at '], pt: ['Aberto agora · até ', 'Fechado agora · abre ', 'hoje', 'amanhã', ' às '], es: ['Abierto ahora · hasta ', 'Cerrado ahora · abre ', 'hoy', 'mañana', ' a las '] }[L];
  var DAYS = { en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], pt: ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'], es: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'] }[L];
  function f(m) { var h = Math.floor(m / 60), mm = m % 60; if (L !== 'en') return h + (mm ? ':' + String(mm).padStart(2, '0') : 'h'); return ((h + 11) % 12 + 1) + (mm ? ':' + String(mm).padStart(2, '0') : '') + (h < 12 ? ' AM' : ' PM'); }
  function status() {
    var H = window.LM_HOURS; if (!H) return;
    var p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
    var g = function (t) { for (var i = 0; i < p.length; i++) if (p[i].type === t) return p[i].value; };
    var now = (+g('hour') % 24) * 60 + +g('minute'), t = H.on(0), txt, open = false;
    if (t && now >= t[0] && now < t[1]) { open = true; txt = T[0] + f(t[1]); }
    else if (t && now < t[0]) txt = T[1] + T[2] + T[4] + f(t[0]);
    else { for (var k = 1; k < 21; k++) { var n = H.on(k); if (n) { var wd = new Date(H.dateStr(k) + 'T12:00:00Z').getUTCDay(); txt = T[1] + (k === 1 ? T[3] : DAYS[wd]) + T[4] + f(n[0]); break; } } }
    document.querySelectorAll('[data-status]').forEach(function (el) { el.classList.toggle('open', open); el.querySelector('span').textContent = txt || ''; });
  }
  status(); setInterval(status, 60000);
  // holiday hours list under the hours table
  (function () {
    var H = window.LM_HOURS, tb = document.querySelector('.pg-visit .hours'); if (!H || !tb) return;
    var rows = []; for (var k = 0; k <= 45; k++) if (H.isHoliday(k)) rows.push([H.dateStr(k), H.on(k)]);
    if (!rows.length) return;
    var N = { en: ['Holiday hours', 'Closed', ' to '], pt: ['Horário de feriado', 'Fechado', ' às '], es: ['Horario de días festivos', 'Cerrado', ' a '] }[L];
    var box = document.createElement('div'); box.className = 'holi';
    var h = document.createElement('h3'); h.textContent = N[0]; box.appendChild(h);
    var ul = document.createElement('ul');
    rows.forEach(function (r) { var li = document.createElement('li'), b = document.createElement('b'), s = document.createElement('span'); b.textContent = new Date(r[0] + 'T12:00:00Z').toLocaleDateString({ en: 'en-US', pt: 'pt-BR', es: 'es-US' }[L], { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' }); s.textContent = r[1] ? f(r[1][0]) + N[2] + f(r[1][1]) : N[1]; li.append(b, s); ul.appendChild(li); });
    box.appendChild(ul); tb.after(box);
  })();
  // phone menu
  var btn = document.querySelector('.menu-btn'), m = document.getElementById('mMenu');
  function close() { m.hidden = true; btn.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; btn.focus(); }
  if (btn && m) {
    btn.addEventListener('click', function () { m.hidden = false; btn.setAttribute('aria-expanded', 'true'); document.body.style.overflow = 'hidden'; var a = m.querySelector('a'); if (a) a.focus(); });
    m.querySelector('.x').addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !m.hidden) close(); });
  }
  // remember the language for the home page
  try { localStorage.setItem('lm-lang', L); } catch (e) {}
})();
"""


# ---------------------------------------------------------------- sitemap, robots, .htaccess, 404

def build_seo_files(pages):
    urls = [('', None)] + pages
    items = []
    for path, alts in urls:
        alt = ''
        if alts:
            alt = ''.join(f'\n    <xhtml:link rel="alternate" hreflang="{l}" href="{DOMAIN}/{p}"/>' for l, p in alts.items())
            alt += f'\n    <xhtml:link rel="alternate" hreflang="x-default" href="{DOMAIN}/{alts["en"]}"/>'
        items.append(f'  <url>\n    <loc>{DOMAIN}/{path}</loc>{alt}\n  </url>')
    write('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' + '\n'.join(items) + '\n</urlset>\n')
    write('robots.txt', f'User-agent: *\nAllow: /\nDisallow: /tools/\nDisallow: /sound-picker.html\nDisallow: /online.html\n\nSitemap: {DOMAIN}/sitemap.xml\n')
    host = re.sub(r'^https?://', '', DOMAIN)
    hta = r"""# GENERATED by tools/build_site.py. For Apache / LiteSpeed hosting (Hostinger and similar).
Options -Indexes
ErrorDocument 404 /404.html
DirectoryIndex index.html

<IfModule mod_rewrite.c>
RewriteEngine On
# always use https
RewriteCond %{HTTPS} !=on
RewriteCond %{HTTP:X-Forwarded-Proto} !https
RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
# keep build tools and preview files off the public site
RewriteRule ^(tools|\.git)(/|$) - [F,L]
RewriteRule ^(online|sound-picker)\.html$ - [F,L]
</IfModule>

<IfModule mod_headers.c>
Header always set Strict-Transport-Security "max-age=31536000"
Header always set X-Content-Type-Options "nosniff"
Header always set Referrer-Policy "strict-origin-when-cross-origin"
Header always set X-Frame-Options "SAMEORIGIN"
Header always set Permissions-Policy "camera=(), microphone=(), payment=(), usb=(), geolocation=(self)"
Header always set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://plausible.io https://cloud.umami.is https://gc.zgo.at; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; media-src 'self'; connect-src 'self' https://api.open-meteo.com https://plausible.io https://cloud.umami.is https://api-gateway.umami.dev https://*.goatcounter.com; frame-src https://www.google.com https://www.openstreetmap.org; base-uri 'self'; form-action 'self'; object-src 'none'; upgrade-insecure-requests"
<FilesMatch "\.(css|js|webp|jpg|png|svg|mp4|mp3|woff2)$">
Header set Cache-Control "public, max-age=604800"
</FilesMatch>
<FilesMatch "(\.html|hours\.js|notice\.json|sw\.js)$">
Header set Cache-Control "no-cache"
</FilesMatch>
</IfModule>

<IfModule mod_deflate.c>
AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json image/svg+xml application/xml text/plain
</IfModule>
AddType application/manifest+json .webmanifest
"""
    write('.htaccess', hta)


def build_404():
    p = os.path.join(ROOT, '404.html')
    h = open(p, encoding='utf-8').read()
    h = re.sub(r'(href|src)="assets/', r'\1="/assets/', h)
    h = h.replace('href="./"', 'href="/"')
    write('404.html', h)


# ---------------------------------------------------------------- main

def main():
    if PREVIEW:
        if os.path.exists(OUT):
            shutil.rmtree(OUT)
        shutil.copytree(ROOT, OUT, ignore=shutil.ignore_patterns('tools', '.git', 'online.html', 'sound-picker.html'))
    index_path = os.path.join(ROOT, 'index.html')
    h = open(index_path, encoding='utf-8').read()
    build_hours_js()
    build_track_js()
    build_page_css(h)
    write('assets/site.js', SITE_JS)
    spr = sprite(h)
    pages = []
    for s in SERVICES:
        for l in LANGS:
            pages.append(build_service(s, l, spr))
    for l in LANGS:
        pages.append(build_policies(l, spr))
    write('index.html', build_index(h))
    build_seo_files(pages)
    build_404()
    print('built', len(pages), 'pages into', OUT, '(preview links)' if PREVIEW else '')


main()
