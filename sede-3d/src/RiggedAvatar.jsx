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

const tmpQ = new THREE.Quaternion(), tmpQ2 = new THREE.Quaternion(), qRoot = new THREE.Quaternion(), tmpV = new THREE.Vector3(), tmpP = new THREE.Vector3(), tmpS = new THREE.Vector3(),
  tmpAx = new THREE.Vector3(), AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0), AZ = new THREE.Vector3(0, 0, 1);

// Añade una rotación (eje en espacio del personaje) a un hueso; los hijos la heredan.
function addRot(bone, axis, angle) {
  bone.matrixWorld.decompose(tmpP, tmpQ, tmpS);
  tmpQ2.setFromAxisAngle(tmpAx.copy(axis).applyQuaternion(qRoot), angle).multiply(tmpQ);
  bone.parent.matrixWorld.decompose(tmpP, tmpQ, tmpS);
  bone.quaternion.copy(tmpQ.invert().multiply(tmpQ2));
  bone.updateMatrixWorld(true);
}

const ONE_SHOT = { Sitting_Enter: true, Sitting_Exit: true };

export function RiggedAvatar({ file, tweaks, action = 'idle', seatTop = 0.55, sitOffset = [0, 0, 0], position, rotation, phase = 0, scale = 1, walkSpeed = 1 }) {
  const char = useGLTF(CHAR_FILE(file)), anim = useGLTF(ANIM_FILE);
  const rig = useMemo(() => {
    const root = SkeletonUtils.clone(char.scene);
    const src = SkeletonUtils.clone(anim.scene);
    const mats = new Map();
    root.traverse((o) => {
      if (!o.isMesh) return;
      o.frustumCulled = false; o.castShadow = true; o.receiveShadow = true;
      const m = o.material;
      if (!mats.has(m)) {
        const c = m.clone(); mats.set(m, c); const t = tweaks?.[m.name];
        c.roughness = Math.min(0.85, Math.max(c.roughness ?? 0.6, 0.55)); c.metalness = Math.min(c.metalness ?? 0, 0.1); c.envMapIntensity = 0.5;
        if (t) { if (t.color) c.color.set(t.color); if (t.emissive) { c.emissive = new THREE.Color(t.emissive); c.emissiveIntensity = t.emissiveIntensity ?? 1; } if (t.metalness != null) c.metalness = t.metalness; if (t.roughness != null) c.roughness = t.roughness; }
      }
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
    const bones = {}; ['UpperArm.L', 'UpperArm.R', 'LowerArm.L', 'LowerArm.R', 'Hand.L', 'Hand.R', 'Head', 'Neck', 'Chest'].forEach((n) => { bones[n] = root.getObjectByName(san(n)); });
    return { root, src, pairs, sHips, tHips, sHipsRest, tHipsRest, k: tHipsRest.y / sHipsRest.y, mixer, actions, cur: null, bones, tHipsParent: tHips.parent };
  }, [char, anim, tweaks]);

  const st = useRef({ clip: null, seated: false, queued: null });
  const play = (name, loop, fade = 0.35) => {
    const next = rig.actions[name]; if (!next) return;
    next.reset(); next.enabled = true; next.setEffectiveWeight(1);
    next.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1); next.clampWhenFinished = !loop; next.fadeIn(fade).play();
    if (rig.cur && rig.cur !== next) rig.cur.fadeOut(fade);
    rig.cur = next; st.current.clip = name;
    if (name === 'Walk_Loop' || name === 'Walk_Formal_Loop') next.timeScale = walkSpeed; else next.timeScale = 1;
    if (loop) next.time = (phase * 0.37) % next.getClip().duration;
  };

  useFrame(({ clock }, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1), t = clock.elapsedTime + phase, S = st.current;
    const A = RIG_ACTIONS[action] ?? RIG_ACTIONS.idle;
    // selección de animación con transiciones de sentarse / levantarse
    if (S.target !== action) {
      S.target = action;
      if (S.first === undefined) { S.first = false; S.seated = A.seated; play(A.clip, true, 0.01); }
      else if (A.seated && !S.seated) { S.seated = true; S.queued = A.clip; play('Sitting_Enter', false); }
      else if (!A.seated && S.seated) { S.seated = false; S.queued = A.clip; play('Sitting_Exit', false); }
      else play(A.clip, true);
    }
    if (S.queued && ONE_SHOT[S.clip] && rig.cur && rig.cur.time >= rig.cur.getClip().duration - 0.06) { const q = S.queued; S.queued = null; play(q, true, 0.25); }
    rig.mixer.update(dt); rig.src.updateMatrixWorld(true);
    rig.root.updateWorldMatrix(true, false); rig.root.updateMatrixWorld(true);
    rig.root.getWorldQuaternion(qRoot);
    const qInv = tmpQ2.copy(qRoot).invert();       // (se reutiliza abajo con copias)
    const qRootInv = qInv.clone();
    // cadera: posición (relativa a la animación, escalada) y rotación; después, el resto de huesos en orden jerárquico
    for (let i = 0; i < rig.pairs.length; i++) {
      const { s, t: tb, sRest, tRest } = rig.pairs[i];
      s.matrixWorld.decompose(tmpP, tmpQ, tmpS);
      tmpQ.multiply(sRest).multiply(tRest);                                   // rotación deseada (espacio del personaje)
      if (i === 0) {
        tmpV.copy(tmpP).sub(rig.sHipsRest).multiplyScalar(rig.k).add(rig.tHipsRest);
        if (S.seated || seatTop > 0) { /* el desplazamiento de la animación ya incluye la altura de sentado */ }
        if (S.seated) tmpV.add(tmpAx.set(...sitOffset));
        rig.root.localToWorld(tmpV);
        tb.position.copy(rig.tHipsParent.worldToLocal(tmpV));
      }
      tb.parent.matrixWorld.decompose(tmpP, tmpQ2, tmpS);
      tmpQ2.premultiply(qRootInv).invert();
      tb.quaternion.copy(tmpQ2.multiply(tmpQ));
      tb.updateMatrix(); tb.matrixWorld.multiplyMatrices(tb.parent.matrixWorld, tb.matrix);
    }
    // capas procedurales (escribir, mirar pantallas)
    const B = rig.bones;
    if (action === 'type') {
      const j1 = Math.sin(t * 17), j2 = Math.sin(t * 13 + 1.3);
      addRot(B['UpperArm.L'], AX, -0.35); addRot(B['UpperArm.R'], AX, -0.35);
      addRot(B['LowerArm.L'], AX, -0.35 + j1 * 0.06); addRot(B['LowerArm.R'], AX, -0.35 + j2 * 0.06);
      addRot(B['Hand.L'], AX, 0.25 + j2 * 0.12); addRot(B['Hand.R'], AX, 0.25 + j1 * 0.12);
      addRot(B.Neck, AX, 0.16 + Math.sin(t * 0.7) * 0.03);
    } else if (action === 'look') {
      addRot(B.Neck, AY, Math.sin(t * 0.7) * 0.55); addRot(B.Head, AX, 0.06);
      addRot(B['UpperArm.R'], AX, -0.3); addRot(B['LowerArm.R'], AX, -0.4);
    }
  });
  return <group position={position} rotation={rotation} scale={scale} userData={{ noMerge: true }}><primitive object={rig.root} /></group>;
}
