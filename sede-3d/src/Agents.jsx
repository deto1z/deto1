import { Suspense, useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RiggedAvatar } from './RiggedAvatar';
import { Avatar } from './Avatar';
import { LOOKS3D } from './characters';
import { useStore, getAgentView } from './store';
import { Y2, ORDER, deskSeat, placeSeat, planRoute } from './routes';

/* Movimiento de los agentes por la oficina.
   Cada agente tiene un "lugar" (desk | meeting | rest). Si cambia, se levanta, camina por rutas fijas
   (incluida la escalera) y se sienta en su nuevo sitio. El lugar sale del estado real
   (store.agentState) o, en la vista previa de diseño, de store.placeOverride. */

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
