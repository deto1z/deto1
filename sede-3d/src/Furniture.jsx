import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { M } from './materials';
import { Screen } from './Screen';
import { drawStats, drawNews, drawAgentBars, drawStation } from './Screen';

const rr = (a, b) => Math.sin(a * 91.7 + b * 13.1);

// Tira luminosa (material compartido -> animación RGB global)
export const Strip = ({ position, size, mat = 'stripBV', rotation }) => (
  <mesh position={position} rotation={rotation} material={M[mat]}>
    <boxGeometry args={size} />
  </mesh>
);

export function Chair({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, accent = 'rgb' }) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* base estrella */}
      <mesh position={[0, 0.06, 0]} material={M.metal}><cylinderGeometry args={[0.06, 0.06, 0.12, 8]} /></mesh>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[Math.cos(i * 1.2566) * 0.2, 0.05, Math.sin(i * 1.2566) * 0.2]} rotation={[0, -i * 1.2566, 0]} material={M.metal}>
          <boxGeometry args={[0.42, 0.04, 0.06]} />
        </mesh>
      ))}
      <mesh position={[0, 0.3, 0]} material={M.chrome}><cylinderGeometry args={[0.035, 0.035, 0.35, 8]} /></mesh>
      {/* asiento */}
      <mesh position={[0, 0.5, 0]} material={M.seat}><boxGeometry args={[0.52, 0.1, 0.5]} /></mesh>
      <mesh position={[0, 0.5, 0.26]} material={M[accent === 'rgb' ? 'rgb' : 'stripBV']}><boxGeometry args={[0.44, 0.02, 0.012]} /></mesh>
      {/* respaldo racing alto */}
      <mesh position={[0, 0.98, -0.25]} rotation={[-0.08, 0, 0]} material={M.seat}><boxGeometry args={[0.5, 0.9, 0.12]} /></mesh>
      <mesh position={[0, 1.2, -0.185]} rotation={[-0.08, 0, 0]} material={M.metal}><boxGeometry args={[0.36, 0.24, 0.03]} /></mesh>
      <mesh position={[0.2, 0.98, -0.19]} rotation={[-0.08, 0, 0]} material={M.stripBV}><boxGeometry args={[0.025, 0.8, 0.02]} /></mesh>
      <mesh position={[-0.2, 0.98, -0.19]} rotation={[-0.08, 0, 0]} material={M.stripBV}><boxGeometry args={[0.025, 0.8, 0.02]} /></mesh>
      {/* reposabrazos */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 0.31, 0.72, -0.05]} material={M.metal}><boxGeometry args={[0.04, 0.3, 0.04]} /></mesh>
          <mesh position={[s * 0.31, 0.88, -0.02]} material={M.seat}><boxGeometry args={[0.08, 0.04, 0.3]} /></mesh>
        </group>
      ))}
    </group>
  );
}

/* Escritorio gaming con 3 monitores, torre RGB, teclado y ratón.
   Local: el agente se sienta en +x mirando hacia -x (hacia los monitores). Se rota desde fuera. */
