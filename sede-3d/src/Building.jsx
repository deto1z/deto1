import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshReflectorMaterial, Grid } from '@react-three/drei';
import { mergeBufferGeometries as mergeGeometries } from 'three-stdlib';
import Agents from './Agents';
import { Truss, OnAir, Acoustic, Softbox, Mixer } from './Studio';
import { Station } from './Stations';
import { Model } from './Asset';
import * as THREE from 'three';
import { M } from './materials';
import { W, D, SLAB_EDGE_Z, AGENTS } from './constants';
import { Screen, drawStats, drawNews, drawTasks, drawAgentBars, drawHolo } from './Screen';
import { makeCanvasTexture, drawLogo, repeatOf } from './textures';
import { Strip, GamingDesk, ExecDesk, ExecChair, MeetingTable, Sofa, Plant, CineCamera, AICore, StationSign, Mic, RingLight } from './Furniture';
import { Stairs } from './Stairs';
import { useStore, getAgentView } from './store';
import { marbleT, M as _M } from './materials';

const HX = W / 2, HZ = D / 2;

export function Logo({ w = 8, position, rotation, bg = true, frame = true, double = false }) {
  const cv = useMemo(() => { const c = makeCanvasTexture(1024, Math.round(1024 * 0.25)); drawLogo(c.ctx, c.canvas.width, c.canvas.height, bg); c.tex.needsUpdate = true; return c; }, [bg]);
  const h = w * 0.25;
  return (
    <group position={position} rotation={rotation}>
      <mesh><planeGeometry args={[w, h]} /><meshBasicMaterial map={cv.tex} transparent={!bg} toneMapped={false} side={double ? THREE.DoubleSide : THREE.FrontSide} /></mesh>
      {frame && <>
        <mesh position={[0, h / 2 + 0.05, 0.01]} material={M.stripBV}><boxGeometry args={[w + 0.2, 0.06, 0.06]} /></mesh>
        <mesh position={[0, -h / 2 - 0.05, 0.01]} material={M.stripBV2}><boxGeometry args={[w + 0.2, 0.06, 0.06]} /></mesh>
        <mesh position={[-w / 2 - 0.07, 0, 0.01]} material={M.stripBV}><boxGeometry args={[0.06, h + 0.16, 0.06]} /></mesh>
        <mesh position={[w / 2 + 0.07, 0, 0.01]} material={M.stripBV2}><boxGeometry args={[0.06, h + 0.16, 0.06]} /></mesh>
      </>}
    </group>
  );
}

function Mullions() {
  const zs = Array.from({ length: 7 }, (_, i) => -HZ + i * (D / 6));
  const xs = Array.from({ length: 9 }, (_, i) => -HX + i * (W / 8));
  return (
    <group>
      {[-1, 1].map((s) => zs.map((z) => (
        <mesh key={`${s}${z}`} position={[s * HX, 5, z]} material={M.black}><boxGeometry args={[0.3, 10, 0.3]} /></mesh>
      )))}
      {xs.map((x) => (<mesh key={x} position={[x, 5, HZ]} material={M.black}><boxGeometry args={[0.3, 10, 0.3]} /></mesh>))}
      {[0.05, 2.5, 5, 7.5, 9.95].map((y) => (
        <group key={y}>
          {[-1, 1].map((s) => <mesh key={s} position={[s * HX, y, 0]} material={M.black}><boxGeometry args={[0.24, 0.16, D]} /></mesh>)}
          <mesh position={[0, y, HZ]} material={M.black}><boxGeometry args={[W, 0.16, 0.24]} /></mesh>
        </group>
      ))}
      {/* tiras de luz en travesaños */}
      {[-1, 1].map((s) => [0, 1, 2, 3, 4, 5].map((k) => (<Strip key={`${s}${k}`} position={[s * (HX - 0.14), 5, -10 + k * 4 + 2]} size={[0.03, 0.08, 4]} mat={'chase' + ((k + (s > 0 ? 3 : 0)) % 8)} />)))}
      {Array.from({ length: 8 }, (_, k) => <Strip key={k} position={[-14 + k * 4, 5, HZ - 0.14]} size={[4, 0.08, 0.03]} mat={"chase" + k} />)}
      {Array.from({ length: 8 }, (_, k) => <Strip key={"t" + k} position={[-14 + k * 4, 9.9, HZ - 0.14]} size={[4, 0.08, 0.03]} mat={"chase" + ((k + 4) % 8)} />)}
    </group>
  );
}

