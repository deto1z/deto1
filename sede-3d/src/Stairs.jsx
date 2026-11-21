import { M } from './materials';
import { STAIR } from './constants';

export function Stairs() {
  const N = 25, rise = STAIR.rise / N, run = (STAIR.z0 - STAIR.z1) / N, w = STAIR.x * 2;
  const len = Math.hypot(STAIR.z0 - STAIR.z1, STAIR.rise);
  const ang = Math.atan2(STAIR.rise, STAIR.z0 - STAIR.z1);
  const mid = [0, STAIR.rise / 2, (STAIR.z0 + STAIR.z1) / 2];
  return (
    <group>
      {Array.from({ length: N }, (_, i) => {
        const top = (i + 1) * rise, z = STAIR.z0 - (i + 0.5) * run;
        return (
          <group key={i}>
            <mesh position={[0, top - 0.05, z]} material={M.black}><boxGeometry args={[w, 0.1, run + 0.01]} /></mesh>
            <mesh position={[0, top - 0.1, z + run / 2]} material={i % 2 ? M.stripBV : M.stripBV2}><boxGeometry args={[w - 0.1, 0.045, 0.03]} /></mesh>
          </group>
        );
      })}
      {/* viga central */}
      <mesh position={mid} rotation={[ang, 0, 0]} material={M.metal}><boxGeometry args={[0.5, 0.35, len]} /></mesh>
      {/* barandillas de cristal con pasamanos de neón */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * (STAIR.x + 0.02), mid[1] + 0.55, mid[2]]} rotation={[ang, 0, 0]} material={M.glass}><boxGeometry args={[0.03, 1.05, len]} /></mesh>
          <mesh position={[s * (STAIR.x + 0.02), mid[1] + 1.08, mid[2]]} rotation={[ang, 0, 0]} material={M.stripBV}><boxGeometry args={[0.07, 0.05, len]} /></mesh>
          <mesh position={[s * (STAIR.x + 0.02), mid[1] + 0.02, mid[2]]} rotation={[ang, 0, 0]} material={M.stripBV2}><boxGeometry args={[0.05, 0.04, len]} /></mesh>
        </group>
      ))}
    </group>
  );
}
