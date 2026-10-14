# OCR every reference screenshot once; save boxes + orange diamond geometry per image.
import sys, json, os, time
import numpy as np
from PIL import Image
from rapidocr_onnxruntime import RapidOCR
eng = RapidOCR()
ids = sorted(int(f.split('.')[0]) for f in os.listdir('refs') if f.endswith('.jpg'))
done = {int(f.split('.')[0]) for f in os.listdir('ocr') if f.endswith('.json')}
t0 = time.time()
for n, id in enumerate(ids):
    if id in done: continue
    path = f'refs/{id}.jpg'
    try:
        im = Image.open(path).convert('RGB')
        a = np.asarray(im).astype(int)
        r, g, b = a[..., 0], a[..., 1], a[..., 2]
        orange = (r > 215) & (g > 165) & (g < 215) & (b > 95) & (b < 170) & (r - b > 55)
        rows = np.where(orange.sum(1) >= 4)[0]; cols = np.where(orange.sum(0) >= 4)[0]
        geo = None
        if len(rows) and len(cols):
            geo = dict(top=int(rows[0]), bottom=int(rows[-1]), left=int(cols[0]), right=int(cols[-1]), pixels=int(orange.sum()))
        res, _ = eng(path)
        boxes = []
        for box, text, score in (res or []):
            xs = [p[0] for p in box]; ys = [p[1] for p in box]
            boxes.append([int(min(xs)), int(min(ys)), int(max(xs)), int(max(ys)), text, round(float(score), 2)])
        json.dump(dict(id=id, w=im.width, h=im.height, geo=geo, boxes=boxes), open(f'ocr/{id}.json', 'w'))
    except Exception as e:
        json.dump(dict(id=id, error=str(e)), open(f'ocr/{id}.json', 'w'))
    if n % 25 == 0: print(n, id, round(time.time() - t0), flush=True)
print('done', round(time.time() - t0))
