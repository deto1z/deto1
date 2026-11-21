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
