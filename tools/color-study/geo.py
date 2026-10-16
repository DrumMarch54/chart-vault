import numpy as np
from PIL import Image
def diamond(path):
    """Orange diamond of the paid tool: the longest vertical run of rows holding orange (gaps up to 40 px allowed)."""
    im = Image.open(path).convert('RGB'); a = np.asarray(im).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    orange = (r > 215) & (g > 165) & (g < 215) & (b > 95) & (b < 170) & (r - b > 55)
    rowsum = orange.sum(1)
    rows = np.where(rowsum >= 4)[0]
    if not len(rows): return None, im
    runs = []; s = rows[0]; p = rows[0]
    for y in rows[1:]:
        if y - p > 40: runs.append((s, p)); s = y
        p = y
    runs.append((s, p))
    top, bottom = max(runs, key=lambda t: t[1] - t[0])
    colsum = orange[top:bottom + 1].sum(0)
    cols = np.where(colsum >= 4)[0]
    if not len(cols): return None, im
    return dict(top=int(top), bottom=int(bottom), left=int(cols[0]), right=int(cols[-1]), w=im.width, h=im.height), im
