// Prueba de navegación: simula caminar por la escalera y las salas sin GPU.
import { canMove, groundY } from './src/colliders.js';
const w = { x: 0, y: 0, z: 15.5 };
const step = (dx, dz, n) => { for (let i = 0; i < n; i++) {
  if (dx && canMove(w, w.x + dx, w.z)) w.x += dx; if (dz && canMove(w, w.x, w.z + dz)) w.z += dz;
  w.y += (groundY(w) - w.y) * 0.25; } };
const log = (m) => console.log(m.padEnd(34), `x=${w.x.toFixed(1)} y=${w.y.toFixed(2)} z=${w.z.toFixed(1)}`);
step(0, -0.05, 400);  log('Norte desde la puerta (escalera)');
console.assert(w.y > 4.9 && w.z < -0.8, 'FALLO: no subió a la planta 2');
step(0, -0.05, 60);   log('Entra al despacho de TITAN X');
console.assert(w.z < -3.5 && w.z > -8.5, 'FALLO: no entró al despacho');
step(0, 0.05, 120); log('Regresa al balcón');
w.x = 5; step(0, 0.05, 80);  log('Intenta saltar la barandilla (x=5)');
console.assert(w.y > 4.9 && w.z < -0.6, 'FALLO: atravesó la barandilla');
w.x = 0; step(0, 0.05, 260); log('Baja por la escalera');
console.assert(w.y < 0.3 && w.z > 8, 'FALLO: no bajó');
// no se puede entrar a la escalera por el costado
Object.assign(w, { x: 3, y: 0, z: 4 }); step(-0.05, 0, 60); log('Costado de la escalera (bloqueado)');
console.assert(w.x > 1.8, 'FALLO: atravesó el costado');
// escritorio bloqueado
Object.assign(w, { x: -5, y: 0, z: 7 }); step(-0.05, 0, 100); log('Hacia escritorio VIRAL HUNTER');
console.assert(w.x > -8.7, 'FALLO: atravesó el escritorio');
console.log('Pruebas de navegación completadas');
