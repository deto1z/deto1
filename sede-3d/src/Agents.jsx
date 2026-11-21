import { Suspense, useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RiggedAvatar } from './RiggedAvatar';
import { Avatar } from './Avatar';
import { LOOKS3D } from './characters';
import { AGENTS } from './constants';
import { useStore, getAgentView } from './store';
import { stairHeight } from './colliders';

/* Movimiento de los agentes por la oficina.
   Cada agente tiene un "lugar" (desk | meeting | rest). Si cambia, se levanta, camina por rutas fijas
   (incluida la escalera) y se sienta en su nuevo sitio. El lugar sale del estado real
   (store.agentState) o, en la vista previa de diseño, de store.placeOverride. */

export const Y2 = 5;
const SEAT_Y = { desk: 0, chair: 0 };
const ORDER = ['viral-hunter', 'hook-master', 'pixel-queen', 'filter-x', 'idea-storm', 'data-boss', 'titan-x'];

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
  const a = AGENTS.find((q) => q.id === id), left = a.pos[0] < 0, lx = left ? -4.8 : 4.8;
  if (id === 'titan-x') return [{ x: -2.6, y: Y2, z: -10.5 }, { x: -2.6, y: Y2, z: -6.5 }, { x: 0, y: Y2, z: -4.6 }, { x: 0, y: Y2, z: -1.8 }];
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

export function AgentActor({ id }) {
  const g = useRef(), S = useRef(null);
  const [act, setAct] = useState('sit');
  const look = LOOKS3D[id];
  useEffect(() => { S.current = null; }, [id]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1), v = getAgentView(id), st = useStore.getState();
    const ov = st.placeOverride;
    const want = id === 'titan-x' ? (ov === 'meeting' ? 'meeting' : 'desk') : ov !== 'auto' ? ov : v.status === 'available' ? 'rest' : 'desk';
    if (!S.current) { const s = deskSeat(id); S.current = { place: 'desk', pos: new THREE.Vector3(s.x, s.y, s.z), yaw: s.yaw, path: [], phase: 'seated', timer: 0, seat: s }; }
    const M = S.current;
    let next = null;
    if (M.phase === 'seated' && want !== M.place) {
      M.phase = 'standing'; M.timer = 1.4; M.target = want; M.path = planRoute(id, M.place, want); next = 'idle';
    } else if (M.phase === 'standing') {
      M.timer -= dt; if (M.timer <= 0) { M.phase = M.path.length ? 'walking' : 'arrive'; next = M.path.length ? (id === 'titan-x' ? 'walkFormal' : 'walk') : null; }
    } else if (M.phase === 'walking') {
      const p = M.path[0], d = new THREE.Vector3(p.x - M.pos.x, 0, p.z - M.pos.z), len = d.length();
      const sp = 1.25 * dt;
      if (len <= sp) { M.pos.set(p.x, p.y, p.z); M.path.shift(); if (!M.path.length) { M.phase = 'arrive'; M.timer = 0; } }
      else { d.normalize(); M.pos.x += d.x * sp; M.pos.z += d.z * sp; M.pos.y += (p.y - M.pos.y) * Math.min(1, sp / Math.max(0.2, len) * 1.2); const ty = Math.atan2(d.x, d.z); let dy = ty - M.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); M.yaw += dy * Math.min(1, dt * 8); }
    }
    if (M.phase === 'arrive') {
      const s = placeSeat(id, M.target); M.pos.set(s.x, s.y, s.z); M.yaw = s.yaw; M.place = M.target; M.phase = 'seated'; M.seat = s; next = 'seat';
    }
    if (M.phase === 'seated') {
      const wanted = M.place === 'meeting' ? 'meeting' : M.place === 'rest' ? 'sit' : v.action;
      if (act !== wanted && next === null) next = wanted; else if (next === 'seat') next = wanted;
    }
    if (next && next !== act) setAct(next);
    g.current.position.copy(M.pos); g.current.rotation.y = M.yaw;
    g.current.visible = !((st.level === '1' && M.pos.y > 2.5) || (st.level === '2' && M.pos.y < 2.5));
  });

  const seated = true;
  return (
    <group ref={g} onClick={(e) => { e.stopPropagation(); useStore.getState().select(id); }}>
      <Suspense fallback={<Avatar id={id} action="sit" seatTop={0.55} position={[0, 0, 0]} />}>
        <RiggedAvatar file={look.file} tweaks={look.tweaks} action={act} sitOffset={[0, 0, 0]} phase={ORDER.indexOf(id) * 1.7} />
      </Suspense>
    </group>
  );
}

export default function Agents() {
  return <>{ORDER.map((id) => <AgentActor key={id} id={id} />)}</>;
}
