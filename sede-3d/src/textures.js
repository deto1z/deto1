import * as THREE from 'three';
export const FONT = '"Segoe UI", "Helvetica Neue", Arial, sans-serif';

export function makeCanvasTexture(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { canvas, ctx: canvas.getContext('2d'), tex };
}

export function neonText(ctx, text, x, y, size, color, glow = 24, weight = 800, align = 'center') {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.shadowColor = color; ctx.shadowBlur = glow; ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.shadowBlur = 0;
}

// Etiqueta estática (nombre de estación, carteles)
export function drawLabel(ctx, w, h, lines) {
  ctx.clearRect(0, 0, w, h);
  lines.forEach((l) => neonText(ctx, l.t, w / 2, l.y, l.s, l.c, l.g ?? 18, l.w ?? 800));
}

// Logo DETONADOR AI EMPIRE
export function drawLogo(ctx, w, h, bg = true) {
  ctx.clearRect(0, 0, w, h);
  if (bg) { ctx.fillStyle = 'rgba(4,5,16,0.92)'; ctx.fillRect(0, 0, w, h); }
  const g = ctx.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, '#2ee6ff'); g.addColorStop(0.5, '#4d7bff'); g.addColorStop(1, '#b45bff');
  // icono: rayo dentro de un hexágono
  const cx = w * 0.16, cy = h / 2, r = h * 0.36;
  ctx.save(); ctx.shadowColor = '#4d7bff'; ctx.shadowBlur = 30; ctx.strokeStyle = g; ctx.lineWidth = h * 0.035;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) { const an = Math.PI / 3 * i + Math.PI / 6; ctx[i ? 'lineTo' : 'moveTo'](cx + r * Math.cos(an), cy + r * Math.sin(an)); }
  ctx.closePath(); ctx.stroke();
  ctx.fillStyle = g; ctx.beginPath();
  ctx.moveTo(cx + r * 0.12, cy - r * 0.62); ctx.lineTo(cx - r * 0.42, cy + r * 0.08); ctx.lineTo(cx - r * 0.02, cy + r * 0.08);
  ctx.lineTo(cx - r * 0.14, cy + r * 0.62); ctx.lineTo(cx + r * 0.44, cy - r * 0.12); ctx.lineTo(cx + r * 0.04, cy - r * 0.12);
  ctx.closePath(); ctx.fill(); ctx.restore();
  ctx.save(); ctx.shadowColor = '#4d7bff'; ctx.shadowBlur = 28; ctx.fillStyle = g;
  ctx.font = `900 ${h * 0.34}px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText('DETONADOR', w * 0.30, h * 0.40);
  ctx.font = `700 ${h * 0.19}px ${FONT}`; ctx.fillStyle = '#f4f7ff'; ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 14;
  ctx.fillText('A I   E M P I R E', w * 0.305, h * 0.74);
  ctx.restore();
}

/* ---------- Texturas procedurales (mármol negro, madera oscura) ---------- */
const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
const vnoise = (x, y) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
const fbm = (x, y) => { let s = 0, a = 0.5; for (let i = 0; i < 5; i++) { s += a * vnoise(x, y); x *= 2; y *= 2; a *= 0.5; } return s; };

function procTexture(size, fn) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const ctx = c.getContext('2d'), img = ctx.createImageData(size, size);
  for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
    const [r, g, b] = fn(px / size, py / size), i = (py * size + px) * 4;
    img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping; t.anisotropy = 8;
  return t;
}
export const marbleTexture = (size = 512) => procTexture(size, (u, v) => {
  const n = fbm(u * 4, v * 4), n2 = fbm(u * 9 + 7, v * 9 + 3);
  const vein = Math.pow(1 - Math.abs(Math.sin((u * 2.2 + v * 1.1 + n * 4.2) * Math.PI)), 16);
  const vein2 = Math.pow(1 - Math.abs(Math.sin((u * 5 - v * 3 + n2 * 3) * Math.PI)), 28) * 0.5;
  const base = 7 + n * 12, w = vein * 150 + vein2 * 110;
  return [base + w * 0.8, base + 2 + w * 0.85, base + 9 + w];
});
export const woodTexture = (size = 512) => procTexture(size, (u, v) => {
  const n = fbm(u * 3, v * 30), ring = Math.sin((v * 46 + n * 7 + fbm(u * 2, v * 4) * 5) * Math.PI);
  const k = 0.5 + 0.5 * ring, g = fbm(u * 60, v * 2.5);
  return [34 + k * 26 + g * 14, 20 + k * 15 + g * 8, 13 + k * 9 + g * 5];
});
export const repeatOf = (tex, x, y) => { const t = tex.clone(); t.needsUpdate = true; t.repeat.set(x, y); return t; };

// Teclado con teclas rotuladas (textura)
export function keyboardTexture() {
  const { canvas, ctx, tex } = makeCanvasTexture(512, 200);
  ctx.fillStyle = '#07080f'; ctx.fillRect(0, 0, 512, 200);
  const rows = [14, 14, 13, 12, 8];
  rows.forEach((n, r) => {
    const kw = 512 / 15.2; let x0 = 12 + (r === 4 ? 70 : 0);
    for (let k = 0; k < n; k++) {
      const w = r === 4 && k === 3 ? kw * 4.6 : kw - 4;
      const g = ctx.createLinearGradient(0, 0, 512, 0); g.addColorStop(0, '#2f7bff'); g.addColorStop(1, '#b45bff');
      ctx.fillStyle = '#10121f'; ctx.fillRect(x0, 14 + r * 36, w, 30);
      ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.strokeRect(x0, 14 + r * 36, w, 30);
      x0 += w + 4;
    }
  });
  tex.needsUpdate = true; return tex;
}
