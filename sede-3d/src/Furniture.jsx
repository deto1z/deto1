import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { M } from './materials';
import { Model } from './Asset';
import { Screen, drawStats, drawNews, drawAgentBars, STATION_SCREENS } from './Screen';
import { getAgentView } from './store';

const rr = (a, b) => Math.sin(a * 91.7 + b * 13.1);
const B = ({ p, s, m, r }) => <mesh position={p} rotation={r} material={m}><boxGeometry args={s} /></mesh>;
const Cyl = ({ p, r = [0.02, 0.02], h, m, rot, seg = 12 }) => <mesh position={p} rotation={rot} material={m}><cylinderGeometry args={[r[0], r[1], h, seg]} /></mesh>;

export const Strip = ({ position, size, mat = 'stripBV', rotation }) => (
  <mesh position={position} rotation={rotation} material={M[mat]}><boxGeometry args={size} /></mesh>
);

/* Silla de streaming: respaldo "racing", laterales, cabezal, base cromada con ruedas */
export function Chair({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, accent = '#2f7bff' }) {
  const pipe = <meshBasicMaterial color={accent} toneMapped={false} />;
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = i * 1.2566;
        return (
          <group key={i} rotation={[0, -a, 0]}>
            <B p={[0.2, 0.09, 0]} s={[0.42, 0.035, 0.06]} m={M.chrome} />
            <mesh position={[0.4, 0.04, 0]} material={M.black}><sphereGeometry args={[0.03, 8, 8]} /></mesh>
          </group>
        );
      })}
      <Cyl p={[0, 0.2, 0]} r={[0.05, 0.05]} h={0.3} m={M.chrome} />
      <Cyl p={[0, 0.38, 0]} r={[0.07, 0.06]} h={0.1} m={M.black} />
      {/* asiento con bordes laterales */}
      <mesh position={[0, 0.47, 0.02]} material={M.seat}><boxGeometry args={[0.5, 0.09, 0.5]} /></mesh>
      {[-1, 1].map((s) => <mesh key={s} position={[s * 0.25, 0.51, 0.02]} rotation={[0, 0, s * -0.18]} material={M.seat}><boxGeometry args={[0.08, 0.1, 0.5]} /></mesh>)}
      <mesh position={[0, 0.49, 0.28]}>{pipe}<boxGeometry args={[0.46, 0.012, 0.012]} /></mesh>
      {/* respaldo */}
      <group position={[0, 0.5, -0.25]} rotation={[-0.1, 0, 0]}>
        <mesh position={[0, 0.42, 0]} material={M.seat}><boxGeometry args={[0.46, 0.7, 0.1]} /></mesh>
        {[-1, 1].map((s) => <mesh key={s} position={[s * 0.25, 0.46, 0.03]} rotation={[0, s * -0.25, 0]} material={M.seat}><boxGeometry args={[0.1, 0.62, 0.12]} /></mesh>)}
        <mesh position={[0, 0.5, 0.055]} material={M.metal}><boxGeometry args={[0.28, 0.46, 0.01]} /></mesh>
        <mesh position={[0, 0.82, 0.02]} material={M.seat}><boxGeometry args={[0.34, 0.16, 0.14]} /></mesh>
        <mesh position={[0, 0.82, 0.1]}>{pipe}<boxGeometry args={[0.22, 0.012, 0.01]} /></mesh>
        {[-1, 1].map((s) => <mesh key={s} position={[s * 0.185, 0.45, 0.065]}>{pipe}<boxGeometry args={[0.012, 0.6, 0.01]} /></mesh>)}
      </group>
      {/* reposabrazos 4D */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.33, 0.5, -0.05]}>
          <B p={[0, 0.12, 0]} s={[0.035, 0.24, 0.05]} m={M.metal} />
          <B p={[0, 0.26, 0.04]} s={[0.09, 0.04, 0.3]} m={M.seat} />
        </group>
      ))}
    </group>
  );
}

