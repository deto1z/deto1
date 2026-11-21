import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshReflectorMaterial, Grid, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { M } from './materials';
import { W, D, SLAB_EDGE_Z, AGENTS } from './constants';
import { Screen, drawStats, drawNews, drawTasks, drawAgentBars, drawHolo } from './Screen';
import { makeCanvasTexture, drawLogo, neonText } from './textures';
import { Strip, GamingDesk, ExecDesk, ExecChair, MeetingTable, Sofa, Plant, CineCamera, AICore, StationSign } from './Furniture';
import { Stairs } from './Stairs';
import { useStore } from './store';

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
      {[-1, 1].map((s) => (<Strip key={s} position={[s * (HX - 0.14), 5, 0]} size={[0.03, 0.08, D]} />))}
      <Strip position={[0, 5, HZ - 0.14]} size={[W, 0.08, 0.03]} mat="stripBV2" />
      <Strip position={[0, 9.9, HZ - 0.14]} size={[W, 0.08, 0.03]} />
    </group>
  );
}

function Shell({ level }) {
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
      {level !== '1' && (
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

function Floor1() {
  const hq = useStore((s) => s.quality === 'high');
  return (
    <group>
      <mesh position={[0, -0.15, 0]} material={M.floor1}><boxGeometry args={[W, 0.3, D]} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
        <planeGeometry args={[W, D]} />
        {hq ? <MeshReflectorMaterial color="#0a0c1c" resolution={512} blur={[300, 100]} mixBlur={1} mixStrength={7} mirror={0.55} roughness={0.7} depthScale={0} metalness={0.6} />
            : <meshStandardMaterial color="#0a0c1c" metalness={0.7} roughness={0.25} />}
      </mesh>
      {/* líneas de guía en el suelo */}
      <Strip position={[0, 0.012, 3]} size={[0.07, 0.01, 18]} />
      <Strip position={[0, 0.012, -9]} size={[0.07, 0.01, 5]} />
      {[-9, 9].map((x) => <Strip key={x} position={[x, 0.012, 1.5]} size={[0.06, 0.01, 20]} mat="stripBV2" />)}
      <Strip position={[0, 0.012, 11.2]} size={[10, 0.01, 0.07]} mat="stripBV2" />
      <pointLight position={[0, 4, 4]} color="#3f7bff" intensity={60} distance={22} decay={2} />
      <pointLight position={[0, 3.5, -8]} color="#9b2bff" intensity={45} distance={18} decay={2} />
      <pointLight position={[-10, 3, 0]} color="#2b7bff" intensity={25} distance={14} decay={2} />
      <pointLight position={[10, 3, 0]} color="#9b4bff" intensity={25} distance={14} decay={2} />
      {/* videowall (DEMO) bajo el piso superior */}
      <group position={[0, 2.5, -11.7]}>
        <Screen w={6.4} h={3.4} res={256} draw={drawStats} fps={3} position={[0, 0, 0]} />
        <Screen w={4.2} h={3.4} res={256} draw={drawNews} fps={2} position={[-5.4, 0, 0]} glow="violet" />
        <Screen w={4.2} h={3.4} res={256} draw={drawAgentBars} fps={1} position={[5.4, 0, 0]} glow="violet" />
      </group>
      <Strip position={[0, 0.9, -11.78]} size={[16, 0.05, 0.04]} />
      {/* Núcleos de IA */}
      <AICore position={[-4.5, 0, -9]} />
      <AICore position={[4.5, 0, -9]} />
      {/* Estaciones de los seis agentes */}
      {AGENTS.map((a) => {
        const left = a.pos[0] < 0;
        return (
          <group key={a.id} position={[a.pos[0], 0, a.pos[1]]}>
            <group onClick={(e) => { e.stopPropagation(); useStore.getState().select(a.id); }}
                   onPointerOver={() => (document.body.style.cursor = 'pointer')} onPointerOut={() => (document.body.style.cursor = '')}>
              <GamingDesk agent={a} rotationY={left ? 0 : Math.PI} />
              <StationSign agent={a} position={[left ? 1.2 : -1.2, 2.55, 0]} rotation={[0, left ? Math.PI / 2 : -Math.PI / 2, 0]} />
              {/* piloto de estado */}
              <mesh position={[left ? 1.2 : -1.2, 2.0, 1.1]}><sphereGeometry args={[0.07, 12, 12]} /><meshBasicMaterial color="#6b7088" toneMapped={false} /></mesh>
              {/* zona clicable invisible */}
              <mesh position={[0, 1.3, 0]} visible={false}><boxGeometry args={[3, 2.8, 3.6]} /></mesh>
            </group>
          </group>
        );
      })}
      {/* cámaras y plantas */}
      <CineCamera position={[-5.5, 0, 9.5]} rotation={[0, Math.PI * 0.85, 0]} />
      <CineCamera position={[5.5, 0, 9.5]} rotation={[0, -Math.PI * 0.85, 0]} />
      <Plant position={[-14.5, 0, 10.5]} s={1.2} /><Plant position={[14.5, 0, 10.5]} s={1.2} />
      <Plant position={[-14.5, 0, -10.5]} s={1.2} /><Plant position={[14.5, 0, -10.5]} s={1.2} />
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
        {/* logo detrás del escritorio */}
        <Logo w={8.5} position={[0, y + 2.7, -11.8]} />
        {/* escritorio y sillón */}
        <group position={[0, y, -9.1]}><ExecDesk /></group>
        <ExecChair position={[0, y, -10.6]} rotation={[0, Math.PI, 0]} />
        {/* holograma gigante */}
        <group position={[0, y + 4.1, -5.8]}>
          <Screen w={5.2} h={1.9} res={256} draw={drawHolo} fps={8} frame={false} additive />
          <mesh position={[0, -2.5, 0]} rotation={[-Math.PI / 2, 0, 0]} material={M.stripBV2}><ringGeometry args={[0.8, 0.9, 40]} /></mesh>
        </group>
        {/* pantallas de rendimiento y panel de tareas */}
        {[0, 1, 2].map((i) => (
          <Screen key={i} w={2.2} h={1.5} res={256} draw={[drawAgentBars, drawStats, drawAgentBars][i]} fps={1} glow="violet"
            position={[-5.82, y + 2.8, -4.6 - i * 2.8 - 0.6]} rotation={[0, Math.PI / 2, 0]} />
        ))}
        <Screen w={5.6} h={2.7} res={256} draw={drawTasks} fps={1} position={[5.82, y + 2.8, -7.6]} rotation={[0, -Math.PI / 2, 0]} />
        <pointLight position={[0, y + 4.2, -8]} color="#8a35ff" intensity={55} distance={16} decay={2} />
        <pointLight position={[0, y + 3.5, -4.2]} color="#2f7bff" intensity={35} distance={12} decay={2} />
        <Plant position={[-5, y, -11]} s={1.1} /><Plant position={[5, y, -11]} s={1.1} />
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
        <pointLight position={[12, y + 4, -8]} color="#3f7bff" intensity={45} distance={14} decay={2} />
      </group>
      {/* — Zona lounge / monitoreo — */}
      <group>
        <Sofa position={[-12, y, -8.5]} rotation={[0, Math.PI / 2 * 0, 0]} />
        <Sofa position={[-12, y, -5.6]} rotation={[0, Math.PI, 0]} />
        <mesh position={[-12, y + 0.25, -7.05]} material={M.black}><cylinderGeometry args={[0.7, 0.7, 0.5, 20]} /></mesh>
        <mesh position={[-12, y + 0.51, -7.05]} rotation={[-Math.PI / 2, 0, 0]} material={M.stripBV2}><ringGeometry args={[0.5, 0.56, 28]} /></mesh>
        <Screen w={5.2} h={2.6} res={256} draw={drawNews} fps={2} position={[-12, y + 2.6, -11.72]} glow="violet" />
        <Plant position={[-15, y, -11]} s={1.2} /><Plant position={[-15, y, -3.8]} s={1.2} />
        <pointLight position={[-12, y + 4, -7]} color="#9b2bff" intensity={40} distance={14} decay={2} />
        <Strip position={[-12, y + 4.95, -7.6]} size={[7.6, 0.05, 0.05]} />
      </group>
      {/* cámara cinematográfica en el balcón */}
      <CineCamera position={[-6.5, y, -1.9]} rotation={[0, 0.5, 0]} />
      <CineCamera position={[6.5, y, -1.9]} rotation={[0, -0.5, 0]} />
      <Strip position={[0, y + 0.012, -1.8]} size={[26, 0.01, 0.05]} mat="stripBV2" />
    </group>
  );
}

// Entorno exterior: suelo, ciudad de fondo, estrellas
function Exterior() {
  const city = useRef();
  const { mats } = useMemo(() => {
    const dummy = new THREE.Object3D(); const arr = [];
    for (let i = 0; i < 150; i++) {
      const a = (i / 150) * Math.PI * 2 + Math.sin(i * 12.9) * 0.05, r = 120 + (Math.abs(Math.sin(i * 78.2)) * 110);
      const h = 10 + Math.abs(Math.sin(i * 3.7)) * 70, w = 5 + Math.abs(Math.sin(i * 9.1)) * 9;
      dummy.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r); dummy.scale.set(w, h, w); dummy.updateMatrix(); arr.push(dummy.matrix.clone());
    }
    return { mats: arr };
  }, []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.32, 0]}><circleGeometry args={[400, 48]} /><meshStandardMaterial color="#04050c" metalness={0.8} roughness={0.5} /></mesh>
      <Grid position={[0, -0.3, 0]} args={[400, 400]} cellSize={2} cellThickness={0.5} cellColor="#16205a" sectionSize={10} sectionThickness={1} sectionColor="#3a1f8a" fadeDistance={160} fadeStrength={1.5} infiniteGrid />
      {/* plaza de entrada */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.28, 28]}><planeGeometry args={[40, 32]} /><meshStandardMaterial color="#080a18" metalness={0.7} roughness={0.3} /></mesh>
      <Strip position={[0, -0.25, 22]} size={[0.15, 0.02, 20]} />
      <Strip position={[-4, -0.25, 22]} size={[0.08, 0.02, 20]} mat="stripBV2" />
      <Strip position={[4, -0.25, 22]} size={[0.08, 0.02, 20]} mat="stripBV2" />
      <instancedMesh ref={city} args={[null, null, mats.length]} onUpdate={(m) => mats.forEach((mat, i) => m.setMatrixAt(i, mat))}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#080a1c" metalness={0.8} roughness={0.35} emissive="#1a1050" emissiveIntensity={0.55} />
      </instancedMesh>
    </group>
  );
}

export default function Building() {
  const level = useStore((s) => s.level);
  return (
    <group>
      <Exterior />
      <Shell level={level} />
      <Stairs />
      {level !== '2' && <Floor1 />}
      {level !== '1' && <Floor2 />}
    </group>
  );
}
