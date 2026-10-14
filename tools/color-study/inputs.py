# From ocr/<id>.json: find the year box and the name box above the orange diamond; read the day
# from under the essence shape and the month from its upper-left corner (the input boxes are
# too small for OCR to see a single digit reliably).
import json, os, re, sys
sys.path.insert(0, '.')
from geo import diamond
out = []; skipped = {}
def skip(id, why): skipped[why] = skipped.get(why, 0) + 1
def nearest(boxes, px, py, tol):
    best = None; bd = tol
    for b in boxes:
        d = abs((b[0] + b[2]) / 2 - px) + abs((b[1] + b[3]) / 2 - py)
        if d < bd: bd = d; best = b
    return best
OCRDIR = os.environ.get('OCRDIR', 'ocr'); REFDIR = os.environ.get('REFDIR', 'refs'); OUT = os.environ.get('OUT', 'inputs.json')
for f in sorted(os.listdir(OCRDIR), key=lambda f: int(f.split('.')[0])):
    d = json.load(open(OCRDIR + '/' + f)); id = d['id']
    if 'error' in d: skip(id, 'ocr error'); continue
    g, _ = diamond(f'{REFDIR}/{id}.' + ('png' if os.path.exists(f'{REFDIR}/{id}.png') else 'jpg'))
    if not g: skip(id, 'no diamond'); continue
    H = g['bottom'] - g['top']; W = g['right'] - g['left']
    if H < 200 or not (0.66 < W / H < 0.80): skip(id, 'diamond ratio'); continue
    top = g['top']; scale = H / 756; cx = (g['left'] + g['right']) / 2
    P = lambda x, y: (cx + (x - 371) * scale, top + (y - 357) * scale)
    limit = top - 300 * scale
    cand = [b for b in d['boxes'] if b[3] < limit and b[1] > 0.02 * d['h']]
    years = [b for b in cand if re.fullmatch(r'1[89]\d\d|20[0-2]\d', b[4].strip())]
    if not years: skip(id, 'no year'); continue
    yb = max(years, key=lambda b: b[1]); year = int(yb[4])
    rowh = yb[3] - yb[1]
    # day: "19/1" under the essence shape (baseline 330, center ~318); month: "11/2" at (236, 88)
    db = nearest(d['boxes'], *P(371, 318), 40 * scale)
    mb = nearest(d['boxes'], *P(236, 86), 40 * scale)
    m = db and re.fullmatch(r'(\d{1,2})[/:lI|\\]\d', db[4].strip().replace(' ', ''))
    if not m and db and re.fullmatch(r'\d1\d', db[4].strip()): m = re.fullmatch(r'(\d)1\d', db[4].strip())
    if not m: skip(id, 'no day'); continue
    day = int(m.group(1))
    m = mb and re.fullmatch(r'(\d{1,2})[/:lI|\\]\d', mb[4].strip().replace(' ', ''))
    if not m and mb and re.fullmatch(r'\d1\d', mb[4].strip()): m = re.fullmatch(r'(\d)1\d', mb[4].strip())
    if not m: skip(id, 'no month'); continue
    month = int(m.group(1))
    if not (1 <= day <= 31 and 1 <= month <= 12): skip(id, 'bad day/month'); continue
    below = [b for b in cand if b[1] > yb[3] - rowh * 0.3 and b[1] < yb[3] + rowh * 2.2 and re.search(r'[A-Za-z]', b[4])]
    if not below: skip(id, 'no name'); continue
    below.sort(key=lambda b: b[0])
    name = ' '.join(b[4] for b in below)
    name = re.sub(r"[^A-Za-zÅÆØåæø' \-]", ' ', name).strip()
    name = re.sub(r'\s+', ' ', name)
    if ' ' not in name and re.search(r'[a-z][A-Z]', name): name = re.sub(r'([a-z])([A-Z])', r'\1 \2', name)
    if not name: skip(id, 'no name'); continue
    out.append(dict(id=id, day=day, month=month, year=year, name=name, top=top, scale=scale, cx=cx, w=d['w'], h=d['h']))
json.dump(out, open(OUT, 'w'), indent=0)
print('ok', len(out), 'skipped', skipped)