export function GamingDesk({ agent, rotationY = 0 }) {
  const screens = [drawNews, drawStats, drawAgentBars];
  const draws = [screens[0], screens[1], screens[2]];
  return (
    <group rotation={[0, rotationY, 0]}>
      {/* tablero y patas */}
      <mesh position={[0, 0.76, 0]} material={M.black}><boxGeometry args={[1.5, 0.06, 3.2]} /></mesh>
      <Strip position={[0.76, 0.76, 0]} size={[0.02, 0.05, 3.2]} />
      <Strip position={[-0.76, 0.76, 0]} size={[0.02, 0.05, 3.2]} />
      {[-1.45, 1.45].map((z) => (
        <mesh key={z} position={[0, 0.38, z]} material={M.metal}><boxGeometry args={[1.3, 0.76, 0.08]} /></mesh>
      ))}
      <mesh position={[0, 0.3, 0]} material={M.metal}><boxGeometry args={[0.08, 0.06, 2.8]} /></mesh>
      {/* tres monitores curvados en arco */}
      {[-1, 0, 1].map((k, i) => (
        <group key={k} position={[-0.55, 1.28, k * 0.98]} rotation={[0, Math.PI / 2 - k * 0.5 * 0.0 + (k * 0.35), 0]}>
          <mesh position={[0, -0.36, 0]} material={M.metal}><boxGeometry args={[0.05, 0.3, 0.05]} /></mesh>
          <mesh position={[0, -0.5, 0.0]} material={M.metal}><boxGeometry args={[0.35, 0.02, 0.2]} /></mesh>
          <Screen w={0.95} h={0.54} res={192} draw={draws[i]} fps={1} frame position={[0, 0, 0]} glow={i === 1 ? 'violet' : 'blue'} />
        </group>
      ))}
      {/* teclado RGB y ratón */}
      <mesh position={[0.2, 0.8, 0]} material={M.black}><boxGeometry args={[0.2, 0.02, 0.62]} /></mesh>
      <mesh position={[0.2, 0.812, 0]} material={M.rgb}><boxGeometry args={[0.17, 0.004, 0.58]} /></mesh>
      <mesh position={[0.22, 0.8, 0.5]} material={M.black}><boxGeometry args={[0.07, 0.025, 0.11]} /></mesh>
      <mesh position={[0.22, 0.82, 0.5]} material={M.rgb}><boxGeometry args={[0.02, 0.004, 0.06]} /></mesh>
      {/* alfombrilla */}
      <mesh position={[0.2, 0.795, 0.2]} material={M.metal}><boxGeometry args={[0.45, 0.005, 1.4]} /></mesh>
      {/* torre PC con vidrio y RGB */}
      <group position={[-0.1, 0.79, 1.3]}>
        <mesh position={[0, 0.25, 0]} material={M.black}><boxGeometry args={[0.28, 0.5, 0.42]} /></mesh>
        <mesh position={[0.145, 0.25, 0]} material={M.glassDark}><boxGeometry args={[0.005, 0.44, 0.36]} /></mesh>
        {[0.08, 0.2, 0.32].map((y) => (
          <mesh key={y} position={[0.15, y + 0.05, 0]} rotation={[0, 0, 0]} material={M.rgb}><boxGeometry args={[0.01, 0.07, 0.3]} /></mesh>
        ))}
        <mesh position={[0.15, 0.18, 0.0]} material={M.rgb}><torusGeometry args={[0.07, 0.008, 6, 20]} /></mesh>
      </group>
      {/* silla */}
      <Chair position={[1.15, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />
      {/* base luminosa en el suelo */}
      <mesh position={[0.2, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} material={M.stripBV2}><ringGeometry args={[2.0, 2.06, 48]} /></mesh>
    </group>
  );
}

/* Escritorio ejecutivo futurista de TITAN X */
export function ExecDesk() {
  return (
    <group>
      <mesh position={[0, 0.78, 0]} material={M.black}><boxGeometry args={[3.8, 0.1, 1.5]} /></mesh>
      <mesh position={[0, 0.84, 0.75]} material={M.neonBlue}><boxGeometry args={[3.8, 0.02, 0.02]} /></mesh>
      <mesh position={[0, 0.4, 0.15]} material={M.metal}><boxGeometry args={[3.6, 0.7, 1.1]} /></mesh>
      <mesh position={[0, 0.4, 0.71]} material={M.stripBV}><boxGeometry args={[3.0, 0.06, 0.02]} /></mesh>
      <mesh position={[0, 0.15, 0.71]} material={M.stripBV2}><boxGeometry args={[3.4, 0.02, 0.02]} /></mesh>
      {/* monitores del CEO */}
      {[-1.2, 0, 1.2].map((x, i) => (
        <group key={x} position={[x, 1.25, -0.45]} rotation={[0, -x * 0.12, 0]}>
          <mesh position={[0, -0.4, 0]} material={M.metal}><boxGeometry args={[0.06, 0.3, 0.06]} /></mesh>
          <Screen w={1.05} h={0.6} res={192} draw={[drawAgentBars, drawStats, drawNews][i]} fps={1} glow="violet" rotation={[0, Math.PI, 0]} />
        </group>
      ))}
      <mesh position={[0, 0.85, 0.15]} material={M.black}><boxGeometry args={[0.7, 0.015, 0.25]} /></mesh>
      <mesh position={[0, 0.858, 0.15]} material={M.stripBV}><boxGeometry args={[0.62, 0.004, 0.2]} /></mesh>
    </group>
  );
}

export function ExecChair({ position, rotation }) {
  return (
    <group position={position} rotation={rotation} scale={1.25}>
      <mesh position={[0, 0.08, 0]} material={M.metal}><cylinderGeometry args={[0.36, 0.4, 0.06, 20]} /></mesh>
      <mesh position={[0, 0.3, 0]} material={M.chrome}><cylinderGeometry args={[0.05, 0.05, 0.4, 10]} /></mesh>
      <mesh position={[0, 0.5, 0]} material={M.seat}><boxGeometry args={[0.7, 0.14, 0.64]} /></mesh>
      <mesh position={[0, 1.15, -0.32]} rotation={[-0.12, 0, 0]} material={M.seat}><boxGeometry args={[0.72, 1.25, 0.16]} /></mesh>
      <mesh position={[0, 1.15, -0.235]} rotation={[-0.12, 0, 0]} material={M.metal}><boxGeometry args={[0.5, 1.0, 0.03]} /></mesh>
      <mesh position={[0.37, 1.15, -0.28]} rotation={[-0.12, 0, 0]} material={M.stripBV}><boxGeometry args={[0.03, 1.2, 0.03]} /></mesh>
      <mesh position={[-0.37, 1.15, -0.28]} rotation={[-0.12, 0, 0]} material={M.stripBV}><boxGeometry args={[0.03, 1.2, 0.03]} /></mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.4, 0.82, -0.05]} material={M.seat}><boxGeometry args={[0.1, 0.06, 0.55]} /></mesh>
      ))}
    </group>
  );
}

