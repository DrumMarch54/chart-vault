# Compare the paid tool's reference screenshot with ours, both in drawing units of the main diamond
# (center x=371, top y=357, height 756). Prints per slot: ref center, our center, delta, text height ratio.
import sys, json
sys.path.insert(0, __import__('os').path.dirname(__file__))
from boxes import ink_boxes
from shapes import shapes
def frame(sh):
    # the two orange halves of the main diamond
    o = [s for s in sh if abs(s['col'][0]-238)<10 and abs(s['col'][1]-193)<12 and s['area'] > 50000]
    o.sort(key=lambda s: s['y'])
    up, lo = o[0], o[1]
    left = min(up['x'], lo['x']); right = max(up['x']+up['w'], lo['x']+lo['w'])
    top = up['y']; bottom = lo['y']+lo['h']
    cx = (left+right)/2; s = 756/(bottom-top)
    return dict(cx=cx, top=top, s=s, line=(up['y']+up['h'], lo['y']), left=left, right=right, bottom=bottom)
def to_u(f, px, py): return (371 + (px-f['cx'])*f['s'], 357 + (py-f['top'])*f['s'])
LABELS = ['month','topAura','year','littleLp','po.day','pi.day','outerAura','bigLp','innerAura','po.ul','po.ur','pi.ul','pi.ur','po.heart','pi.heart','day','po.first','po.last','pi.first','pi.last','po.solar','pi.solar','po.ll','po.lr','pi.ll','pi.lr','po.le','pi.le','po.pillar','ul','heart','ur','pi.pillar','heartExtra','spine','letters','firstName','middleName','lastName','first','middle','last','solar','c.day','v.day','solarExtra','ll','lr','c.ul','c.heart','c.ur','v.ul','v.heart','v.ur','c.heartExtra','v.heartExtra','c.firstName','c.middleName','c.lastName','v.firstName','v.middleName','v.lastName','c.first','c.middle','c.last','v.first','v.middle','v.last','c.solar','v.solar','c.ll','c.solarExtra','c.lr','v.ll','v.solarExtra','v.lr','le','c.big','c.le','v.big','v.le','pillar','c.pillar','v.pillar']
def analyse(path, crop, tag):
    sh = shapes(path, crop); f = frame(sh)
    bx = ink_boxes(path, crop, f'OUT/{tag}_boxes.png')
    for b in bx:
        b['ux'], b['uy'] = to_u(f, b['cx'], b['cy']); b['uh'] = b['h']*f['s']; b['uw'] = b['w']*f['s']
        b['ubottom'] = 357 + (b['y']+b['h']-f['top'])*f['s']
    return f, sh, bx
if __name__ == '__main__':
    ref, refcrop, ours, ourcrop = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
    rf, rsh, rbx = analyse(ref, tuple(map(int, refcrop.split(','))), 'ref')
    of, osh, obx = analyse(ours, tuple(map(int, ourcrop.split(','))), 'ours')
    print('ref frame', rf); print('our frame', of)
    print('ref line thickness u %.1f  ours %.1f' % ((rf['line'][1]-rf['line'][0])*rf['s'], (of['line'][1]-of['line'][0])*of['s']))
    print('ref diamond hw u %.1f  ours %.1f' % ((rf['right']-rf['left'])/2*rf['s'], (of['right']-of['left'])/2*of['s']))
    if len(rbx) != len(LABELS): print('REF BOX COUNT', len(rbx), 'labels', len(LABELS))
    # nearest match of our boxes to the ref boxes (one to one, threshold 22 units)
    used = set()
    print('%-14s %7s %7s | %7s %7s | %6s %6s | h ratio' % ('slot','refX','refY','ourX','ourY','dx','dy'))
    for i, r in enumerate(rbx):
        lab = LABELS[i] if i < len(LABELS) else '?'
        best = None
        for j, o in enumerate(obx):
            if j in used: continue
            d = ((o['ux']-r['ux'])**2 + (o['uy']-r['uy'])**2) ** .5
            if d < 24 and (best is None or d < best[0]): best = (d, j)
        if best is None: print('%-14s %7.1f %7.1f | no match (bottom %.1f h %.1f)' % (lab, r['ux'], r['uy'], r['ubottom'], r['uh'])); continue
        used.add(best[1]); o = obx[best[1]]
        print('%-14s %7.1f %7.1f | %7.1f %7.1f | %6.1f %6.1f | %.3f  (ref bottom %.1f h %.1f w %.1f)' % (lab, r['ux'], r['uy'], o['ux'], o['uy'], r['ux']-o['ux'], r['uy']-o['uy'], r['uh']/o['uh'], r['ubottom'], r['uh'], r['uw']))
    print('\nREF SHAPES (units)')
    for s in rsh:
        x0,y0 = to_u(rf, s['x'], s['y']); x1,y1 = to_u(rf, s['x']+s['w'], s['y']+s['h'])
        if s['area'] < 1500: continue
        print('  shape col=%s x %.1f..%.1f (cx %.1f, w %.1f) y %.1f..%.1f (h %.1f)' % (s['col'], x0, x1, (x0+x1)/2, x1-x0, y0, y1, y1-y0))
        for h in s['holes']:
            if h['area'] < 1000: continue
            hx0,hy0 = to_u(rf, h['x'], h['y']); hx1,hy1 = to_u(rf, h['x']+h['w'], h['y']+h['h'])
            print('     hole cx %.1f cy %.1f w %.1f h %.1f' % ((hx0+hx1)/2, (hy0+hy1)/2, hx1-hx0, hy1-hy0))
    print('\nOUR SHAPES (units)')
    for s in osh:
        x0,y0 = to_u(of, s['x'], s['y']); x1,y1 = to_u(of, s['x']+s['w'], s['y']+s['h'])
        print('  shape col=%s x %.1f..%.1f (cx %.1f, w %.1f) y %.1f..%.1f (h %.1f)' % (s['col'], x0, x1, (x0+x1)/2, x1-x0, y0, y1, y1-y0))
        for h in s['holes']:
            if h['area'] < 1000: continue
            hx0,hy0 = to_u(of, h['x'], h['y']); hx1,hy1 = to_u(of, h['x']+h['w'], h['y']+h['h'])
            print('     hole cx %.1f cy %.1f w %.1f h %.1f' % ((hx0+hx1)/2, (hy0+hy1)/2, hx1-hx0, hy1-hy0))
