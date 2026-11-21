import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, Lightformer, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import Building from './Building';
import CameraRig from './CameraRig';
import UI from './UI';
import Intro from './Intro';
import ChatPanel from './ChatPanel';
import { startAmbient, stopAmbient } from './audio';
import { useEffect } from 'react';
import { useStore } from './store';
import { animateMaterials } from './materials';
import { useFrame } from '@react-three/fiber';

function Tick() { useFrame(({ clock }) => animateMaterials(clock.elapsedTime)); return null; }

function Scene() {
  const q = useStore((s) => s.quality);
  return (
    <>
      <color attach="background" args={['#04050d']} />
      <fog attach="fog" args={['#06081a', 60, 330]} />
      <ambientLight intensity={0.55} color="#6f7cff" />
      <hemisphereLight args={['#4d6bff', '#1a0a3a', 0.5]} />
      <directionalLight position={[12, 34, 20]} intensity={q === 'low' ? 0.5 : 0.85} color="#a9b9ff" castShadow={q !== 'low'}
        shadow-mapSize={[2048, 2048]} shadow-camera-left={-24} shadow-camera-right={24} shadow-camera-top={20} shadow-camera-bottom={-20}
        shadow-camera-near={1} shadow-camera-far={90} shadow-bias={-0.0004} shadow-normalBias={0.04} shadow-radius={5} />
      {q === 'high' && <>
        <spotLight position={[0, 9.6, -6]} target-position={[0, 5, -9.5]} angle={0.95} penumbra={1} intensity={110} distance={20} color="#b89bff" castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0006} />
        <spotLight position={[0, 9.6, 2]} angle={1.0} penumbra={1} intensity={150} distance={22} color="#8fb0ff" castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0006} />
      </>}
      <Environment resolution={64}>
        <Lightformer form="rect" intensity={2.5} color="#2f6bff" position={[0, 6, 14]} scale={[18, 4, 1]} />
        <Lightformer form="rect" intensity={2.5} color="#9b2bff" position={[0, 6, -14]} scale={[18, 4, 1]} />
        <Lightformer form="ring" intensity={2} color="#ffffff" position={[0, 14, 0]} rotation-x={Math.PI / 2} scale={8} />
      </Environment>
      <Stars radius={260} depth={60} count={q === 'low' ? 800 : 3000} factor={5} fade speed={0.6} />
      <Tick />
      <Suspense fallback={null}><Building /></Suspense>
      <CameraRig />
      {q !== 'low' && (
        <EffectComposer multisampling={q === 'high' ? 4 : 0}>
          <Bloom intensity={q === 'high' ? 0.9 : 0.6} luminanceThreshold={1} luminanceSmoothing={0.2} mipmapBlur />
          <Vignette eskil={false} offset={0.2} darkness={0.55} />
        </EffectComposer>
      )}
    </>
  );
}

export default function App() {
  const q = useStore((s) => s.quality);
  const sound = useStore((s) => s.sound);
  useEffect(() => { sound ? startAmbient() : stopAmbient(); }, [sound]);
  return (
    <div className="app">
      <Canvas shadows={q === 'low' ? false : 'soft'} key={q === 'low' ? 'l' : 'h'} dpr={q === 'low' ? [1, 1.25] : q === 'medium' ? [1, 1.5] : [1, 2]} gl={{ antialias: q !== 'high', powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
        onCreated={({ gl, scene }) => { if (new URLSearchParams(location.search).has('debug')) window.__gl = gl; window.__scene = scene; }} camera={{ position: [36, 13, 40], fov: 55 }} onPointerMissed={() => useStore.getState().select(null)}>
        <Scene />
      </Canvas>
      <Intro />
      <UI />
      <ChatPanel />
    </div>
  );
}
