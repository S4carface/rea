#!/usr/bin/env python3
"""Sprint 3 site builder for L&M Tire Auto Repair. Builds every page in English, Portuguese and Spanish.

  python3 tools/build3.py                 # production site in site/  (links like /tires/, upload site/ to the host)
  python3 tools/build3.py --hp BRANCH     # phone preview in preview3/ through htmlpreview.github.io (not for the live site)

Facts come from tools/business.py, service text from tools/content.py, site text from tools/text3.py.
Source styles and scripts are in src3/. Nothing in site/ points at GitHub or preview services.
"""
import hashlib, html, json, os, re, shutil, subprocess, sys
from urllib.parse import quote

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(ROOT, 'src3')
sys.path.insert(0, HERE)
import business as BZ  # noqa
from business import SITE, BUSINESS as B, HOURS, PHOTOS, DEPOSIT, POLICIES, ACIMA, REVIEWS, PHOTO_TEXT, CONTACTS, ROUTE, SOCIAL, STATS, EMAIL  # noqa
from content import SERVICES, NEARBY  # noqa
from text3 import LANGS, PAGES, NAV, NAV2, T, PRIVACY, MAKES, JS_TXT  # noqa
from business import DELIVERY, INVENTORY, MUSIC  # noqa
from tools3 import TOOLS, VIDEOS, C as TC, LOAD_INDEX, SPEED, SYMPTOMS, TIPS  # noqa

HP = sys.argv[sys.argv.index('--hp') + 1] if '--hp' in sys.argv else ''
REPO = 'S4carface/rea'
SUB = 'lm-tire-10k'
OUT = os.path.join(ROOT, 'preview3' if HP else 'site')
SITE_DIR = os.path.join(ROOT, 'site')
DOMAIN = (SITE['domain'] or 'https://YOUR-LIVE-DOMAIN').rstrip('/')
E = lambda s: html.escape(str(s), quote=True)
SVC = {s['key']: s for s in SERVICES}
LOCALE = {'en': 'en_US', 'pt': 'pt_BR', 'es': 'es_US'}
TIRE_KEYS = ['new-tires', 'used-tires', 'flat-tire-repair']
REPAIR_KEYS = ['brakes', 'wheel-alignment', 'oil-change', 'suspension', 'diagnostics']
DIRECTIONS = 'https://www.google.com/maps/dir/?api=1&destination=' + quote(f"{B['street']}, {B['city']}, {B['region']} {B['zip']}")


# ---------------------------------------------------------------- paths and links

def ppath(key, lang):
    """site path of a page: '' for the English home, 'pt/' for Portuguese home, 'tires/', 'pt/pneus/' ..."""
    slug = PAGES[key][lang] if key in PAGES else key
    pre = '' if lang == 'en' else lang + '/'
    return pre + (slug + '/' if slug else '')


def spath(s, lang):
    return ('' if lang == 'en' else lang + '/') + s['slug'][lang] + '/'


HP_BASE = f'https://htmlpreview.github.io/?https://github.com/{REPO}/blob/{HP}/{SUB}/preview3/'


def href(path):
    if HP:
        return HP_BASE + path + 'index.html'
    return '/' + path


def git_sha(rel):
    try:
        out = subprocess.run(['git', 'log', '-1', '--format=%H', '--', rel], cwd=ROOT, capture_output=True, text=True).stdout.strip()
        return out
    except Exception:
        return ''


def asset(name, here=''):
    """URL of a file in site/assets."""
    if not HP:
        return '/assets/' + name
    if re.search(r'\.(css|js|json)$', name):
        # htmlpreview loads these itself; relative to the preview page
        return '../' * (here.count('/') + 1) + ('site/assets/' + name if not name.startswith('hp/') else 'preview3/' + name[3:])
    sha = git_sha('site/assets/' + name)
    if sha:
        return f'https://cdn.jsdelivr.net/gh/{REPO}@{sha}/{SUB}/site/assets/{name}'
    return f'https://raw.githubusercontent.com/{REPO}/{HP}/{SUB}/site/assets/{name}'


def write(rel, text):
    p = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(p) or '.', exist_ok=True)
    if HP:
        # htmlpreview runs every <script> as code: add Google data from code instead
        text = re.sub(r'<script type="application/ld\+json">(.*?)</script>', lambda m: '<script>(function(){var s=document.createElement("script");s.type="application/ld+json";s.text=' + json.dumps(m.group(1)) + ';document.head.appendChild(s)})()</script>', text, flags=re.S)
    with open(p, 'w', encoding='utf-8') as f:
        f.write(text)


def sms(num, body):
    return 'sms:' + num + '?&body=' + quote(body, safe='')


def route(lang):
    return CONTACTS[ROUTE[lang]]


# ---------------------------------------------------------------- icons

def load_icons():
    h = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
    icons = dict(re.findall(r'<symbol id="i-([a-z0-9]+)"[^>]*>(.*?)</symbol>', h, re.S))
    icons.update({
        'menu': '<path d="M4 7h16M4 12h16M4 17h16"/>',
        'x': '<path d="M6 6l12 12M18 6L6 18"/>',
        'share': '<path d="M12 3.5v11M8 7.5l4-4 4 4"/><path d="M6 11.5H5a1.5 1.5 0 0 0-1.5 1.5v6A1.5 1.5 0 0 0 5 20.5h14a1.5 1.5 0 0 0 1.5-1.5v-6a1.5 1.5 0 0 0-1.5-1.5h-1"/>',
        'cal': '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4M8 14h2M14 14h2M8 17h2"/>',
        'wrench': '<path d="M14.7 4.2a4.5 4.5 0 0 0-5.6 5.9L3.8 15.4a2 2 0 0 0 2.8 2.8l5.3-5.3a4.5 4.5 0 0 0 5.9-5.6l-2.6 2.6-2.4-.5-.5-2.4z"/>',
        'cash': '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v5M18 9.5v5"/>',
        'star': '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"/>',
        'shield': '<path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.3-7.5 9.5-4.3-1.2-7.5-4.9-7.5-9.5V6z"/><path d="M8.8 12.2l2.2 2.2 4.3-4.4"/>',
        'clock': '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
        'card': '<rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="9" cy="11" r="2.2"/><path d="M5.8 16c.6-1.6 1.8-2.4 3.2-2.4s2.6.8 3.2 2.4M14.5 10h4M14.5 13h3"/>',
        'chat2': '<path d="M5 18.5l1-3.4A7.5 7.5 0 1 1 9 18z"/>',
        'arrow': '<path d="M5 12h14M13 6l6 6-6 6"/>',
    })
    return icons


ICONS = load_icons()
USED = set()


def icon(n, cls='i'):
    USED.add(n)
    return f'<svg class="{cls}" aria-hidden="true"><use href="#i-{n}"/></svg>'


def sprite():
    syms = ''.join(f'<symbol id="i-{n}" viewBox="0 0 24 24">{ICONS[n]}</symbol>' for n in sorted(USED) if n in ICONS)
    return f'<svg aria-hidden="true" focusable="false" style="position:absolute;width:0;height:0;overflow:hidden">{syms}</svg>'


# ---------------------------------------------------------------- Google data

def hours_spec():
    days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    groups = {}
    for dd, (o, c) in sorted(HOURS['weekly'].items()):
        groups.setdefault((o, c), []).append(days[dd])
    return [{'@type': 'OpeningHoursSpecification', 'dayOfWeek': ds, 'opens': o, 'closes': c} for (o, c), ds in groups.items()]


def business_ld():
    d = {
        '@context': 'https://schema.org', '@type': 'AutoRepair', '@id': DOMAIN + '/#shop',
        'name': B['name'], 'url': DOMAIN + '/', 'telephone': '+1-508-853-3322', 'foundingDate': B['founded'],
        'address': {'@type': 'PostalAddress', 'streetAddress': B['street'], 'addressLocality': B['city'], 'addressRegion': B['region'], 'postalCode': B['zip'], 'addressCountry': B['country']},
        'geo': {'@type': 'GeoCoordinates', 'latitude': B['geo'][0], 'longitude': B['geo'][1]},
        'hasMap': B['google_maps_url'], 'openingHoursSpecification': hours_spec(),
        'paymentAccepted': ', '.join(B['payment']), 'knowsLanguage': ['en', 'pt', 'es'],
        'areaServed': [{'@type': 'City', 'name': n + ', MA'} for n in NEARBY],
        'image': DOMAIN + '/assets/og-card.jpg', 'logo': DOMAIN + '/assets/icon-512.png',
        'contactPoint': [{'@type': 'ContactPoint', 'telephone': '+1-' + c['label'], 'contactType': 'customer service',
                          'availableLanguage': [{'en': 'English', 'pt': 'Portuguese', 'es': 'Spanish'}[x] for x in c['langs']]} for c in CONTACTS.values()],
        'hasOfferCatalog': {'@type': 'OfferCatalog', 'name': 'Tire and auto repair services', 'itemListElement': [
            {'@type': 'Offer', 'itemOffered': {'@type': 'Service', 'name': s['en']['name'], 'url': DOMAIN + '/' + spath(s, 'en')}} for s in SERVICES]},
    }
    sp = []
    for ds, v in sorted(HOURS['holidays'].items()):
        o, c = (v if isinstance(v, (list, tuple)) else ('00:00', '00:00'))
        sp.append({'@type': 'OpeningHoursSpecification', 'validFrom': ds, 'validThrough': ds, 'opens': o, 'closes': c})
    if sp:
        d['specialOpeningHoursSpecification'] = sp
    links = [v for v in SOCIAL.values() if v] + [B['google_profile_url']]
    d['sameAs'] = links
    if EMAIL:
        d['email'] = EMAIL
    if B['google_rating'] and B['google_review_count']:
        d['aggregateRating'] = {'@type': 'AggregateRating', 'ratingValue': B['google_rating'], 'reviewCount': B['google_review_count']}
    return d


