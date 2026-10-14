# Median ink color per (position class, number, one-middle-name?) -> color class; then see which
# position classes share a table.
import json, colorsys
from collections import defaultdict, Counter
import numpy as np
exec(open('tally.py').read().split('by = defaultdict')[0])
s = json.load(open('samples.json')); inputs = {x['id']: x for x in json.load(open('inputs.json'))}
groups = defaultdict(list)
for x in s:
    if x['cls'].startswith(('e.', 'pi.', 'po.')) or x['cls'] in ('day', 'c.day', 'v.day', 'letters'): continue
    n = len(inputs[x['id']]['name'].split())
    groups[(x['cls'], x['text'], n == 3)].append(x['rgb'])
table = {}
for key, rgbs in groups.items():
    if len(rgbs) < 2: continue
    med = np.median(np.array(rgbs), 0).tolist()
    k = klass(med); k = {'brown': 'gray', 'other': 'green1'}.get(k, k)
    table[key] = (k, len(rgbs))
json.dump([[list(k), v] for k, v in table.items()], open('table.json', 'w'))
# does the one-middle flag matter per class?
flag = defaultdict(lambda: [0, 0])
for (cls, text, mid), (k, n) in table.items():
    other = table.get((cls, text, not mid))
    if other: flag[cls][0 if other[0] == k else 1] += 1
print('mid-flag effect (same, different):'); print({c: tuple(v) for c, v in sorted(flag.items())})
# which classes share a table (ignoring the flag where it does not matter)
classes = sorted({k[0] for k in table})
def agree(a, b):
    same = diff = 0
    for (cls, text, mid), (k, n) in table.items():
        if cls != a: continue
        o = table.get((b, text, mid))
        if o: same += o[0] == k; diff += o[0] != k
    return same, diff
pairs = [('first', 'last'), ('first', 'middle'), ('ul', 'ur'), ('ul', 'll'), ('ul', 'lr'), ('first', 'ul'), ('heart', 'solar'), ('heartExtra', 'solarExtra'), ('heart', 'heartExtra'), ('le', 'pillar'), ('le', 'first'), ('c.first', 'v.first'), ('c.first', 'first'), ('c.ul', 'v.ul'), ('c.ul', 'ul'), ('c.ul', 'c.ur'), ('c.ul', 'c.ll'), ('c.heart', 'v.heart'), ('c.heart', 'c.solar'), ('c.heart', 'heart'), ('c.heartExtra', 'v.heartExtra'), ('c.heartExtra', 'c.solarExtra'), ('c.le', 'v.le'), ('c.le', 'le'), ('c.pillar', 'v.pillar'), ('c.pillar', 'pillar'), ('c.first', 'c.last'), ('c.first', 'c.middle'), ('v.first', 'v.last'), ('spine', 'ul'), ('c.big', 'v.big'), ('c.big', 'c.le')]
for a, b in pairs: print(f"{a:12s} vs {b:12s} same/diff {agree(a, b)}")
