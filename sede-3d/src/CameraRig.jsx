import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from './store';
import { canMove, groundY } from './colliders';

const EYE = 1.7;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Recorrido cinematográfico: [posición, punto al que mira]
const TOUR = [
  [[42, 14, 46], [0, 5, 0]], [[14, 6, 36], [0, 6, 4]], [[0, 4.5, 24], [0, 7, 8]], [[0, 1.8, 14], [0, 3, 0]],
  [[0, 2.2, 6], [0, 3.5, -8]], [[-6, 1.8, 3], [-9, 1.4, 1]], [[-5, 1.8, -3], [-9, 1.4, -5]], [[5, 1.8, -2], [9, 1.4, 2]],
  [[4, 1.8, 6], [9, 1.4, 7]], [[0, 2.8, 4], [0, 6, -4]], [[0, 5.2, 0], [0, 6.4, -8]],
  [[0, 6.7, -1], [0, 6.4, -10]], [[0, 6.8, -5.4], [0, 7, -11.6]], [[6, 6.7, -2], [12, 6, -8]],
  [[10, 6.7, -5], [12.5, 6, -10]], [[-10, 6.7, -2], [-12, 6, -8]], [[0, 9, 4], [0, 5, -6]],
  [[-30, 14, 40], [0, 5, 0]],
];