/* Micrófono de condensador con brazo articulado, antipop y araña */
export function Mic({ position = [0, 0, 0], rotation = [0, 0, 0], s = 1 }) {
  return (
    <group position={position} rotation={rotation} scale={s}>
      <B p={[0, 0.02, 0]} s={[0.1, 0.04, 0.07]} m={M.black} />
      <Cyl p={[0, 0.25, 0]} h={0.46} r={[0.012, 0.012]} m={M.chrome} />
      <Cyl p={[0.12, 0.5, 0]} h={0.3} r={[0.01, 0.01]} m={M.chrome} rot={[0, 0, Math.PI / 2.6]} />
      <mesh position={[0.26, 0.56, 0]} material={M.chrome}><sphereGeometry args={[0.02, 8, 8]} /></mesh>
      <Cyl p={[0.38, 0.52, 0]} h={0.26} r={[0.012, 0.012]} m={M.chrome} rot={[0, 0, -Math.PI / 2.2]} />
      <group position={[0.5, 0.45, 0]} rotation={[0, 0, 0.2]}>
        <mesh material={M.black}><torusGeometry args={[0.055, 0.005, 6, 20]} /></mesh>
        <mesh position={[0, -0.02, 0]} rotation={[0, 0, 0]}><capsuleGeometry args={[0.032, 0.11, 6, 12]} /><meshStandardMaterial color="#1a1c2e" metalness={0.9} roughness={0.25} /></mesh>
        <mesh position={[0, -0.02, 0.0]} rotation={[0, 0, 0]} material={M.stripBV}><torusGeometry args={[0.034, 0.003, 6, 16]} /></mesh>
        <mesh position={[0.075, 0, 0]} rotation={[0, Math.PI / 2, 0]}><circleGeometry args={[0.085, 24]} /><meshStandardMaterial color="#05060d" roughness={0.9} transparent opacity={0.7} side={THREE.DoubleSide} /></mesh>
      </group>
    </group>
  );
}

export function Headphones({ position, rotation }) {
  return (
    <group position={position} rotation={rotation}>
      <B p={[0, 0.01, 0]} s={[0.14, 0.02, 0.12]} m={M.black} />
      <Cyl p={[0, 0.14, 0]} h={0.26} r={[0.008, 0.008]} m={M.chrome} />
      <mesh position={[0, 0.3, 0]} rotation={[0, 0, 0]} material={M.metal}><torusGeometry args={[0.095, 0.011, 8, 20, Math.PI]} /></mesh>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.095, 0.29, 0]} rotation={[0, 0, Math.PI / 2]}>
          <mesh material={M.black}><cylinderGeometry args={[0.05, 0.05, 0.045, 16]} /></mesh>
          <mesh position={[0, s * 0.024, 0]} rotation={[Math.PI / 2, 0, 0]} material={M.rgb}><torusGeometry args={[0.04, 0.004, 6, 16]} /></mesh>
        </group>
      ))}
    </group>
  );
}

function Fan({ r, R }) {
  return (
    <group ref={r} userData={{ noMerge: true }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} rotation={[0, 0, i * 1.2566]} position={[Math.cos(i * 1.2566) * R * 0.5, Math.sin(i * 1.2566) * R * 0.5, 0.004]} material={M.rgb}>
          <boxGeometry args={[R * 0.9, R * 0.28, 0.003]} />
        </mesh>
      ))}
    </group>
  );
}

