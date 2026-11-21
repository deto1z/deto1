import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { M } from './materials';
import { makeCanvasTexture, neonText, FONT } from './textures';
import { Screen } from './Screen';

/* Detalles de estudio profesional de streaming */
const B = ({ p, s, m, r }) => <mesh position={p} rotation={r} material={m}><boxGeometry args={s} /></mesh>;

// Truss de focos sobre el atrio (barras + focos con haz de luz)
export function Truss({ y = 9.6, z = 5, x0 = -12, x1 = 12, n = 7 }) {
  const beams = useRef([]);
  useFrame(({ clock }) => beams.current.forEach((b, i) => { if (b) b.material.opacity = 0.05 + 0.03 * Math.sin(clock.elapsedTime * 1.3 + i); }));
  const cols = ['#2f7bff', '#9b2bff', '#2ee6ff', '#b45bff'];
  return (
    <group position={[0, y, z]}>
      <B p={[0, 0, 0.18]} s={[x1 - x0, 0.03, 0.03]} m={M.chrome} /><B p={[0, 0, -0.18]} s={[x1 - x0, 0.03, 0.03]} m={M.chrome} /><B p={[0, 0.3, 0]} s={[x1 - x0, 0.03, 0.03]} m={M.chrome} />
      {Array.from({ length: 24 }, (_, i) => <B key={i} p={[x0 + 0.5 + i * ((x1 - x0 - 1) / 23), 0.15, 0]} s={[0.015, 0.34, 0.36]} m={M.metal} r={[0, 0, i % 2 ? 0.5 : -0.5]} />)}
      {Array.from({ length: n }, (_, i) => {
        const x = x0 + 2 + i * ((x1 - x0 - 4) / (n - 1)), c = cols[i % cols.length];
        return (
          <group key={i} position={[x, -0.2, 0]} rotation={[0.35 * (i % 2 ? 1 : -1), 0, 0.2 * Math.sin(i)]}>
            <B p={[0, 0.08, 0]} s={[0.06, 0.16, 0.06]} m={M.metal} />
            <mesh position={[0, -0.12, 0]} material={M.black}><cylinderGeometry args={[0.13, 0.1, 0.3, 14]} /></mesh>
            <mesh position={[0, -0.28, 0]} rotation={[Math.PI, 0, 0]} material={new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(2), toneMapped: false })}><circleGeometry args={[0.11, 14]} /></mesh>
            <mesh ref={(r) => (beams.current[i] = r)} position={[0, -3.1, 0]}><coneGeometry args={[1.1, 5.6, 16, 1, true]} /><meshBasicMaterial color={c} transparent opacity={0.06} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} /></mesh>
          </group>
        );
      })}
    </group>
  );
}

// Cartel "ON AIR" de neón rojo
export function OnAir({ position, rotation }) {
  const cv = useMemo(() => { const c = makeCanvasTexture(512, 192); c.ctx.fillStyle = 'rgba(8,2,4,.95)'; c.ctx.fillRect(0, 0, 512, 192); c.ctx.strokeStyle = '#ff2a3a'; c.ctx.lineWidth = 8; c.ctx.shadowColor = '#ff2a3a'; c.ctx.shadowBlur = 24; c.ctx.strokeRect(14, 14, 484, 164); neonText(c.ctx, 'ON AIR', 256, 98, 108, '#ff3a48', 30, 900); c.tex.needsUpdate = true; return c; }, []);
  const m = useRef();
  useFrame(({ clock }) => { if (m.current) m.current.opacity = 0.82 + 0.18 * Math.sin(clock.elapsedTime * 3); });
  return (
    <group position={position} rotation={rotation}>
      <mesh><planeGeometry args={[1.6, 0.6]} /><meshBasicMaterial ref={m} map={cv.tex} transparent toneMapped={false} /></mesh>
      <B p={[0, 0, -0.03]} s={[1.7, 0.7, 0.04]} m={M.black} />
      <pointLight position={[0, 0, 0.6]} color="#ff2a3a" intensity={4} distance={4} />
    </group>
  );
}

