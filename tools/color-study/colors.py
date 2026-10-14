# For every paid-tool screenshot: map each expected number (slots.json) to pixels, find its OCR box,
# check the text, and record the ink color. Writes samples.json.
import json, re, sys
import numpy as np
from PIL import Image
import os
OCRDIR = os.environ.get('OCRDIR', 'ocr'); REFDIR = os.environ.get('REFDIR', 'refs'); INP = os.environ.get('INP', 'inputs.json'); SL = os.environ.get('SL', 'slots.json'); OUT = os.environ.get('OUT', 'samples.json')
inputs = json.load(open(INP)); slots = json.load(open(SL))
def norm(t):
    t = t.strip().replace(' ', '')
    t = re.sub(r'[:lI|\\一-鿿]', '/', t)
    if re.fullmatch(r'\d1\d', t): t = t[0] + '/' + t[2]
    if re.fullmatch(r'\d\d1\d', t): t = t[:2] + '/' + t[3]
    return t
def match(ocr, exp):
    n = norm(ocr)
    if n == exp: return True
    if re.sub(r'\D', '', ocr) == exp.replace('/', ''): return True
    return False
samples = []; stats = {}
for inp in inputs:
    id = str(inp['id']); sl = slots.get(id)
    if not sl: continue
    d = json.load(open(f"{OCRDIR}/{id}.json")); boxes = d['boxes']
    im = Image.open(f"{REFDIR}/{id}." + ('png' if os.path.exists(f"{REFDIR}/{id}.png") else 'jpg')).convert('RGB'); a = np.asarray(im).astype(int)
    sc = inp['scale']; cx = inp['cx']; top = inp['top']
    hits = 0; miss = 0
    for s in sl:
        px = cx + (s['x'] - 371) * sc; py = top + (s['y'] - 357) * sc; fs = s['size'] * sc
        bx = None; best = 1e9
        for b in boxes:
            bcx = (b[0] + b[2]) / 2; bcy = (b[1] + b[3]) / 2
            dx = bcx - px; dy = bcy - (py - fs * 0.36)
            if abs(dx) < fs * 1.2 + 8 and abs(dy) < fs * 0.7 + 6:
                dist = abs(dx) + abs(dy)
                if dist < best: best = dist; bx = b
        st = stats.setdefault(s['cls'], dict(n=0, found=0, text=0, dx=[], dy=[]))
        st['n'] += 1
        if not bx: miss += 1; continue
        st['found'] += 1
        ok = match(bx[4], s['text'])
        if not ok: continue
        st['text'] += 1; hits += 1
        st['dx'].append(((bx[0] + bx[2]) / 2 - px) / sc); st['dy'].append((bx[3] - py) / sc); st.setdefault('dxlen', {}).setdefault(len(s['text']), []).append(((bx[0] + bx[2]) / 2 - px) / sc)
        x0, y0, x1, y1 = bx[0] + 1, bx[1] + 1, bx[2] - 1, bx[3] - 1
        crop = a[y0:y1, x0:x1].reshape(-1, 3)
        if not len(crop): continue
        lum = crop.mean(1)
        ink = crop[lum < 235]
        if len(ink) < 10: continue
        k = max(5, len(ink) // 6)
        dark = ink[np.argsort(ink.mean(1))[:k]]
        med = np.median(dark, 0)
        samples.append(dict(id=int(id), cls=s['cls'], text=s['text'], rgb=[int(v) for v in med], bold=s['bold'], ocr=bx[4], par=s.get('par')))
    inp['hits'] = hits; inp['miss'] = miss
json.dump(samples, open(OUT, 'w'))
json.dump(inputs, open(OUT.replace('.json','_scored.json'), 'w'))
print('samples', len(samples), 'images', len(inputs))
for cls, st in sorted(stats.items()):
    dx = np.median(st['dx']) if st['dx'] else 0; dy = np.median(st['dy']) if st['dy'] else 0
    bylen = ' '.join(f"len{k}:{np.median(v):.1f}({len(v)})" for k, v in sorted(st.get('dxlen', {}).items()))
    print(f"{cls:14s} n={st['n']:4d} found={st['found']:4d} text ok={st['text']:4d}  dx={dx:6.1f} dy(baseline)={dy:6.1f}  {bylen}")