function PCTower({ position }) {
  const fans = useRef([]);
  useFrame((_, dt) => fans.current.forEach((f) => f && (f.rotation.z += dt * 9)));
  return (
    <group position={position}>
      <B p={[0, 0.27, 0]} s={[0.3, 0.54, 0.45]} m={M.black} />
      <mesh position={[0.152, 0.27, 0]} material={M.glassDark}><boxGeometry args={[0.004, 0.5, 0.41]} /></mesh>
      {/* placa base, GPU, RAM y radiador AIO con ventiladores RGB */}
      <B p={[0.12, 0.27, 0]} s={[0.01, 0.46, 0.38]} m={M.metal} />
      <B p={[0.14, 0.17, 0.02]} s={[0.05, 0.05, 0.3]} m={M.chrome} />
      {[0, 1].map((i) => (
        <group key={i} position={[0.168, 0.17, -0.08 + i * 0.17]} rotation={[0, Math.PI / 2, 0]}>
          <mesh material={M.black} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.058, 0.058, 0.008, 18]} /></mesh>
          <mesh material={M.rgb}><torusGeometry args={[0.052, 0.004, 6, 24]} /></mesh>
          <Fan r={(g) => (fans.current[i] = g)} R={0.045} />
        </group>
      ))}
      {[-0.1, -0.07, -0.04, -0.01].map((z, i) => <mesh key={z} position={[0.135, 0.42, z + 0.1]} material={M.rgb}><boxGeometry args={[0.012, 0.09, 0.012]} /></mesh>)}
      <B p={[0.13, 0.46, -0.12]} s={[0.02, 0.1, 0.16]} m={M.chrome} />
      {[0, 1, 2].map((i) => (
        <group key={i} position={[0.145, 0.47, -0.17 + i * 0.05]} rotation={[0, Math.PI / 2, 0]}>
          <Fan r={(g) => (fans.current[2 + i] = g)} R={0.02} />
        </group>
      ))}
      {[0.06, 0.12, 0.18, 0.24].map((y) => <B key={y} p={[-0.15, 0.2 + y * 0.5, 0]} s={[0.004, 0.012, 0.3]} m={M.chrome} />)}
      <Strip position={[0.153, 0.04, 0]} size={[0.004, 0.012, 0.4]} mat="rgb" />
    </group>
  );
}

function Monitor({ draw, tilt = 0, glow, w = 0.98, h = 0.56 }) {
  return (
    <group rotation={[0, tilt, 0]}>
      {/* bisel, soporte y barra RGB trasera */}
      <B p={[0, 0, -0.045]} s={[w + 0.04, h + 0.04, 0.05]} m={M.black} />
      <Cyl p={[0, -h / 2 - 0.12, -0.05]} h={0.24} r={[0.02, 0.02]} m={M.chrome} />
      <B p={[0, -h / 2 - 0.235, -0.01]} s={[0.34, 0.015, 0.2]} m={M.chrome} />
      <B p={[0, 0, -0.08]} s={[w * 0.9, 0.012, 0.012]} m={M.rgb} />
      <B p={[0.3, -h / 2 - 0.022, 0.0]} s={[0.01, 0.01, 0.005]} m={M.led} />
      <Screen w={w} h={h} res={192} draw={draw} fps={1} frame={false} glow={glow} />
    </group>
  );
}

