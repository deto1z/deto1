import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/* ───────────────────────────────────────────────────────────────
   Personajes humanoides con rig de articulaciones (huesos) propio.
   Cada personaje es una configuración (LOOKS). La animación es
   independiente del modelo: si más adelante se aporta un GLB con
   esqueleto, se reutilizan las mismas "acciones" (ver PERSONAJES.md).
   Convención: el personaje mira hacia +Z; su mano izquierda queda en +X.
   ─────────────────────────────────────────────────────────────── */

export const TITAN = { id: 'titan-x', name: 'TITAN X', role: 'CEO · Director de la empresa', color: '#2f7bff' };

export const LOOKS = {
  'titan-x':     { h: 1.86, skin: '#b98b6c', hair: '#c9ceda', style: 'slick',  top: '#06070d', bottom: '#06070d', shirt: '#e8ecff', accent: '#2f7bff', eye: '#6fb4ff', acc: ['tie', 'earpiece', 'lapel'], suit: true },
  'viral-hunter':{ h: 1.80, skin: '#8d5a3f', hair: '#14110f', style: 'short', top: '#0d3b4a', bottom: '#12151f', accent: '#2ee6ff', eye: '#2ee6ff', acc: ['cap', 'headset', 'scarf'] },
  'hook-master': { h: 1.74, skin: '#e0b192', hair: '#6b2a8c', style: 'messy', top: '#4a0f45', bottom: '#14111d', accent: '#ff4fd8', eye: '#ff9bf0', acc: ['glasses', 'hoodie'] },
  'pixel-queen': { h: 1.70, skin: '#d9a98a', hair: '#8f4bff', style: 'long',  top: '#2a1459', bottom: '#120f24', accent: '#b45bff', eye: '#d6a8ff', acc: ['stylus', 'visorband'] },
  'filter-x':    { h: 1.78, skin: '#a8765a', hair: '#2a2a2e', style: 'short', top: '#16352a', bottom: '#10141a', shirt: '#dfe9e4', accent: '#25e08a', eye: '#5dffb0', acc: ['monocle', 'vest'] },
  'idea-storm':  { h: 1.76, skin: '#f0c4a0', hair: '#ffc531', style: 'spiky', top: '#4d3a08', bottom: '#15130f', accent: '#ffc531', eye: '#ffe08a', acc: ['bulb', 'blazer'] },
  'data-boss':   { h: 1.82, skin: '#6e4631', hair: '#0d0d12', style: 'bald',  top: '#0c2556', bottom: '#0b0f1c', shirt: '#cfe0ff', accent: '#2f7bff', eye: '#7fb4ff', acc: ['visor', 'tablet', 'tie'], suit: true },
};

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.1, ...o });
const glow = (color, k = 2) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), toneMapped: false });

