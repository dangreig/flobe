// Pure utility helpers shared across Flobe modules.
export function rnd(a, b) { return a + Math.random() * (b - a); }

export function rndInt(a, b) { return Math.floor(rnd(a, b + 1)); }

export function lerp(a, b, t) { return a + (b - a) * t; }

export function normalizedSpeedValue(value) {
  return Math.max(1, Math.min(10, Number(value) || 5));
}

export function normalizedDensityValue(value) {
  return Math.max(1, Math.min(10, Number(value) || 5));
}

export function hexToRgb(hex) {
  if(!hex || typeof hex !== 'string') return [0, 0, 0];
  hex = hex.trim().replace(/^#/, '');
  if(hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  if(hex.length !== 6) return [0, 0, 0];
  return [
    parseInt(hex.slice(0,2), 16),
    parseInt(hex.slice(2,4), 16),
    parseInt(hex.slice(4,6), 16),
  ];
}

export function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
}

export function mixHexColor(a, b, t) {
  const ar = hexToRgb(a);
  const br = hexToRgb(b);
  return rgbToHex(
    lerp(ar[0], br[0], t),
    lerp(ar[1], br[1], t),
    lerp(ar[2], br[2], t)
  );
}

export function rotatePalette(base, offset) {
  return base.map((_, i) => base[(i + offset) % base.length]);
}
