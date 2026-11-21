import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';

/* ───────────────────────────────────────────────────────────────
   Personajes 3D reales (Quaternius «Ultimate Modular Men/Women», CC0)
   + animaciones de captura de movimiento (Quaternius «Universal Animation Library», CC0).
   Las animaciones se retargetean en tiempo real a cada esqueleto (por rotaciones de mundo).
   ─────────────────────────────────────────────────────────────── */
const BASE = import.meta.env.BASE_URL;
export const CHAR_FILE = (name) => `${BASE}models/characters/${name}.glb`;
const ANIM_FILE = `${BASE}models/ual_animations.glb`;

const san = (n) => n.replace(/\s/g, '_').replace(/[\[\]\.:\/]/g, '');
const FINGERS = ['index', 'middle', 'ring', 'pinky'];
const PAIRS = (() => {
  const p = [['DEF-hips', 'Hips'], ['DEF-spine.001', 'Abdomen'], ['DEF-spine.002', 'Torso'], ['DEF-spine.003', 'Chest'], ['DEF-neck', 'Neck'], ['DEF-head', 'Head']];
  ['L', 'R'].forEach((s) => {
    p.push([`DEF-shoulder.${s}`, `Shoulder.${s}`], [`DEF-upper_arm.${s}`, `UpperArm.${s}`], [`DEF-forearm.${s}`, `LowerArm.${s}`], [`DEF-hand.${s}`, `Hand.${s}`],
      [`DEF-thigh.${s}`, `UpperLeg.${s}`], [`DEF-shin.${s}`, `LowerLeg.${s}`], [`DEF-foot.${s}`, `Foot.${s}`]);
    FINGERS.forEach((f) => [1, 2, 3].forEach((i) => p.push([`DEF-f_${f}.0${i}.${s}`, `${f[0].toUpperCase() + f.slice(1)}${i + 1}.${s}`])));
    p.push([`DEF-thumb.02.${s}`, `Thumb2.${s}`], [`DEF-thumb.03.${s}`, `Thumb3.${s}`]);
  });
  return p.map(([a, b]) => [san(a), san(b)]);
})();

// Acción → animación base y si es sentada
export const RIG_ACTIONS = {
  idle:      { clip: 'Idle_Loop',               seated: false, label: 'En pie' },
  walk:      { clip: 'Walk_Loop',               seated: false, label: 'Caminar' },
  walkFormal:{ clip: 'Walk_Formal_Loop',        seated: false, label: 'Caminar (formal)' },
  sit:       { clip: 'Sitting_Idle_Loop',       seated: true,  label: 'Sentado / descansando' },
  type:      { clip: 'Sitting_Idle_Loop',       seated: true,  label: 'Escribir' },
  look:      { clip: 'Sitting_Idle_Loop',       seated: true,  label: 'Mirar monitores' },
  talk:      { clip: 'Sitting_Talking_Loop',    seated: true,  label: 'Hablar (sentado)' },
  meeting:   { clip: 'Sitting_Talking_Loop',    seated: true,  label: 'Reunión' },
  talkStand: { clip: 'Idle_Talking_Loop',       seated: false, label: 'Hablar (de pie)' },
};

const tmpQ = new THREE.Quaternion(), tmpQ2 = new THREE.Quaternion(), tmpV = new THREE.Vector3(), AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0);

function worldRotate(bone, axis, angle) {            // añade una rotación en espacio mundo a un hueso (los hijos la heredan)
  bone.parent.updateWorldMatrix(true, false);
  bone.updateWorldMatrix(false, false);
  bone.getWorldQuaternion(tmpQ);
  tmpQ2.setFromAxisAngle(axis, angle).multiply(tmpQ);
  bone.parent.getWorldQuaternion(tmpQ).invert();
  bone.quaternion.copy(tmpQ.multiply(tmpQ2));
  bone.updateMatrixWorld(true);
}