function Shell({ level }) {
  const cutaway = useStore((s) => s.cutaway);
  const gh = 10;
  return (
    <group>
      {/* paredes de cristal laterales y frontal (con hueco de puerta) */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * HX, gh / 2, 0]} rotation={[0, Math.PI / 2, 0]} material={M.glass}><planeGeometry args={[D, gh]} /></mesh>
      ))}
      {[[-9, 14], [9, 14]].map(([x, w]) => (
        <mesh key={x} position={[x * 1 + (x < 0 ? -0.5 : 0.5) * 0 + (x < 0 ? -1 : 1) * 0, gh / 2, HZ]} material={M.glass}>
          <planeGeometry args={[w, gh]} />
        </mesh>
      ))}
      <mesh position={[0, 7, HZ]} material={M.glass}><planeGeometry args={[4, 6]} /></mesh>
      {/* marco de la puerta */}
      {[-2, 2].map((x) => <mesh key={x} position={[x, 2, HZ]} material={M.black}><boxGeometry args={[0.2, 4, 0.3]} /></mesh>)}
      <mesh position={[0, 4, HZ]} material={M.black}><boxGeometry args={[4.2, 0.2, 0.3]} /></mesh>
      <Strip position={[-2, 2, HZ + 0.17]} size={[0.06, 4, 0.04]} mat="stripBV2" />
      <Strip position={[2, 2, HZ + 0.17]} size={[0.06, 4, 0.04]} mat="stripBV2" />
      <Strip position={[0, 4.1, HZ + 0.17]} size={[4.2, 0.06, 0.04]} />
      {/* pared trasera opaca */}
      <mesh position={[0, 5, -HZ - 0.2]} material={M.wall}><boxGeometry args={[W + 0.6, 10.2, 0.4]} /></mesh>
      {[-12, -6, 6, 12].map((x) => <Strip key={x} position={[x, 5, -HZ + 0.03]} size={[0.06, 9.8, 0.03]} mat={x < 0 ? 'stripBV' : 'stripBV2'} />)}
      <Mullions />
      {/* techo de cristal oscuro */}
      {level === 'all' && !cutaway && (
        <group>
          <mesh position={[0, 10.1, 0]} material={M.glassDark}><boxGeometry args={[W + 0.6, 0.2, D + 0.6]} /></mesh>
          {Array.from({ length: 7 }, (_, i) => (
            <mesh key={i} position={[-12 + i * 4, 10.25, 0]} material={M.black}><boxGeometry args={[0.2, 0.1, D + 0.6]} /></mesh>
          ))}
          <Strip position={[0, 10.0, 0]} size={[0.1, 0.05, D]} />
          <Strip position={[-8, 10.0, 0]} size={[0.06, 0.04, D]} mat="stripBV2" />
          <Strip position={[8, 10.0, 0]} size={[0.06, 0.04, D]} mat="stripBV2" />
        </group>
      )}
      {/* rótulo exterior */}
      <Logo w={13} position={[0, 7.4, HZ + 0.6]} />
      <Logo w={13} position={[0, 7.4, HZ + 0.58]} rotation={[0, Math.PI, 0]} />
      {[-5.5, 5.5].map((x) => <mesh key={x} position={[x, 8.5, HZ + 0.3]} material={M.black}><boxGeometry args={[0.08, 4, 0.08]} /></mesh>)}
    </group>
  );
}


const floorMarble = repeatOf(marbleT, 5, 3.5);

