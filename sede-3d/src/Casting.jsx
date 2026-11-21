import { Suspense, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Lightformer } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { RiggedAvatar, RIG_ACTIONS } from './RiggedAvatar';
import { Chair } from './Furniture';
import { LOOKS3D, TITAN } from './characters';
import { AGENTS } from './constants';
import { makeCanvasTexture, neonText } from './textures';
import './styles.css';

const ALL12 = ['men_Suit', 'men_Spacesuit', 'men_Casual', 'men_Casual2', 'men_Punk', 'men_Worker', 'women_Suit', 'women_SciFi', 'women_Formal', 'women_Casual', 'women_Punk', 'women_Worker']
  .map((f) => ({ id: f, name: f.replace('_', ' ').toUpperCase(), role: 'Candidato', color: '#6fb4ff', file: f }));

function Name({ c, x, z }) {
  const cv = useMemo(() => { const k = makeCanvasTexture(512, 128); neonText(k.ctx, c.name, 256, 52, 54, c.color, 18, 900); neonText(k.ctx, c.role, 256, 100, 24, '#cdd6ff', 0, 500); k.tex.needsUpdate = true; return k; }, [c]);
  return <mesh position={[x, 0.01, z + 1.0]} rotation={[-Math.PI / 2.4, 0, 0]}><planeGeometry args={[2, 0.5]} /><meshBasicMaterial map={cv.tex} transparent toneMapped={false} /></mesh>;
}

function Slot({ c, x, z, action }) {
  const g = useRef(), A = RIG_ACTIONS[action];
  useFrame(({ clock }) => {
    if (action === 'walk' || action === 'walkFormal') { const a = clock.elapsedTime * 0.8 + x, R = 0.6; g.current.position.set(x + Math.cos(a) * R, 0, z + Math.sin(a) * R); g.current.rotation.y = -a + Math.PI; }
    else { g.current.position.set(x, 0, z); g.current.rotation.y = 0; }
  });
  return (
    <>
      <mesh position={[x, 0.01, z]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.85, 0.9, 48]} /><meshBasicMaterial color={c.color} toneMapped={false} /></mesh>
      <group ref={g}>
        {A.seated && <>
          <Chair position={[0, 0, -0.12]} rotation={[0, 0, 0]} accent={c.color} />
          <mesh position={[0, 0.74, 0.62]}><boxGeometry args={[1.1, 0.04, 0.55]} /><meshStandardMaterial color="#2a1c14" roughness={0.5} /></mesh>
        </>}
        <Suspense fallback={null}><RiggedAvatar file={c.file} tweaks={c.tweaks} action={action} seatTop={0.55} seatBack={0} phase={x} /></Suspense>
      </group>
      <Name c={c} x={x} z={z} />
    </>
  );
}

export default function Casting() {
  const params = new URLSearchParams(location.search), pick = params.has('pick');
  const list = pick ? ALL12 : [TITAN, ...AGENTS].map((a) => ({ ...a, file: LOOKS3D[a.id].file, tweaks: LOOKS3D[a.id].tweaks }));
  const [action, setAction] = useState('idle');
  const cols = pick ? 6 : 7;
  return (
    <div className="app">
      <Canvas shadows camera={{ position: [0, 2.6, pick ? 12.5 : 11], fov: 44 }} gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.15 }}>
        <color attach="background" args={['#05060f']} />
        <fog attach="fog" args={['#05060f', 16, 36]} />
        <ambientLight intensity={0.7} color="#8f9bff" />
        <directionalLight position={[3, 6, 6]} intensity={1.4} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-10} shadow-camera-right={10} shadow-camera-top={6} shadow-camera-bottom={-6} />
        <pointLight position={[-6, 3, 3]} intensity={50} color="#2f7bff" /><pointLight position={[6, 3, 3]} intensity={50} color="#9b2bff" />
        <Environment resolution={64}><Lightformer intensity={1.5} color="#2f6bff" position={[0, 4, 6]} scale={[14, 3, 1]} /><Lightformer intensity={1.5} color="#9b2bff" position={[0, 4, -6]} scale={[14, 3, 1]} /></Environment>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[60, 30]} /><meshStandardMaterial color="#0a0c1c" metalness={0.2} roughness={0.4} /></mesh>
        {list.map((c, i) => <Slot key={c.id} c={c} x={((i % cols) - (cols - 1) / 2) * 2.3} z={pick ? (i < cols ? -1.6 : 1.6) : 0} action={action} />)}
        <OrbitControls target={[0, 1.0, 0]} maxPolarAngle={Math.PI * 0.5} minDistance={2} maxDistance={24} />
        <EffectComposer><Bloom intensity={0.6} luminanceThreshold={1} mipmapBlur /></EffectComposer>
      </Canvas>
      <div className="cast-title"><b>CASTING DE PERSONAJES</b><small>{pick ? '12 candidatos (Quaternius, CC0). ' : ''}Vista previa de animaciones; no representa trabajo real de ningún agente.</small></div>
      <div className="cast-bar">{Object.entries(RIG_ACTIONS).map(([k, a]) => <button key={k} className={action === k ? 'on' : ''} onClick={() => setAction(k)}>{a.label}</button>)}</div>
    </div>
  );
}
