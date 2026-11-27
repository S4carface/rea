"""Private preview: turn site/ into a folder that works from any sub-path (relative links), for a private claude.ai page.
Usage: python3 tools/preview_art.py OUTDIR   (run tools/build3.py first). Nothing here goes to the live site."""
import os, re, shutil, sys, json
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'site')
OUT = os.path.join(sys.argv[1], 'site')
shutil.rmtree(OUT, ignore_errors=True)
shutil.copytree(SRC, OUT, ignore=shutil.ignore_patterns('.htaccess', 'robots.txt', 'sitemap.xml'))

def rel(path, P):
    p = path[1:]
    q = ''
    if '#' in p:
        p, q = p.split('#', 1); q = '#' + q
    if p == '' or p.endswith('/'):
        p += 'index.html'
    return P + p + q

for dp, _, fs in os.walk(OUT):
    for f in fs:
        fp = os.path.join(dp, f)
        if f.endswith('.html'):
            d = os.path.relpath(dp, OUT).count(os.sep) + (0 if os.path.relpath(dp, OUT) == '.' else 1)
            P = '../' * d
            h = open(fp, encoding='utf-8').read()
            h = re.sub(r'(\s(?:href|src|data-[\w-]+|poster))="(/(?!/)[^"]*)"', lambda m: f'{m.group(1)}="{rel(m.group(2), P)}"', h)
            h = re.sub(r'srcset="([^"]*)"', lambda m: 'srcset="' + re.sub(r'(^|,\s*)/(?!/)', lambda n: n.group(1) + P, m.group(1)) + '"', h)
            h = h.replace('&quot;/assets/', '&quot;' + P + 'assets/').replace('"/assets/', '"' + P + 'assets/')
            h = h.replace('<head>', f'<head>\n<script>window.LM_ROOT={json.dumps(P)};</script>', 1)
            h = h.replace('<link rel="manifest"', '<link rel="x-manifest"')
            open(fp, 'w', encoding='utf-8').write(h)
        elif f.startswith('search-') and f.endswith('.json'):
            j = open(fp, encoding='utf-8').read()
            j = re.sub(r'"u":\s*"/([^"#]*)(#[^"]*)?"', lambda m: '"u": "' + (m.group(1) + ('index.html' if (m.group(1) == '' or m.group(1).endswith('/')) else '')) + (m.group(2) or '') + '"', j)
            open(fp, 'w', encoding='utf-8').write(j)
cj = os.path.join(OUT, 'assets', 'core.js')
s = open(cj, encoding='utf-8').read()
assert "href=\"' + esc(it.u) + '\"" in s
s = s.replace("href=\"' + esc(it.u) + '\"", "href=\"' + esc((window.LM_ROOT || '') + it.u) + '\"")
open(cj, 'w', encoding='utf-8').write(s)
left = []
for dp, _, fs in os.walk(OUT):
    for f in fs:
        if f.endswith('.html'):
            h = open(os.path.join(dp, f), encoding='utf-8').read()
            left += re.findall(r'\s(?:href|src)="/(?!/)[^"]*"', h)
print('files', sum(len(fs) for _, _, fs in os.walk(OUT)), 'root links left', len(left), left[:5])