/* Estación gaming/streaming. Local: el agente se sienta en +x y mira hacia -x (monitores). */
export function GamingDesk({ agent }) {
  const accent = agent?.color ?? '#2f7bff';
  const screens = STATION_SCREENS[agent?.id] ?? [drawNews, drawStats, drawAgentBars];
  return (
    <group>
      {/* tablero de madera oscura + marco metálico */}
      <mesh position={[0, 0.76, 0]} material={M.wood}><boxGeometry args={[1.5, 0.05, 3.2]} /></mesh>
      <B p={[0, 0.735, 0]} s={[1.46, 0.015, 3.16]} m={M.black} />
      {[-1.45, 1.45].map((z) => (
        <group key={z} position={[0, 0, z]}>
          <B p={[0, 0.38, 0]} s={[1.2, 0.04, 0.06]} m={M.metal} r={[0, 0, 0]} />
          <B p={[-0.55, 0.38, 0]} s={[0.06, 0.76, 0.1]} m={M.metal} />
          <B p={[0.55, 0.38, 0]} s={[0.06, 0.76, 0.1]} m={M.metal} />
          <B p={[0, 0.02, 0]} s={[1.3, 0.04, 0.12]} m={M.black} />
        </group>
      ))}
      <Strip position={[0.74, 0.735, 0]} size={[0.015, 0.025, 3.16]} />
      <Strip position={[-0.74, 0.735, 0]} size={[0.015, 0.025, 3.16]} mat="stripBV2" />
      <B p={[0, 0.34, 0]} s={[0.3, 0.04, 2.6]} m={M.black} />
      {/* tres monitores en arco */}
      {[-1, 0, 1].map((k, i) => (
        <group key={k} position={[-0.5 + Math.abs(k) * 0.07, 1.25, k * 0.96]} rotation={[0, Math.PI / 2 + k * 0.33, 0]}>
          <Monitor draw={screens[i]} glow={i === 1 ? 'violet' : 'blue'} />
          {k === 0 && <group position={[0, 0.32, 0]}><Cyl p={[0, 0, 0]} h={0.025} r={[0.02, 0.02]} m={M.black} rot={[Math.PI / 2, 0, 0]} /><mesh position={[0, 0, 0.015]} material={M.led}><sphereGeometry args={[0.006, 6, 6]} /></mesh></group>}
        </group>
      ))}
      {/* teclado mecánico, ratón, alfombrilla */}
      <mesh position={[0.2, 0.775, 0]} rotation={[0, 0, 0]} material={M.metal}><boxGeometry args={[0.25, 0.015, 0.72]} /></mesh>
      <mesh position={[0.2, 0.784, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} material={M.keys}><planeGeometry args={[0.68, 0.22]} /></mesh>
      <Strip position={[0.2, 0.772, 0]} size={[0.27, 0.004, 0.74]} mat="rgb" />
      <mesh position={[0.2, 0.793, 0.62]} scale={[1, 0.5, 1.5]} material={M.black}><sphereGeometry args={[0.04, 12, 10]} /></mesh>
      <Strip position={[0.2, 0.775, 0.62]} size={[0.06, 0.004, 0.09]} mat="rgb" />
      <B p={[0.2, 0.762, 0.35]} s={[0.55, 0.004, 1.5]} m={M.metal} />
      {/* Stream Deck, micrófono, auriculares, taza */}
      <group position={[0.35, 0.775, -0.62]} rotation={[0, 0, -0.35]}>
        <B p={[0, 0, 0]} s={[0.06, 0.12, 0.16]} m={M.black} />
        {Array.from({ length: 6 }, (_, i) => <mesh key={i} position={[0.032, 0.03 - Math.floor(i / 3) * 0.05, -0.05 + (i % 3) * 0.05]} material={i % 2 ? M.stripBV : M.stripBV2}><boxGeometry args={[0.005, 0.035, 0.035]} /></mesh>)}
      </group>
      <Mic position={[0.15, 0.76, -1.5]} rotation={[0, Math.PI / 2 + 0.2, 0]} />
      <Headphones position={[-0.3, 0.76, -1.3]} rotation={[0, 1.2, 0]} />
      <Cyl p={[0.45, 0.82, 0.95]} h={0.09} r={[0.035, 0.03]} m={M.white} />
      <PCTower position={[-0.18, 0.76, 1.32]} />
      {/* luz de escritorio */}
      <group position={[-0.3, 0.76, 1.0]}>
        <B p={[0, 0.01, 0]} s={[0.1, 0.02, 0.1]} m={M.black} />
        <Cyl p={[0, 0.17, 0]} h={0.34} r={[0.008, 0.008]} m={M.chrome} />
        <B p={[0.08, 0.36, 0]} s={[0.24, 0.02, 0.05]} m={M.neonW} />
      </group>
      <Chair position={[1.15, 0, 0]} rotation={[0, -Math.PI / 2, 0]} accent={accent} />
      <mesh position={[0.2, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} material={M.stripBV2}><ringGeometry args={[2.0, 2.06, 48]} /></mesh>
      <mesh position={[0.2, 0.011, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[2.0, 40]} /><meshStandardMaterial color="#0a0c20" metalness={0.5} roughness={0.5} transparent opacity={0.55} /></mesh>
    </group>
  );
}

/* Escritorio ejecutivo: mármol negro + madera oscura + neón */
export function ExecDesk() {
  return (
    <group>
      <mesh position={[0, 0.78, 0]} material={M.marble}><boxGeometry args={[3.8, 0.08, 1.5]} /></mesh>
      <mesh position={[0, 0.7, 0]} material={M.black}><boxGeometry args={[3.7, 0.06, 1.4]} /></mesh>
      <mesh position={[0, 0.42, 0.18]} material={M.wood}><boxGeometry args={[3.5, 0.66, 1.0]} /></mesh>
      {[-1.2, 0, 1.2].map((x) => <mesh key={x} position={[x, 0.42, 0.685]} material={M.black}><boxGeometry args={[1.1, 0.56, 0.02]} /></mesh>)}
      <B p={[0, 0.84, 0.75]} s={[3.8, 0.014, 0.014]} m={M.neonBlue} />
      <B p={[0, 0.08, 0.7]} s={[3.5, 0.02, 0.02]} m={M.stripBV2} />
      <B p={[0, 0.74, 0.74]} s={[3.7, 0.02, 0.02]} m={M.stripBV} />
      {/* triple monitor ejecutivo de cara al CEO */}
      {[-1.55, 1.55].map((x, i) => (
        <group key={x} position={[x, 1.15, -0.3]} rotation={[0, Math.PI - x * 0.28, 0]}>
          <Monitor draw={STATION_SCREENS['titan-x'][i === 0 ? 0 : 2]} glow="violet" w={1.05} h={0.6} />
        </group>
      ))}
      <mesh position={[0.1, 0.835, 0.12]} material={M.black}><boxGeometry args={[0.62, 0.012, 0.22]} /></mesh>
      <mesh position={[0.1, 0.843, 0.12]} rotation={[-Math.PI / 2, 0, 0]} material={M.keys}><planeGeometry args={[0.58, 0.19]} /></mesh>
      <Mic position={[-1.4, 0.82, 0.1]} rotation={[0, -1.2, 0]} s={1.1} />
      <Headphones position={[1.55, 0.82, 0.2]} rotation={[0, -0.6, 0]} />
      <Cyl p={[1.15, 0.9, 0.35]} h={0.1} r={[0.04, 0.035]} m={M.white} />
    </group>
  );
}

export function ExecChair({ position, rotation }) {
  return (
    <group position={position} rotation={rotation} scale={1.25}>
      <mesh position={[0, 0.08, 0]} material={M.metal}><cylinderGeometry args={[0.36, 0.4, 0.06, 20]} /></mesh>
      <Cyl p={[0, 0.3, 0]} r={[0.05, 0.05]} h={0.4} m={M.chrome} seg={10} />
      <mesh position={[0, 0.5, 0]} material={M.seat}><boxGeometry args={[0.7, 0.14, 0.64]} /></mesh>
      <mesh position={[0, 1.1, -0.3]} rotation={[-0.12, 0, 0]} material={M.seat}><boxGeometry args={[0.72, 1.1, 0.16]} /></mesh>
      <mesh position={[0, 1.78, -0.35]} rotation={[-0.12, 0, 0]} material={M.seat}><boxGeometry args={[0.46, 0.3, 0.14]} /></mesh>
      <mesh position={[0, 1.1, -0.215]} rotation={[-0.12, 0, 0]} material={M.metal}><boxGeometry args={[0.5, 0.9, 0.03]} /></mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 0.37, 1.1, -0.27]} rotation={[-0.12, 0, 0]} material={M.stripBV}><boxGeometry args={[0.03, 1.1, 0.03]} /></mesh>
          <mesh position={[s * 0.4, 0.82, -0.05]} material={M.seat}><boxGeometry args={[0.1, 0.06, 0.55]} /></mesh>
          <mesh position={[s * 0.4, 0.65, -0.1]} material={M.metal}><boxGeometry args={[0.04, 0.3, 0.04]} /></mesh>
        </group>
      ))}
    </group>
  );
}

