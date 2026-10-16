# Layout check against one paid-tool screenshot

Compares a screenshot of the paid tool (same date and name) with our own
rendering, shape by shape and number by number, in drawing units of the main
diamond (center x 371, top y 357, height 756). Used 2026-10-15 to re-measure
`LAYOUT` in public/numeroscope.js. Never run by `npm run verify`.

Needs python3 with pillow, numpy, scipy; node + playwright; the dev app on 3399.

1. `node render.mjs ours.png 21 10 1985 "Peter Joshua Shicora"` draws our chart
   at phone width (1440 px) into ours.png.
2. `python3 -I compare.py ref.jpg X0,Y0,X1,Y1 ours.png 0,0,W,H` prints every
   number's position in both (dx, dy, text-height ratio) and the shapes with
   their holes (circles). The crop box must hold the chart only. Both pictures
   get a copy with the detected boxes numbered (`OUT/ref_boxes.png`,
   `OUT/ours_boxes.png`); if the counts differ, fix LABELS in compare.py.
3. `python3 -I scan.py pic.jpg crop name:col:x:y0:y1 ...` lists the color runs
   along a column or row (apex, circle edges, line thickness).
4. `python3 -I crop.py pic.jpg crop out.png x0,y0,x1,y1` cuts a region with a
   10-unit grid to look at.
5. `derive.py` turns compare.py's output into new sizes and baselines per
   LAYOUT key (edit its paths and KEYS table first).

Edit the `OUT/` paths at the top of the scripts to a scratch folder before use.