export function MeetingTable({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.76, 0]} material={M.black}><boxGeometry args={[5, 0.07, 1.7]} /></mesh>
      <mesh position={[0, 0.8, 0]} material={M.stripBV}><boxGeometry args={[4.6, 0.01, 0.04]} /></mesh>
      <mesh position={[0, 0.38, 0]} material={M.metal}><boxGeometry args={[0.5, 0.76, 1.1]} /></mesh>
      {[-1.6, -0.55, 0.55, 1.6].map((x) => [-1, 1].map((s) => (
        <Chair key={`${x}${s}`} position={[x, 0, s * 1.2]} rotation={[0, s > 0 ? Math.PI : 0, 0]} accent="bv" />
      )))}
    </group>
  );
}

export function Sofa({ position, rotation }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0.25, 0]} material={M.seat}><boxGeometry args={[2.6, 0.5, 0.95]} /></mesh>
      <mesh position={[0, 0.7, -0.4]} material={M.seat}><boxGeometry args={[2.6, 0.6, 0.18]} /></mesh>
      {[-1.4, 1.4].map((x) => <mesh key={x} position={[x, 0.45, 0]} material={M.seat}><boxGeometry args={[0.18, 0.6, 0.95]} /></mesh>)}
      <mesh position={[0, 0.02, 0.5]} material={M.stripBV2}><boxGeometry args={[2.7, 0.03, 0.03]} /></mesh>
    </group>
  );
}

