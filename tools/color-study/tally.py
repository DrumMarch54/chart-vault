# Classify every sampled ink color and count, per position class and number, which color is used most.
import json, colorsys, sys
from collections import Counter, defaultdict
s = json.load(open('samples.json'))
def klass(rgb):
    r, g, b = rgb; h, l, sat = colorsys.rgb_to_hls(r / 255, g / 255, b / 255); h *= 360
    if l > 0.68: return 'faded'
    if l < 0.3: return 'dark'
    if sat < 0.08: return 'gray'
    if 190 <= h <= 230: return 'blue'
    if 20 <= h <= 50 and sat < 0.3: return 'brown'
    if 80 <= h <= 160:
        if sat < 0.2: return 'green1'
        if sat < 0.45: return 'green2'
        if sat < 0.7: return 'green3'
        return 'green4'
    if h < 25 or h > 335:
        if sat < 0.2: return 'red1'
        if sat < 0.42: return 'red2'
        return 'red3'
    return 'other'
by = defaultdict(Counter)
for x in s: by[(x['cls'], x['text'])][klass(x['rgb'])] += 1
groups = defaultdict(Counter)
for x in s: groups[x['cls']][klass(x['rgb'])] += 1
if len(sys.argv) > 1 and sys.argv[1] == 'groups':
    for cls, c in sorted(groups.items()): print(f"{cls:14s}", dict(c.most_common()))
else:
    for (cls, text), c in sorted(by.items(), key=lambda kv: (kv[0][0], int(kv[0][1].split('/')[0]) if kv[0][1][0].isdigit() else 0)):
        tot = sum(c.values()); top, n = c.most_common(1)[0]
        print(f"{cls:14s} {text:6s} n={tot:3d} {top:7s} {100*n//tot:3d}%  {dict(c.most_common())}")