// Partículas de polvo luminoso (ambiente). Material estándar de puntos: sin shaders propios.
function Dust() {
  const ref = useRef();
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry(), a = new Float32Array(150 * 3);
    for (let i = 0; i < 150; i++) { a[i * 3] = (Math.sin(i * 12.9) * 0.5) * 28; a[i * 3 + 1] = 0.5 + (Math.abs(Math.sin(i * 7.7))) * 8; a[i * 3 + 2] = (Math.sin(i * 4.1) * 0.5) * 22; }
    g.setAttribute('position', new THREE.BufferAttribute(a, 3)); return g;
  }, []);
  useFrame(({ clock }) => { if (ref.current) { ref.current.rotation.y = clock.elapsedTime * 0.01; ref.current.position.y = Math.sin(clock.elapsedTime * 0.3) * 0.25; } });
  return <points ref={ref} geometry={geo}><pointsMaterial size={0.07} color="#9fb4ff" transparent opacity={0.65} depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation /></points>;
}

function Floor1() {
  const hq = useStore((s) => s.gfx.reflections);
  return (
    <group>
      <mesh position={[0, -0.15, 0]} material={M.floor1}><boxGeometry args={[W, 0.3, D]} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
        <planeGeometry args={[W, D]} />
        {hq ? <MeshReflectorMaterial map={floorMarble} color="#aab4ff" resolution={512} blur={[300, 100]} mixBlur={1} mixStrength={9} mirror={0.6} roughness={0.55} depthScale={0} metalness={0.15} envMapIntensity={0.35} />
            : <meshStandardMaterial map={floorMarble} color="#aab4ff" metalness={0.15} roughness={0.35} envMapIntensity={0.35} />}
      </mesh>
      {/* líneas de guía en el suelo */}
      <Strip position={[0, 0.012, 3]} size={[0.07, 0.01, 18]} />
      <Strip position={[0, 0.012, -9]} size={[0.07, 0.01, 5]} />
      {[-9, 9].map((x) => <Strip key={x} position={[x, 0.012, 1.5]} size={[0.06, 0.01, 20]} mat="stripBV2" />)}
      <Strip position={[0, 0.012, 11.2]} size={[10, 0.01, 0.07]} mat="stripBV2" />
      <pointLight position={[0, 4, 4]} color="#3f7bff" intensity={23} distance={22} decay={2} />
      <pointLight position={[0, 3.5, -8]} color="#9b2bff" intensity={17} distance={18} decay={2} />
      <pointLight position={[-10, 3, 0]} color="#2b7bff" intensity={10} distance={14} decay={2} />
      <pointLight position={[10, 3, 0]} color="#9b4bff" intensity={10} distance={14} decay={2} />
      {/* videowall (DEMO) bajo el piso superior */}
      <group position={[0, 2.5, -11.7]}>
        <Screen w={6.4} h={3.4} res={256} draw={drawStats} fps={3} position={[0, 0, 0]} />
        <Screen w={4.2} h={3.4} res={256} draw={drawNews} fps={2} position={[-5.4, 0, 0]} glow="violet" />
        <Screen w={4.2} h={3.4} res={256} draw={drawAgentBars} fps={1} position={[5.4, 0, 0]} glow="violet" />
      </group>
      <Strip position={[0, 0.9, -11.78]} size={[16, 0.05, 0.04]} />
      <Dust />
      <Truss z={6.2} />
      <Truss z={1.2} x0={-13} x1={13} n={6} />
      {/* Núcleos de IA */}
      <AICore position={[-4.5, 0, -9]} />
      <AICore position={[4.5, 0, -9]} />
      {/* Estaciones de los seis agentes */}
      {AGENTS.map((a) => <Station key={a.id} a={a} />)}
      {/* cámaras y plantas */}
      <CineCamera position={[-14.3, 0, 5.8]} rotation={[0, -Math.PI * 0.55, 0]} />
      <CineCamera position={[14.3, 0, 2.2]} rotation={[0, Math.PI * 0.55, 0]} />
      <Plant position={[-14.5, 0, 10.5]} /><Plant position={[14.5, 0, 10.5]} />
      <Plant position={[-14.5, 0, -10.5]} /><Plant position={[14.5, 0, -10.5]} /><Plant position={[-2.6, 0, 10.6]} s={1.1} /><Plant position={[2.6, 0, 10.6]} s={1.1} />
      {/* pantalla gigante colgante de doble cara */}
      <group position={[0, 8.3, 9.2]}>
        <Screen w={7.2} h={2.7} res={256} draw={drawNews} fps={2} position={[0, 0, 0.05]} glow="violet" />
        <Screen w={7.2} h={2.7} res={256} draw={drawStats} fps={2} position={[0, 0, -0.05]} rotation={[0, Math.PI, 0]} />
        {[-3.4, 3.4].map((x) => <mesh key={x} position={[x, 2.6, 0]} material={M.chrome}><cylinderGeometry args={[0.015, 0.015, 4, 6]} /></mesh>)}
      </group>
    </group>
  );
}

