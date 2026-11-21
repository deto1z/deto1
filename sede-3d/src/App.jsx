import { Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Lightformer, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import Building from './Building';
import CameraRig from './CameraRig';
import UI from './UI';
import Intro from './Intro';
import ChatPanel from './ChatPanel';
import { startAmbient, stopAmbient } from './audio';
import { useEffect, useRef } from 'react';
import { useStore } from './store';
import { animateMaterials } from './materials';

function Tick() { useFrame(({ clock }) => animateMaterials(clock.elapsedTime)); return null; }

function Meter() {
  const acc = useRef({ n: 0, t: 0, el: null });
  useFrame((_, dt) => {
    const A = acc.current; A.n++; A.t += dt;
    if (A.t >= 1) { const fps = Math.round(A.n / A.t); window.__fps = fps; A.el ??= document.getElementById('fps'); if (A.el) A.el.textContent = fps + ' FPS'; A.n = 0; A.t = 0; }
  });
  return null;
}
// Si el equipo va lento y el usuario no eligió calidad, baja un escalón automáticamente (una sola vez)
function AutoQuality() {
  const st = useRef({ n: 0, t: 0, done: false, age: 0 });
  useFrame((_, dt) => {
    const S = st.current; if (S.done) return; S.age += dt; if (S.age < 8) return;
    S.n++; S.t += dt;
    if (S.t >= 5) {
      S.done = true; let manual = new URLSearchParams(location.search).has('q'); try { manual = manual || !!localStorage.getItem('detonador.q'); } catch (e) { /* nada */ }
      const fps = S.n / S.t, q = useStore.getState().quality;
      if (!manual && fps < 20 && (q === 'high' || q === 'medium')) { useStore.getState().setQuality(q === 'high' ? 'medium' : 'low'); try { localStorage.removeItem('detonador.q'); } catch (e) { /* nada */ } useStore.setState({ toast: `Rendimiento bajo (${Math.round(fps)} FPS): calidad bajada automáticamente. Cámbiala en ⚙ Gráficos.` }); }
    }
  });
  return null;
}

function Scene() {
  const q = useStore((s) => s.quality), gfx = useStore((s) => s.gfx);
  return (
    <>
      <color attach="background" args={['#04050d']} />
      <fog attach="fog" args={['#06081a', 60, 330]} />
      <ambientLight intensity={0.55} color="#6f7cff" />
      <hemisphereLight args={['#4d6bff', '#1a0a3a', 0.5]} />
      <directionalLight position={[12, 34, 20]} intensity={q === 'low' ? 0.4 : 0.2} color="#a9b9ff" castShadow={gfx.shadows}
        shadow-mapSize={[2048, 2048]} shadow-camera-left={-24} shadow-camera-right={24} shadow-camera-top={20} shadow-camera-bottom={-20}
        shadow-camera-near={1} shadow-camera-far={90} shadow-bias={-0.0004} shadow-normalBias={0.04} shadow-radius={5} />
      {q === 'high' && gfx.shadows && <>
        <spotLight position={[0, 9.6, -6]} target-position={[0, 5, -9.5]} angle={0.95} penumbra={1} intensity={110} distance={20} color="#b89bff" castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0006} />
        <spotLight position={[0, 9.6, 2]} angle={1.0} penumbra={1} intensity={150} distance={22} color="#8fb0ff" castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0006} />
      </>}
      <Environment resolution={64}>
        <Lightformer form="rect" intensity={1.6} color="#2f6bff" position={[0, 6, 14]} scale={[18, 4, 1]} />
        <Lightformer form="rect" intensity={1.6} color="#9b2bff" position={[0, 6, -14]} scale={[18, 4, 1]} />
        <Lightformer form="ring" intensity={0.5} color="#7f9bff" position={[0, 14, 0]} rotation-x={Math.PI / 2} scale={8} />
        {[-1, 1].map((sx) => [0, 1, 2].map((k) => <Lightformer key={`${sx}${k}`} form="rect" intensity={1.8} color={k === 1 ? "#9b2bff" : "#2f6bff"} position={[sx * 18, 5, -8 + k * 8]} rotation-y={sx * Math.PI / 2} scale={[1.2, 9, 1]} />))}
      </Environment>
      <Stars radius={260} depth={60} count={q === 'low' || q === 'min' ? 800 : 3000} factor={5} fade speed={0.6} />
      <Tick /><Meter /><AutoQuality />
      <Suspense fallback={null}><Building /></Suspense>
      <CameraRig />
      {gfx.bloom && (
        <EffectComposer multisampling={q === 'high' ? 4 : 0}>
          <Bloom intensity={q === 'high' ? 0.9 : 0.6} luminanceThreshold={1} luminanceSmoothing={0.2} mipmapBlur />
          <Vignette eskil={false} offset={0.2} darkness={0.55} />
        </EffectComposer>
      )}
    </>
  );
}

export default function App() {
  const q = useStore((s) => s.quality), gfx = useStore((s) => s.gfx), toast = useStore((s) => s.toast);
  const sound = useStore((s) => s.sound);
  useEffect(() => { sound ? startAmbient() : stopAmbient(); }, [sound]);
  return (
    <div className="app">
      <Canvas shadows={gfx.shadows ? 'soft' : false} key={String(gfx.shadows) + String(gfx.bloom)} dpr={[gfx.res, Math.max(gfx.res, Math.min(2, gfx.res * 2))]} gl={{ antialias: q !== 'high', powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
        onCreated={({ gl, scene, camera }) => { if (new URLSearchParams(location.search).has('debug')) window.__gl = gl; window.__scene = scene; window.__cam = camera; window.__THREE = THREE; }} camera={{ position: [36, 13, 40], fov: 55 }} onPointerMissed={() => useStore.getState().select(null)}>
        <Scene />
      </Canvas>
      {gfx.fps && <div id="fps" className="fps">… FPS</div>}
      {toast && <div className="banner" style={{ top: 'auto', bottom: 90, background: 'rgba(31,107,255,.95)', color: '#fff' }} onClick={() => useStore.setState({ toast: null })}>{toast}</div>}
      <Intro />
      <UI />
      <ChatPanel />
    </div>
  );
}
