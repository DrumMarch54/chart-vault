import sys, json
import numpy as np
from PIL import Image
from scipy import ndimage
def shapes(path, crop):
    im = Image.open(path).convert('RGB'); x0,y0,x1,y1 = crop
    a = np.asarray(im).astype(int)[y0:y1, x0:x1]
    r,g,b = a[...,0],a[...,1],a[...,2]
    lum = 0.299*r+0.587*g+0.114*b
    mx = a.max(2); mn = a.min(2); sat = mx-mn
    fill = (lum >= 165) & ((lum < 243) | (sat > 14))
    fill = ndimage.binary_opening(fill, structure=np.ones((3,3)))
    lab, n = ndimage.label(fill)
    out = []
    for i, sl in enumerate(ndimage.find_objects(lab)):
        if sl is None: continue
        comp = lab[sl] == i+1
        area = int(comp.sum())
        if area < 1500: continue
        ys, xs = sl
        col = tuple(int(v) for v in np.median(a[sl][comp], axis=0))
        filled = ndimage.binary_fill_holes(comp)
        holes = filled & ~comp
        hl, hn = ndimage.label(holes)
        hs = []
        for j, hsl in enumerate(ndimage.find_objects(hl)):
            if hsl is None: continue
            hm = hl[hsl] == j+1; ha = int(hm.sum())
            if ha < 200: continue
            hy, hx = hsl
            hs.append(dict(x=hx.start+xs.start+x0, y=hy.start+ys.start+y0, w=hx.stop-hx.start, h=hy.stop-hy.start, area=ha))
        out.append(dict(x=xs.start+x0, y=ys.start+y0, w=xs.stop-xs.start, h=ys.stop-ys.start, area=area, col=col, holes=hs))
    out.sort(key=lambda s: (s['y'], s['x']))
    return out
if __name__ == '__main__':
    path = sys.argv[1]; crop = tuple(int(v) for v in sys.argv[2].split(','))
    for s in shapes(path, crop):
        print('shape x=%d y=%d w=%d h=%d area=%d col=%s' % (s['x'], s['y'], s['w'], s['h'], s['area'], s['col']))
        for h in s['holes']: print('   hole x=%d y=%d w=%d h=%d area=%d  center=(%.1f,%.1f)' % (h['x'], h['y'], h['w'], h['h'], h['area'], h['x']+h['w']/2, h['y']+h['h']/2))
