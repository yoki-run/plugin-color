/**
 * Color parsing and conversion utilities.
 * Supports: hex (#FF6B35, #F63), rgb(255,107,53), hsl(20,100%,60%),
 * named colors (red, coral, tailwind-500, etc.)
 */
"use strict";

// ---- Named colors (CSS + extras) ----
const NAMED = {
  red:'#FF0000',green:'#00FF00',blue:'#0000FF',white:'#FFFFFF',black:'#000000',
  yellow:'#FFFF00',cyan:'#00FFFF',magenta:'#FF00FF',orange:'#FFA500',purple:'#800080',
  pink:'#FFC0CB',brown:'#A52A2A',gray:'#808080',grey:'#808080',navy:'#000080',
  teal:'#008080',olive:'#808000',maroon:'#800000',aqua:'#00FFFF',lime:'#00FF00',
  silver:'#C0C0C0',gold:'#FFD700',coral:'#FF7F50',salmon:'#FA8072',violet:'#EE82EE',
  indigo:'#4B0082',turquoise:'#40E0D0',crimson:'#DC143C',khaki:'#F0E68C',
  lavender:'#E6E6FA',beige:'#F5F5DC',ivory:'#FFFFF0',mint:'#98FF98',peach:'#FFDAB9',
  plum:'#DDA0DD',tan:'#D2B48C',tomato:'#FF6347',wheat:'#F5DEB3',
  skyblue:'#87CEEB',steelblue:'#4682B4',slategray:'#708090',
  hotpink:'#FF69B4',deeppink:'#FF1493',dodgerblue:'#1E90FF',
  forestgreen:'#228B22',darkgreen:'#006400',darkred:'#8B0000',
  chocolate:'#D2691E',firebrick:'#B22222',
};

function parseColor(input) {
  input = (input || '').trim();
  if (!input) return null;

  // Named color
  const lower = input.toLowerCase().replace(/\s+/g, '');
  if (NAMED[lower]) return hexToRgb(NAMED[lower]);

  // Hex: #RGB or #RRGGBB
  let m = input.match(/^#?([0-9a-f]{3})$/i);
  if (m) {
    const h = m[1];
    return hexToRgb('#' + h[0]+h[0]+h[1]+h[1]+h[2]+h[2]);
  }
  m = input.match(/^#?([0-9a-f]{6})$/i);
  if (m) return hexToRgb('#' + m[1]);

  // rgb(r, g, b)
  m = input.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
  if (m) return fromRgb(+m[1], +m[2], +m[3]);

  // r, g, b
  m = input.match(/^(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})$/);
  if (m) return fromRgb(+m[1], +m[2], +m[3]);

  // hsl(h, s%, l%)
  m = input.match(/^hsl\(\s*(\d{1,3})\s*,\s*(\d{1,3})%?\s*,\s*(\d{1,3})%?\s*\)$/i);
  if (m) return fromHsl(+m[1], +m[2], +m[3]);

  return null;
}

function hexToRgb(hex) {
  hex = hex.replace('#', '');
  const r = parseInt(hex.slice(0,2), 16);
  const g = parseInt(hex.slice(2,4), 16);
  const b = parseInt(hex.slice(4,6), 16);
  return fromRgb(r, g, b);
}

function fromRgb(r, g, b) {
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  const hex = '#' + [r,g,b].map(v => v.toString(16).padStart(2,'0').toUpperCase()).join('');
  const [h, s, l] = rgbToHsl(r, g, b);
  const name = findClosestName(r, g, b);
  return { r, g, b, hex, h, s, l, name,
    rgb: `rgb(${r}, ${g}, ${b})`,
    hsl: `hsl(${h}, ${s}%, ${l}%)`,
    // Contrast helpers
    luminance: (0.299*r + 0.587*g + 0.114*b) / 255,
  };
}

function fromHsl(h, s, l) {
  h = h % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2*l - 1)) * s;
  const x = c * (1 - Math.abs((h/60) % 2 - 1));
  const m = l - c/2;
  let r, g, b;
  if (h < 60)       { r=c; g=x; b=0; }
  else if (h < 120) { r=x; g=c; b=0; }
  else if (h < 180) { r=0; g=c; b=x; }
  else if (h < 240) { r=0; g=x; b=c; }
  else if (h < 300) { r=x; g=0; b=c; }
  else              { r=c; g=0; b=x; }
  return fromRgb(Math.round((r+m)*255), Math.round((g+m)*255), Math.round((b+m)*255));
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h, s, l = (max+min)/2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d/(2-max-min) : d/(max+min);
    if (max === r) h = ((g-b)/d + (g<b?6:0));
    else if (max === g) h = (b-r)/d + 2;
    else h = (r-g)/d + 4;
    h *= 60;
  }
  return [Math.round(h), Math.round(s*100), Math.round(l*100)];
}

function findClosestName(r, g, b) {
  let best = '', bestDist = Infinity;
  for (const [name, hex] of Object.entries(NAMED)) {
    const nr = parseInt(hex.slice(1,3),16), ng = parseInt(hex.slice(3,5),16), nb = parseInt(hex.slice(5,7),16);
    const d = (r-nr)**2 + (g-ng)**2 + (b-nb)**2;
    if (d < bestDist) { bestDist = d; best = name; }
  }
  return bestDist === 0 ? best : bestDist < 2000 ? '~' + best : '';
}

// Generate palette variations
function generatePalette(c) {
  const items = [];
  const add = (label, h, s, l) => {
    const col = fromHsl(h, s, l);
    items.push({ ...col, label });
  };

  add('Original', c.h, c.s, c.l);
  add('Complementary', (c.h + 180) % 360, c.s, c.l);
  add('Analogous +30°', (c.h + 30) % 360, c.s, c.l);
  add('Analogous -30°', (c.h + 330) % 360, c.s, c.l);
  add('Triadic +120°', (c.h + 120) % 360, c.s, c.l);
  add('Triadic -120°', (c.h + 240) % 360, c.s, c.l);
  add('Lighter +15%', c.h, c.s, Math.min(c.l + 15, 100));
  add('Lighter +30%', c.h, c.s, Math.min(c.l + 30, 100));
  add('Darker -15%', c.h, c.s, Math.max(c.l - 15, 0));
  add('Darker -30%', c.h, c.s, Math.max(c.l - 30, 0));

  return items;
}

function randomColor() {
  const h = Math.floor(Math.random() * 360);
  const s = 60 + Math.floor(Math.random() * 30);
  const l = 45 + Math.floor(Math.random() * 20);
  return fromHsl(h, s, l);
}

module.exports = { parseColor, fromHsl, generatePalette, randomColor, NAMED };