// Panel acústico de espuma en rombos
export function Acoustic({ position, rotation, w = 1.2, h = 2.4 }) {
  const tex = useMemo(() => { const c = makeCanvasTexture(128, 256); c.ctx.fillStyle = '#0a0b14'; c.ctx.fillRect(0, 0, 128, 256); for (let y = 0; y < 8; y++) for (let x = 0; x < 4; x++) { const cx = x * 32 + 16 + (y % 2) * 16, cy = y * 32 + 16, g = c.ctx.createRadialGradient(cx, cy, 2, cx, cy, 18); g.addColorStop(0, '#2a2f55'); g.addColorStop(1, '#07080f'); c.ctx.fillStyle = g; c.ctx.beginPath(); c.ctx.moveTo(cx, cy - 15); c.ctx.lineTo(cx + 15, cy); c.ctx.lineTo(cx, cy + 15); c.ctx.lineTo(cx - 15, cy); c.ctx.fill(); } c.tex.needsUpdate = true; return c.tex; }, []);
  return (
    <group position={position} rotation={rotation}>
      <mesh><planeGeometry args={[w, h]} /><meshStandardMaterial map={tex} roughness={0.95} metalness={0} /></mesh>
      <B p={[0, h / 2 + 0.02, 0.01]} s={[w + 0.06, 0.03, 0.03]} m={M.chase0} /><B p={[0, -h / 2 - 0.02, 0.01]} s={[w + 0.06, 0.03, 0.03]} m={M.chase4} />
    </group>
  );
}

// Softbox de iluminación de estudio sobre trípode
export function Softbox({ position, rotation = [0, 0, 0], tint = '#e8eeff' }) {
  return (
    <group position={position} rotation={rotation}>
      {[0, 1, 2].map((i) => <mesh key={i} position={[Math.cos(i * 2.094) * 0.25, 0.8, Math.sin(i * 2.094) * 0.25]} rotation={[Math.sin(i * 2.094) * 0.2, 0, -Math.cos(i * 2.094) * 0.2]} material={M.black}><cylinderGeometry args={[0.015, 0.012, 1.7, 6]} /></mesh>)}
      <B p={[0, 1.7, 0]} s={[0.06, 0.4, 0.06]} m={M.chrome} />
      <group position={[0, 2.0, 0.1]} rotation={[0.12, 0, 0]}>
        <B p={[0, 0, -0.1]} s={[0.8, 0.8, 0.22]} m={M.black} />
        <mesh position={[0, 0, 0.02]}><planeGeometry args={[0.72, 0.72]} /><meshBasicMaterial color={new THREE.Color(tint).multiplyScalar(1.15)} toneMapped={false} /></mesh>
      </group>
    </group>
  );
}

// Mesa de mezclas / controlador de audio
export function Mixer({ position, rotation }) {
  return (
    <group position={position} rotation={rotation}>
      <B p={[0, 0.76, 0]} s={[1.9, 0.05, 0.8]} m={M.wood} /><B p={[0, 0.38, 0]} s={[1.8, 0.72, 0.7]} m={M.black} />
      <B p={[0, 0.82, 0.05]} s={[1.1, 0.06, 0.5]} m={M.metal} r={[-0.15, 0, 0]} />
      {Array.from({ length: 12 }, (_, i) => <group key={i} position={[-0.5 + i * 0.09, 0.86, 0.02]} rotation={[-0.15, 0, 0]}><B p={[0, 0, 0]} s={[0.012, 0.004, 0.32]} m={M.chrome} /><B p={[0, 0.012, -0.08 + (i % 5) * 0.05]} s={[0.04, 0.02, 0.025]} m={i % 3 ? M.neonBlue : M.neonViolet} /></group>)}
      <Screen w={0.7} h={0.4} res={160} draw={(ctx, w, h, t) => { ctx.fillStyle = '#050816'; ctx.fillRect(0, 0, w, h); for (let i = 0; i < 16; i++) { const v = 0.2 + 0.7 * Math.abs(Math.sin(t * 3 + i)); ctx.fillStyle = i < 11 ? '#2f7bff' : '#ff4fd8'; ctx.fillRect(10 + i * (w - 20) / 16, h - 8 - v * (h - 20), (w - 20) / 16 - 3, v * (h - 20)); } }} fps={10} position={[0, 1.2, -0.25]} />
    </group>
  );
}
