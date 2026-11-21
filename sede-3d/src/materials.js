import * as THREE from 'three';
import { C } from './constants';

const std = (o) => new THREE.MeshStandardMaterial(o);
export const M = {
  black:   std({ color: '#070813', metalness: 0.9, roughness: 0.35 }),
  metal:   std({ color: '#12142a', metalness: 0.95, roughness: 0.25 }),
  chrome:  std({ color: '#8d93b8', metalness: 1, roughness: 0.15 }),
  white:   std({ color: '#e9edff', metalness: 0.2, roughness: 0.4 }),
  floor1:  std({ color: '#0a0c1c', metalness: 0.6, roughness: 0.18 }),
  floor2:  std({ color: '#0c0b20', metalness: 0.6, roughness: 0.2 }),
  wall:    std({ color: '#0a0b18', metalness: 0.7, roughness: 0.45 }),
  seat:    std({ color: '#0d0d14', metalness: 0.1, roughness: 0.8 }),
  glass:   new THREE.MeshPhysicalMaterial({ color: '#7fb4ff', transparent: true, opacity: 0.13, metalness: 0.2, roughness: 0.04, depthWrite: false, side: THREE.DoubleSide }),
  glassDark: new THREE.MeshPhysicalMaterial({ color: '#10163a', transparent: true, opacity: 0.45, metalness: 0.5, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide }),
  holo:    new THREE.MeshBasicMaterial({ color: C.cyan, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }),
  // Materiales que se animan cada frame (ver Animator)
  stripBV:  new THREE.MeshBasicMaterial({ color: new THREE.Color(C.blue).multiplyScalar(2.2), toneMapped: false }),   // azul<->violeta
  stripBV2: new THREE.MeshBasicMaterial({ color: new THREE.Color(C.violet).multiplyScalar(2.2), toneMapped: false }), // violeta<->azul
  rgb:      new THREE.MeshBasicMaterial({ color: '#ff00ff', toneMapped: false }), // arcoíris (PC gaming)
  neonW:    new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffffff').multiplyScalar(1.6), toneMapped: false }),
  neonBlue: new THREE.MeshBasicMaterial({ color: new THREE.Color(C.blue).multiplyScalar(2.4), toneMapped: false }),
  neonViolet: new THREE.MeshBasicMaterial({ color: new THREE.Color(C.violet).multiplyScalar(2.4), toneMapped: false }),
};

const a = new THREE.Color(C.blue), b = new THREE.Color(C.violet), tmp = new THREE.Color();
export function animateMaterials(t) {
  const k = (Math.sin(t * 0.8) + 1) / 2;
  M.stripBV.color.copy(tmp.copy(a).lerp(b, k)).multiplyScalar(2.2);
  M.stripBV2.color.copy(tmp.copy(b).lerp(a, k)).multiplyScalar(2.2);
  M.rgb.color.setHSL((t * 0.25) % 1, 1, 0.55).multiplyScalar(1.8);
}