function Floor2() {
  const y = 5;
  const edgeZ = SLAB_EDGE_Z;
  const sl = (-HZ + edgeZ) / 2, sd = edgeZ + HZ;
  return (
    <group>
      {/* losa del piso 2 */}
      <mesh position={[0, y - 0.2, sl]} material={M.black}><boxGeometry args={[W, 0.4, sd]} /></mesh>
      <mesh position={[0, y + 0.002, sl]} rotation={[-Math.PI / 2, 0, 0]} material={M.floor2}><planeGeometry args={[W - 0.2, sd]} /></mesh>
      <Strip position={[0, y - 0.2, edgeZ]} size={[W, 0.08, 0.06]} />
      <Strip position={[0, y - 0.45, edgeZ - 0.2]} size={[W, 0.03, 0.03]} mat="stripBV2" />
      {/* barandilla de cristal con hueco para la escalera */}
      {[[-9.1, 13.8], [9.1, 13.8]].map(([x, w]) => (
        <group key={x}>
          <mesh position={[x - (x < 0 ? 0 : 0) + (x < 0 ? -0.0 : 0), y + 0.55, edgeZ]} material={M.glass}><boxGeometry args={[w, 1.1, 0.04]} /></mesh>
          <mesh position={[x, y + 1.12, edgeZ]} material={M.stripBV}><boxGeometry args={[w, 0.05, 0.07]} /></mesh>
        </group>
      ))}
      {/* — Despacho TITAN X — */}
      <group>
        {[-6, 6].map((x) => (
          <group key={x}>
            <mesh position={[x, y + 2.6, -7.6]} material={M.wall}><boxGeometry args={[0.3, 5.2, 8.8]} /></mesh>
            <Strip position={[x - Math.sign(x) * 0.17, y + 0.1, -7.6]} size={[0.03, 0.05, 8.8]} />
            <Strip position={[x - Math.sign(x) * 0.17, y + 4.95, -7.6]} size={[0.03, 0.05, 8.8]} mat="stripBV2" />
          </group>
        ))}
        {[-3.75, 3.75].map((x) => (<mesh key={x} position={[x, y + 2.5, -3.2]} material={M.glass}><boxGeometry args={[4.5, 5, 0.06]} /></mesh>))}
        <mesh position={[0, y + 3.9, -3.2]} material={M.glass}><boxGeometry args={[3, 2.2, 0.06]} /></mesh>
        {[-1.5, 1.5].map((x) => <mesh key={x} position={[x, y + 1.4, -3.2]} material={M.black}><boxGeometry args={[0.12, 2.8, 0.14]} /></mesh>)}
        <Strip position={[0, y + 2.85, -3.2]} size={[3.1, 0.06, 0.08]} mat="stripBV2" />
        <mesh position={[0, y + 0.01, -7.6]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[11.7, 8.8]} /><meshStandardMaterial color="#080818" metalness={0.5} roughness={0.5} /></mesh>
        <mesh position={[0, y + 0.012, -8.8]} rotation={[-Math.PI / 2, 0, 0]} material={M.stripBV}><ringGeometry args={[3.2, 3.26, 64]} /></mesh>
        {/* paneles de madera oscura tras el escritorio */}
        <mesh position={[0, y + 2.5, -11.86]} material={M.woodWall}><boxGeometry args={[11.6, 5, 0.1]} /></mesh>
        {Array.from({ length: 19 }, (_, i) => <mesh key={i} position={[-5.4 + i * 0.6, y + 2.5, -11.78]} material={M.black}><boxGeometry args={[0.02, 5, 0.04]} /></mesh>)}
        <mesh position={[0, y + 0.05, -11.7]} material={M.marble}><boxGeometry args={[11.6, 0.1, 0.3]} /></mesh>
        {/* logo detrás del escritorio */}
        <Logo w={8.5} position={[0, y + 2.9, -11.7]} />
        {/* escritorio y sillón */}
        <group position={[0, y, -9.1]}><ExecDesk /></group>
        <ExecChair position={[0, y, -10.6]} rotation={[0, 0, 0]} />
        {/* holograma gigante */}
        <group position={[0, y + 4.1, -5.8]}>
          <Screen w={5.2} h={1.9} res={256} draw={drawHolo} fps={8} frame={false} additive />
          <mesh position={[0, -4.08, 0]} rotation={[-Math.PI / 2, 0, 0]} material={M.stripBV2}><ringGeometry args={[0.8, 0.9, 40]} /></mesh>
        </group>
        {/* pantallas de rendimiento y panel de tareas */}
        {[0, 1, 2].map((i) => (
          <Screen key={i} w={2.2} h={1.5} res={256} draw={[drawAgentBars, drawStats, drawAgentBars][i]} fps={1} glow="violet"
            position={[-5.82, y + 2.8, -4.6 - i * 2.8 - 0.6]} rotation={[0, Math.PI / 2, 0]} />
        ))}
        <Screen w={5.6} h={2.7} res={256} draw={drawTasks} fps={1} position={[5.82, y + 2.8, -7.6]} rotation={[0, -Math.PI / 2, 0]} />
        <pointLight position={[0, y + 4.2, -8]} color="#8a35ff" intensity={21} distance={16} decay={2} />
        <pointLight position={[0, y + 3.5, -4.2]} color="#2f7bff" intensity={13} distance={12} decay={2} />
        <Plant position={[-5, y, -11]} /><Plant position={[5, y, -11]} />
      </group>
      {/* — Sala de juntas — */}
      <group>
        <mesh position={[8, y + 2.6, -7.6]} material={M.glass}><boxGeometry args={[0.1, 5.2, 8.8]} /></mesh>
        {[-3.2].map((z) => <group key={z}>
          <mesh position={[9.6, y + 2.5, z]} material={M.glass}><boxGeometry args={[3.2, 5, 0.06]} /></mesh>
          <mesh position={[14.6, y + 2.5, z]} material={M.glass}><boxGeometry args={[2.8, 5, 0.06]} /></mesh>
          <mesh position={[12, y + 3.9, z]} material={M.glass}><boxGeometry args={[2, 2.2, 0.06]} /></mesh>
          {[11, 13].map((x) => <mesh key={x} position={[x, y + 1.4, z]} material={M.black}><boxGeometry args={[0.1, 2.8, 0.12]} /></mesh>)}
          <Strip position={[12, y + 2.85, z]} size={[2.1, 0.06, 0.08]} />
        </group>)}
        <mesh position={[12, y + 0.01, -7.6]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[7.8, 8.8]} /><meshStandardMaterial color="#080818" metalness={0.5} roughness={0.5} /></mesh>
        <MeetingTable position={[12, y, -8]} />
        <mesh position={[12, y + 1.5, -8]} material={M.holo}><sphereGeometry args={[0.5, 20, 14]} /></mesh>
        <mesh position={[12, y + 0.85, -8]} material={M.neonBlue}><cylinderGeometry args={[0.3, 0.3, 0.02, 20]} /></mesh>
        <Screen w={6.4} h={2.9} res={256} draw={drawStats} fps={2} position={[12, y + 2.6, -11.72]} />
        <Strip position={[12, y + 4.95, -7.6]} size={[7.6, 0.05, 0.05]} />
        <Strip position={[12, y + 4.95, -4.2]} size={[7.6, 0.05, 0.05]} mat="stripBV2" />
        <Logo w={3.6} position={[12, y + 4.3, -11.74]} bg={false} frame={false} />
        <pointLight position={[12, y + 4, -8]} color="#3f7bff" intensity={17} distance={14} decay={2} />
      </group>
      {/* — Zona lounge y set de streaming — */}
      <group>
        <mesh position={[-12, y + 0.015, -7.6]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[7.8, 8.8]} /><meshStandardMaterial color="#0b0a1c" roughness={0.9} metalness={0.1} /></mesh>
        <mesh position={[-12, y + 0.02, -8.2]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[2.7, 48]} /><meshStandardMaterial color="#130f2e" roughness={0.95} /></mesh>
        <mesh position={[-12, y + 0.024, -8.2]} rotation={[-Math.PI / 2, 0, 0]} material={M.stripBV2}><ringGeometry args={[2.7, 2.76, 64]} /></mesh>
        <Sofa file="SheenWoodLeatherSofa" width={3.3} position={[-12, y, -5.9]} rotation={[0, Math.PI, 0]} />
        <Sofa file="GlamVelvetSofa" width={2.3} position={[-14.5, y, -8.4]} rotation={[0, Math.PI / 2, 0]} />
        <Model file="SheenChair" height={0.95} position={[-9.5, y, -8.4]} rotation={[0, -Math.PI / 2, 0]} />
        <mesh position={[-12, y + 0.22, -8.3]} material={M.marble}><cylinderGeometry args={[0.8, 0.8, 0.05, 40]} /></mesh>
        <mesh position={[-12, y + 0.11, -8.3]} material={M.chrome}><cylinderGeometry args={[0.09, 0.14, 0.22, 16]} /></mesh>
        <Model file="GlassVaseFlowers" height={0.55} position={[-12, y + 0.245, -8.3]} />
        <group position={[-9.6, y, -5.6]}>
          <mesh position={[0, 0.25, 0]} material={M.wood}><boxGeometry args={[0.6, 0.5, 0.6]} /></mesh>
          <Model file="IridescenceLamp" height={0.5} position={[0, 0.5, 0]} />
        </group>
        <Screen w={5.2} h={2.6} res={256} draw={drawNews} fps={2} position={[-12, y + 2.6, -11.72]} glow="violet" />
        <mesh position={[-12, y + 2.6, -11.86]} material={M.woodWall}><boxGeometry args={[6.4, 3.6, 0.1]} /></mesh>
        <Plant position={[-15, y, -11]} /><Plant position={[-9.2, y, -11]} s={1.2} />
        {/* set de streaming: aro de luz, micrófono y cámara */}
        <group position={[-14.6, y, -4.3]}>
          <mesh position={[0, 0.76, 0]} material={M.wood}><boxGeometry args={[1.6, 0.05, 0.8]} /></mesh>
          {[-0.7, 0.7].map((x) => <mesh key={x} position={[x, 0.38, 0]} material={M.black}><boxGeometry args={[0.05, 0.76, 0.7]} /></mesh>)}
          <Mic position={[0.2, 0.785, -0.1]} rotation={[0, 0.3, 0]} />
          <RingLight position={[-0.55, 0.785, -0.15]} rotation={[0, 0.5, 0]} />
        </group>
        <CineCamera position={[-15.1, y, -9.6]} rotation={[0, Math.PI * 0.35, 0]} />
        <OnAir position={[-6.2, y + 3.7, -4.8]} rotation={[0, -Math.PI / 2, 0]} />
        <Acoustic position={[-15.7, y + 1.9, -7.6]} rotation={[0, Math.PI / 2, 0]} w={3.2} h={2.4} />
        <Acoustic position={[-7.6, y + 2.2, -11.85]} w={1.2} h={2.4} /><Acoustic position={[-16.4 + 0.1, y + 2.2, -11.85]} w={1.2} h={2.4} />
        <Softbox position={[-13.4, y, -2.9]} rotation={[0, Math.PI * 0.2, 0]} /><Softbox position={[-16.0, y, -5.6]} rotation={[0, Math.PI * 0.45, 0]} tint="#cfd8ff" />
        <Mixer position={[-9.4, y, -3.9]} rotation={[0, Math.PI, 0]} />
        <pointLight position={[-12, y + 4, -7]} color="#9b2bff" intensity={15} distance={14} decay={2} />
        <Strip position={[-12, y + 4.95, -7.6]} size={[7.6, 0.05, 0.05]} />
      </group>
      {/* cámara cinematográfica en el balcón */}
      <CineCamera position={[-14.8, y, -1.6]} rotation={[0, 0.9, 0]} />
      <CineCamera position={[14.8, y, -1.6]} rotation={[0, -0.9, 0]} />
      <Strip position={[0, y + 0.012, -1.8]} size={[26, 0.01, 0.05]} mat="stripBV2" />
    </group>
  );
}