export function MeetingTable({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.76, 0]} material={M.marble}><boxGeometry args={[5, 0.07, 1.7]} /></mesh>
      <mesh position={[0, 0.7, 0]} material={M.wood}><boxGeometry args={[4.8, 0.06, 1.5]} /></mesh>
      <B p={[0, 0.8, 0]} s={[4.6, 0.01, 0.04]} m={M.stripBV} />
      <mesh position={[0, 0.38, 0]} material={M.black}><boxGeometry args={[0.5, 0.7, 1.1]} /></mesh>
      {[-1.6, -0.55, 0.55, 1.6].map((x) => [-1, 1].map((s) => (
        <Chair key={`${x}${s}`} position={[x, 0, s * 1.2]} rotation={[0, s > 0 ? Math.PI : 0, 0]} accent="#9b2bff" />
      )))}
    </group>
  );
}

export function Plant({ position, s = 1.4 }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.3 * s, 0]} material={M.black}><cylinderGeometry args={[0.3 * s, 0.24 * s, 0.6 * s, 18]} /></mesh>
      <mesh position={[0, 0.6 * s, 0]} rotation={[Math.PI / 2, 0, 0]} material={M.stripBV}><torusGeometry args={[0.3 * s, 0.012, 6, 24]} /></mesh>
      <mesh position={[0, 0.6 * s, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.29 * s, 18]} /><meshStandardMaterial color="#050608" roughness={1} /></mesh>
      <group position={[0, 0.58 * s, 0]}>
        <Model file="DiffuseTransmissionPlant" height={1.5 * s} hide={/^pot/i} fallback={null} />
      </group>
    </group>
  );
}