function build(look) {
  const s = look.h / 1.76;
  const skin = mat(look.skin, { roughness: 0.6 }), hair = mat(look.hair, { roughness: 0.45 }), top = mat(look.top, { roughness: 0.5, metalness: 0.15 });
  const bottom = mat(look.bottom, { roughness: 0.6 }), shoe = mat('#07080c', { roughness: 0.3, metalness: 0.4 }), shirt = mat(look.shirt ?? look.top);
  const acc = glow(look.accent, 2.2), eyeM = glow(look.eye, 2.5), dark = mat('#05060a', { roughness: 0.8 });
  const g = (parent, pos = [0, 0, 0]) => { const o = new THREE.Group(); o.position.set(...pos); parent.add(o); return o; };
  const m = (parent, geo, material, pos = [0, 0, 0], sc = [1, 1, 1], rot = [0, 0, 0]) => {
    const o = new THREE.Mesh(geo, material); o.position.set(...pos); o.scale.set(...sc); o.rotation.set(...rot); o.castShadow = true; parent.add(o); return o;
  };
  const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 4, 12), sph = (r) => new THREE.SphereGeometry(r, 18, 14), box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
  const J = {};
  const root = new THREE.Group(); root.scale.setScalar(s);
  const hips = J.hips = g(root, [0, 0.95, 0]);
  m(hips, box(0.34, 0.17, 0.21), bottom, [0, 0, 0]);
  m(hips, box(0.35, 0.03, 0.22), acc, [0, 0.07, 0]);              // cinturón luminoso
  const spine = J.spine = g(hips, [0, 0.06, 0]);
  const chest = g(spine, [0, 0, 0]);
  m(chest, cap(0.16, 0.28), top, [0, 0.27, 0], [1.2, 1, 0.75]);   // torso
  m(chest, cap(0.12, 0.1), shirt, [0, 0.42, 0.045], [1.1, 1, 0.7]);
  m(chest, box(0.012, 0.42, 0.01), acc, [0.07, 0.3, 0.131], [1, 1, 1], [0, 0, 0.06]);   // vivos luminosos de la chaqueta
  m(chest, box(0.012, 0.42, 0.01), acc, [-0.07, 0.3, 0.131], [1, 1, 1], [0, 0, -0.06]);
  m(chest, sph(0.07), top, [0.21, 0.47, 0]); m(chest, sph(0.07), top, [-0.21, 0.47, 0]);  // hombros
  if (look.acc.includes('tie')) { m(chest, box(0.03, 0.26, 0.012), acc, [0, 0.33, 0.138]); m(chest, box(0.05, 0.04, 0.014), acc, [0, 0.46, 0.138]); }
  if (look.acc.includes('lapel')) { m(chest, sph(0.012), acc, [0.1, 0.4, 0.14]); }
  if (look.acc.includes('vest')) { m(chest, box(0.3, 0.3, 0.012), mat('#e9f1ee'), [0, 0.28, 0.137]); m(chest, box(0.3, 0.012, 0.014), acc, [0, 0.43, 0.14]); }
  if (look.acc.includes('hoodie')) { m(chest, new THREE.TorusGeometry(0.1, 0.035, 8, 16), top, [0, 0.5, -0.03], [1.3, 1, 1], [Math.PI / 2.3, 0, 0]); }
  if (look.acc.includes('scarf')) { m(chest, new THREE.TorusGeometry(0.095, 0.03, 8, 16), mat('#e8f7ff'), [0, 0.5, 0.0], [1.3, 1, 1], [Math.PI / 2, 0, 0]); m(chest, box(0.05, 0.22, 0.012), mat('#2ee6ff'), [0.05, 0.38, 0.135]); }
  if (look.acc.includes('blazer')) { m(chest, box(0.008, 0.3, 0.012), acc, [0.1, 0.3, 0.14]); }

  // cuello y cabeza
  const neck = J.neck = g(chest, [0, 0.56, 0]);
  m(neck, cap(0.04, 0.05), skin, [0, 0.04, 0]);
  const head = J.head = g(neck, [0, 0.12, 0]);
  m(head, sph(0.112), skin, [0, 0.07, 0], [0.92, 1.1, 1]);
  m(head, sph(0.04), skin, [0, 0.02, 0.1], [1, 0.9, 0.8]);                       // nariz
  [-1, 1].forEach((sx) => { m(head, sph(0.018), eyeM, [sx * 0.04, 0.09, 0.098], [1.3, 0.8, 0.6]); m(head, sph(0.03), skin, [sx * 0.105, 0.06, 0], [0.5, 1, 0.9]); });
  J.mouth = m(head, box(0.05, 0.012, 0.01), dark, [0, -0.02, 0.098]);
  // pelo
  const st = look.style;
  if (st === 'slick') { m(head, sph(0.118), hair, [0, 0.1, -0.012], [0.95, 0.95, 1.02]); }
  if (st === 'short') { m(head, sph(0.116), hair, [0, 0.105, -0.015], [0.95, 0.85, 1.0]); }
  if (st === 'messy') { for (let i = 0; i < 9; i++) m(head, sph(0.05), hair, [Math.cos(i * 0.7) * 0.08, 0.15 + (i % 3) * 0.02, Math.sin(i * 0.7) * 0.07 - 0.01], [1, 0.9, 1]); }
  if (st === 'long') { m(head, sph(0.118), hair, [0, 0.1, -0.02], [0.96, 0.98, 1.02]); m(head, cap(0.09, 0.3), hair, [0, -0.1, -0.09], [1.15, 1, 0.7]); m(head, sph(0.06), hair, [0.08, 0.16, 0.06], [1.3, 0.7, 0.8]); }
  if (st === 'spiky') { for (let i = 0; i < 9; i++) m(head, new THREE.ConeGeometry(0.03, 0.12, 6), hair, [Math.cos(i * 0.7) * 0.07, 0.2, Math.sin(i * 0.7) * 0.07], [1, 1, 1], [Math.sin(i * 0.7) * 0.5, 0, -Math.cos(i * 0.7) * 0.5]); m(head, sph(0.112), hair, [0, 0.12, -0.02], [0.93, 0.7, 1]); }
  // accesorios de cabeza
  if (look.acc.includes('glasses')) { [-1, 1].forEach((sx) => m(head, new THREE.TorusGeometry(0.03, 0.005, 6, 16), acc, [sx * 0.045, 0.09, 0.105])); m(head, box(0.03, 0.005, 0.005), acc, [0, 0.095, 0.108]); }
  if (look.acc.includes('visor')) { m(head, box(0.2, 0.042, 0.06), glow(look.accent, 1.6), [0, 0.09, 0.075], [1, 1, 1]); m(head, box(0.215, 0.05, 0.04), dark, [0, 0.09, 0.062]); }
  if (look.acc.includes('visorband')) { m(head, new THREE.TorusGeometry(0.11, 0.008, 6, 24, Math.PI * 1.3), acc, [0, 0.17, 0], [1, 1, 1], [Math.PI / 2, 0, 0.0]); }
  if (look.acc.includes('monocle')) { m(head, new THREE.TorusGeometry(0.036, 0.006, 6, 18), acc, [0.045, 0.09, 0.108]); m(head, new THREE.CircleGeometry(0.032, 18), new THREE.MeshBasicMaterial({ color: look.accent, transparent: true, opacity: 0.25 }), [0.045, 0.09, 0.108]); }
  if (look.acc.includes('earpiece')) { m(head, sph(0.014), acc, [-0.108, 0.05, 0.01]); }
  if (look.acc.includes('headset')) {
    m(head, new THREE.TorusGeometry(0.12, 0.01, 8, 24, Math.PI), dark, [0, 0.07, 0], [1, 1, 1], [0, 0, 0]);
    [-1, 1].forEach((sx) => m(head, new THREE.CylinderGeometry(0.035, 0.035, 0.03, 14), dark, [sx * 0.12, 0.07, 0], [1, 1, 1], [0, 0, Math.PI / 2]));
    m(head, new THREE.CylinderGeometry(0.004, 0.004, 0.12, 6), dark, [0.1, 0.0, 0.07], [1, 1, 1], [Math.PI / 2.4, 0, 0]);
    m(head, sph(0.013), acc, [0.1, -0.03, 0.12]);
  }
  if (look.acc.includes('cap')) { m(head, new THREE.SphereGeometry(0.12, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat('#0d2230'), [0, 0.14, 0]); m(head, box(0.14, 0.012, 0.09), mat('#0d2230'), [0, 0.15, -0.14]); m(head, box(0.04, 0.03, 0.005), acc, [0, 0.19, 0.11]); }
  if (look.acc.includes('bulb')) {
    const b = J.bulb = g(head, [0, 0.42, 0]);
    m(b, sph(0.05), glow('#ffd34d', 2.5)); m(b, new THREE.TorusGeometry(0.075, 0.004, 6, 24), glow('#ffd34d', 2), [0, 0, 0], [1, 1, 1], [Math.PI / 2, 0, 0]);
  }

  // brazos
  const arm = (side) => {
    const sh = g(chest, [side * 0.235, 0.47, 0]);
    m(sh, cap(0.048, 0.22), top, [0, -0.17, 0]);
    const el = g(sh, [0, -0.33, 0]);
    m(el, cap(0.042, 0.2), top, [0, -0.15, 0]);
    m(el, sph(0.044), skin, [0, -0.3, 0]);
    m(el, new THREE.TorusGeometry(0.044, 0.004, 6, 16), acc, [0, -0.255, 0], [1, 1, 1], [Math.PI / 2, 0, 0]);   // puño luminoso
    if (side === -1 && look.acc.includes('stylus')) m(el, new THREE.CylinderGeometry(0.006, 0.004, 0.14, 6), glow(look.accent), [0, -0.32, 0.05], [1, 1, 1], [1.0, 0, 0]);
    if (side === 1 && look.acc.includes('tablet')) { m(el, box(0.16, 0.012, 0.22), dark, [0, -0.33, 0.06], [1, 1, 1], [0.5, 0, 0]); m(el, box(0.14, 0.004, 0.2), glow(look.accent, 1.2), [0, -0.325, 0.06], [1, 1, 1], [0.5, 0, 0]); }
    return [sh, el];
  };
  [J.shL, J.elL] = arm(1); [J.shR, J.elR] = arm(-1);

  // piernas
  const leg = (side) => {
    const hp = g(hips, [side * 0.095, -0.03, 0]);
    m(hp, cap(0.072, 0.3), bottom, [0, -0.21, 0]);
    const kn = g(hp, [0, -0.45, 0]);
    m(kn, cap(0.058, 0.3), bottom, [0, -0.2, 0]);
    const an = g(kn, [0, -0.42, 0]);
    m(an, box(0.1, 0.07, 0.25), shoe, [0, -0.03, 0.05]);
    m(an, box(0.102, 0.012, 0.252), acc, [0, -0.065, 0.05]);
    return [hp, kn, an];
  };
  [J.hipL, J.kneeL, J.ankL] = leg(1); [J.hipR, J.kneeR, J.ankR] = leg(-1);
  return { root, J, s };
}

