import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { makeCanvasTexture, neonText, FONT } from './textures';
import { useStore } from './store';

// Pantalla con contenido dibujado en canvas. `draw(ctx,w,h,t)` se llama a `fps`.
// IMPORTANTE: todo el contenido actual es DEMOSTRACIÓN (sin datos reales) y se rotula como tal.
export function Screen({ w = 2, h = 1.2, res = 256, draw, fps = 4, position, rotation, frame = true, glow = 'blue', additive = false }) {
  const cv = useMemo(() => makeCanvasTexture(Math.round(res * w / h), res), [res, w, h]);
  const last = useRef(-1);
  const low = useStore((s) => s.quality === 'low');
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const f = low ? Math.min(fps, 2) : fps;
    if (last.current < 0 || t - last.current > 1 / f) {
      last.current = t;
      draw(cv.ctx, cv.canvas.width, cv.canvas.height, t);
      cv.tex.needsUpdate = true;
    }
  });
  const fc = glow === 'violet' ? '#9b2bff' : '#1f6bff';
  return (
    <group position={position} rotation={rotation}>
      {frame && (
        <mesh position={[0, 0, -0.03]}>
          <boxGeometry args={[w + 0.12, h + 0.12, 0.05]} />
          <meshStandardMaterial color="#05060f" metalness={0.9} roughness={0.3} emissive={fc} emissiveIntensity={0.25} />
        </mesh>
      )}
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={cv.tex} toneMapped={false} transparent={additive} depthWrite={!additive} side={additive ? THREE.DoubleSide : THREE.FrontSide} blending={additive ? THREE.AdditiveBlending : THREE.NormalBlending} />
      </mesh>
    </group>
  );
}

/* ---------- Contenidos de pantalla (DEMO) ---------- */
const bgGrad = (ctx, w, h) => {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#060a24'); g.addColorStop(1, '#16083a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
};
const demoTag = (ctx, w, h) => {
  ctx.font = `600 ${h * 0.045}px ${FONT}`; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffc531'; ctx.fillText('DEMO · sin datos reales', w - h * 0.04, h - h * 0.035);
};
const rng = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

export const drawStats = (ctx, w, h, t) => {
  bgGrad(ctx, w, h);
  neonText(ctx, 'RENDIMIENTO DE CANALES', w * 0.03, h * 0.09, h * 0.07, '#2ee6ff', 10, 800, 'left');
  const kp = [['VISUALIZACIONES', '— — —'], ['RETENCIÓN', '— %'], ['SEGUIDORES', '— — —']];
  kp.forEach(([k, v], i) => {
    const x = w * (0.03 + i * 0.32);
    ctx.fillStyle = 'rgba(80,110,255,0.14)'; ctx.fillRect(x, h * 0.17, w * 0.29, h * 0.2);
    ctx.font = `600 ${h * 0.04}px ${FONT}`; ctx.textAlign = 'left'; ctx.fillStyle = '#9fb0ff'; ctx.fillText(k, x + 14, h * 0.22);
    ctx.font = `800 ${h * 0.09}px ${FONT}`; ctx.fillStyle = '#fff'; ctx.fillText(v, x + 14, h * 0.31);
  });
  // gráfica decorativa (placeholder animado)
  ctx.strokeStyle = '#4d7bff'; ctx.lineWidth = 3; ctx.shadowColor = '#4d7bff'; ctx.shadowBlur = 12; ctx.beginPath();
  for (let i = 0; i <= 60; i++) {
    const x = w * 0.03 + (w * 0.94) * i / 60, y = h * (0.72 - 0.18 * Math.sin(i * 0.25 + t * 0.8) * 0.5 - 0.1 * Math.sin(i * 0.7 + t) * 0.5 - i / 60 * 0.12);
    ctx[i ? 'lineTo' : 'moveTo'](x, y);
  }
  ctx.stroke(); ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(160,170,255,0.5)'; ctx.font = `500 ${h * 0.04}px ${FONT}`; ctx.textAlign = 'left';
  ctx.fillText('Esperando conexión autorizada de cuentas (Fase 5)', w * 0.03, h * 0.92);
  demoTag(ctx, w, h);
};

export const drawNews = (ctx, w, h, t) => {
  bgGrad(ctx, w, h);
  neonText(ctx, 'NOTICIAS · FÚTBOL · VIRAL', w * 0.03, h * 0.09, h * 0.07, '#ff4fd8', 10, 800, 'left');
  const items = ['[ejemplo] Titular de tendencia 1', '[ejemplo] Titular de tendencia 2', '[ejemplo] Titular de tendencia 3', '[ejemplo] Titular de tendencia 4'];
  items.forEach((s, i) => {
    const y = h * (0.22 + i * 0.17);
    ctx.fillStyle = 'rgba(120,80,255,0.16)'; ctx.fillRect(w * 0.03, y - h * 0.06, w * 0.94, h * 0.13);
    ctx.fillStyle = i === Math.floor(t / 2) % 4 ? '#2ee6ff' : '#445';
    ctx.fillRect(w * 0.03, y - h * 0.06, 6, h * 0.13);
    ctx.font = `600 ${h * 0.058}px ${FONT}`; ctx.textAlign = 'left'; ctx.fillStyle = '#eef'; ctx.fillText(s, w * 0.06, y);
    ctx.font = `500 ${h * 0.036}px ${FONT}`; ctx.fillStyle = '#8ea'; ctx.fillText('fuente · fecha · estado: sin verificar', w * 0.06, y + h * 0.05);
  });
  demoTag(ctx, w, h);
};