export function Sofa({ file, position, rotation, width = 2.4 }) {
  return <Model file={file} width={width} position={position} rotation={rotation} />;
}

export function RingLight({ position, rotation = [0, 0, 0] }) {
  return (
    <group position={position} rotation={rotation}>
      {[0, 1, 2].map((i) => <Cyl key={i} p={[Math.cos(i * 2.094) * 0.22, 0.6, Math.sin(i * 2.094) * 0.22]} h={1.25} r={[0.012, 0.012]} m={M.black} rot={[Math.sin(i * 2.094) * 0.18, 0, -Math.cos(i * 2.094) * 0.18]} />)}
      <Cyl p={[0, 1.35, 0]} h={0.5} r={[0.015, 0.015]} m={M.chrome} />
      <mesh position={[0, 1.7, 0]} rotation={[Math.PI / 2, 0, 0]} material={M.neonW}><torusGeometry args={[0.28, 0.022, 8, 40]} /></mesh>
      <mesh position={[0, 1.7, -0.02]} rotation={[Math.PI / 2, 0, 0]} material={M.black}><torusGeometry args={[0.28, 0.035, 8, 40]} /></mesh>
      <pointLight position={[0, 1.7, 0.4]} intensity={8} distance={5} color="#e8eeff" />
    </group>
  );
}