export function Plant({ position, s = 1 }) {
  return (
    <group position={position} scale={s}>
      <mesh position={[0, 0.3, 0]} material={M.black}><cylinderGeometry args={[0.32, 0.26, 0.6, 12]} /></mesh>
      <mesh position={[0, 0.62, 0]} material={M.stripBV}><torusGeometry args={[0.32, 0.015, 6, 20]} rotation={[Math.PI / 2, 0, 0]} /></mesh>
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} position={[Math.cos(i * 0.7) * 0.18, 1.0 + (i % 3) * 0.2, Math.sin(i * 0.7) * 0.18]} rotation={[rr(i, 1) * 0.5, i, rr(i, 2) * 0.5]}>
          <coneGeometry args={[0.1, 0.8, 5]} /><meshStandardMaterial color="#0e5a4a" emissive="#06352b" roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

// Cámara cinematográfica en trípode (decorativa)
export function CineCamera({ position, rotation = [0, 0, 0] }) {
  return (
    <group position={position} rotation={rotation}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[Math.cos(i * 2.094) * 0.28, 0.6, Math.sin(i * 2.094) * 0.28]} rotation={[Math.sin(i * 2.094) * 0.3, 0, -Math.cos(i * 2.094) * 0.3]} material={M.metal}>
          <cylinderGeometry args={[0.018, 0.018, 1.25, 6]} />
        </mesh>
      ))}
      <mesh position={[0, 1.3, 0]} material={M.chrome}><cylinderGeometry args={[0.06, 0.06, 0.1, 10]} /></mesh>
      <mesh position={[0, 1.5, 0]} material={M.black}><boxGeometry args={[0.2, 0.22, 0.45]} /></mesh>
      <mesh position={[0, 1.5, 0.38]} material={M.metal}><cylinderGeometry args={[0.085, 0.1, 0.3, 14]} /><meshStandardMaterial /></mesh>
      <mesh position={[0, 1.5, 0.545]} rotation={[Math.PI / 2, 0, 0]} material={M.neonBlue}><circleGeometry args={[0.07, 14]} /></mesh>
      <mesh position={[0, 1.66, -0.1]} material={M.rgb}><sphereGeometry args={[0.025, 8, 8]} /></mesh>
    </group>
  );
}

// Núcleo de IA: cilindro de cristal con anillos giratorios
export function AICore({ position }) {
  const r1 = useRef(), r2 = useRef(), orb = useRef();
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (r1.current) { r1.current.rotation.y = t * 0.8; r1.current.rotation.x = Math.sin(t * 0.5) * 0.5; }
    if (r2.current) { r2.current.rotation.z = -t * 0.6; r2.current.rotation.x = Math.PI / 2 + Math.cos(t * 0.4) * 0.4; }
    if (orb.current) orb.current.scale.setScalar(1 + Math.sin(t * 2) * 0.05);
  });
  return (
    <group position={position}>
      <mesh position={[0, 0.1, 0]} material={M.metal}><cylinderGeometry args={[0.9, 1, 0.2, 24]} /></mesh>
      <mesh position={[0, 0.22, 0]} rotation={[-Math.PI / 2, 0, 0]} material={M.stripBV}><ringGeometry args={[0.8, 0.88, 40]} /></mesh>
      <mesh position={[0, 1.8, 0]} material={M.glass}><cylinderGeometry args={[0.7, 0.7, 3.2, 24, 1, true]} /></mesh>
      <mesh position={[0, 3.45, 0]} material={M.metal}><cylinderGeometry args={[0.9, 0.8, 0.18, 24]} /></mesh>
      <mesh ref={orb} position={[0, 1.8, 0]} material={M.neonBlue}><icosahedronGeometry args={[0.32, 1]} /></mesh>
      <mesh ref={r1} position={[0, 1.8, 0]} material={M.neonViolet}><torusGeometry args={[0.55, 0.018, 8, 40]} /></mesh>
      <mesh ref={r2} position={[0, 1.8, 0]} material={M.neonW}><torusGeometry args={[0.48, 0.012, 8, 40]} /></mesh>
    </group>
  );
}

// Cartel flotante con nombre sobre cada estación
export function StationSign({ agent, position, rotation }) {
  return (
    <group position={position} rotation={rotation}>
      <Screen w={2.4} h={0.8} res={256} draw={drawStation(agent)} fps={0.4} frame={false} />
      <mesh position={[0, -0.46, 0]}><boxGeometry args={[2.4, 0.03, 0.03]} /><meshBasicMaterial color={agent.color} toneMapped={false} /></mesh>
    </group>
  );
}