// Entorno exterior: ciudad nocturna con ventanas iluminadas, tráfico, avenida y estrellas
function windowsTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, 256, 128);
  const cols = ['#ffd9a0', '#9fd0ff', '#c9a0ff', '#ffe9c9', '#7fb4ff'];
  for (let r = 0; r < 4; r++) for (let q = 0; q < 8; q++) {
    const h = Math.abs(Math.sin(r * 12.9 + q * 78.2) * 43758.5) % 1;
    if (h > 0.42) { x.fillStyle = cols[Math.floor(h * 97) % cols.length]; x.globalAlpha = 0.55 + (h % 0.3); x.fillRect(q * 32 + 6, r * 32 + 8, 20, 16); }
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}

function City() {
  const { geo, tex } = useMemo(() => {
    const geos = [];
    for (let i = 0; i < 260; i++) {
      const near = i < 90, a = (i / 260) * Math.PI * 2 * (near ? 2.9 : 1) + Math.sin(i * 12.9) * 0.08;
      const r = near ? 128 + (Math.abs(Math.sin(i * 78.2)) * 50) : 190 + (Math.abs(Math.sin(i * 31.7)) * 130);
      const h = (near ? 16 : 30) + Math.abs(Math.sin(i * 3.7)) * (near ? 46 : 120), w = 6 + Math.abs(Math.sin(i * 9.1)) * 10, d = 6 + Math.abs(Math.sin(i * 5.3)) * 10;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (Math.abs(x) < 26 && z > 20) continue;           // corredor de la avenida
      const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv, n = g.attributes.normal;
      for (let k = 0; k < uv.count; k++) {
        const side = Math.abs(n.getY(k)) < 0.5, ww = Math.abs(n.getX(k)) > 0.5 ? d : w;
        uv.setXY(k, side ? uv.getX(k) * ww / 12 : 0, side ? uv.getY(k) * h / 12 : 0);
      }
      g.translate(x, h / 2 - 0.3, z); geos.push(g);
    }
    return { geo: mergeGeometries(geos), tex: windowsTexture() };
  }, []);
  const cars = useRef(), N = 70;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    for (let i = 0; i < N; i++) {
      const lane = i % 3, dir = lane === 1 ? -1 : 1, R = 96 + lane * 7, a = (i / N) * 6.283 * 3 % 6.283 + t * 0.045 * dir * (1 + lane * 0.15);
      dummy.position.set(Math.cos(a) * R, 0.25, Math.sin(a) * R); dummy.rotation.set(0, -a + (dir > 0 ? 0 : Math.PI), 0); dummy.updateMatrix(); cars.current.setMatrixAt(i, dummy.matrix);
    }
    cars.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <group>
      <mesh geometry={geo}><meshStandardMaterial color="#070916" metalness={0.8} roughness={0.3} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={0.55} /></mesh>
      {[96, 103, 110].map((r) => <mesh key={r} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.27, 0]}><ringGeometry args={[r - 2.2, r + 2.2, 96]} /><meshStandardMaterial color="#05060e" roughness={0.4} metalness={0.7} /></mesh>)}
      <instancedMesh ref={cars} args={[null, null, N]} frustumCulled={false}>
        <boxGeometry args={[0.9, 0.25, 2]} /><meshBasicMaterial color={new THREE.Color('#ffe9c9').multiplyScalar(0.85)} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

