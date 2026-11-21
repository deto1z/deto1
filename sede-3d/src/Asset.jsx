import { Component, Suspense, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { useStore } from './store';

import { modelPath } from './modelBase';
export const modelUrl = (name) => modelPath(name + '.glb');

/* Cargador de modelos GLB con licencia abierta (ver CREDITOS.md).
   Normaliza el tamaño (height | width), apoya la base en y=0 y centra en XZ.
   Si el archivo no existe o falla, muestra `fallback` (mobiliario procedural). */
class Boundary extends Component {
  state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  componentDidCatch(e) { console.warn('[GLB] no cargó:', e?.message); }
  render() { return this.state.err ? this.props.fallback ?? null : this.props.children; }
}

function Loaded({ file, height, width, position, rotation, tint, hide }) {
  const { scene } = useGLTF(modelUrl(file));
  const obj = useMemo(() => {
    const o = SkeletonUtils.clone(scene);
    if (hide) { const rm = []; o.traverse((x) => { if (x.isMesh && hide.test(x.name)) rm.push(x); }); rm.forEach((x) => x.parent?.remove(x)); }
    const lights = []; o.traverse((x) => { if (x.isLight) lights.push(x); }); lights.forEach((l) => { l.target?.parent?.remove(l.target); l.parent?.remove(l); });   // los GLB traen luces incrustadas: se descartan
    const box = new THREE.Box3().setFromObject(o), size = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
    const k = height ? height / size.y : width ? width / Math.max(size.x, size.z) : 1;
    const g = new THREE.Group(); g.add(o);
    o.position.set(-ctr.x, -box.min.y, -ctr.z); g.scale.setScalar(k);
    const wrap = new THREE.Group(); wrap.add(g);
    wrap.traverse((m) => {
      if (!m.isMesh) return;
      m.castShadow = true; m.receiveShadow = true;
      m.material = m.material.clone();
      for (const k of Object.keys(m.material)) { const v = m.material[k]; if (v?.isTexture && v.channel === 1) m.material[k] = null; }   // UV1 (p. ej. oclusión) no soportado
      if (tint) m.material.color.multiply(new THREE.Color(tint));
    });
    return wrap;
  }, [scene, height, width, tint]);
  return <primitive object={obj} position={position} rotation={rotation} />;
}

export function Model({ fallback, ...p }) {
  if (useStore((s) => s.quality) === 'min') return fallback ?? null;   // calidad mínima: sin modelos decorativos
  return <Boundary fallback={fallback}><Suspense fallback={fallback}><Loaded {...p} /></Suspense></Boundary>;
}