/* Acciones: define la pose objetivo de cada articulación. */
export const ACTIONS = {
  idle: { label: 'En pie', seated: false }, walk: { label: 'Caminar', seated: false }, sit: { label: 'Sentarse', seated: true },
  type: { label: 'Escribir', seated: true }, talk: { label: 'Hablar', seated: true }, look: { label: 'Mirar pantallas', seated: true },
  meeting: { label: 'Reunión', seated: true }, talkStand: { label: 'Hablar (de pie)', seated: false },
};

function poseFor(action, seatTop, s, t, ph) {
  const T = t + ph, P = {
    hipsPos: [0, 0.95, 0], spine: [Math.sin(T * 1.7) * 0.012, 0, 0], neck: [0, 0, 0], head: [0, 0, 0],
    shL: [0, 0, 0.09], elL: [0, 0, 0], shR: [0, 0, -0.09], elR: [0, 0, 0],
    hipL: [0, 0, 0.03], kneeL: [0, 0, 0], hipR: [0, 0, -0.03], kneeR: [0, 0, 0],
  };
  const seated = ACTIONS[action]?.seated;
  if (seated) {
    P.hipsPos = [0, (seatTop + 0.09) / s, -0.02];
    P.hipL = [-1.48, 0.05, 0.1]; P.hipR = [-1.48, -0.05, -0.1]; P.kneeL = [1.5, 0, 0]; P.kneeR = [1.5, 0, 0];
  }
  switch (action) {
    case 'idle': P.head = [0, Math.sin(T * 0.45) * 0.25, 0]; P.shL[0] = Math.sin(T * 1.2) * 0.03; P.shR[0] = -Math.sin(T * 1.2) * 0.03; break;
    case 'walk': {
      const p = T * 5.2, a = Math.sin(p), b = Math.sin(p + Math.PI);
      P.hipL[0] = -a * 0.6; P.hipR[0] = -b * 0.6;
      P.kneeL[0] = 0.25 + Math.max(0, Math.cos(p)) * 0.8; P.kneeR[0] = 0.25 + Math.max(0, Math.cos(p + Math.PI)) * 0.8;
      P.shL[0] = a * 0.5; P.shR[0] = b * 0.5; P.elL[0] = -0.45; P.elR[0] = -0.45;
      P.hipsPos[1] = 0.95 - 0.015 + Math.abs(Math.sin(p)) * 0.025; P.spine = [0.03, Math.sin(p) * 0.1, 0]; P.head = [0, -Math.sin(p) * 0.06, 0]; break;
    }
    case 'sit': P.shL = [-0.55, 0, 0.12]; P.shR = [-0.55, 0, -0.12]; P.elL = [-0.95, 0, 0]; P.elR = [-0.95, 0, 0]; P.head = [0.05, Math.sin(T * 0.4) * 0.3, 0]; break;
    case 'type': {
      const k = Math.sin(T * 17), k2 = Math.sin(T * 13 + 1.3);
      P.shL = [-0.8 + k * 0.04, 0, 0.14]; P.shR = [-0.8 + k2 * 0.04, 0, -0.14]; P.elL = [-1.05 + k2 * 0.1, 0, 0]; P.elR = [-1.05 + k * 0.1, 0, 0];
      P.spine[0] = 0.1; P.head = [0.18 + Math.sin(T * 0.8) * 0.03, Math.sin(T * 0.6) * 0.1, 0]; break;
    }
    case 'look':
      P.head = [0.05, Math.sin(T * 0.7) * 0.55, 0]; P.neck = [0, Math.sin(T * 0.7) * 0.15, 0];
      P.shR = [-0.85, 0, -0.12]; P.elR = [-1.0, 0, 0]; P.shL = [-0.45, 0, 0.12]; P.elL = [-1.0, 0, 0]; P.spine[0] = 0.06; break;
    case 'talk': case 'talkStand':
      P.head = [Math.sin(T * 3.1) * 0.05, Math.sin(T * 0.9) * 0.18, 0];
      P.shR = [-0.95 + Math.sin(T * 2.4) * 0.22, 0, -0.2]; P.elR = [-1.25 + Math.sin(T * 3.3) * 0.25, 0, 0];
      P.shL = seated ? [-0.5, 0, 0.12] : [Math.sin(T * 1.9) * 0.1, 0, 0.1]; P.elL = [seated ? -1.0 : -0.3, 0, 0]; P.spine[0] += 0.02; break;
    case 'meeting': {
      const speak = Math.sin(T * 0.35) > 0.2;
      P.head = [Math.sin(T * 1.3) * 0.04, Math.sin(T * 0.5) * 0.6, 0]; P.spine[0] = 0.07;
      P.shL = [-0.7, 0, 0.1]; P.elL = [-0.9, 0, 0];
      P.shR = speak ? [-1.0 + Math.sin(T * 2.4) * 0.2, 0, -0.18] : [-0.7, 0, -0.1]; P.elR = speak ? [-1.2 + Math.sin(T * 3.1) * 0.2, 0, 0] : [-0.9, 0, 0]; break;
    }
    default: break;
  }
  return P;
}