function Exterior() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.32, 0]}><circleGeometry args={[420, 48]} /><meshStandardMaterial color="#04050c" metalness={0.1} roughness={0.85} envMapIntensity={0.2} /></mesh>
      <Grid position={[0, -0.3, 0]} args={[400, 400]} cellSize={2} cellThickness={0.5} cellColor="#16205a" sectionSize={10} sectionThickness={1} sectionColor="#3a1f8a" fadeDistance={160} fadeStrength={1.5} infiniteGrid />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.28, 28]}><planeGeometry args={[40, 32]} /><meshStandardMaterial map={floorMarble} color="#2c3252" metalness={0.1} roughness={0.7} envMapIntensity={0.15} /></mesh>
      <Strip position={[0, -0.25, 22]} size={[0.15, 0.02, 20]} />
      <Strip position={[-4, -0.25, 22]} size={[0.08, 0.02, 20]} mat="stripBV2" />
      <Strip position={[4, -0.25, 22]} size={[0.08, 0.02, 20]} mat="stripBV2" />
      <City />
    </group>
  );
}

/* Optimización: fusiona las mallas ESTÁTICAS con material equivalente en una sola (de miles de llamadas de dibujo a unas decenas).
   Se excluye todo lo animado (userData.noMerge), lo transparente, lo invisible y los materiales especiales. */
