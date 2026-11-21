import { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Lightformer } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Avatar, LOOKS, ACTIONS, TITAN } from './Avatar';
import { Chair } from './Furniture';
import { AGENTS } from './constants';
import { makeCanvasTexture, neonText } from './textures';
import './styles.css';

const CAST = [TITAN, ...AGENTS];

function Name({ c, x }) {
  const cv = useMemo(() => { const k = makeCanvasTexture(512, 128); neonText(k.ctx, c.name, 256, 52, 54, c.color, 18, 900); neonText(k.ctx, c.role, 256, 100, 24, '#cdd6ff', 0, 500); k.tex.needsUpdate = true; return k; }, [c]);
  return <mesh position={[x, 0.01, 1.35]} rotation={[-Math.PI / 2.4, 0, 0]}><planeGeometry args={[2, 0.5]} /><meshBasicMaterial map={cv.tex} transparent toneMapped={false} /></mesh>;
}

function Slot({ c, x, action }) {
  const g = useRef(), seated = ACTIONS[action].seated;
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (action === 'walk') { const a = t * 0.9 + x, R = 0.7; g.current.position.set(x + Math.cos(a) * R, 0, Math.sin(a) * R); g.current.rotation.y = -a; }
    else { g.current.position.set(x, 0, 0); g.current.rotation.y = 0; }
  });
  return (
    <>
      <mesh position={[x, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.95, 1.0, 48]} /><meshBasicMaterial color={c.color} toneMapped={false} /></mesh>
      <group ref={g}>
        {seated && <>
          <Chair position={[0, 0, -0.04]} rotation={[0, 0, 0]} accent={c.color} />
          {(action === 'type' || action === 'look' || action === 'sit') && <group position={[0, 0, 0.62]}>
            <mesh position={[0, 0.74, 0]}><boxGeometry args={[1.2, 0.04, 0.6]} /><meshStandardMaterial color="#2a1c14" roughness={0.5} /></mesh>
            <mesh position={[0, 0.77, 0.06]}><boxGeometry args={[0.42, 0.015, 0.14]} /><meshBasicMaterial color={new THREE.Color(c.color).multiplyScalar(1.5)} toneMapped={false} /></mesh>
          </group>}
          {action === 'meeting' && <mesh position={[0, 0.74, 0.7]}><boxGeometry args={[1.6, 0.05, 0.8]} /><meshStandardMaterial color="#14141c" metalness={0.6} roughness={0.2} /></mesh>}
        </>}
        <Avatar id={c.id} action={action} seatTop={0.55} position={[0, 0, 0]} phase={x} />
      </group>
      <Name c={c} x={x} />
    </>
  );
}

export default function Casting() {
  const [action, setAction] = useState('idle');
  return (
    <div className="app">
      <Canvas shadows camera={{ position: [0, 2.4, 11.5], fov: 44 }} gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.15 }}>
        <color attach="background" args={['#05060f']} />
        <fog attach="fog" args={['#05060f', 14, 34]} />
        <ambientLight intensity={0.6} color="#7f8cff" />
        <directionalLight position={[3, 6, 6]} intensity={1.6} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-10} shadow-camera-right={10} shadow-camera-top={6} shadow-camera-bottom={-3} />
        <pointLight position={[-6, 3, 3]} intensity={50} color="#2f7bff" /><pointLight position={[6, 3, 3]} intensity={50} color="#9b2bff" />
        <Environment resolution={64}><Lightformer intensity={2} color="#2f6bff" position={[0, 4, 6]} scale={[14, 3, 1]} /><Lightformer intensity={2} color="#9b2bff" position={[0, 4, -6]} scale={[14, 3, 1]} /></Environment>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[60, 30]} /><meshStandardMaterial color="#0a0c1c" metalness={0.7} roughness={0.25} /></mesh>
        {CAST.map((c, i) => <Slot key={c.id} c={c} x={(i - 3) * 2.2} action={action} />)}
        <OrbitControls target={[0, 1.0, 0]} maxPolarAngle={Math.PI * 0.5} minDistance={2} maxDistance={20} />
        <EffectComposer><Bloom intensity={0.8} luminanceThreshold={1} mipmapBlur /></EffectComposer>
      </Canvas>
      <div className="cast-title"><b>CASTING DE PERSONAJES</b><small>Siete personajes humanoides con rig propio. Vista previa de las animaciones; no representa trabajo real de ningún agente.</small></div>
      <div className="cast-bar">{Object.entries(ACTIONS).map(([k, a]) => <button key={k} className={action === k ? 'on' : ''} onClick={() => setAction(k)}>{a.label}</button>)}</div>
    </div>
  );
}
