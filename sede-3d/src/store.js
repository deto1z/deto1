import { create } from 'zustand';
const mobile = typeof window !== 'undefined' &&
  (window.matchMedia?.('(pointer: coarse)').matches || window.innerWidth < 800);
export const useStore = create((set) => ({
  mode: 'orbit',          // orbit | walk | tour
  goto: null,             // {pos,target,id} animación de cámara
  level: 'all',           // all | 1 | 2
  quality: mobile ? 'low' : 'high',
  mobile,
  selected: null,
  tourT: 0,
  joy: { x: 0, y: 0 },
  setMode: (mode) => set({ mode }),
  flyTo: (p) => set({ mode: 'orbit', goto: { ...p, id: Math.random() } }),
  setLevel: (level) => set({ level }),
  setQuality: (quality) => set({ quality }),
  select: (selected) => set({ selected }),
  setJoy: (joy) => set({ joy }),
}));