export default function CameraRig() {
  const { camera, gl } = useThree();
  const ctrl = useRef();
  const mode = useStore((s) => s.mode);
  const goto = useStore((s) => s.goto);
  const anim = useRef(null);
  const walk = useRef({ x: 0, y: 0, z: 15, yaw: 0, pitch: 0, keys: new Set() });
  const tour = useRef({ t: 0 });
  const prevMode = useRef('orbit');
  const enter = useRef(null);

  const curves = useMemo(() => ({
    pos: new THREE.CatmullRomCurve3(TOUR.map((p) => V(...p[0])), true, 'centripetal'),
    look: new THREE.CatmullRomCurve3(TOUR.map((p) => V(...p[1])), true, 'centripetal'),
  }), []);

  useEffect(() => {
    camera.position.set(...[36, 13, 40]); camera.fov = 55; camera.near = 0.1; camera.far = 700; camera.updateProjectionMatrix();
    if (ctrl.current) { ctrl.current.target.set(0, 5, 0); ctrl.current.update(); }
  }, [camera]);

  // Salto a un preset de cámara
  useEffect(() => { if (goto) anim.current = { pos: V(...goto.pos), target: V(...goto.target), fov: goto.fov ?? 55 }; }, [goto]);

  // Cambio de modo
  useEffect(() => {
    const w = walk.current;
    if (mode === 'walk') {
      const P = camera.position;
      const inside = Math.abs(P.x) < 15 && P.z < 11.5 && P.z > -11.5 && P.y < 12;
      if (!inside) { w.x = 0; w.y = 0; w.z = 15.5; w.yaw = 0; w.pitch = 0; }
      else { w.x = P.x; w.z = P.z; w.y = P.y > 5.5 ? 5 : 0; const d = camera.getWorldDirection(V(0, 0, 0)); w.yaw = Math.atan2(-d.x, -d.z); w.pitch = 0; }
    }
    if (prevMode.current !== 'orbit' && mode === 'orbit' && ctrl.current && !anim.current) {
      const d = camera.getWorldDirection(V(0, 0, 0));
      ctrl.current.target.copy(camera.position).addScaledVector(d, 4);
      ctrl.current.update();
    }
    if (mode === 'tour') tour.current.t = 0;
    if (mode === 'enter') {
      const d = camera.getWorldDirection(V(0, 0, 0)), p0 = camera.position.clone();
      enter.current = {
        t: 0,
        pos: new THREE.CatmullRomCurve3([p0, V(0, 4.2, 28), V(0, 2.4, 16), V(0, 2.1, 10.5), V(0, 3.3, 6), V(0, 4.9, 3), V(0, 6.8, 0.2), V(0, 6.8, -2.6), V(0, 6.8, -3.9)], false, 'centripetal'),
        look: new THREE.CatmullRomCurve3([p0.clone().addScaledVector(d, 30), V(0, 5, 0), V(0, 3.6, 4), V(0, 3, 0), V(0, 4, -2), V(0, 6.2, -6), V(0, 6.5, -8), V(0, 6.6, -11), V(0, 6.6, -11)], false, 'centripetal'),
      };
    }
    prevMode.current = mode;
  }, [mode, camera]);

  // Entrada: teclado + arrastre para mirar (modo caminar)
  useEffect(() => {
    const el = gl.domElement;
    const kd = (e) => {
      const k = e.key.toLowerCase();
      if (k === 'escape') useStore.getState().setMode('orbit');
      walk.current.keys.add(k);
      if (useStore.getState().mode === 'tour' && ['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)) useStore.getState().setMode('orbit');
    };
    const ku = (e) => walk.current.keys.delete(e.key.toLowerCase());
    let drag = null;
    const pd = (e) => { drag = { x: e.clientX, y: e.clientY }; if (useStore.getState().mode === 'tour') useStore.getState().setMode('orbit'); };
    const pm = (e) => {
      if (!drag || useStore.getState().mode !== 'walk') return;
      const w = walk.current;
      w.yaw -= (e.clientX - drag.x) * 0.0045; w.pitch = Math.max(-1.2, Math.min(1.2, w.pitch - (e.clientY - drag.y) * 0.0045));
      drag = { x: e.clientX, y: e.clientY };
    };
    const pu = () => (drag = null);
    const wheel = () => { if (useStore.getState().mode === 'tour') useStore.getState().setMode('orbit'); };
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
    el.addEventListener('pointerdown', pd); window.addEventListener('pointermove', pm); window.addEventListener('pointerup', pu);
    el.addEventListener('wheel', wheel, { passive: true });
    return () => {
      window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku);
      el.removeEventListener('pointerdown', pd); window.removeEventListener('pointermove', pm); window.removeEventListener('pointerup', pu);
      el.removeEventListener('wheel', wheel);
    };
  }, [gl]);

  useFrame(({ clock }, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const st = useStore.getState();
    const c = ctrl.current;

    if (st.mode === 'orbit' && anim.current && c) {
      const k = 1 - Math.exp(-3.2 * dt), a = anim.current;
      camera.position.lerp(a.pos, k); c.target.lerp(a.target, k);
      if (Math.abs(camera.fov - a.fov) > 0.05) { camera.fov += (a.fov - camera.fov) * k; camera.updateProjectionMatrix(); }
      if (camera.position.distanceTo(a.pos) < 0.05 && c.target.distanceTo(a.target) < 0.05) { camera.fov = a.fov; camera.updateProjectionMatrix(); anim.current = null; }
      c.update();
    }

    if (st.mode === 'intro') {
      const t = clock.elapsedTime, a = 0.8 * Math.sin(t * 0.11), R = 38 + 4 * Math.sin(t * 0.07), h = 7 + 2.5 * Math.sin(t * 0.09 + 1);
      camera.position.set(R * Math.sin(a), h, R * Math.cos(a)); camera.lookAt(0, 4.6 + Math.sin(t * 0.13), 0);
    }

    if (st.mode === 'enter' && enter.current) {
      const E = enter.current; E.t += dt / 13;
      const u = Math.min(1, E.t), e = u * u * (3 - 2 * u);
      camera.position.copy(E.pos.getPointAt(e)); camera.lookAt(E.look.getPointAt(e));
      if (u >= 1) {
        enter.current = null;
        if (c) { c.target.set(0, 6.6, -11); c.update(); }
        useStore.setState({ mode: 'orbit', phase: 'app', goto: null });
      }
    }

    if (st.mode === 'tour') {
      const T = tour.current; T.t = (T.t + dt / 95) % 1;
      camera.position.copy(curves.pos.getPointAt(T.t));
      camera.lookAt(curves.look.getPointAt(T.t));
    }

    if (st.mode === 'walk') {
      const w = walk.current, K = w.keys, j = st.joy;
      const fwd = (K.has('w') || K.has('arrowup') ? 1 : 0) - (K.has('s') || K.has('arrowdown') ? 1 : 0) + (-j.y || 0);
      const str = (K.has('d') || K.has('arrowright') ? 1 : 0) - (K.has('a') || K.has('arrowleft') ? 1 : 0) + (j.x || 0);
      if (K.has('q')) w.yaw += dt * 1.6; if (K.has('e')) w.yaw -= dt * 1.6;
      const sp = (K.has('shift') ? 6 : 3.4) * dt;
      const sx = -Math.sin(w.yaw), sz = -Math.cos(w.yaw);          // adelante
      const dx = (sx * fwd + Math.cos(w.yaw) * str) * sp, dz = (sz * fwd - Math.sin(w.yaw) * str) * sp;
      const tryMove = (nx, nz) => canMove(w, nx, nz);
      if (dx && tryMove(w.x + dx, w.z)) w.x += dx;
      if (dz && tryMove(w.x, w.z + dz)) w.z += dz;
      const g = groundY(w);
      w.y += (g - w.y) * Math.min(1, dt * 14);
      camera.position.set(w.x, w.y + EYE, w.z);
      camera.rotation.order = 'YXZ'; camera.rotation.set(w.pitch, w.yaw, 0);
    }
  });

  return <OrbitControls ref={ctrl} makeDefault enabled={mode === 'orbit'} enableDamping dampingFactor={0.08}
    minDistance={0.8} maxDistance={110} maxPolarAngle={Math.PI * 0.51} rotateSpeed={0.6} zoomSpeed={0.8}
    onStart={() => { anim.current = null; }} />;
}