const talking = (a) => a === 'talk' || a === 'talkStand' || a === 'meeting';

/* <Avatar id action seatTop position rotation />  — `seatTop` es la altura de la superficie del asiento en metros */
export function Avatar({ id, action = 'idle', seatTop = 0.55, position, rotation, phase = 0, scale = 1 }) {
  const rig = useMemo(() => build(LOOKS[id]), [id]);
  const cur = useRef(null);
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime, P = poseFor(action, seatTop, rig.s, t, phase), k = 1 - Math.exp(-9 * Math.min(dt, 0.1));
    if (!cur.current) cur.current = JSON.parse(JSON.stringify(P));
    const C = cur.current;
    for (const n in P) {
      for (let i = 0; i < 3; i++) C[n][i] += (P[n][i] - C[n][i]) * k;
      if (n === 'hipsPos') rig.J.hips.position.set(C[n][0], C[n][1], C[n][2]);
      else if (rig.J[n]) rig.J[n].rotation.set(C[n][0], C[n][1], C[n][2]);
    }
    // pies planos: compensar flexión de cadera + rodilla
    rig.J.ankL.rotation.x = -(C.hipL[0] + C.kneeL[0]); rig.J.ankR.rotation.x = -(C.hipR[0] + C.kneeR[0]);
    rig.J.mouth.scale.y = talking(action) ? 0.4 + Math.abs(Math.sin(t * 11 + phase)) * 2.2 : 0.6;
    if (rig.J.bulb) { rig.J.bulb.rotation.y = t * 2; rig.J.bulb.position.y = 0.42 + Math.sin(t * 2) * 0.02; }
  });
  return <group position={position} rotation={rotation} scale={scale}><primitive object={rig.root} /></group>;
}
