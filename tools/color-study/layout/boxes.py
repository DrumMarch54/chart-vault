import sys, json
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
def ink_boxes(path, crop, out_png, scale=0.5, minh=12, gapx=14):
    im = Image.open(path).convert('RGB')
    x0,y0,x1,y1 = crop
    a = np.asarray(im).astype(int)[y0:y1, x0:x1]
    r,g,b = a[...,0],a[...,1],a[...,2]
    lum = 0.299*r+0.587*g+0.114*b
    ink = lum < 165
    # close small horizontal gaps so a word becomes one blob
    closed = ndimage.binary_closing(ink, structure=np.ones((3, gapx)))
    lab, n = ndimage.label(closed)
    objs = ndimage.find_objects(lab)
    boxes = []
    for i, sl in enumerate(objs):
        if sl is None: continue
        ys, xs = sl
        h = ys.stop-ys.start; w = xs.stop-xs.start
        if h < minh or w < 6 or h > 120 or w > 400: continue
        m = (lab[sl] == i+1) & ink[sl]
        if m.sum() < 30: continue
        # ink color: median of ink pixels in the blob
        px = a[sl][m]
        col = tuple(int(v) for v in np.median(px, axis=0))
        boxes.append(dict(x=xs.start+x0, y=ys.start+y0, w=w, h=h, cx=xs.start+x0+w/2, cy=ys.start+y0+h/2, col=col))
    boxes.sort(key=lambda b: (round(b['y']/30), b['x']))
    # annotate
    im2 = im.crop(crop); d = ImageDraw.Draw(im2)
    for i, b in enumerate(boxes):
        d.rectangle([b['x']-x0, b['y']-y0, b['x']-x0+b['w'], b['y']-y0+b['h']], outline=(255,0,0), width=2)
        d.text((b['x']-x0, b['y']-y0-14), str(i), fill=(200,0,0))
    im2 = im2.resize((int(im2.width*scale), int(im2.height*scale)))
    im2.save(out_png)
    return boxes
if __name__ == '__main__':
    path, out, js = sys.argv[1], sys.argv[2], sys.argv[3]
    crop = tuple(int(v) for v in sys.argv[4].split(','))
    bx = ink_boxes(path, crop, out)
    json.dump(bx, open(js, 'w'))
    for i, b in enumerate(bx): print(i, b['x'], b['y'], b['w'], b['h'], 'c=(%d,%d)' % (b['cx'], b['cy']), b['col'])
