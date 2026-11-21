// Prueba de rutas de los agentes: todos los trayectos empiezan/terminan en el asiento correcto,
// la altura en la escalera es coherente y no hay valores inválidos.
import { planRoute, placeSeat, deskSeat, ORDER, Y2 } from './src/routes.js';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FALLO', m); } };
const near = (a, b) => Math.hypot(a.x - b.x, a.z - b.z) < 0.01 && Math.abs(a.y - b.y) < 0.01;
let count = 0, maxLen = 0;
for (const id of ORDER) for (const from of ['desk', 'meeting', 'rest']) for (const to of ['desk', 'meeting', 'rest']) {
  if (from === to) continue; if (id === 'titan-x' && (from === 'rest' || to === 'rest')) continue;
  const r = planRoute(id, from, to); count++;
  ok(r.length > 0, `${id} ${from}->${to} ruta vacía`);
  ok(r.every((p) => [p.x, p.y, p.z].every(Number.isFinite)), `${id} ${from}->${to} valores no finitos`);
  ok(near(r[r.length - 1], placeSeat(id, to)), `${id} ${from}->${to} no termina en el asiento`);
  let len = 0; for (let i = 1; i < r.length; i++) { const d = Math.hypot(r[i].x - r[i - 1].x, r[i].z - r[i - 1].z); len += d; ok(Math.abs(r[i].y - r[i - 1].y) / Math.max(d, 0.1) < 0.7, `${id} ${from}->${to} pendiente excesiva en tramo ${i}`); }
  maxLen = Math.max(maxLen, len);
}
const seats = new Set(); for (const id of ORDER) { const s = placeSeat(id, 'meeting'); seats.add(`${s.x},${s.z}`); } ok(seats.size === 7, 'asientos de reunión repetidos');
const rest = new Set(); for (const id of ORDER.filter((i) => i !== 'titan-x')) { const s = placeSeat(id, 'rest'); rest.add(`${s.x},${s.z}`); } ok(rest.size === 6, 'asientos de descanso repetidos');
console.log(`${count} rutas verificadas · ruta más larga ${maxLen.toFixed(1)} m (${(maxLen / 1.25).toFixed(0)} s a 1,25 m/s) · ${fails ? fails + ' FALLOS' : 'sin fallos'}`);
process.exit(fails ? 1 : 0);
