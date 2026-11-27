#!/usr/bin/env python3
"""Public tire inventory feed for the website (future link to the shop app).

  python3 tools/inventory.py shop-export.json site/inventory/public.json

The shop app export can contain anything. ONLY the fields in PUBLIC_FIELDS are copied to the website.
Costs, supplier names, margins, notes and any other field are dropped, and the script refuses to run
if a field that looks confidential would end up in the public file.

Input: {"tires": [ {...}, ... ]}  (one object per tire line)
Public fields:
  id               shop app id (text)
  brand, model     e.g. "Michelin", "Defender2"
  size             e.g. "225/65R17" (no leading P)
  condition        "new" or "used"
  tread_32nds      remaining tread in 32nds of an inch (used tires)
  photo            URL of a photo of THIS tire (real photo only)
  quantity         how many in stock (shown only if the shop allows: SHOW_QUANTITY)
  in_stock         true = in the shop, false = can be ordered from a supplier (supplier name is never sent)
  price_tire       retail price per tire (after any promotion or approved discount)
  price_installed  installed price per tire (mounting, balancing, valve; the shop decides)
  fees_note        short public note, e.g. "Plus $10 disposal per tire"
  promo            short public promotion label, e.g. "Winter special"

Prices and stock reach the page only when INVENTORY['mode'] in business.py allows it and the shop approved it.
"""
import json, re, sys

PUBLIC_FIELDS = ['id', 'brand', 'model', 'size', 'condition', 'tread_32nds', 'photo', 'quantity', 'in_stock',
                 'price_tire', 'price_installed', 'fees_note', 'promo']
SHOW_QUANTITY = False
NEVER = re.compile(r'cost|supplier|vendor|margin|profit|wholesale|acquisition|markup|internal|note_private|dealer', re.I)
PRICE_RULES = {  # which prices each display mode may publish
    'quote': (), 'availability': (), 'tire_price': ('price_tire',), 'installed_price': ('price_installed',), 'both': ('price_tire', 'price_installed'),
}


def clean(rec, mode):
    out = {}
    for k in PUBLIC_FIELDS:
        if k not in rec or rec[k] in (None, ''):
            continue
        if k.startswith('price_') and k not in PRICE_RULES[mode]:
            continue
        if k == 'quantity' and not SHOW_QUANTITY:
            continue
        v = rec[k]
        if isinstance(v, str):
            v = v.strip()[:80]
            if NEVER.search(v) and k in ('fees_note', 'promo'):
                raise SystemExit(f'refusing: field {k} mentions confidential wording: {v!r}')
        out[k] = v
    if 'size' in out:
        out['size'] = re.sub(r'^P', '', str(out['size']).upper().replace(' ', ''))
    if out.get('condition') not in ('new', 'used'):
        out['condition'] = 'new'
    return out


def build(src, mode):
    if mode not in PRICE_RULES:
        raise SystemExit('unknown mode ' + mode)
    if mode == 'quote':
        return {'mode': mode, 'tires': []}
    tires = [clean(r, mode) for r in src.get('tires', [])]
    tires = [t for t in tires if t.get('size')]
    blob = json.dumps(tires)
    for key in re.findall(r'"([a-z_]+)":', blob):
        if NEVER.search(key):
            raise SystemExit('refusing: confidential field in output: ' + key)
    return {'mode': mode, 'tires': tires}


if __name__ == '__main__':
    sys.path.insert(0, __file__.rsplit('/', 1)[0])
    from business import INVENTORY
    data = json.load(open(sys.argv[1], encoding='utf-8'))
    out = build(data, INVENTORY['mode'])
    with open(sys.argv[2], 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False)
    print('wrote', len(out['tires']), 'public tire lines, mode', out['mode'])