// Cámara de cine en trípode con matte box, monitor, asa y tally
export function CineCamera({ position, rotation = [0, 0, 0] }) {
  const tally = useRef();
  useFrame(({ clock }) => { if (tally.current) tally.current.visible = Math.floor(clock.elapsedTime * 1.2) % 2 === 0; });
  return (
    <group position={position} rotation={rotation}>
      {[0, 1, 2].map((i) => (
        <group key={i}>
          <mesh position={[Math.cos(i * 2.094) * 0.3, 0.62, Math.sin(i * 2.094) * 0.3]} rotation={[Math.sin(i * 2.094) * 0.26, 0, -Math.cos(i * 2.094) * 0.26]} material={M.metal}><cylinderGeometry args={[0.02, 0.016, 1.28, 8]} /></mesh>
          <mesh position={[Math.cos(i * 2.094) * 0.38, 0.03, Math.sin(i * 2.094) * 0.38]} material={M.black}><sphereGeometry args={[0.03, 8, 8]} /></mesh>
        </group>
      ))}
      <Cyl p={[0, 1.3, 0]} h={0.12} r={[0.07, 0.07]} m={M.chrome} />
      <B p={[0, 1.38, 0]} s={[0.18, 0.04, 0.3]} m={M.black} />
      <Cyl p={[0.1, 1.28, -0.35]} h={0.55} r={[0.008, 0.008]} m={M.black} rot={[1.2, 0, 0]} />
      <B p={[0, 1.55, 0]} s={[0.22, 0.28, 0.46]} m={M.black} />
      <B p={[0, 1.7, -0.05]} s={[0.04, 0.04, 0.32]} m={M.chrome} />
      <B p={[0.13, 1.55, 0.05]} s={[0.02, 0.16, 0.22]} m={M.metal} />
      <mesh position={[0.15, 1.6, 0.05]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[0.2, 0.12]} /><meshBasicMaterial color="#1f6bff" toneMapped={false} /></mesh>
      <Cyl p={[0, 1.55, 0.36]} h={0.26} r={[0.1, 0.09]} m={M.metal} rot={[Math.PI / 2, 0, 0]} />
      {[0.3, 0.38, 0.45].map((z) => <mesh key={z} position={[0, 1.55, z]} rotation={[Math.PI / 2, 0, 0]} material={M.chrome}><torusGeometry args={[0.1, 0.006, 6, 20]} /></mesh>)}
      <B p={[0, 1.55, 0.6]} s={[0.3, 0.24, 0.16]} m={M.black} />
      <mesh position={[0, 1.55, 0.69]} rotation={[0, 0, 0]}><planeGeometry args={[0.16, 0.14]} /><meshStandardMaterial color="#03040a" metalness={1} roughness={0.05} /></mesh>
      <mesh ref={tally} userData={{ noMerge: true }} position={[0, 1.7, 0.2]} material={M.led}><sphereGeometry args={[0.015, 6, 6]} /></mesh>
      <B p={[0, 1.55, -0.28]} s={[0.12, 0.2, 0.06]} m={M.metal} />
    </group>
  );
}

export function AICore({ position }) {
  const r1 = useRef(), r2 = useRef(), orb = useRef();
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (r1.current) { r1.current.rotation.y = t * 0.8; r1.current.rotation.x = Math.sin(t * 0.5) * 0.5; }
    if (r2.current) { r2.current.rotation.z = -t * 0.6; r2.current.rotation.x = Math.PI / 2 + Math.cos(t * 0.4) * 0.4; }
    if (orb.current) orb.current.scale.setScalar(1 + Math.sin(t * 2) * 0.06);
  });
  return (
    <group position={position} userData={{ noMerge: true }}>
      <mesh position={[0, 0.1, 0]} material={M.black}><cylinderGeometry args={[0.9, 1, 0.2, 32]} /></mesh>
      <mesh position={[0, 0.22, 0]} rotation={[-Math.PI / 2, 0, 0]} material={M.stripBV}><ringGeometry args={[0.8, 0.88, 48]} /></mesh>
      <mesh position={[0, 1.8, 0]} material={M.glass}><cylinderGeometry args={[0.7, 0.7, 3.2, 32, 1, true]} /></mesh>
      <mesh position={[0, 3.45, 0]} material={M.black}><cylinderGeometry args={[0.9, 0.8, 0.18, 32]} /></mesh>
      <mesh ref={orb} position={[0, 1.8, 0]} material={M.neonBlue}><icosahedronGeometry args={[0.32, 2]} /></mesh>
      <mesh ref={r1} position={[0, 1.8, 0]} material={M.neonViolet}><torusGeometry args={[0.55, 0.018, 8, 48]} /></mesh>
      <mesh ref={r2} position={[0, 1.8, 0]} material={M.neonW}><torusGeometry args={[0.48, 0.012, 8, 48]} /></mesh>
    </group>
  );
}

