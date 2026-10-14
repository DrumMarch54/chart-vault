// Run once: node scripts/make-icons.mjs  (writes public/icons/*.png)
import sharp from 'sharp';
import fs from 'node:fs';
const svg = (pad) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<rect width="512" height="512" rx="${pad ? 0 : 96}" fill="#1b1f2a"/>
<g transform="translate(${pad ? 96 : 64} ${pad ? 96 : 64}) scale(${pad ? 0.625 : 0.75})">
<rect x="0" y="0" width="160" height="160" rx="24" fill="#f0b64a"/>
<rect x="176" y="0" width="160" height="160" rx="24" fill="#6fb3ff"/>
<rect x="352" y="0" width="160" height="160" rx="24" fill="#f0b64a"/>
<rect x="0" y="176" width="160" height="160" rx="24" fill="#6fb3ff"/>
<rect x="176" y="176" width="160" height="160" rx="24" fill="#f7f7fb"/>
<rect x="352" y="176" width="160" height="160" rx="24" fill="#6fb3ff"/>
<rect x="0" y="352" width="160" height="160" rx="24" fill="#f0b64a"/>
<rect x="176" y="352" width="160" height="160" rx="24" fill="#6fb3ff"/>
<rect x="352" y="352" width="160" height="160" rx="24" fill="#f0b64a"/>
<text x="256" y="300" font-family="Arial, Helvetica, sans-serif" font-size="150" font-weight="700" text-anchor="middle" fill="#1b1f2a">12</text>
</g></svg>`;
fs.mkdirSync('public/icons', { recursive: true });
await sharp(Buffer.from(svg(false))).resize(192, 192).png().toFile('public/icons/icon-192.png');
await sharp(Buffer.from(svg(false))).resize(512, 512).png().toFile('public/icons/icon-512.png');
await sharp(Buffer.from(svg(true))).resize(512, 512).png().toFile('public/icons/icon-maskable-512.png');
console.log('icons written');
