import { STAIR, SLAB_EDGE_Z, W, D } from './constants.js';
// Cajas [minX,maxX,minZ,maxZ,planta]  (planta 1 = suelo, 2 = piso superior)
const b = (cx, cz, sx, sz, f) => [cx - sx / 2, cx + sx / 2, cz - sz / 2, cz + sz / 2, f];
export const BOXES = [
  // Planta 1: escritorios (3.2 x 1.5 + silla)
  ...[8.8, 4.4, 0.2].flatMap((z) => [b(-9.7, z, 1.6, 3.4, 1), b(9.7, z, 1.6, 3.4, 1), b(-11.5, z, 0.6, 4.0, 1), b(11.5, z, 0.6, 4.0, 1)]),
  b(-4.5, -9, 2, 2, 1), b(4.5, -9, 2, 2, 1), // núcleos IA
  b(0, -11.4, 12, 0.8, 1),                  // videowall
  // Planta 2: despacho TITAN X (paredes con puerta en |x|<1.5)
  b(-6, -7.6, 0.3, 8.8, 2), b(6, -7.6, 0.3, 8.8, 2),
  b(-3.75, -3.2, 4.5, 0.2, 2), b(3.75, -3.2, 4.5, 0.2, 2),
  b(0, -9.1, 4.2, 1.8, 2),                  // escritorio ejecutivo
  // Sala de juntas (puerta en x 11..13)
  b(8, -7.6, 0.2, 8.8, 2), b(9.6, -3.2, 3.2, 0.2, 2), b(14.6, -3.2, 2.8, 0.2, 2),
  b(12, -8, 5.2, 1.9, 2),
  // Lounge izquierdo
  b(-12, -5.9, 3.3, 1.1, 2), b(-14.5, -8.4, 1.1, 2.3, 2), b(-9.5, -8.4, 1.0, 1.0, 2), b(-12, -8.3, 1.7, 1.7, 2), b(-9.6, -5.6, 0.7, 0.7, 2), b(-14.6, -4.3, 1.7, 0.9, 2),
];
export function inStairRect(x, z) { return Math.abs(x) < STAIR.x + 0.15 && z < STAIR.z0 && z > STAIR.z1 - 0.3; }
export function stairHeight(z) {
  const t = (STAIR.z0 - z) / (STAIR.z0 - STAIR.z1);
  return Math.min(Math.max(t, 0), 1) * STAIR.rise;
}
export const bounds = { x: W / 2 - 0.5, zMin: -D / 2 + 0.5, zMax: D / 2 - 0.5 };
export { SLAB_EDGE_Z };

const R = 0.35;
// ¿Puede el caminante w={x,y,z} pasar a (nx,nz)? Función pura (probada en Node).
export function canMove(w, nx, nz) {
  const lvl = w.y > 2.4 ? 2 : 1;
  if (nz < bounds.zMin || nz > 30 || Math.abs(nx) > 30) return false;
  if (nz > bounds.zMax - 0.2 && nz < bounds.zMax + 1.2 && Math.abs(nx) > 1.8) return false; // fachada de cristal (puerta |x|<1.8)
  if (nz < bounds.zMax + 0.5 && Math.abs(nx) > bounds.x) return false;
  const curIn = inStairRect(w.x, w.z), nxtIn = inStairRect(nx, nz);
  if (nxtIn && !curIn && !((w.z >= STAIR.z0 && w.y < 0.8) || (w.z <= STAIR.z1 && w.y > 4.2))) return false;
  if (!nxtIn && curIn && !((nz >= STAIR.z0 && w.y < 0.8) || (nz <= STAIR.z1 && w.y > 4.2))) return false;
  if (lvl === 2 && !nxtIn && nz > SLAB_EDGE_Z - 0.2) return false;
  if (!nxtIn && !curIn && lvl === 1 && Math.abs(nx) < STAIR.x + 0.3 && nz < STAIR.z0 && nz > STAIR.z1 - 0.3) return false;
  for (const [x0, x1, z0, z1, f] of BOXES) if (f === lvl && nx > x0 - R && nx < x1 + R && nz > z0 - R && nz < z1 + R) return false;
  return true;
}
export function groundY(w) { return inStairRect(w.x, w.z) ? stairHeight(w.z) : (w.y > 2.4 ? 5 : 0); }
