// Rutas y asientos de los agentes (módulo puro, sin React: se prueba con `node test-routes.mjs`)
import { AGENTS } from './constants.js';
import { stairHeight } from './colliders.js';

export const Y2 = 5;
export const ORDER = ['viral-hunter', 'hook-master', 'pixel-queen', 'filter-x', 'idea-storm', 'data-boss', 'titan-x'];

export function deskSeat(id) {
  if (id === 'titan-x') return { x: 0, y: Y2, z: -10.5, yaw: 0 };
  const a = AGENTS.find((q) => q.id === id), left = a.pos[0] < 0;
  return { x: a.pos[0] + (left ? 1.1 : -1.1), y: 0, z: a.pos[1], yaw: left ? -Math.PI / 2 : Math.PI / 2 };
}
const MEET = [[10.4, -9.25, 0], [11.45, -9.25, 0], [12.55, -9.25, 0], [13.6, -9.25, 0], [10.4, -6.75, Math.PI], [11.45, -6.75, Math.PI], [12.55, -6.75, Math.PI]];
const REST = [[-13.1, -6.0, Math.PI], [-12, -6.0, Math.PI], [-10.9, -6.0, Math.PI], [-14.4, -9.0, Math.PI / 2], [-14.4, -7.8, Math.PI / 2], [-9.55, -8.4, -Math.PI / 2]];
export function placeSeat(id, place) {
  const i = ORDER.indexOf(id);
  if (place === 'meeting') { const m = MEET[i]; return { x: m[0], y: Y2, z: m[1], yaw: m[2] }; }
  if (place === 'rest' && id !== 'titan-x') { const m = REST[i]; return { x: m[0], y: Y2 - 0.04, z: m[1], yaw: m[2] }; }
  return deskSeat(id);
}

const stairNodes = (down) => { const n = []; for (let z = 7.8; z >= -0.9; z -= 1.7) n.push({ x: 0, y: stairHeight(z), z }); return down ? n.reverse() : n; };
// Ruta desde el escritorio hasta la zona de la planta 2 (o a la inversa)
function routeToUpper(id) {
  if (id === 'titan-x') return [{ x: -2.6, y: Y2, z: -10.5 }, { x: -2.6, y: Y2, z: -6.5 }, { x: 0, y: Y2, z: -4.6 }, { x: 0, y: Y2, z: -1.8 }];
  const a = AGENTS.find((q) => q.id === id), left = a.pos[0] < 0, lx = left ? -4.8 : 4.8;
  return [{ x: a.pos[0] + (left ? 2.6 : -2.6), y: 0, z: a.pos[1] }, { x: lx, y: 0, z: a.pos[1] }, { x: lx, y: 0, z: 10.0 }, { x: 0, y: 0, z: 9.3 }, ...stairNodes(false), { x: 0, y: Y2, z: -1.8 }];
}
const landingTo = (place, seat) => place === 'meeting'
  ? [{ x: 11.6, y: Y2, z: -1.8 }, { x: 12, y: Y2, z: -4.4 }, { x: seat.x, y: Y2, z: seat.z + (seat.yaw === 0 ? 1.0 : -1.0) }, seat]
  : [{ x: -9.8, y: Y2, z: -1.8 }, { x: -9.8, y: Y2, z: -4.3 }, { x: seat.x + (seat.yaw === Math.PI ? 0 : seat.yaw > 0 ? 1.0 : -1.0), y: Y2, z: seat.z + (seat.yaw === Math.PI ? 1.0 : 0) }, seat];

export function planRoute(id, from, to) {
  if (from === to) return [];
  const up = routeToUpper(id), landing = { x: 0, y: Y2, z: -1.8 };
  const toLanding = (place) => (place === 'desk' ? [...up] : [...landingTo(place, placeSeat(id, place)).slice(0, -1).reverse(), landing]);
  const fromLanding = (place) => (place === 'desk' ? [...up].reverse().concat([deskSeat(id)]) : landingTo(place, placeSeat(id, place)));
  return toLanding(from).concat(fromLanding(to));
}

