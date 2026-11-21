import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { M } from './materials';
import { Screen } from './Screen';
import { GamingDesk, StationSign, Strip } from './Furniture';
import { useStore, getAgentView } from './store';
import { makeCanvasTexture, neonText, FONT } from './textures';

const B = ({ p, s, m, r }) => <mesh position={p} rotation={r} material={m}><boxGeometry args={s} /></mesh>;
const glowMat = (c, k = 1.6) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), toneMapped: false });

function Banner({ text, sub, color, w = 3.0 }) {
  const draw = (ctx, W, H) => { ctx.clearRect(0, 0, W, H); ctx.fillStyle = 'rgba(5,6,18,.9)'; ctx.fillRect(0, 0, W, H); neonText(ctx, text, W / 2, H * 0.4, H * 0.34, color, 22, 900); ctx.font = `500 ${H * 0.16}px ${FONT}`; ctx.fillStyle = '#cdd6ff'; ctx.textAlign = 'center'; ctx.fillText(sub, W / 2, H * 0.78); };
  return <Screen w={w} h={w * 0.3} res={192} draw={draw} fps={0.2} frame={false} />;
}

// Objetos 3D propios de cada especialidad (marco local del escritorio: monitores en x<0, el agente se sienta en x>0)
const Cup = ({ p }) => <mesh position={p} material={M.white}><cylinderGeometry args={[0.04, 0.032, 0.09, 14]} /></mesh>;
function Props({ id }) {
  const ball = useMemo(() => { const c = makeCanvasTexture(128, 64); c.ctx.fillStyle = '#f4f7ff'; c.ctx.fillRect(0, 0, 128, 64); c.ctx.fillStyle = '#10121f'; for (let i = 0; i < 9; i++) { c.ctx.beginPath(); c.ctx.arc((i * 29) % 128, 12 + (i * 17) % 44, 8, 0, 7); c.ctx.fill(); } c.tex.needsUpdate = true; return c.tex; }, []);
  const swatch = ['#2f7bff', '#9b2bff', '#ff4fd8', '#2ee6ff', '#ffc531', '#25e08a'];
  if (id === 'viral-hunter') return (<>
    <mesh position={[0.35, 0.9, -1.3]}><sphereGeometry args={[0.11, 20, 16]} /><meshStandardMaterial map={ball} roughness={0.5} /></mesh>
    <mesh position={[0.35, 0.8, -1.3]} material={M.black}><cylinderGeometry args={[0.07, 0.09, 0.03, 16]} /></mesh>
    <group position={[-0.2, 0.79, 1.15]}><mesh position={[0, 0.1, 0]} material={glowMat('#ffc531', 1.1)}><cylinderGeometry args={[0.05, 0.08, 0.2, 14]} /></mesh><mesh position={[0, 0.26, 0]} material={glowMat('#ffc531', 1.1)}><cylinderGeometry args={[0.1, 0.05, 0.16, 14, 1, true]} /></mesh></group>
    <Cup p={[0.45, 0.835, 0.95]} />
  </>);
  if (id === 'hook-master') return (<>
    {[0, 1, 2].map((i) => <B key={i} p={[0.35, 0.81 + i * 0.03, -1.25]} s={[0.22, 0.03, 0.3]} m={M.white} r={[0, 0.2 * i, 0]} />)}
    <group position={[-0.25, 0.79, -1.2]}><B p={[0, 0.04, 0]} s={[0.35, 0.08, 0.28]} m={M.black} />{Array.from({ length: 12 }, (_, i) => <mesh key={i} position={[-0.12 + (i % 6) * 0.045, 0.085, -0.05 + Math.floor(i / 6) * 0.06]} material={M.chrome}><cylinderGeometry args={[0.014, 0.014, 0.012, 8]} /></mesh>)}<B p={[0, 0.2, -0.13]} s={[0.3, 0.02, 0.01]} m={M.white} /></group>
    <group position={[-0.3, 0.79, 1.1]}><mesh position={[0, 0.17, 0]} material={M.chrome}><cylinderGeometry args={[0.008, 0.008, 0.34, 6]} /></mesh><mesh position={[0, 0.36, 0]} material={glowMat('#ffd9a0', 1.3)}><sphereGeometry args={[0.07, 12, 10]} /></mesh></group>
    <Cup p={[0.45, 0.835, 0.95]} />
  </>);
  if (id === 'pixel-queen') return (<>
    <group position={[0.4, 0.79, 0.15]} rotation={[0, 0.1, 0]}><B p={[0, 0.01, 0]} s={[0.3, 0.02, 0.22]} m={M.black} /><B p={[0, 0.022, 0]} s={[0.26, 0.004, 0.18]} m={M.stripBV2} /><mesh position={[0.1, 0.03, 0.12]} rotation={[0.4, 0, 1.2]} material={M.white}><cylinderGeometry args={[0.006, 0.004, 0.16, 6]} /></mesh></group>
    {swatch.map((c, i) => <mesh key={c} position={[0.3 + (i % 3) * 0.07, 0.81, -1.2 + Math.floor(i / 3) * 0.07]} material={glowMat(c, 1.2)}><boxGeometry args={[0.06, 0.02, 0.06]} /></mesh>)}
    <group position={[-1.9, 0, 1.9]} rotation={[0, 0.6, 0]}>{[[-0.3, 0], [0.3, 0], [0, -0.3]].map(([x, z], i) => <mesh key={i} position={[x * 0.9, 0.8, z * 0.7]} rotation={[z * 0.2, 0, -x * 0.3]} material={M.wood}><cylinderGeometry args={[0.02, 0.02, 1.7, 6]} /></mesh>)}
      <mesh position={[0, 1.15, 0.08]} material={M.white}><boxGeometry args={[0.7, 0.95, 0.03]} /></mesh><mesh position={[0, 1.15, 0.1]} material={glowMat('#9b2bff', 0.8)}><boxGeometry args={[0.6, 0.85, 0.01]} /></mesh></group>
  </>);
  if (id === 'filter-x') return (<>
    <group position={[0.35, 0.79, -1.15]} rotation={[0, 0.4, 0]}><mesh position={[0, 0.17, 0]} rotation={[0, 0, 0]} material={M.chrome}><torusGeometry args={[0.08, 0.008, 8, 24]} /></mesh><mesh position={[0, 0.17, 0]} material={M.holo}><circleGeometry args={[0.075, 20]} /></mesh><mesh position={[0, 0.06, 0]} material={M.chrome}><cylinderGeometry args={[0.009, 0.009, 0.14, 6]} /></mesh></group>
    {[0, 1, 2].map((i) => <B key={i} p={[0.4, 0.8 + i * 0.02, 1.2]} s={[0.24, 0.015, 0.32]} m={i % 2 ? M.white : glowMat('#25e08a', 0.7)} r={[0, 0.15 * i, 0]} />)}
    <Cup p={[0.1, 0.835, 1.3]} />
  </>);
  if (id === 'idea-storm') return (<>
    <group position={[-0.2, 0.79, -1.2]}><mesh position={[0, 0.16, 0]} material={glowMat('#ffd34d', 1.6)}><sphereGeometry args={[0.09, 16, 12]} /></mesh><mesh position={[0, 0.06, 0]} material={M.chrome}><cylinderGeometry args={[0.04, 0.05, 0.1, 12]} /></mesh></group>
    {['#ffc531', '#ff4fd8', '#2ee6ff', '#25e08a'].map((c, i) => <B key={c} p={[0.4 + (i % 2) * 0.1, 0.8 + 0.001 * i, -1.2 + (i >> 1) * 0.1]} s={[0.08, 0.004, 0.08]} m={glowMat(c, 0.9)} r={[0, i * 0.4, 0]} />)}
    <group position={[-2.0, 0, -1.9]} rotation={[0, 0.3, 0]}><B p={[0, 1.0, 0]} s={[1.5, 1.0, 0.04]} m={M.white} />{Array.from({ length: 10 }, (_, i) => <B key={i} p={[-0.55 + (i % 5) * 0.27, 1.2 - Math.floor(i / 5) * 0.4, 0.03]} s={[0.15, 0.15, 0.004]} m={glowMat(['#ffc531', '#ff4fd8', '#2ee6ff', '#25e08a', '#b45bff'][i % 5], 0.9)} />)}<B p={[0, 0.25, 0]} s={[0.05, 0.5, 0.05]} m={M.chrome} /></group>
  </>);
  if (id === 'data-boss') return (<>
    <group position={[-1.2, 0, 1.9]}><B p={[0, 0.9, 0]} s={[0.6, 1.8, 0.7]} m={M.black} />{Array.from({ length: 16 }, (_, i) => <mesh key={i} position={[0.1, 0.35 + i * 0.1, 0.36]} material={i % 3 ? M.stripBV : M.rgb}><boxGeometry args={[0.4, 0.04, 0.01]} /></mesh>)}</group>
    <mesh position={[0.4, 0.9, -1.2]} material={M.holo}><cylinderGeometry args={[0.18, 0.18, 0.2, 20, 1, true]} /></mesh>
    <mesh position={[0.4, 0.8, -1.2]} material={M.stripBV2}><cylinderGeometry args={[0.2, 0.2, 0.01, 20]} /></mesh>
    <Cup p={[0.45, 0.835, 0.95]} />
  </>);
  return null;
}