export const drawTasks = (ctx, w, h) => {
  bgGrad(ctx, w, h);
  neonText(ctx, 'PANEL DE TRABAJOS', w / 2, h * 0.07, h * 0.06, '#2ee6ff', 10);
  ['PENDIENTES', 'EN CURSO', 'COMPLETADOS'].forEach((c, i) => {
    const x = w * (0.04 + i * 0.32);
    ctx.fillStyle = 'rgba(80,110,255,0.14)'; ctx.fillRect(x, h * 0.14, w * 0.29, h * 0.76);
    ctx.font = `700 ${h * 0.04}px ${FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = ['#ffc531', '#2f7bff', '#25e08a'][i];
    ctx.fillText(c, x + w * 0.145, h * 0.19);
    ctx.font = `800 ${h * 0.16}px ${FONT}`; ctx.fillStyle = '#fff'; ctx.fillText('0', x + w * 0.145, h * 0.5);
    ctx.font = `500 ${h * 0.032}px ${FONT}`; ctx.fillStyle = '#8890c0'; ctx.fillText('sin tareas aún', x + w * 0.145, h * 0.64);
  });
  ctx.font = `500 ${h * 0.034}px ${FONT}`; ctx.fillStyle = '#9aa'; ctx.textAlign = 'center';
  ctx.fillText('Se activará con el sistema de órdenes (Fase 4)', w / 2, h * 0.96);
};

export const drawAgentBars = (ctx, w, h, t) => {
  bgGrad(ctx, w, h);
  neonText(ctx, 'RENDIMIENTO DE AGENTES', w / 2, h * 0.08, h * 0.065, '#b45bff', 10);
  const names = ['VIRAL HUNTER', 'HOOK MASTER', 'PIXEL QUEEN', 'FILTER X', 'IDEA STORM', 'DATA BOSS'];
  names.forEach((n, i) => {
    const y = h * (0.2 + i * 0.125);
    ctx.font = `600 ${h * 0.045}px ${FONT}`; ctx.textAlign = 'left'; ctx.fillStyle = '#cdd6ff'; ctx.fillText(n, w * 0.04, y);
    ctx.fillStyle = 'rgba(100,120,255,0.18)'; ctx.fillRect(w * 0.4, y - h * 0.025, w * 0.52, h * 0.05);
    ctx.fillStyle = '#6b7088'; ctx.fillText('sin conectar', w * 0.43, y);
  });
  demoTag(ctx, w, h);
};

export const drawHolo = (ctx, w, h, t) => {
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(46,230,255,0.9)'; ctx.lineWidth = 4; ctx.strokeRect(6, 6, w - 12, h - 12);
  ctx.fillStyle = 'rgba(46,230,255,0.07)'; ctx.fillRect(0, 0, w, h);
  for (let y = (t * 40) % 8; y < h; y += 8) { ctx.fillStyle = 'rgba(46,230,255,0.06)'; ctx.fillRect(0, y, w, 2); }
  neonText(ctx, 'TITAN X · CENTRO DE MANDO', w / 2, h * 0.14, h * 0.1, '#2ee6ff', 20);
  // anillo de órbita animado
  const cx = w / 2, cy = h * 0.55;
  for (let k = 0; k < 3; k++) {
    ctx.strokeStyle = ['#2ee6ff', '#4d7bff', '#b45bff'][k]; ctx.lineWidth = 3; ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.ellipse(cx, cy, h * (0.18 + k * 0.08), h * (0.07 + k * 0.03), t * (0.6 - k * 0.25), 0, Math.PI * 2); ctx.stroke();
  }
  ctx.shadowBlur = 0;
  neonText(ctx, 'ESPERANDO TUS ÓRDENES', w / 2, h * 0.9, h * 0.07, '#ffffff', 12, 600);
};

export const drawStation = (agent) => (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(5,6,18,0.82)'; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = agent.color; ctx.lineWidth = 6; ctx.shadowColor = agent.color; ctx.shadowBlur = 18; ctx.strokeRect(5, 5, w - 10, h - 10); ctx.shadowBlur = 0;
  neonText(ctx, agent.name, w / 2, h * 0.38, h * 0.30, agent.color, 22, 900);
  ctx.font = `500 ${h * 0.14}px ${FONT}`; ctx.fillStyle = '#cdd6ff'; ctx.textAlign = 'center'; ctx.fillText(agent.role, w / 2, h * 0.66);
  ctx.font = `600 ${h * 0.11}px ${FONT}`; ctx.fillStyle = '#8e93ad'; ctx.fillText('● SIN CONECTAR', w / 2, h * 0.86);
};