export function RiggedAvatar({ file, tweaks, action = 'idle', seatTop = 0.55, seatBack = 0, position, rotation, phase = 0, scale = 1, onReady }) {
  const char = useGLTF(CHAR_FILE(file)), anim = useGLTF(ANIM_FILE);
  const rig = useMemo(() => {
    const root = SkeletonUtils.clone(char.scene);
    const src = SkeletonUtils.clone(anim.scene);
    // materiales propios (para teñir por personaje) y sin recorte por frustum
    const mats = new Map();
    root.traverse((o) => {
      if (!o.isMesh) return;
      o.frustumCulled = false; o.castShadow = true; o.receiveShadow = true;
      const m = o.material;
      if (!mats.has(m)) { const c = m.clone(); mats.set(m, c); const t = tweaks?.[m.name]; if (t) { if (t.color) c.color.set(t.color); if (t.emissive) { c.emissive = new THREE.Color(t.emissive); c.emissiveIntensity = t.emissiveIntensity ?? 1; } if (t.metalness != null) c.metalness = t.metalness; if (t.roughness != null) c.roughness = t.roughness; } }
      o.material = mats.get(m);
    });
    root.updateMatrixWorld(true); src.updateMatrixWorld(true);
    const pairs = [];
    PAIRS.forEach(([sn, tn]) => {
      const s = src.getObjectByName(sn), t = root.getObjectByName(tn);
      if (!s || !t) return;
      pairs.push({ s, t, sRest: s.getWorldQuaternion(new THREE.Quaternion()).invert(), tRest: t.getWorldQuaternion(new THREE.Quaternion()) });
    });
    const sHips = src.getObjectByName(san('DEF-hips')), tHips = root.getObjectByName('Hips');
    const sHipsRest = sHips.getWorldPosition(new THREE.Vector3()), tHipsRest = tHips.getWorldPosition(new THREE.Vector3());
    const clips = anim.animations.map((c) => { const k = c.clone(); k.tracks = k.tracks.filter((t) => !t.name.startsWith('root.')); return k; });
    const mixer = new THREE.AnimationMixer(src);
    const actions = {}; clips.forEach((c) => { actions[c.name] = mixer.clipAction(c); });
    const bones = (n) => root.getObjectByName(san(n));
    return { root, src, pairs, sHips, tHips, sHipsRest, tHipsRest, k: tHipsRest.y / sHipsRest.y, mixer, actions, cur: null, bones, sitY: null, tHipsParent: tHips.parent };
  }, [char, anim, tweaks]);

  useEffect(() => { onReady?.(rig); }, [rig, onReady]);

  const state = useRef({ act: null });
  useFrame(({ clock }, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1), t = clock.elapsedTime + phase;
    const A = RIG_ACTIONS[action] ?? RIG_ACTIONS.idle;
    if (state.current.act !== A.clip) {
      const next = rig.actions[A.clip]; if (next) { next.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.45).play(); if (rig.cur) rig.cur.fadeOut(0.45); rig.cur = next; next.time = (phase * 0.37) % next.getClip().duration; }
      state.current.act = A.clip;
    }
    rig.mixer.update(dt); rig.src.updateMatrixWorld(true);
    // 1) retarget por rotaciones de mundo
    for (const { s, t: tb, sRest, tRest } of rig.pairs) {
      s.getWorldQuaternion(tmpQ).multiply(sRest).multiply(tRest);       // (srcMundo · srcReposo⁻¹) · tgtReposo
      // Nota: el orden delta = srcMundo · srcReposo⁻¹ se aplica por la izquierda de tgtReposo
      tb.parent.updateWorldMatrix(true, false);
      tb.parent.getWorldQuaternion(tmpQ2).invert();
      tb.quaternion.copy(tmpQ2.multiply(tmpQ));
      tb.updateMatrixWorld(true);
    }
    // 2) desplazamiento de la cadera (sentarse, rebote al caminar), escalado a la altura del personaje
    rig.sHips.getWorldPosition(tmpV).sub(rig.sHipsRest).multiplyScalar(rig.k).add(rig.tHipsRest);
    rig.tHipsParent.updateWorldMatrix(true, false);
    rig.tHips.position.copy(rig.tHipsParent.worldToLocal(tmpV));
    if (A.seated) rig.tHips.position.z -= seatBack;
    rig.tHips.updateMatrixWorld(true);
    // 3) capas procedurales sobre la animación (escribir, mirar pantallas)
    const L = rig.bones('UpperArm.L'), R = rig.bones('UpperArm.R'), LL = rig.bones('LowerArm.L'), RL = rig.bones('LowerArm.R'), H = rig.bones('Head'), N = rig.bones('Neck');
    if (action === 'type') {
      const j1 = Math.sin(t * 17), j2 = Math.sin(t * 13 + 1.3);
      worldRotate(L, AX, -0.75); worldRotate(R, AX, -0.75);
      worldRotate(LL, AX, -0.55 + j1 * 0.05); worldRotate(RL, AX, -0.55 + j2 * 0.05);
      worldRotate(N, AX, 0.18 + Math.sin(t * 0.7) * 0.03);
    } else if (action === 'look') {
      worldRotate(N, AY, Math.sin(t * 0.7) * 0.5); worldRotate(H, AX, 0.08);
      worldRotate(R, AX, -0.6); worldRotate(RL, AX, -0.5);
    }
  });
  const hipsOffset = 0;
  return <group position={position} rotation={rotation} scale={scale} userData={{ noMerge: true }}><primitive object={rig.root} position={[0, hipsOffset, 0]} /></group>;
}

useGLTF.preload && ['men_Suit'].forEach((n) => useGLTF.preload(CHAR_FILE(n)));
