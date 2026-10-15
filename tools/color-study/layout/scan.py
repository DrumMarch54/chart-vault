# Run-length scan along a column or row of a screenshot, printed in drawing units (main-diamond frame).
import sys
sys.path.insert(0, __import__('os').path.dirname(__file__))
import numpy as np
from PIL import Image
from shapes import shapes
from compare import frame, to_u
def cls(p):
    r,g,b = p; lum = 0.299*r+0.587*g+0.114*b; sat = max(p)-min(p)
    if lum > 243 and sat < 14: return 'white'
    if lum < 165: return 'ink'
    return 'fill(%d,%d,%d)' % (round(r/12)*12, round(g/12)*12, round(b/12)*12)
def runs(a, f, kind, pos_u, a_u, b_u):
    if kind == 'col':
        px = int(round(f['cx'] + (pos_u-371)/f['s']))
        p0 = int(round(f['top'] + (a_u-357)/f['s'])); p1 = int(round(f['top'] + (b_u-357)/f['s']))
        line = a[p0:p1, px]
        conv = lambda i: 357 + (p0+i-f['top'])*f['s']
    else:
        py = int(round(f['top'] + (pos_u-357)/f['s']))
        p0 = int(round(f['cx'] + (a_u-371)/f['s'])); p1 = int(round(f['cx'] + (b_u-371)/f['s']))
        line = a[py, p0:p1]
        conv = lambda i: 371 + (p0+i-f['cx'])*f['s']
    out = []; cur = None; start = 0
    for i, p in enumerate(line):
        c = cls(tuple(int(v) for v in p))
        if c != cur:
            if cur is not None: out.append((cur, conv(start), conv(i)))
            cur = c; start = i
    out.append((cur, conv(start), conv(len(line))))
    # merge runs shorter than 1.5 units into neighbours by dropping them
    return [(c, s, e) for c, s, e in out if e - s >= 1.2]
if __name__ == '__main__':
    path, crop = sys.argv[1], tuple(map(int, sys.argv[2].split(',')))
    im = Image.open(path).convert('RGB'); a = np.asarray(im).astype(int)
    f = frame(shapes(path, crop))
    for spec in sys.argv[3:]:
        name, kind, pos, s0, s1 = spec.split(':')
        print(name, kind, pos)
        for c, s, e in runs(a, f, kind, float(pos), float(s0), float(s1)):
            print('   %-22s %7.1f .. %7.1f  (%.1f)' % (c, s, e, e-s))