// Cartel de estación: nombre, rol y estado real (lee el store en cada refresco)
export function StationSign({ agent, position, rotation }) {
  const draw = (ctx, w, h) => {
    const v = getAgentView(agent.id);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(5,6,18,0.84)'; ctx.fillRect(0, 0, w, h);
    const col = v.alert ? '#ff3b4d' : agent.color;
    ctx.strokeStyle = col; ctx.lineWidth = 6; ctx.shadowColor = col; ctx.shadowBlur = 18; ctx.strokeRect(5, 5, w - 10, h - 10); ctx.shadowBlur = 0;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `900 ${h * 0.26}px "Segoe UI",Arial,sans-serif`; ctx.fillStyle = agent.color; ctx.shadowColor = agent.color; ctx.shadowBlur = 20; ctx.fillText(agent.name, w / 2, h * 0.2); ctx.shadowBlur = 0;
    ctx.font = `500 ${h * 0.12}px "Segoe UI",Arial,sans-serif`; ctx.fillStyle = '#cdd6ff'; ctx.fillText(agent.role, w / 2, h * 0.4);
    ctx.font = `700 ${h * 0.11}px "Segoe UI",Arial,sans-serif`; ctx.fillStyle = v.st.color; ctx.fillText('● ' + v.st.label, w / 2, h * 0.58);
    if (v.alert) { ctx.fillStyle = '#ff3b4d'; ctx.font = `700 ${h * 0.1}px "Segoe UI",Arial,sans-serif`; ctx.fillText('⚠ ' + (v.alert || '').slice(0, 34), w / 2, h * 0.92); }
    else if (v.task) {
      ctx.fillStyle = '#eef'; ctx.font = `600 ${h * 0.095}px "Segoe UI",Arial,sans-serif`; ctx.fillText(v.task.title.slice(0, 36), w / 2, h * 0.76);
      if (typeof v.task.steps === 'number') { ctx.fillStyle = '#9fb0ff'; ctx.font = `500 ${h * 0.075}px "Segoe UI",Arial,sans-serif`; ctx.textAlign = 'right'; ctx.fillText(`paso ${v.task.steps}`, w * 0.93, h * 0.58); ctx.textAlign = 'center'; }   // pasos reales, nunca un porcentaje inventado
      const bx = w * 0.1, bw = w * 0.8, by = h * 0.88;
      ctx.fillStyle = 'rgba(100,120,255,0.25)'; ctx.fillRect(bx, by, bw, h * 0.06);
      ctx.fillStyle = agent.color;
      if (typeof v.task.progress === 'number') ctx.fillRect(bx, by, bw * Math.min(1, v.task.progress), h * 0.06);   // progreso REAL
      else { const t = (performance.now() / 1000) % 1.6 / 1.6; ctx.fillRect(bx + (bw - bw * 0.25) * t, by, bw * 0.25, h * 0.06); } // indeterminado: sin porcentaje
    }
  };
  return (
    <group position={position} rotation={rotation}>
      <Screen w={2.6} h={1.1} res={256} draw={draw} fps={4} frame={false} />
      <mesh position={[0, -0.58, 0]}><boxGeometry args={[2.6, 0.03, 0.03]} /><meshBasicMaterial color={agent.color} toneMapped={false} /></mesh>
    </group>
  );
}