const THEME = {
  'viral-hunter': { title: 'FÚTBOL · TENDENCIAS', sub: 'noticias · virales · entretenimiento', wood: false },
  'hook-master': { title: 'GUIONES · GANCHOS', sub: 'títulos · intros · retención', wood: true },
  'pixel-queen': { title: 'ESTUDIO DE DISEÑO', sub: 'portadas · miniaturas · gráficos', wood: false },
  'filter-x': { title: 'CENTRO DE VERIFICACIÓN', sub: 'fuentes · contraste · veracidad', wood: false },
  'idea-storm': { title: 'PLANIFICACIÓN EDITORIAL', sub: 'mañana · tarde · noche', wood: true },
  'data-boss': { title: 'ANALÍTICA DE REDES', sub: 'visualizaciones · retención · crecimiento', wood: false },
};

// Cabina personal: panel trasero con rótulo, mamparas laterales de cristal, alfombra y luz de zona
function Zone({ a }) {
  const th = THEME[a.id];
  return (
    <group>
      <mesh position={[-2.5, 1.5, 0]} material={th.wood ? M.woodWall : M.black}><boxGeometry args={[0.1, 3.0, 4.0]} /></mesh>
      <mesh position={[-2.43, 0.05, 0]} material={M.black}><boxGeometry args={[0.2, 0.1, 4.0]} /></mesh>
      <Strip position={[-2.44, 3.0, 0]} size={[0.04, 0.05, 4.0]} mat="stripBV" />
      <Strip position={[-2.44, 0.12, 0]} size={[0.04, 0.04, 4.0]} mat="stripBV2" />
      <mesh position={[-2.44, 3.0, 0]} material={new THREE.MeshBasicMaterial({ color: a.color, toneMapped: false })}><boxGeometry args={[0.03, 0.03, 4.0]} /></mesh>
      <group position={[-2.42, 2.2, 0]} rotation={[0, Math.PI / 2, 0]}><Banner text={th.title} sub={th.sub} color={a.color} w={3.4} /></group>
      {[-2, 2].map((z) => <mesh key={z} position={[-1.2, 0.8, z]} material={M.glass}><boxGeometry args={[2.6, 1.6, 0.03]} /></mesh>)}
      {[-2, 2].map((z) => <Strip key={'s' + z} position={[-1.2, 1.6, z]} size={[2.6, 0.04, 0.05]} mat={z < 0 ? 'stripBV' : 'stripBV2'} />)}
      <Props id={a.id} />
    </group>
  );
}