def crumbs_ld(items):
    return {'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
        {'@type': 'ListItem', 'position': i + 1, 'name': n, 'item': DOMAIN + '/' + p} for i, (n, p) in enumerate(items)]}


def faq_ld(pairs):
    return {'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [
        {'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in pairs]}


# ---------------------------------------------------------------- page frame

def head(lang, here, title, desc, alts, lds=(), extra_css='', preload=''):
    canon = DOMAIN + '/' + here
    alt = ''.join(f'<link rel="alternate" hreflang="{l}" href="{DOMAIN}/{p}">\n' for l, p in alts.items())
    if 'en' in alts:
        alt += f'<link rel="alternate" hreflang="x-default" href="{DOMAIN}/{alts["en"]}">\n'
    ld = '\n'.join('<script type="application/ld+json">' + json.dumps(x, ensure_ascii=False) + '</script>' for x in lds)
    css = asset('hp/core.css', here) if HP else asset('core.css')
    fonts = '' if HP else f'<link rel="preload" href="{asset("fonts/archivo.woff2")}" as="font" type="font/woff2" crossorigin>\n<link rel="preload" href="{asset("fonts/barlow-400.woff2")}" as="font" type="font/woff2" crossorigin>\n'
    robots = '<meta name="robots" content="noindex">\n' if HP else ''
    return f"""<!doctype html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{E(title)}</title>
<meta name="description" content="{E(desc)}">
{robots}<link rel="canonical" href="{canon}">
{alt}<meta name="theme-color" content="#0c0d16">
<meta name="format-detection" content="telephone=no">
<link rel="icon" href="{asset('icon-192.png', here)}">
<link rel="apple-touch-icon" href="{asset('icon-180.png', here)}">
<link rel="manifest" href="{asset('manifest.webmanifest', here) if not HP else asset('icon-192.png', here)}">
<meta property="og:type" content="website">
<meta property="og:title" content="{E(title)}">
<meta property="og:description" content="{E(desc)}">
<meta property="og:url" content="{canon}">
<meta property="og:image" content="{DOMAIN}/assets/og-card.jpg">
<meta property="og:locale" content="{LOCALE[lang]}">
<meta property="og:site_name" content="{E(B['name'])}">
<meta name="twitter:card" content="summary_large_image">
{fonts}{preload}<link rel="stylesheet" href="{css}">
{extra_css}<script src="{asset('hours.js', here)}"></script>
<script src="{asset('core.js', here)}" defer></script>
<script src="{asset('track.js', here)}" defer></script>
{ld}
</head>
"""


MUSIC_T = {'en': ('Background music', 'Music is off. Tap to play.', 'Music is on. Tap to stop.'),
           'pt': ('Música de fundo', 'Música desligada. Toque para tocar.', 'Música ligada. Toque para parar.'),
           'es': ('Música de fondo', 'Música apagada. Toque para escuchar.', 'Música encendida. Toque para parar.')}


def music_on():
    return bool(MUSIC.get('licensed') or HP)


def music_url(here):
    """production: only when licensed (file copied into site/assets). Preview: the legacy copy on jsDelivr, never in site/."""
    if MUSIC.get('licensed'):
        return asset(MUSIC['file'], here)
    if HP:
        sha = git_sha('assets/' + MUSIC['file'])
        return f'https://cdn.jsdelivr.net/gh/{REPO}@{sha}/{SUB}/assets/{MUSIC["file"]}' if sha else ''
    return ''


def music_btn(lang, here=''):
    src = music_url(here)
    if not src:
        return ''
    m = MUSIC_T[lang]
    return f'<button type="button" class="hbtn music-btn" data-src="{E(src)}" aria-pressed="false" data-off="{E(m[1])}" data-on="{E(m[2])}" aria-label="{E(m[1])}" title="{E(m[0])}">{icon("sound", "i i-sound")}{icon("mute", "i i-mute")}</button>'


def header(lang, here, key, lang_links):
    t = T[lang]
    cur = lambda k: ' aria-current="page"' if k == key else ''
    nav = ''.join(f'<a href="{E(href(ppath(k, lang)))}"{cur(k)}>{E(t["nav"][k])}</a>' for k in NAV if k != 'home')
    lng = ''.join(f'<a href="{E(lang_links[l])}" hreflang="{l}" lang="{l}" title="{E(t["lang_names"][l])}"{" aria-current=" + chr(34) + "true" + chr(34) if l == lang else ""}>{l.upper()}</a>' for l in LANGS)
    main = ''.join(f'<li><a href="{E(href(ppath(k, lang)))}"{cur(k)}>{E(t["nav"][k])}{icon("arrow")}</a></li>' for k in NAV)
    sub = ''.join(f'<li><a href="{E(href(ppath(k, lang)))}">{E(t["nav"][k])}</a></li>' for k in NAV2)
    shop = CONTACTS['shop']
    return f"""<a class="skip" href="#main">{E(t['skip'])}</a>
<header class="top">
  <a class="brand" href="{E(href(ppath('home', lang)))}"><img src="{asset('logo.webp', here)}" alt="{E(B['name'])}, {E(t['nav']['home'])}" width="440" height="266"></a>
  <nav class="nav" aria-label="{E(t['menu'])}">{nav}</nav>
  <button type="button" class="hbtn" aria-controls="srch" aria-expanded="false" aria-label="{E(t['search_label'])}">{icon('search')}</button>
  <div class="lng" role="group" aria-label="{E(t['lang_label'])}">{lng}</div>
  {music_btn(lang, here)}<a class="btn btn-red btn-sm call" href="tel:{shop['phone']}">{icon('phone')}{E(t['call'])}</a>
  <button type="button" class="hbtn menu-btn" aria-controls="mMenu" aria-expanded="false" aria-label="{E(t['menu'])}">{icon('menu')}</button>
</header>
<div class="m-menu" id="mMenu" role="dialog" aria-modal="true" aria-label="{E(t['menu'])}" hidden>
  <div class="m-head"><img src="{asset('logo.webp', here)}" alt="" width="72" height="44"><button type="button" class="hbtn" data-close aria-label="{E(t['close'])}">{icon('x')}</button></div>
  <nav aria-label="{E(t['menu'])}"><ul class="main">{main}</ul><ul class="sub">{sub}</ul>
  <div class="lng" role="group" aria-label="{E(t['lang_label'])}">{lng}</div>
  <a class="btn btn-red m-call" href="tel:{shop['phone']}">{icon('phone')}{E(t['call_shop'])} {shop['label']}</a></nav>
</div>
<div class="srch" id="srch" role="dialog" aria-modal="true" aria-label="{E(t['search_label'])}" data-index="{E(asset('hp/search-' + lang + '.json', here) if HP else asset('search-' + lang + '.json'))}" data-none="{E(t['search_none'].format(shop=CONTACTS['shop']['label'], pt=CONTACTS['leo']['label']))}" hidden>
  <div class="srch-box">
    <div class="srch-in">{icon('search')}<label for="srchIn" class="sr">{E(t['search_label'])}</label><input id="srchIn" type="search" autocomplete="off" enterkeyhint="search" placeholder="{E(t['search_ph'])}" role="combobox" aria-expanded="true" aria-controls="srchRes"><button type="button" class="hbtn" data-close aria-label="{E(t['close'])}">{icon('x')}</button></div>
    <div class="srch-pop" id="srchPop"><span>{E(t['search_hint'])}</span>{''.join(f'<button type="button">{E(p)}</button>' for p in t['search_pop'])}</div>
    <ul class="srch-res" id="srchRes" role="listbox" aria-label="{E(t['search'])}"></ul>
  </div>
</div>
"""


def crumbs(lang, items):
    t = T[lang]
    lis = ''.join(f'<li><a href="{E(href(p))}">{E(n)}</a></li>' for n, p in items[:-1]) + f'<li aria-current="page">{E(items[-1][0])}</li>'
    return f'<nav class="crumbs" aria-label="{E(t["breadcrumb"])}"><ol>{lis}</ol></nav>'


def footer(lang, here):
    t = T[lang]
    r = route(lang)
    main = ''.join(f'<li><a href="{E(href(ppath(k, lang)))}">{E(t["nav"][k])}</a></li>' for k in NAV if k != 'home')
    sub = ''.join(f'<li><a href="{E(href(ppath(k, lang)))}">{E(t["nav"][k])}</a></li>' for k in NAV2)
    social = ''.join(f'<li><a href="{E(u)}" rel="noopener" target="_blank">{n.title() if n != "youtube" else "YouTube"}</a></li>' for n, u in SOCIAL.items() if u)
    email = f'<li><a href="mailto:{E(EMAIL)}">{E(EMAIL)}</a></li>' if EMAIL else ''
    rows = ''.join(f'<li>{E(a)}: {E(b)}</li>' for a, b in t['hours_rows'])
    return f"""<footer class="foot">
  <div class="foot-grid">
    <div>
      <img class="logo" src="{asset('logo.webp', here)}" alt="{E(B['name'])}" width="440" height="266" loading="lazy">
      <p class="tag">{E(t['foot_tag'])}</p>
      <div class="qr"><img src="{asset('review-qr.svg', here)}" alt="" width="96" height="96" loading="lazy"><small>{E(t['foot_qr'])}</small></div>
      <a class="btn btn-ghost btn-sm rv-btn" href="{E(B['google_review_url'])}" target="_blank" rel="noopener">{icon('star')}{E(t['foot_review'])}</a>
    </div>
    <div><h2>{E(t['menu'])}</h2><ul>{main}</ul></div>
    <div><h2>L&amp;M Tire</h2><ul>{sub}{social}</ul></div>
    <div><h2>{E(t['nav']['contact'])}</h2><ul>
      <li>{E(B['street'])}, {E(B['city'])}, {B['region']} {B['zip']}</li>
      <li><a href="tel:{CONTACTS['shop']['phone']}">{E(t['shop'])}: {CONTACTS['shop']['label']}</a></li>
      <li><a href="{E(sms(r['phone'], t['sms_hello']))}">{E(t['text'])}: {r['label']}</a></li>
      {email}{rows}
    </ul>
    <h2 style="margin-top:18px">{E(t['a11y'])}</h2>
    <div class="a11y"><button type="button" data-a11y="big" aria-pressed="false">{E(t['a11y_big'])}</button><button type="button" data-a11y="contrast" aria-pressed="false">{E(t['a11y_contrast'])}</button><button type="button" data-a11y="calm" aria-pressed="false">{E(t['a11y_calm'])}</button></div>
    </div>
  </div>
  <div class="fine"><span>© <span data-year>2026</span> {E(B['name'])} · {E(B['city'])}, {B['region']}</span><span>{E(t['speak'])}</span></div>
</footer>
<nav class="bar" id="bar" aria-label="{E(t['bar'])}">
  <a href="{E(sms(r['phone'], t['sms_hello']))}" data-track="text">{icon('text')}{E(t['text'])}</a>
  <a class="hot" href="tel:{CONTACTS['shop']['phone']}">{icon('phone')}{E(t['call'])}</a>
  <a href="{E(DIRECTIONS)}" target="_blank" rel="noopener">{icon('pin')}{E(t['bar_dir'])}</a>
</nav>
"""


def page(lang, key, here, alts, title, desc, body, lds=(), extra_css='', preload='', extra_js='', fname=None):
    """assemble one page; alts = {lang: path}"""
    lang_links = {l: href(alts[l]) for l in LANGS}
    top = header(lang, here, key, lang_links)
    foot = footer(lang, here)
    doc_body = f'<body>\n{top}<main id="main" tabindex="-1">\n{body}\n</main>\n{foot}{extra_js}'
    out = head(lang, here, title, desc, alts, lds, extra_css, preload) + doc_body.replace('<body>\n', '<body>\n' + sprite() + '\n', 1) + '\n</body>\n</html>\n'
    write(fname or (here + 'index.html'), out)
    USED.clear()
    return here, alts


def alts_of(key):
    return {l: ppath(key, l) for l in LANGS}


def phead(h1, lede='', extra=''):
    return f'<section class="phead"><div class="wrap"><h1>{E(h1)}</h1>{f"<p class=lede>{E(lede)}</p>" if lede else ""}{extra}</div></section>'


def status_line():
    return '<p class="status" data-status role="status"><i></i><span></span></p>'


def hours_table(lang):
    t = T[lang]
    rows = ''.join(f'<tr data-days="{dd}"><th scope="row">{E(a)}</th><td>{E(b)}</td></tr>' for dd, (a, b) in zip(['1,2,3,4,5', '6', '0'], t['hours_rows']))
    return f'<table class="hours"><caption class="sr">{E(t["hours"])}</caption><tbody>{rows}</tbody></table><p class="hint" style="margin-top:8px">{E(t["hours_note"])}</p>'


def people(lang):
    t = T[lang]
    c = CONTACTS
    def row(who, langs, k, lang_attr=''):
        wa = f' · <a href="https://wa.me/{c[k]["phone"][1:]}" target="_blank" rel="noopener">WhatsApp</a>' if c[k]['whatsapp'] else ''
        return f'<div class="person"><div><b>{E(who)}</b><small{lang_attr}>{E(langs)}{wa}</small></div><a href="tel:{c[k]["phone"]}">{c[k]["label"]}</a></div>'
    return row(t['shop'], t['langs_shop'], 'shop') + row(t['owner'], t['langs_owner'], 'cid') + row(t['partner'], t['langs_partner'], 'leo', ' lang="pt"' if lang != 'pt' else '')


def visit_card(lang, here):
    t = T[lang]
    return f"""<div class="grid2">
  <div class="card">
    <h2 style="font-size:1.4rem;margin-bottom:6px">{E(t['address'])}</h2>
    <p style="font-size:1.15rem;font-weight:600">{E(B['street'])}<br>{E(B['city'])}, {B['region']} {B['zip']}</p>
    <div class="btn-row" style="margin-top:16px"><a class="btn btn-ghost btn-sm" href="{E(DIRECTIONS)}" target="_blank" rel="noopener">{icon('pin')}{E(t['directions'])}</a><a class="btn btn-ghost btn-sm" href="{E(B['google_maps_url'])}" target="_blank" rel="noopener">{E(t['map_open'])}</a></div>
    <p class="hint" style="margin-top:16px">{E(t['area'])}</p>
  </div>
  <div class="card">
    <h2 style="font-size:1.4rem;margin-bottom:6px">{E(t['hours'])}</h2>
    {status_line()}
    {hours_table(lang)}
  </div>
</div>"""


# ---------------------------------------------------------------- pages

def blurb(c):
    """short line under a service name: the first 'come in if' sign, else the first sentence"""
    x = c['intro'].split('. ')[0].rstrip('.') + '.'
    return x if len(x) <= 110 else c['signs'][0]


def build_home(lang):
    t = T[lang]
    here = ppath('home', lang)
    r = route(lang)
    tiles = ''.join(f'<li><a class="tile" href="{E(href(spath(SVC[k], lang)))}"><span class="ic">{icon(SVC[k]["icon"])}</span><span><b>{E(SVC[k][lang]["name"])}</b><small>{E(blurb(SVC[k][lang]))}</small></span></a></li>' for k in REPAIR_KEYS + ['flat-tire-repair'])
    stats = f'<li class="stat"><b>{STATS["since"]}</b><span>{E(t["stat_since"])}</span></li>' if STATS['since'] else ''
    if STATS['languages']:
        stats += f'<li class="stat"><b>{STATS["languages"]}</b><span>{E(t["stat_langs"])}: {E(t["stat_langs_s"])}</span></li>'
    if STATS['google_reviews']:
        stats += f'<li class="stat"><b>{STATS["google_reviews"]}</b><span>Google</span></li>'
    a = ACIMA[lang]
    rv = REVIEWS[lang]
    body = f"""<section class="hero" aria-labelledby="h1">
  <div class="hero-media" aria-hidden="true">
    <picture><source media="(max-width:760px)" srcset="{asset('hero-sq.webp', here)}"><img src="{asset('hero-poster.webp', here)}" alt="" width="1280" height="720" fetchpriority="high" decoding="async" class="hero-img"></picture>
    <video id="heroVid" muted playsinline loop preload="none" tabindex="-1" data-wide="{asset('hero-720.mp4', here)}" data-sq="{asset('hero-sq.mp4', here)}"></video>
  </div>
  <div class="hero-in">
    <p class="kicker mono">{E(t['hero_kicker'])}</p>
    <h1 id="h1">{E(t['hero_h1'])}</h1>
    <p class="lede">{E(t['hero_sub'])}</p>
    <div class="btn-row">
      <a class="btn btn-red" href="{E(href(ppath('tires', lang)))}">{icon('tread')}{E(t['hero_tires'])}</a>
      <a class="btn btn-ghost" href="{E(href(ppath('book', lang)))}">{icon('cal')}{E(t['hero_book'])}</a>
    </div>
    {status_line()}
  </div>
</section>

<section class="sec sec-tight" aria-labelledby="q-h">
  <div class="wrap card">
    <h2 id="q-h" style="font-size:clamp(1.5rem,3vw,2.1rem)">{E(t['quick_h'])}</h2>
    <p class="note" style="margin-top:8px">{E(t['quick_p'])}</p>
    <form class="quick" action="{E(href(ppath('tires', lang)))}" method="get" data-size-go>
      <div class="field"><label for="qsz">{E(t['quick_size'])}</label><input id="qsz" name="size" inputmode="text" autocomplete="off" autocapitalize="characters" placeholder="{E(t['quick_size_ph'])}" maxlength="18"></div>
      <button class="btn btn-red" type="submit">{icon('search')}{E(t['quick_go'])}</button>
    </form>
    <p class="quick-alt"><a class="link-arrow" href="{E(href(ppath('tires', lang)))}#by-car">{E(t['quick_car'])}</a></p>
  </div>
</section>

<section class="sec" aria-labelledby="svc-h">
  <div class="wrap">
    <div class="sec-h"><div><p class="kicker mono">{E(t['svc_kicker'])}</p><h2 id="svc-h">{E(t['svc_h'])}</h2></div><a class="link-arrow" href="{E(href(ppath('repair', lang)))}">{E(t['svc_more'])}</a></div>
    <ul class="tiles">{tiles}</ul>
  </div>
</section>

<section class="sec" aria-labelledby="cred-h">
  <div class="wrap">
    <p class="kicker mono">{E(t['cred_kicker'])}</p><h2 id="cred-h" style="font-size:clamp(1.7rem,3.6vw,2.6rem);max-width:22ch">{E(t['cred_h'])}</h2>
    <ul class="stats" style="margin-top:24px">{stats}</ul>
    <div class="card" style="margin-top:16px;display:flex;flex-wrap:wrap;gap:16px;align-items:center;justify-content:space-between">
      <p style="max-width:52ch">{E(t['reviews_line'])}</p>
      <div class="btn-row"><a class="btn btn-ghost btn-sm" href="{E(B['google_profile_url'])}" target="_blank" rel="noopener">{icon('star')}{E(rv['read'])}</a><a class="btn btn-ghost btn-sm" href="{E(B['google_review_url'])}" target="_blank" rel="noopener">{E(rv['write'])}</a></div>
    </div>
  </div>
</section>

<section class="sec sec-tight" aria-labelledby="fin-h">
  <div class="wrap card" style="border-color:rgba(138,144,255,.35)">
    <p class="kicker mono" style="color:var(--blue-bright)">{E(t['fin_kicker'])}</p>
    <h2 id="fin-h" style="font-size:clamp(1.5rem,3vw,2.1rem)">{E(a['title'])}</h2>
    <p class="note" style="margin-top:10px">{E(a['body'])}</p>
    <ul class="ticks blue" style="margin-top:14px">{''.join(f'<li>{E(x)}</li>' for x in a['points'])}</ul>
    <p style="margin-top:16px"><a class="link-arrow" href="{E(href(ppath('financing', lang)))}">{E(t['fin_more'])}</a></p>
  </div>
</section>

<section class="sec" aria-labelledby="visit-h">
  <div class="wrap">
    <div class="sec-h"><div><p class="kicker mono">{E(t['visit_kicker'])}</p><h2 id="visit-h">{E(t['visit_h'])}</h2></div><a class="link-arrow" href="{E(href(ppath('contact', lang)))}">{E(t['nav']['contact'])}</a></div>
    {visit_card(lang, here)}
  </div>
</section>

<section class="sec sec-tight" aria-labelledby="ct-h">
  <div class="wrap card">
    <h2 id="ct-h" style="font-size:clamp(1.5rem,3vw,2.1rem)">{E(t['contact_h'])}</h2>
    <p class="note" style="margin-top:8px">{E(t['contact_p'])} {E(t['speak'])}</p>
    <div class="btn-row" style="margin-top:18px">
      <a class="btn btn-red" href="tel:{CONTACTS['shop']['phone']}">{icon('phone')}{E(t['call'])} {CONTACTS['shop']['label']}</a>
      <a class="btn btn-ghost" href="{E(sms(r['phone'], t['sms_hello']))}">{icon('text')}{E(t['text'])} {r['label']}</a>
      <a class="btn btn-ghost" href="{E(href(ppath('book', lang)))}">{icon('cal')}{E(t['nav']['book'])}</a>
    </div>
  </div>
</section>"""
    pre = f'<link rel="preload" as="image" href="{asset("hero-sq.webp", here)}" media="(max-width:760px)" fetchpriority="high">\n<link rel="preload" as="image" href="{asset("hero-poster.webp", here)}" media="(min-width:761px)" fetchpriority="high">\n'
    return page(lang, 'home', here, alts_of('home'), t['home_title'], t['home_desc'], body, [business_ld()], preload=pre)


def cfg_js(lang, here, txt=True):
    """public settings for the page scripts (no secrets: phone numbers and display mode only)"""
    r = route(lang)
    rt = {l: {'num': route(l)['phone'], 'label': route(l)['label'], 'wa': route(l)['phone'] if route(l)['whatsapp'] else ''} for l in LANGS}
    cfg = {'shop': CONTACTS['shop']['phone'], 'shopLabel': CONTACTS['shop']['label'], 'text': r['phone'], 'textLabel': r['label'],
           'wa': r['phone'] if r['whatsapp'] else '', 'route': rt, 'endpoint': DELIVERY['endpoint'],
           'inv': {'mode': INVENTORY['mode'], 'feed': INVENTORY['feed']}}
    out = '<script>window.LM_CFG=' + json.dumps(cfg, ensure_ascii=False) + ';'
    if txt:
        out += 'window.LM_TXT=' + json.dumps(JS_TXT[lang], ensure_ascii=False) + ';window.LM_MAKES=' + json.dumps(MAKES) + ';'
    return out + '</script>\n'


def build_tires(lang):
    t = T[lang]
    here = ppath('tires', lang)
    tiles = ''.join(f'<li><a class="tile" href="{E(href(spath(SVC[k], lang)))}"><span class="ic">{icon(SVC[k]["icon"])}</span><span><b>{E(SVC[k][lang]["name"])}</b><small>{E(blurb(SVC[k][lang]))}</small></span></a></li>' for k in TIRE_KEYS + ['wheel-alignment'])
    body = crumbs(lang, [(t['crumb_home'], ppath('home', lang)), (t['nav']['tires'], here)]) + phead(t['tires_h1'], t['tires_lede']) + f"""
<section class="sec sec-tight" id="tire-search" aria-label="{E(t['quick_h'])}">
  <div class="wrap" data-tire-search></div>
</section>
<section class="sec" aria-labelledby="ty-h">
  <div class="wrap"><h2 id="ty-h" style="font-size:clamp(1.5rem,3vw,2.1rem);margin-bottom:20px">{E(t['tires_types'])}</h2><ul class="tiles">{tiles}</ul></div>
</section>"""
    lds = [crumbs_ld([(t['crumb_home'], ppath('home', lang)), (t['nav']['tires'], here)])]
    return page(lang, 'tires', here, alts_of('tires'), t['tires_title'], t['tires_desc'], body, lds,
                extra_js=cfg_js(lang, here) + f'<script src="{asset("vehicle.js", here)}" defer></script>\n<script src="{asset("tires.js", here)}" defer></script>\n')


def build_repair(lang):
    t = T[lang]
    here = ppath('repair', lang)
    def tl(keys):
        return ''.join(f'<li><a class="tile" href="{E(href(spath(SVC[k], lang)))}"><span class="ic">{icon(SVC[k]["icon"])}</span><span><b>{E(SVC[k][lang]["name"])}</b><small>{E(blurb(SVC[k][lang]))}</small></span></a></li>' for k in keys)
    d = DEPOSIT[lang]
    body = crumbs(lang, [(t['crumb_home'], ppath('home', lang)), (t['nav']['repair'], here)]) + phead(t['repair_h1'], t['repair_lede'], f'<div class="btn-row"><a class="btn btn-red" href="{E(href(ppath("book", lang)))}">{icon("cal")}{E(t["nav"]["book"])}</a><a class="btn btn-ghost" href="tel:{CONTACTS["shop"]["phone"]}">{icon("phone")}{E(t["call"])} {CONTACTS["shop"]["label"]}</a></div>') + f"""
<section class="sec sec-tight" aria-label="{E(t['nav']['repair'])}"><div class="wrap"><ul class="tiles">{tl(REPAIR_KEYS)}</ul>
<p class="note" style="margin-top:20px">{E(d['short'])} <a href="{E(href(ppath('policies', lang)))}">{E(t['nav']['policies'])}</a></p>
<p class="note" style="margin-top:8px">{E(t['no_body'])}</p></div></section>
<section class="sec" aria-labelledby="rt-h"><div class="wrap"><h2 id="rt-h" style="font-size:clamp(1.5rem,3vw,2.1rem);margin-bottom:20px">{E(t['repair_tires'])}</h2><ul class="tiles">{tl(TIRE_KEYS)}</ul></div></section>"""
    lds = [crumbs_ld([(t['crumb_home'], ppath('home', lang)), (t['nav']['repair'], here)])]
    return page(lang, 'repair', here, alts_of('repair'), t['repair_title'], t['repair_desc'], body, lds)


def build_book(lang):
    t = T[lang]
    here = ppath('book', lang)
    d = DEPOSIT[lang]
    body = crumbs(lang, [(t['crumb_home'], ppath('home', lang)), (t['nav']['book'], here)]) + phead(t['book_h1'], t['book_lede']) + f"""
<section class="sec sec-tight" aria-label="{E(t['book_h1'])}"><div class="wrap" data-book></div></section>
<section class="sec sec-tight" aria-labelledby="dep-h"><div class="wrap card"><h2 id="dep-h" style="font-size:1.4rem;margin-bottom:10px">{E(d['title'])}</h2><p class="note">{E(d['short'])}</p><p class="note" style="margin-top:8px"><b>{E(d['confirm'])}</b></p><p style="margin-top:12px"><a class="link-arrow" href="{E(href(ppath('policies', lang)))}">{E(t['nav']['policies'])}</a></p></div></section>"""
    lds = [crumbs_ld([(t['crumb_home'], ppath('home', lang)), (t['nav']['book'], here)])]
    return page(lang, 'book', here, alts_of('book'), t['book_title'], t['book_desc'], body, lds,
                extra_js=cfg_js(lang, here) + f'<script src="{asset("vehicle.js", here)}" defer></script>\n<script src="{asset("book.js", here)}" defer></script>\n')


HELP_TOOLS = [(k, ic, {l: (TC[l][k]['name'], TC[l][k]['blurb'], TC[l][k]['slug'], TC[l][k]['kw']) for l in LANGS}) for k, ic, _ in TOOLS]


def tpath(k, lang):
    return ppath('help', lang) + TC[lang][k]['slug'] + '/'


def build_help(lang):
    t = T[lang]
    here = ppath('help', lang)
    items = ''.join(f'<li><a class="tile" href="{E(href(tpath(k, lang)))}"><span class="ic">{icon(ic)}</span><span><b>{E(v[lang][0])}</b><small>{E(v[lang][1])}</small></span></a></li>' for k, ic, v in HELP_TOOLS)
    body = crumbs(lang, [(t['crumb_home'], ppath('home', lang)), (t['nav']['help'], here)]) + phead(t['help_h1'], t['help_lede']) + f"""
<section class="sec sec-tight" aria-label="{E(t['help_h1'])}"><div class="wrap"><ul class="tiles">{items}</ul></div></section>"""
    tp = TIPS[lang]
    cards = ''
    for i, (h, p_, link, lab) in enumerate(tp['items']):
        u = href(ppath('book', lang)) if link == 'book' else href(tpath(link, lang))
        rot = ''
        if i == 1:
            rot = (f'<div class="rot"><svg viewBox="0 0 120 150" aria-hidden="true"><rect x="32" y="12" width="56" height="126" rx="22" class="rot-car"/><rect x="40" y="34" width="40" height="26" rx="6" class="rot-glass"/>'
                   + ''.join(f'<g class="rot-t" data-p="{j}"><rect x="-8" y="-14" width="16" height="28" rx="5"/></g>' for j in range(4))
                   + f'</svg><button type="button" class="btn btn-ghost btn-sm rot-go">{E(tp["rotate"])}</button><span class="sr" aria-live="polite" data-done="{E(tp["rotated"])}"></span></div>')
        cards += f'<li class="tip card"><span class="tip-n">{i + 1:02d}</span><h3>{E(h)}</h3><p class="note">{E(p_)}</p>{rot}<a class="link-arrow" href="{E(u)}">{E(lab)}</a></li>'
    body += f"""<section class="sec" aria-labelledby="tips-h"><div class="wrap" data-tool="tips"><p class="kicker mono">{E(tp['kicker'])}</p><div class="tips-head"><h2 id="tips-h">{E(tp['h'])}</h2><div class="tips-nav"><button type="button" class="btn btn-ghost btn-sm tips-p" aria-label="{E(tp['prev'])}">←</button><button type="button" class="btn btn-ghost btn-sm tips-n" aria-label="{E(tp['next'])}">→</button></div></div><ul class="tips">{cards}</ul></div></section>"""
    lds = [crumbs_ld([(t['crumb_home'], ppath('home', lang)), (t['nav']['help'], here)])]
    extra = f'<script>window.LM_TXT={{}};</script><script src="{asset("help.js", here)}" defer></script>\n'
    return page(lang, 'help', here, alts_of('help'), t['help_title'], t['help_desc'], body, lds, extra_js=extra)


def tool_static(k, lang, here):
    c = TC[lang][k]
    lst = lambda xs, cls='ticks': f'<ul class="{cls}">' + ''.join(f'<li>{E(x)}</li>' for x in xs) + '</ul>'
    h2 = lambda x: f'<h2 class="th">{E(x)}</h2>'
    if k == 'penny':
        return h2(c['steps_h']) + '<ol class="steps">' + ''.join(f'<li>{E(x)}</li>' for x in c['steps']) + '</ol>' + h2(c['limits_h']) + lst(c['limits']) + f'<p class="hint" style="margin-top:12px">{E(c["source"])}</p>'
    if k == 'puncture':
        return h2(c['plug_h']) + f'<p class="note">{E(c["plug_p"])}</p>' + h2(c['drive_h']) + lst(c['drive']) + f'<p class="hint" style="margin-top:12px">{E(c["source"])}</p>'
    if k in ('age', 'pressure'):
        return h2(c['tips_h']) + lst(c['tips'])
    if k in ('size', 'oil'):
        return f'<p class="note">{E(c["note"])}</p>'
    return ''


def build_tool(k, ic, svc_key, lang):
    t, c, g = T[lang], TC[lang][k], TC[lang]
    here = tpath(k, lang)
    alts = {l: tpath(k, l) for l in LANGS}
    r = route(lang)
    items = [(t['crumb_home'], ppath('home', lang)), (t['nav']['help'], ppath('help', lang)), (c['name'], here)]
    if k == 'sounds':
        tool = '<div class="sfx-list">' + ''.join(f'<div class="card sfx"><button type="button" class="btn btn-ghost" aria-pressed="false" data-sfx="{E(asset("sfx-" + key + ".mp3", here))}">{icon("play")}<span>{E(c["play"])}</span><b class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></b></button><div><h2>{E(n)}</h2><p class="note">{E(desc)}</p><a class="link-arrow" href="{E(href(spath(SVC[sk], lang)))}">{E(SVC[sk][lang]["name"])}</a></div></div>' for key, n, desc, sk in c['items']) + f'<p class="hint">{E(c["audio_note"])}</p></div>'
        tool = f'<div data-tool="sounds">{tool}</div>'
    elif k == 'symptoms':
        btns = ''
        for key, ic_, sk, snds in SYMPTOMS:
            it = c['items'][key]
            sv = SVC[sk]
            snd = ','.join(f'{c["snd"][x]}|{asset("sfx-" + x + ".mp3", here)}' for x in snds)
            btns += (f'<button type="button" class="sy-b" aria-pressed="false" data-svc="{E(sv[lang]["name"])}" data-href="{E(href(spath(sv, lang)))}" '
                     f'data-why="{E(it[2])}" data-sms="{E(sms(r["phone"], it[3]))}" data-snd="{E(snd)}"><span class="ic">{icon(ic_)}</span><span><b>{E(it[0])}</b><small>{E(it[1])}</small></span></button>')
        tool = (f'<div data-tool="symptoms" class="tool-mount tm-sy"><div class="sy-grid" role="group" aria-label="{E(c["pick"])}">{btns}</div>'
                f'<div class="sy-out card" aria-live="polite" hidden><p class="kicker mono">{E(c["fits"])}</p><h2 class="sy-svc"></h2><p class="note sy-why"></p>'
                f'<div class="sy-hear" hidden><p class="lbl">{E(c["hear"])}</p><div class="sy-snds"></div></div>'
                f'<div class="btn-row"><a class="btn btn-red sy-text" href="#">{icon("text")}{E(c["text_it"])}</a><a class="btn btn-ghost sy-link" href="#">{E(c["see_svc"])}</a></div></div></div>')
    elif k == 'chooser':
        qs = ''.join(f'<fieldset class="field ch-q"><legend class="lbl"><span class="ch-n mono">{i + 1}</span>{E(q)}</legend><div class="chips">' + ''.join(f'<label><input type="radio" name="q{i + 1}" value="{v}"><span>{E(lab)}</span></label>' for v, lab in opts) + '</div></fieldset>' for i, (q, opts) in enumerate(c['qs']))
        tool = (f'<div data-tool="chooser" class="tool-mount"><form class="tool-card ch-form" onsubmit="return false">{qs}<div class="ch-prog" aria-hidden="true"><i></i></div></form>'
                f'<div class="ch-res card" aria-live="polite" hidden><p class="kicker mono">{E(c["tip"])}</p><h2></h2><p class="note"></p>'
                f'<div class="btn-row"><a class="btn btn-red" href="{E(href(ppath("tires", lang)))}">{icon("tread")}{E(c["quote"])}</a><a class="btn btn-ghost ch-text" href="#">{icon("text")}{E(g["text_us"])}</a></div></div></div>')
    elif k == 'lights':
        tool = '<div data-tool="lights" class="tool-mount tm-lights"><ul class="lights">' + ''.join(f'<li class="card"><h2>{E(n)}</h2><p class="note">{E(desc)}</p></li>' for n, desc in c['items']) + '</ul></div>' + f'<div class="card" style="margin-top:16px"><h2 class="th" style="margin-top:0">{E(c["remind_h"])}</h2>' + ''.join(f'<p class="note" style="margin-top:10px">{E(x)}</p>' for x in c['remind']) + '</div>'
    else:
        imgs = {}
        if k == 'penny':
            imgs = {'tread820': asset('tread-820.webp', here), 'tread1400': asset('tread-1400.webp', here)}
        elif k == 'puncture':
            imgs = {'tire': asset('tire-real.webp', here), 'nailHead': asset('nail-head2.webp', here), 'zoomNail': asset('zoom-nail.webp', here), 'zoomShoulder': asset('zoom-shoulder.webp', here), 'zoomSide': asset('zoom-side.webp', here)}
        tool = f'<div data-tool="{k}" data-penny="{E(asset("penny.webp", here))}" data-img="{E(json.dumps(imgs))}" class="tool-mount tm-{k}"></div>'
    vid = ''
    if VIDEOS.get(k):
        vid = f'<section class="sec sec-tight"><div class="wrap"><button type="button" class="video-lite" data-yt="{E(VIDEOS[k])}">{icon("play")}<span>{E(g["video"])}</span><small>{E(g["video_note"])}</small></button></div></section>'
    s = SVC[svc_key]
    body = crumbs(lang, items) + phead(c['h1'], c['lede']) + f"""
<section class="sec sec-tight" aria-label="{E(c['name'])}"><div class="wrap">{tool}</div></section>
<section class="sec sec-tight"><div class="wrap"><div class="prose">{tool_static(k, lang, here)}</div>
<p class="box-amber" style="margin-top:22px">{E(g['disclaimer'])}</p>
<div class="btn-row" style="margin-top:18px"><a class="btn btn-red" href="{E(href(ppath('book', lang)))}#svc={E(svc_key)}">{icon('cal')}{E(g['book'])}</a><a class="btn btn-ghost" href="{E(sms(r['phone'], t['sms_hello']))}">{icon('text')}{E(g['text_us'])}</a></div></div></section>
{vid}<section class="sec sec-tight"><div class="wrap grid2"><a class="tile" href="{E(href(spath(s, lang)))}"><span class="ic">{icon(s['icon'])}</span><span><small>{E(g['related'])}</small><b>{E(s[lang]['name'])}</b></span></a><a class="tile" href="{E(href(ppath('help', lang)))}"><span class="ic">{icon(ic)}</span><span><b>{E(g['all_tools'])}</b></span></a></div></section>"""
    txt = dict(c)
    txt['penny_img'] = c.get('h1', '')
    js = '<script>window.LM_TXT=' + json.dumps(txt, ensure_ascii=False) + ';'
    if k == 'size':
        js += 'window.LM_LI=' + json.dumps(LOAD_INDEX) + ';window.LM_SR=' + json.dumps(SPEED) + ';'
    js += '</script>\n'
    extra = cfg_js(lang, here, txt=False) + js + f'<script src="{asset("help.js", here)}" defer></script>\n'
    lds = [crumbs_ld(items)]
    return page(lang, 'help', here, alts, c['title'], c['desc'], body, lds, extra_js=extra)


def build_financing(lang):
    t = T[lang]
    here = ppath('financing', lang)
    a = ACIMA[lang]
    r = route(lang)
    href_a = B['acima_url'] or sms(r['phone'], a['sms'])
    label = a['cta_apply'] if B['acima_url'] else a['cta']
    ext = ' target="_blank" rel="noopener"' if B['acima_url'] else ''
    body = crumbs(lang, [(t['crumb_home'], ppath('home', lang)), (t['nav']['financing'], here)]) + phead(t['fin_h1'], '') + f"""
<section class="sec sec-tight" aria-labelledby="ac-h"><div class="wrap card" style="border-color:rgba(138,144,255,.35)">
  <p class="kicker mono" style="color:var(--blue-bright)">{E(a['kicker'])}</p>
  <h2 id="ac-h" style="font-size:clamp(1.6rem,3.4vw,2.4rem)">{E(a['title'])}</h2>
  <p class="lede">{E(a['body'])}</p>
  <ul class="ticks blue" style="margin-top:16px">{''.join(f'<li>{E(x)}</li>' for x in a['points'])}</ul>
  <div class="btn-row" style="margin-top:22px"><a class="btn btn-red" data-track="acima" href="{E(href_a)}"{ext}>{icon('text')}{E(label)}</a><a class="btn btn-ghost" href="tel:{CONTACTS['shop']['phone']}">{icon('phone')}{CONTACTS['shop']['label']}</a></div>
</div></section>"""
    lds = [crumbs_ld([(t['crumb_home'], ppath('home', lang)), (t['nav']['financing'], here)])]
    return page(lang, 'financing', here, alts_of('financing'), t['fin_title'], t['fin_desc'], body, lds)


def build_contact(lang):
    t = T[lang]
    here = ppath('contact', lang)
    r = route(lang)
    body = crumbs(lang, [(t['crumb_home'], ppath('home', lang)), (t['nav']['contact'], here)]) + phead(t['contact_h1'], t['contact_lede'], f"""<div class="btn-row"><a class="btn btn-red" href="tel:{CONTACTS['shop']['phone']}">{icon('phone')}{E(t['call'])} {CONTACTS['shop']['label']}</a><a class="btn btn-ghost" href="{E(sms(r['phone'], t['sms_hello']))}">{icon('text')}{E(t['text'])} {r['label']}</a><a class="btn btn-ghost" href="{E(DIRECTIONS)}" target="_blank" rel="noopener">{icon('pin')}{E(t['directions'])}</a></div>""") + f"""
<section class="sec sec-tight" aria-label="{E(t['visit_h'])}"><div class="wrap">{visit_card(lang, here)}</div></section>
<section class="sec sec-tight" aria-labelledby="who-h"><div class="wrap card"><h2 id="who-h" style="font-size:1.4rem;margin-bottom:6px">{E(t['who'])}</h2>{people(lang)}<p class="hint" style="margin-top:14px">{E(t['speak'])} {E(t['no_body'])}</p></div></section>
<section class="sec sec-tight" id="save" aria-label="vCard"><div class="wrap" data-contact-tools></div></section>"""
    lds = [crumbs_ld([(t['crumb_home'], ppath('home', lang)), (t['nav']['contact'], here)]), business_ld()]
    return page(lang, 'contact', here, alts_of('contact'), t['contact_title'], t['contact_desc'], body, lds)


def build_about(lang):
    t = T[lang]
    here = ppath('about', lang)
    paras = ''.join(f'<p>{E(p)}</p>' for p in t['about_body'])
    photos = ''
    if PHOTOS:
        pt = PHOTO_TEXT[lang]
        figs = ''.join(f'<figure><img src="{asset("photos/" + fn, here)}" alt="{E(alt[lang])}" loading="lazy" decoding="async"><figcaption>{E(pt["cats"].get(cat, ""))}</figcaption></figure>' for fn, alt, cat in PHOTOS)
        photos = f'<section class="sec" aria-labelledby="ph-h"><div class="wrap"><h2 id="ph-h">{E(pt["title"])}</h2><div class="grid3">{figs}</div></div></section>'
    body = crumbs(lang, [(t['crumb_home'], ppath('home', lang)), (t['nav']['about'], here)]) + phead(t['about_h1'], t['about_lede']) + f"""
<section class="sec sec-tight"><div class="wrap prose">{paras}<h2>{E(t['about_not'])}</h2><p>{E(t['about_not_p'])}</p></div></section>{photos}"""
    lds = [crumbs_ld([(t['crumb_home'], ppath('home', lang)), (t['nav']['about'], here)])]
    return page(lang, 'about', here, alts_of('about'), t['about_title'], t['about_desc'], body, lds)


def build_reviews(lang):
    t = T[lang]
    here = ppath('reviews', lang)
    rv = REVIEWS[lang]
    score = ''
    if B['google_rating'] and B['google_review_count']:
        score = f'<p class="stat"><b>{B["google_rating"]}</b><span>{E(rv["rating"].format(r=B["google_rating"], n=B["google_review_count"]))}</span></p>'
    body = crumbs(lang, [(t['crumb_home'], ppath('home', lang)), (t['nav']['reviews'], here)]) + phead(t['reviews_h1'], t['reviews_lede']) + f"""
<section class="sec sec-tight"><div class="wrap card">{score}<p>{E(rv['ask'])}</p>
<div class="btn-row" style="margin-top:18px"><a class="btn btn-red" href="{E(B['google_review_url'])}" target="_blank" rel="noopener">{icon('star')}{E(rv['write'])}</a><a class="btn btn-ghost" href="{E(B['google_profile_url'])}" target="_blank" rel="noopener">{E(rv['read'])}</a></div>
<div class="qr" style="display:flex;gap:14px;align-items:center;margin-top:20px"><img src="{asset('review-qr.svg', here)}" alt="" width="120" height="120" style="background:#fff;border-radius:10px;padding:6px" loading="lazy"><small class="hint">{E(t['foot_qr'])}</small></div>
</div></section>"""
    lds = [crumbs_ld([(t['crumb_home'], ppath('home', lang)), (t['nav']['reviews'], here)])]
    return page(lang, 'reviews', here, alts_of('reviews'), t['reviews_title'], t['reviews_desc'], body, lds)


def build_policies(lang):
    t = T[lang]
    here = ppath('policies', lang)
    p, d = POLICIES[lang], DEPOSIT[lang]
    cats = [(d['title'], d['items'])] + p['cats']
    blocks = ''.join(f'<details{" open" if i == 0 else ""} id="p{i}"><summary>{E(ti)}</summary><ul>{"".join(f"<li>{E(x)}</li>" for x in items)}</ul></details>' for i, (ti, items) in enumerate(cats))
    a = ACIMA[lang]
    acima = f'<details id="p-acima"><summary>Acima</summary><ul><li>{E(a["body"])}</li>{"".join(f"<li>{E(x)}</li>" for x in a["points"][1:])}</ul></details>'
    body = crumbs(lang, [(t['crumb_home'], ppath('home', lang)), (p['title'], here)]) + phead(p['h1'], p['intro']) + f"""
<section class="sec sec-tight"><div class="wrap acc">{blocks}{acima}<p class="note" style="margin-top:22px">{E(p['law'])}</p></div></section>"""
    lds = [crumbs_ld([(t['crumb_home'], ppath('home', lang)), (p['title'], here)])]
    return page(lang, 'policies', here, alts_of('policies'), p['title'] + ' | ' + B['name'], p['desc'], body, lds)


def build_privacy(lang):
    t = T[lang]
    here = ppath('privacy', lang)
    secs = ''.join(f'<h2>{E(h)}</h2><ul class="ticks">{"".join(f"<li>{E(x)}</li>" for x in items)}</ul>' for h, items in PRIVACY[lang])
    body = crumbs(lang, [(t['crumb_home'], ppath('home', lang)), (t['nav']['privacy'], here)]) + phead(t['privacy_h1']) + f"""
<section class="sec sec-tight"><div class="wrap prose"><p class="box-amber">{E(t['privacy_draft'])}</p>{secs}</div></section>"""
    return page(lang, 'privacy', here, alts_of('privacy'), t['privacy_title'], t['privacy_desc'], body)


def build_service(s, lang):
    t, c = T[lang], s[lang]
    here = spath(s, lang)
    alts = {l: spath(s, l) for l in LANGS}
    parent = 'tires' if s.get('tire') else 'repair'
    r = route(lang)
    service_ld = {'@context': 'https://schema.org', '@type': 'Service', 'name': c['name'], 'serviceType': s['schema'],
                  'description': c['desc'], 'url': DOMAIN + '/' + here, 'inLanguage': lang,
                  'provider': {'@id': DOMAIN + '/#shop'}, 'areaServed': [{'@type': 'City', 'name': n + ', MA'} for n in NEARBY]}
    items = [(t['crumb_home'], ppath('home', lang)), (t['nav'][parent], ppath(parent, lang)), (c['name'], here)]
    lds = [service_ld, faq_ld(c['faq']), crumbs_ld(items)]
    cta2 = (f'<a class="btn btn-ghost" href="{E(href(ppath("tires", lang)))}">{icon("tread")}{E(t["hero_tires"])}</a>' if s.get('tire')
            else f'<a class="btn btn-ghost" href="tel:{CONTACTS["shop"]["phone"]}">{icon("phone")}{E(t["call"])} {CONTACTS["shop"]["label"]}</a>')
    faq = ''.join(f'<details><summary>{E(q)}</summary><p>{E(a)}</p></details>' for q, a in c['faq'])
    rel = ''.join(f'<li><a class="tile" href="{E(href(spath(SVC[k], lang)))}"><span class="ic">{icon(SVC[k]["icon"])}</span><span><b>{E(SVC[k][lang]["name"])}</b></span></a></li>' for k in c['related'])
    dep = ''
    if not s.get('tire'):
        d = DEPOSIT[lang]
        dep = f'<p class="note" style="margin-top:12px">{E(d["short"])} {E(d["confirm"])} <a href="{E(href(ppath("policies", lang)))}">{E(t["nav"]["policies"])}</a></p>'
    extra = f'<div class="btn-row"><a class="btn btn-red" href="{E(href(ppath("book", lang)))}#svc={E(s["key"])}">{icon("cal")}{E(t["nav"]["book"])}</a>{cta2}</div><p style="margin-top:18px">{status_line()}</p>'
    body = crumbs(lang, items) + phead(c['h1'], c['intro'], extra) + f"""
<section class="sec sec-tight"><div class="wrap grid2">
  <div class="card"><h2 style="font-size:1.4rem;margin-bottom:14px">{E(UI_L(lang, 'what_we_do'))}</h2><ul class="ticks">{''.join(f'<li>{E(x)}</li>' for x in c['do'])}</ul></div>
  <div class="card"><h2 style="font-size:1.4rem;margin-bottom:14px">{E(UI_L(lang, 'signs'))}</h2><ul class="ticks blue">{''.join(f'<li>{E(x)}</li>' for x in c['signs'])}</ul></div>
</div><div class="wrap"><p class="note" style="margin-top:18px">{E(UI_L(lang, 'price_note'))}</p>{dep}</div></section>
<section class="sec sec-tight" aria-labelledby="faq-h"><div class="wrap acc"><h2 id="faq-h" style="font-size:clamp(1.5rem,3vw,2.1rem);margin-bottom:8px">{E(UI_L(lang, 'questions'))}</h2>{faq}</div></section>
<section class="sec sec-tight" aria-labelledby="rel-h"><div class="wrap"><h2 id="rel-h" style="font-size:clamp(1.4rem,2.6vw,1.9rem);margin-bottom:16px">{E(UI_L(lang, 'other'))}</h2><ul class="tiles">{rel}</ul></div></section>"""
    return page(lang, parent, here, alts, c['title'], c['desc'], body, lds)


def UI_L(lang, k):
    from content import UI
    return UI[lang][k]


def build_404():
    lang = 'en'
    t = T[lang]
    USED.clear()
    body = phead(t['nf_h1'], t['nf_p'].format(shop=CONTACTS['shop']['label']), f'<div class="btn-row"><a class="btn btn-red" href="{E(href(""))}">{E(t["nav"]["home"])}</a><button type="button" class="btn btn-ghost" aria-controls="srch">{icon("search")}{E(t["search"])}</button></div>')
    return page('en', '404', '', alts_of('home'), t['nf_title'], t['nf_p'].format(shop=CONTACTS['shop']['label']), body, fname='404.html')


# ---------------------------------------------------------------- search index

SYN = {
    'en': {'new-tires': 'tyre tyres buy price quote all season winter snow install', 'used-tires': 'cheap second hand tyre',
           'flat-tire-repair': 'puncture nail screw leak plug patch flat', 'wheel-alignment': 'pulls crooked steering wheel off center',
           'brakes': 'squeal squeak grind pads rotors stopping', 'oil-change': 'oil service lube', 'suspension': 'clunk bumps shocks struts steering',
           'diagnostics': 'check engine light warning code scan', 'tires': 'tire price quote size', 'book': 'appointment schedule reserve visit booking',
           'contact': 'phone call address directions location map hours open', 'financing': 'acima lease payments credit finance',
           'policies': 'deposit cancel refund return storage disposal fee payment', 'help': 'guide tools penny tread', 'reviews': 'google stars rating',
           'about': 'who history since 2013 languages', 'privacy': 'data cookies'},
    'pt': {'new-tires': 'pneu comprar preço orçamento inverno neve montagem', 'used-tires': 'barato seminovo usado', 'flat-tire-repair': 'furo prego parafuso vazando tarugo remendo',
           'wheel-alignment': 'puxando volante torto', 'brakes': 'chiado rangendo pastilha disco freio', 'oil-change': 'óleo troca', 'suspension': 'barulho batida amortecedor direção',
           'diagnostics': 'luz injeção motor painel código', 'tires': 'pneu preço medida', 'book': 'agendar marcar horário visita',
           'contact': 'telefone ligar endereço como chegar mapa horário aberto', 'financing': 'acima leasing parcelas crédito',
           'policies': 'sinal cancelar devolução guarda descarte taxa pagamento', 'help': 'guia ferramentas moeda', 'reviews': 'google estrelas', 'about': 'quem somos desde 2013', 'privacy': 'dados cookies'},
    'es': {'new-tires': 'llanta neumático goma comprar precio invierno nieve montaje', 'used-tires': 'barato segunda mano usada', 'flat-tire-repair': 'ponchadura ponchada clavo tornillo tapón parche',
           'wheel-alignment': 'jala volante chueco', 'brakes': 'chillido rechinido balatas pastillas discos', 'oil-change': 'aceite cambio', 'suspension': 'ruido golpe amortiguadores dirección',
           'diagnostics': 'luz check engine motor código tablero', 'tires': 'llanta precio medida', 'book': 'cita reservar agendar visita',
           'contact': 'teléfono llamar dirección cómo llegar mapa horario abierto', 'financing': 'acima arrendamiento pagos crédito',
           'policies': 'depósito cancelar devolución almacenaje desecho cargo pago', 'help': 'guía herramientas centavo', 'reviews': 'google estrellas', 'about': 'quiénes somos desde 2013', 'privacy': 'datos cookies'},
}


def build_search(lang):
    t = T[lang]
    items = []
    descs = {'tires': t['tires_lede'], 'repair': t['repair_lede'], 'book': t['book_lede'], 'help': t['help_lede'], 'financing': ACIMA[lang]['body'],
             'contact': f"{B['street']}, {B['city']} · " + ' · '.join(f'{a} {b}' for a, b in t['hours_rows']), 'about': t['about_lede'], 'reviews': t['reviews_lede'],
             'policies': POLICIES[lang]['intro'], 'privacy': t['privacy_desc'], 'home': t['hero_sub']}
    for k in NAV + NAV2:
        items.append({'t': t['nav'][k] if k != 'policies' else POLICIES[lang]['title'], 'u': href(ppath(k, lang)), 'k': 'policy' if k == 'policies' else 'page', 'x': descs[k], 'w': SYN[lang].get(k, ''), 'b': 1})
    for s in SERVICES:
        c = s[lang]
        items.append({'t': c['name'], 'u': href(spath(s, lang)), 'k': 'service', 'x': c['intro'][:150].rsplit(' ', 1)[0] + '…', 'w': ' '.join(c['do'] + c['signs']) + ' ' + SYN[lang].get(s['key'], ''), 'b': 2})
        for q, a in c['faq']:
            items.append({'t': q, 'u': href(spath(s, lang)) + '#faq-h', 'k': 'question', 'x': a[:140].rsplit(' ', 1)[0] + ('…' if len(a) > 140 else ''), 'w': c['name']})
    p = POLICIES[lang]
    for i, (ti, its) in enumerate([(DEPOSIT[lang]['title'], DEPOSIT[lang]['items'])] + p['cats']):
        items.append({'t': ti, 'u': href(ppath('policies', lang)) + f'#p{i}', 'k': 'policy', 'x': its[0], 'w': ' '.join(its) + ' ' + SYN[lang]['policies']})
    for k, ic, v in HELP_TOOLS:
        items.append({'t': v[lang][0], 'u': href(tpath(k, lang)), 'k': 'tool', 'x': v[lang][1], 'w': v[lang][3], 'b': 2})
    data = json.dumps({'kinds': t['kinds'], 'items': items}, ensure_ascii=False, separators=(',', ':'))
    write(('search-' if HP else 'assets/search-') + lang + '.json', data)


# ---------------------------------------------------------------- assets, hours, SEO files

def copy_assets():
    if HP:
        css = open(os.path.join(SRC, 'core.css'), encoding='utf-8').read()
        sha = git_sha('site/assets/fonts/archivo.woff2') or HP
        css = css.replace('url(fonts/', f'url(https://cdn.jsdelivr.net/gh/{REPO}@{sha}/{SUB}/site/assets/fonts/')
        write('core.css', css)
        return
    A = os.path.join(OUT, 'assets')
    os.makedirs(os.path.join(A, 'fonts'), exist_ok=True)
    for f in os.listdir(os.path.join(SRC, 'fonts')):
        shutil.copy2(os.path.join(SRC, 'fonts', f), os.path.join(A, 'fonts', f))
    for f in os.listdir(os.path.join(SRC, 'media')):
        shutil.copy2(os.path.join(SRC, 'media', f), os.path.join(A, f))
    for f in os.listdir(SRC):
        if f.endswith(('.css', '.js')):
            shutil.copy2(os.path.join(SRC, f), os.path.join(A, f))
    for f in ['hero-poster.webp', 'logo.webp', 'icon-180.png', 'icon-192.png', 'icon-512.png', 'og-card.jpg', 'penny.webp', 'sfx-squeal.mp3', 'sfx-grind.mp3', 'sfx-clunk.mp3'] + ([MUSIC['file']] if MUSIC.get('licensed') else []):
        shutil.copy2(os.path.join(ROOT, 'assets', f), os.path.join(A, f))
    if PHOTOS:
        shutil.copytree(os.path.join(ROOT, 'assets', 'photos'), os.path.join(A, 'photos'), dirs_exist_ok=True)
    # hours and analytics helpers come from the Sprint 2 builder's generated files
    for f in ['hours.js', 'track.js']:
        shutil.copy2(os.path.join(ROOT, 'assets', f), os.path.join(A, f))
    man = json.load(open(os.path.join(ROOT, 'manifest.webmanifest'), encoding='utf-8'))
    man['start_url'] = '/'
    man['scope'] = '/'
    for ic in man.get('icons', []):
        ic['src'] = '/assets/' + os.path.basename(ic['src'])
    write('assets/manifest.webmanifest', json.dumps(man, ensure_ascii=False, indent=1))


def build_seo(pages):
    items = []
    for path, alts in pages:
        alt = ''.join(f'\n    <xhtml:link rel="alternate" hreflang="{l}" href="{DOMAIN}/{p}"/>' for l, p in alts.items())
        alt += f'\n    <xhtml:link rel="alternate" hreflang="x-default" href="{DOMAIN}/{alts["en"]}"/>'
        items.append(f'  <url>\n    <loc>{DOMAIN}/{path}</loc>{alt}\n  </url>')
    write('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' + '\n'.join(items) + '\n</urlset>\n')
    write('robots.txt', f'User-agent: *\nAllow: /\n\nSitemap: {DOMAIN}/sitemap.xml\n')
    hta = open(os.path.join(ROOT, '.htaccess'), encoding='utf-8').read() if os.path.exists(os.path.join(ROOT, '.htaccess')) else ''
    hta = re.sub(r'# keep build tools.*?\n(RewriteRule.*\n)+', '', hta)
    hta = hta.replace(" https://fonts.googleapis.com", '').replace('font-src https://fonts.gstatic.com', "font-src 'self'")
    hta = hta.replace('https://api.open-meteo.com', 'https://vpic.nhtsa.dot.gov https://api.open-meteo.com')
    hta = hta.replace('woff2)$', 'woff2|webmanifest)$')
    write('.htaccess', hta)


def main():
    if os.path.exists(OUT):
        shutil.rmtree(OUT)
    os.makedirs(OUT)
    copy_assets()
    pages = []
    for lang in LANGS:
        for fn in (build_home, build_tires, build_repair, build_book, build_help, build_financing, build_contact, build_about, build_reviews, build_policies, build_privacy):
            here, alts = fn(lang)
            if fn is not build_privacy:
                pages.append((here, alts))
        for s in SERVICES:
            pages.append(build_service(s, lang))
        for k, ic, sk in TOOLS:
            pages.append(build_tool(k, ic, sk, lang))
        build_search(lang)
    seen = set()
    pages = [p for p in pages if not (p[0] in seen or seen.add(p[0]))]
    if not HP:
        build_seo(pages)
        build_404()
    print('built', len(pages), 'pages into', OUT)


if __name__ == '__main__':
    main()
