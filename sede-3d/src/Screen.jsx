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

/* ───── Pantallas temáticas por especialidad (contenido de DEMOSTRACIÓN, sin datos reales) ───── */
const tag = (ctx, w, h) => demoTag(ctx, w, h);
const head = (ctx, w, h, text, color) => neonText(ctx, text, w * 0.04, h * 0.08, h * 0.07, color, 10, 800, 'left');

export const drawFootball = (ctx, w, h, t) => {            // VIRAL HUNTER · fútbol
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#04230f'); g.addColorStop(1, '#06310f'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 3; const x0 = w * 0.06, y0 = h * 0.18, pw = w * 0.88, ph = h * 0.62;
  ctx.strokeRect(x0, y0, pw, ph); ctx.beginPath(); ctx.moveTo(w / 2, y0); ctx.lineTo(w / 2, y0 + ph); ctx.stroke();
  ctx.beginPath(); ctx.arc(w / 2, y0 + ph / 2, ph * 0.16, 0, 7); ctx.stroke(); ctx.strokeRect(x0, y0 + ph * 0.28, pw * 0.14, ph * 0.44); ctx.strokeRect(x0 + pw * 0.86, y0 + ph * 0.28, pw * 0.14, ph * 0.44);
  for (let i = 0; i < 10; i++) { const a = i * 0.9 + t * 0.4; ctx.fillStyle = i < 5 ? '#2ee6ff' : '#ff4fd8'; ctx.beginPath(); ctx.arc(w * (0.2 + 0.6 * (0.5 + 0.5 * Math.sin(a + i))), y0 + ph * (0.15 + 0.7 * (0.5 + 0.5 * Math.cos(a * 0.7 + i * 2))), h * 0.018, 0, 7); ctx.fill(); }
  head(ctx, w, h, 'FÚTBOL · EN VIVO (demo)', '#25e08a');
  ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(0, h * 0.86, w, h * 0.14); ctx.font = `600 ${h * 0.05}px ${FONT}`; ctx.textAlign = 'left'; ctx.fillStyle = '#eef';
  const tick = '[ejemplo] Titular de tendencia · fuente · fecha · sin verificar      '; const off = (t * 60) % (w); ctx.fillText(tick + tick + tick, -off, h * 0.93); tag(ctx, w, h);
};
export const drawTrends = (ctx, w, h, t) => {              // VIRAL HUNTER · tendencias
  bgGrad(ctx, w, h); head(ctx, w, h, 'TENDENCIAS', '#2ee6ff');
  for (let i = 0; i < 6; i++) { const y = h * (0.2 + i * 0.12); ctx.fillStyle = 'rgba(120,80,255,.18)'; ctx.fillRect(w * 0.04, y, w * 0.92, h * 0.1);
    ctx.fillStyle = '#2ee6ff'; ctx.font = `700 ${h * 0.05}px ${FONT}`; ctx.textAlign = 'left'; ctx.fillText('#' + (i + 1), w * 0.06, y + h * 0.065);
    ctx.fillStyle = '#cdd6ff'; ctx.font = `500 ${h * 0.045}px ${FONT}`; ctx.fillText('[ejemplo] tema en tendencia', w * 0.16, y + h * 0.065);
    ctx.fillStyle = 'rgba(100,120,255,.35)'; ctx.fillRect(w * 0.62, y + h * 0.03, w * 0.3 * (0.4 + 0.5 * Math.abs(Math.sin(i + t * 0.3))), h * 0.04); }
  tag(ctx, w, h);
};
export const drawScript = (ctx, w, h, t) => {              // HOOK MASTER · guiones
  ctx.fillStyle = '#0c0a1c'; ctx.fillRect(0, 0, w, h); head(ctx, w, h, 'GUION · GANCHOS', '#ff4fd8');
  ctx.fillStyle = 'rgba(255,79,216,.15)'; ctx.fillRect(w * 0.04, h * 0.15, w * 0.92, h * 0.1); ctx.fillStyle = '#ff9bf0'; ctx.font = `700 ${h * 0.05}px ${FONT}`; ctx.textAlign = 'left'; ctx.fillText('GANCHO · 0:00–0:03', w * 0.06, h * 0.215);
  for (let i = 0; i < 9; i++) { const y = h * (0.3 + i * 0.07); ctx.fillStyle = 'rgba(205,214,255,.22)'; ctx.fillRect(w * 0.06, y, w * (0.3 + 0.55 * Math.abs(Math.sin(i * 7.3))), h * 0.025); }
  if (Math.floor(t * 2) % 2 === 0) { ctx.fillStyle = '#ff4fd8'; ctx.fillRect(w * 0.06 + w * 0.4, h * 0.3 + h * 0.07 * 4, 4, h * 0.035); }
  ctx.fillStyle = '#8e93ad'; ctx.font = `500 ${h * 0.04}px ${FONT}`; ctx.fillText('Retención · títulos · intros (esperando órdenes)', w * 0.06, h * 0.95); tag(ctx, w, h);
};
export const drawDesign = (ctx, w, h, t) => {               // PIXEL QUEEN · portadas
  ctx.fillStyle = '#120a26'; ctx.fillRect(0, 0, w, h); head(ctx, w, h, 'PORTADAS · MINIATURAS', '#b45bff');
  for (let i = 0; i < 3; i++) { const x = w * (0.05 + i * 0.31), g = ctx.createLinearGradient(x, 0, x + w * 0.28, h); g.addColorStop(0, ['#2f7bff', '#ff4fd8', '#25e08a'][i]); g.addColorStop(1, '#2a1259');
    ctx.fillStyle = g; ctx.fillRect(x, h * 0.16, w * 0.28, h * 0.36); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = `900 ${h * 0.07}px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('TÍTULO', x + w * 0.14, h * 0.38); }
  ['#2f7bff', '#9b2bff', '#ff4fd8', '#2ee6ff', '#ffc531', '#25e08a', '#ffffff', '#0b0d1a'].forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(w * (0.05 + i * 0.07), h * 0.6, w * 0.06, h * 0.07); });
  for (let i = 0; i < 4; i++) { ctx.fillStyle = 'rgba(180,91,255,.25)'; ctx.fillRect(w * 0.05, h * (0.72 + i * 0.05), w * (0.5 + 0.4 * Math.abs(Math.sin(i * 2 + t * 0.2))) * 0.9, h * 0.035); }
  tag(ctx, w, h);
};
export const drawVerify = (ctx, w, h, t) => {               // FILTER X · verificación
  ctx.fillStyle = '#071410'; ctx.fillRect(0, 0, w, h); head(ctx, w, h, 'VERIFICACIÓN DE FUENTES', '#25e08a');
  const nodes = [[0.5, 0.3], [0.2, 0.55], [0.5, 0.62], [0.8, 0.55], [0.35, 0.82], [0.68, 0.82]];
  ctx.strokeStyle = 'rgba(37,224,138,.5)'; ctx.lineWidth = 2; [[0, 1], [0, 2], [0, 3], [1, 4], [2, 4], [2, 5], [3, 5]].forEach(([a, b]) => { ctx.beginPath(); ctx.moveTo(w * nodes[a][0], h * nodes[a][1]); ctx.lineTo(w * nodes[b][0], h * nodes[b][1]); ctx.stroke(); });
  nodes.forEach(([x, y], i) => { ctx.fillStyle = i === 0 ? '#25e08a' : '#10301f'; ctx.strokeStyle = '#25e08a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(w * x, h * y, h * 0.045, 0, 7); ctx.fill(); ctx.stroke(); });
  ctx.fillStyle = '#25e08a'; ctx.font = `700 ${h * 0.06}px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('?', w * 0.5, h * 0.32);
  ctx.fillStyle = '#8fa'; ctx.font = `500 ${h * 0.04}px ${FONT}`; ctx.fillText('verificado · rumor · sin verificar', w / 2, h * 0.95); tag(ctx, w, h);
};
export const drawCalendar = (ctx, w, h) => {                // IDEA STORM · calendario editorial
  ctx.fillStyle = '#17120a'; ctx.fillRect(0, 0, w, h); head(ctx, w, h, 'CALENDARIO EDITORIAL', '#ffc531');
  const cols = ['MAÑANA', 'TARDE', 'NOCHE'], days = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  cols.forEach((c, i) => { ctx.fillStyle = '#ffc531'; ctx.font = `700 ${h * 0.045}px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText(c, w * (0.28 + i * 0.24), h * 0.19); });
  days.forEach((d, r) => { const y = h * (0.23 + r * 0.095); ctx.fillStyle = '#8e93ad'; ctx.font = `600 ${h * 0.04}px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText(d, w * 0.07, y + h * 0.06);
    cols.forEach((_, i) => { ctx.strokeStyle = 'rgba(255,197,49,.35)'; ctx.strokeRect(w * (0.16 + i * 0.24), y, w * 0.22, h * 0.08); }); });
  ctx.fillStyle = '#8e93ad'; ctx.font = `500 ${h * 0.037}px ${FONT}`; ctx.fillText('sin publicaciones programadas', w / 2, h * 0.95); tag(ctx, w, h);
};
export const drawSocial = (ctx, w, h, t) => {              // DATA BOSS · redes
  bgGrad(ctx, w, h); head(ctx, w, h, 'REDES · ANALÍTICA', '#2f7bff');
  ['YouTube', 'TikTok', 'Instagram', 'X'].forEach((n, i) => { const x = w * (0.04 + i * 0.24); ctx.fillStyle = 'rgba(80,110,255,.16)'; ctx.fillRect(x, h * 0.15, w * 0.22, h * 0.17);
    ctx.fillStyle = '#9fb0ff'; ctx.font = `600 ${h * 0.04}px ${FONT}`; ctx.textAlign = 'left'; ctx.fillText(n, x + 8, h * 0.2); ctx.fillStyle = '#fff'; ctx.font = `800 ${h * 0.075}px ${FONT}`; ctx.fillText('—', x + 8, h * 0.285); });
  ctx.strokeStyle = '#2f7bff'; ctx.lineWidth = 3; ctx.shadowColor = '#2f7bff'; ctx.shadowBlur = 10; ctx.beginPath(); for (let i = 0; i <= 50; i++) { const x = w * 0.05 + w * 0.9 * i / 50, y = h * (0.62 - 0.12 * Math.sin(i * 0.3 + t * 0.6) - 0.03 * i / 5); ctx[i ? 'lineTo' : 'moveTo'](x, y); } ctx.stroke(); ctx.shadowBlur = 0;
  for (let i = 0; i < 12; i++) { ctx.fillStyle = 'rgba(180,91,255,.4)'; const bh = h * 0.12 * (0.3 + 0.7 * Math.abs(Math.sin(i * 1.7))); ctx.fillRect(w * (0.06 + i * 0.075), h * 0.9 - bh, w * 0.05, bh); }
  ctx.fillStyle = '#8890c0'; ctx.font = `500 ${h * 0.035}px ${FONT}`; ctx.textAlign = 'left'; ctx.fillText('Solo cuentas autorizadas (sin conectar)', w * 0.05, h * 0.95); tag(ctx, w, h);
};
export const drawExec = (ctx, w, h, t) => {                 // TITAN X · mando
  bgGrad(ctx, w, h); head(ctx, w, h, 'MANDO EJECUTIVO', '#6fb4ff');
  ['VIRAL HUNTER', 'HOOK MASTER', 'PIXEL QUEEN', 'FILTER X', 'IDEA STORM', 'DATA BOSS'].forEach((n, i) => { const x = w * (0.04 + (i % 3) * 0.32), y = h * (0.17 + Math.floor(i / 3) * 0.3);
    ctx.fillStyle = 'rgba(80,110,255,.16)'; ctx.fillRect(x, y, w * 0.29, h * 0.26); ctx.fillStyle = '#cdd6ff'; ctx.font = `600 ${h * 0.045}px ${FONT}`; ctx.textAlign = 'left'; ctx.fillText(n, x + 8, y + h * 0.07); ctx.fillStyle = '#6b7088'; ctx.fillText('● sin conectar', x + 8, y + h * 0.15); });
  ctx.fillStyle = '#9aa'; ctx.font = `500 ${h * 0.04}px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('Órdenes · aprobaciones · estado de la empresa', w / 2, h * 0.86); tag(ctx, w, h);
};
// Pantallas de cada estación (izquierda, centro, derecha)
export const STATION_SCREENS = {
  'viral-hunter': [drawTrends, drawFootball, drawNews],
  'hook-master': [drawScript, drawScript, drawNews],
  'pixel-queen': [drawDesign, drawDesign, drawStats],
  'filter-x': [drawVerify, drawNews, drawVerify],
  'idea-storm': [drawCalendar, drawCalendar, drawTasks],
  'data-boss': [drawSocial, drawStats, drawSocial],
  'titan-x': [drawExec, drawAgentBars, drawTasks],
};
