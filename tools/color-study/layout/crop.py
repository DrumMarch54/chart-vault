# Crop a region given in drawing units from a screenshot, scale it up, draw a 10-unit grid with labels.
import sys
sys.path.insert(0, __import__('os').path.dirname(__file__))
from PIL import Image, ImageDraw
from shapes import shapes
from compare import frame
path, crop, out = sys.argv[1], tuple(map(int, sys.argv[2].split(','))), sys.argv[3]
x0,y0,x1,y1 = map(float, sys.argv[4].split(','))
f = frame(shapes(path, crop))
im = Image.open(path).convert('RGB')
px = lambda u: f['cx'] + (u-371)/f['s']; py = lambda u: f['top'] + (u-357)/f['s']
box = (int(px(x0)), int(py(y0)), int(px(x1)), int(py(y1)))
c = im.crop(box); k = 3; c = c.resize((c.width*k, c.height*k), Image.LANCZOS)
d = ImageDraw.Draw(c)
import math
for u in range(int(math.ceil(x0/10))*10, int(x1)+1, 10):
    X = (px(u)-box[0])*k; d.line([(X,0),(X,c.height)], fill=(255,0,0) if u % 50 == 0 else (255,180,180), width=1); 
    if u % 50 == 0: d.text((X+2, 2), str(u), fill=(200,0,0))
for u in range(int(math.ceil(y0/10))*10, int(y1)+1, 10):
    Y = (py(u)-box[1])*k; d.line([(0,Y),(c.width,Y)], fill=(255,0,0) if u % 50 == 0 else (255,180,180), width=1)
    if u % 50 == 0: d.text((2, Y+2), str(u), fill=(200,0,0))
c.save(out)