const sig = (m) => [m.type, m.color?.getHex(), m.emissive?.getHex(), m.emissiveIntensity, m.metalness, m.roughness, m.map?.uuid, m.emissiveMap?.uuid, m.opacity, m.side, m.toneMapped, m.envMapIntensity].join('|');
function mergeStatic(root, shadows) {
  root.updateWorldMatrix(true, true);
  const groups = new Map(), hidden = [];
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || !o.visible || o.parent?.type === 'Scene') return;
    for (let p = o; p; p = p.parent) if (p.userData?.noMerge || p.visible === false) return;
    const m = o.material;
    if (!m || Array.isArray(m) || m.transparent || !['MeshStandardMaterial', 'MeshBasicMaterial'].includes(m.type) || m.constructor.name.includes('Reflector')) return;
    const k = sig(m); if (!groups.has(k)) groups.set(k, { m, list: [] }); groups.get(k).list.push(o);
  });
  const out = new THREE.Group(); out.userData.merged = true;
  groups.forEach(({ m, list }) => {
    if (list.length < 3) return;
    const geos = list.map((o) => {
      const g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld);
      for (const n of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(n)) g.deleteAttribute(n);
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      return g.index ? g.toNonIndexed() : g;
    });
    const mesh = new THREE.Mesh(mergeGeometries(geos, false), m);
    mesh.castShadow = shadows && m.type !== 'MeshBasicMaterial'; mesh.receiveShadow = shadows && m.type !== 'MeshBasicMaterial'; mesh.userData.noShadowToggle = true;
    out.add(mesh); list.forEach((o) => { o.visible = false; hidden.push(o); });
    geos.forEach((g) => g.dispose());
  });
  root.add(out);
  return () => { root.remove(out); out.traverse((o) => o.geometry?.dispose()); hidden.forEach((o) => { o.visible = true; }); };
}

function Shadowize({ children }) {
  const ref = useRef(), q = useStore((s) => (s.gfx.shadows ? 'on' : 'low')), level = useStore((s) => s.level);
  useEffect(() => {
    let undo = null;
    const id = setTimeout(() => {
      ref.current?.traverse((o) => {
        if (!o.isMesh || o.userData.noShadow) return;
        const m = o.material, basic = m?.isMeshBasicMaterial || m?.transparent;
        o.castShadow = q !== 'low' && !basic; o.receiveShadow = q !== 'low' && !m?.isMeshBasicMaterial;
      });
      if (ref.current) undo = mergeStatic(ref.current, q !== 'low');
    }, 2500);
    return () => { clearTimeout(id); undo?.(); };
  }, [q, level]);
  return <group ref={ref}>{children}</group>;
}

export default function Building() {
  const level = useStore((s) => s.level);
  return (
    <Shadowize>
      <Exterior />
      <Shell level={level} />
      <Stairs />
      <Agents />
      {level !== '2' && <Floor1 />}
      {level !== '1' && <Floor2 />}
    </Shadowize>
  );
}
