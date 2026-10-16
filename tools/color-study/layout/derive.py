# From compare1.txt: for every LAYOUT text key, new size and baseline from the reference.
import re
rows = {}
for line in open('OUT/compare1.txt'):
    m = re.match(r'(\S+)\s+([-\d.]+)\s+([-\d.]+) \|\s+([-\d.]+)\s+([-\d.]+) \|\s+([-\d.]+)\s+([-\d.]+) \| ([\d.]+)\s+\(ref bottom ([-\d.]+) h ([\d.]+) w ([\d.]+)\)', line)
    if m:
        slot = m.group(1); rx, ry, ox, oy, dx, dy, hr, rb, rh, rw = map(float, m.groups()[1:])
        rows[slot] = dict(rx=rx, ry=ry, ox=ox, oy=oy, hr=hr, rh=rh, oh=rh/hr)
# (slots, old baseline, old size) per key
KEYS = {
 'hex.monthY/corner': (['month','year','topAura'], 99.5, 24.6),
 'hex.lpY/lp': (['littleLp'], 165.6, 27.4), 'hex.bigLpY/lp': (['bigLp'], 197.1, 27.4),
 'hex.auraY/aura': (['outerAura','innerAura'], 208.1, 22),
 'psy.dvY/day': (['po.day','pi.day'], 179.7, 21.6),
 'psy.upY/small': (['po.ul','po.ur','pi.ul','pi.ur'], 254.4, 23), 'psy.lowY/small': (['po.ll','po.lr','pi.ll','pi.lr'], 423.7, 23),
 'psy.heartY/heart': (['po.heart','pi.heart'], 276.3, 24.6), 'psy.solarY/heart': (['po.solar','pi.solar'], 390.7, 24.6),
 'psy.lineY/lineFont': (['po.first','po.last','pi.first','pi.last'], 334, 25),
 'psy.leY/le': (['po.le','pi.le'], 493.1, 22.8), 'psy.pillarY/pillar': (['po.pillar','pi.pillar'], 536.5, 21),
 'main.dvY/day': (['day'], 334.5, 36.6),
 'main.upY/small': (['ul','ur'], 524.2, 25), 'main.lowY/small': (['ll','lr'], 948.8, 25),
 'main.heartY/heart': (['heart'], 540.6, 38), 'main.heartExtraY/extra': (['heartExtra'], 630.0, 25.5),
 'main.solarY/solar': (['solar'], 833.6, 37), 'main.solarExtraY/extra': (['solarExtra'], 924.6, 25.5),
 'main.spineY/small': (['spine'], 640.8, 25), 'main.letterY/letterFont': (['letters'], 646.4, 26.6),
 'main.nameY/name': (['firstName','lastName'], 723, 27), 'main.lineY/lineFont': (['first','middle','last'], 770.5, 36),
 'main.leY/le': (['le'], 1157, 36.6), 'main.pillarY/pillar': (['pillar'], 1252, 34),
 'sub.dvY/day': (['c.day','v.day'], 895, 19.1),
 'sub.upY/small': (['c.ul','c.ur','v.ul','v.ur'], 983.8, 20), 'sub.lowY/small': (['c.ll','c.lr','v.ll','v.lr'], 1133.4, 20),
 'sub.heartY/heart': (['c.heart','v.heart'], 984.4, 22.8), 'sub.heartExtraY/extra': (['c.heartExtra','v.heartExtra'], 1015.2, 14.6),
 'sub.nameY/name': (['c.firstName','c.lastName','v.firstName','v.lastName'], 1039, 16),
 'sub.lineY/lineFont': (['c.first','c.middle','c.last','v.first','v.middle','v.last'], 1062.7, 19),
 'sub.solarY/solar': (['c.solar','v.solar'], 1100.1, 22.8), 'sub.solarExtraY/extra': (['c.solarExtra','v.solarExtra'], 1127.1, 14.6),
 'sub.leY/le': (['c.big','c.le','v.big','v.le'], 1210.4, 22.8), 'sub.pillarY/pillar': (['c.pillar','v.pillar'], 1264, 17.3),
}
AR, AO = 1.4, 1.1  # anti-alias allowance in units (ref 2px, ours 2px)
for key, (slots, y0, s0) in KEYS.items():
    rs = [rows[s] for s in slots if s in rows]
    ratio = sum((r['rh']-AR)/(r['oh']-AO) for r in rs)/len(rs)
    s1 = s0*ratio
    ys = [r['ry'] + (y0 - r['oy'])*(s1/s0) for r in rs]
    y1 = sum(ys)/len(ys)
    print('%-28s size %5.1f -> %5.1f   y %7.1f -> %7.1f   (dy %+.1f, ratio %.3f, n=%d)' % (key, s0, s1, y0, y1, y1-y0, ratio, len(rs)))