export function StationFX({ agent, left }) {
  const light = useRef(), ring = useRef(), beacon = useRef(), orb = useRef(), q = useStore((s) => s.quality);
  useFrame(({ clock }) => {
    const v = getAgentView(agent.id), t = clock.elapsedTime;
    const col = v.alert ? '#ff3b4d' : v.st.color;
    if (orb.current) orb.current.material.color.set(col).multiplyScalar(v.status === 'offline' ? 1 : 2);
    if (ring.current) { ring.current.visible = v.active || !!v.alert; ring.current.material.color.set(col).multiplyScalar(1.6 + Math.sin(t * 4) * 0.5); }
    if (light.current) { light.current.color.set(col); light.current.intensity += (((v.active || v.alert) ? 12 : 0) - light.current.intensity) * 0.1; }
    if (beacon.current) { beacon.current.visible = !!v.alert; beacon.current.rotation.y = t * 6; beacon.current.scale.setScalar(1 + Math.sin(t * 8) * 0.15); }
  });
  return (
    <group userData={{ noMerge: true }}>
      <mesh ref={orb} position={[left ? 1.2 : -1.2, 2.0, 1.25]}><sphereGeometry args={[0.07, 12, 12]} /><meshBasicMaterial color="#6b7088" toneMapped={false} /></mesh>
      <mesh ref={ring} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}><ringGeometry args={[2.1, 2.3, 48]} /><meshBasicMaterial color="#2f7bff" toneMapped={false} /></mesh>
      {q === 'high' && <pointLight ref={light} position={[left ? 0.9 : -0.9, 2.4, 0]} intensity={0} distance={7} decay={2} />}
      <mesh ref={beacon} position={[left ? 1.2 : -1.2, 3.35, 0]} visible={false}><coneGeometry args={[0.12, 0.25, 4]} /><meshBasicMaterial color="#ff3b4d" toneMapped={false} /></mesh>
    </group>
  );
}

export function Station({ a }) {
  const left = a.pos[0] < 0;
  return (
    <group position={[a.pos[0], 0, a.pos[1]]}>
      <group onClick={(e) => { e.stopPropagation(); useStore.getState().select(a.id); }}
             onPointerOver={() => (document.body.style.cursor = 'pointer')} onPointerOut={() => (document.body.style.cursor = '')}>
        <group rotation={[0, left ? 0 : Math.PI, 0]}><GamingDesk agent={a} /><Zone a={a} /></group>
        <StationSign agent={a} position={[left ? 1.2 : -1.2, 2.55, 0]} rotation={[0, left ? Math.PI / 2 : -Math.PI / 2, 0]} />
        <mesh position={[0, 1.3, 0]} visible={false}><boxGeometry args={[3, 2.8, 3.6]} /></mesh>
      </group>
      <StationFX agent={a} left={left} />
    </group>
  );
}
