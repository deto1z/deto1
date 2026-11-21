import { create } from 'zustand';
import { STATUS } from './constants';

const mobile = typeof window !== 'undefined' &&
  (window.matchMedia?.('(pointer: coarse)').matches || window.innerWidth < 800);

const PRESETS_GFX = {
  high:   { shadows: true,  reflections: true,  bloom: true,  res: 1,    fps: false },
  medium: { shadows: true,  reflections: false, bloom: true,  res: 0.85, fps: false },
  low:    { shadows: false, reflections: false, bloom: false, res: 0.75, fps: false },
  min:    { shadows: false, reflections: false, bloom: false, res: 0.5,  fps: false },
};
export { PRESETS_GFX };
const q0 = (typeof window !== 'undefined' && ['min', 'low', 'medium', 'high'].includes(new URLSearchParams(location.search).get('q'))) ? new URLSearchParams(location.search).get('q') : mobile ? 'low' : 'high';
let saved = null; try { saved = JSON.parse(localStorage.getItem('detonador.gfx')); } catch (e) { /* sin datos */ }
const GFX0 = saved && !(typeof window !== 'undefined' && new URLSearchParams(location.search).has('q')) ? { ...PRESETS_GFX[q0], ...saved } : PRESETS_GFX[q0];

export const useStore = create((set) => ({
  phase: 'intro',         // intro | enter | app
  mode: 'intro',          // intro | enter | orbit | walk | tour
  goto: null,
  level: 'all',
  cutaway: false,         // quita el techo (vistas estratégicas)
  gfx: GFX0,
  setGfxOpt: (k, v) => set((st) => { const gfx = { ...st.gfx, [k]: v }; try { localStorage.setItem('detonador.gfx', JSON.stringify(gfx)); } catch (e) { /* sin almacenamiento */ } return { gfx }; }),
  quality: q0,
  mobile,
  selected: null,
  joy: { x: 0, y: 0 },
  sound: false,
  chatOpen: (typeof localStorage !== 'undefined' && localStorage.getItem('detonador.chatOpen') === '1'),
  preview: false,         // VISTA PREVIA DE DISEÑO (estados de ejemplo, no son tareas reales)
  /* Estado REAL de los agentes. Lo alimentará el orquestador (WebSocket) en la Fase 4.
     { [id]: { status, task:{title, progress?:0..1}, alert?:string } }  — vacío = sin conectar */
  agentState: {},
  instant: false,         // solo pruebas (?debug): los agentes cambian de lugar sin caminar
  placeOverride: 'auto',   // solo vista previa de diseño: 'auto' | 'desk' | 'meeting' | 'rest'
  setPlace: (placeOverride) => set({ placeOverride }),
  setPhase: (phase) => set({ phase }),
  setMode: (mode) => set({ mode }),
  flyTo: (p) => set({ mode: 'orbit', goto: { ...p, id: Math.random() }, level: p.level ?? 'all', cutaway: !!p.cutaway }),
  jumpTo: (p) => set({ mode: 'orbit', goto: { ...p, jump: true, id: Math.random() }, level: p.level ?? 'all', cutaway: !!p.cutaway }),
  setLevel: (level) => set({ level }),
  setQuality: (quality) => { const gfx = { ...PRESETS_GFX[quality], fps: false }; try { localStorage.setItem('detonador.gfx', JSON.stringify(gfx)); localStorage.setItem('detonador.q', quality); } catch (e) { /* sin almacenamiento */ } set({ quality, gfx }); },
  select: (selected) => set({ selected }),
  setJoy: (joy) => set({ joy }),
  setSound: (sound) => set({ sound }),
  setChatOpen: (chatOpen) => { try { localStorage.setItem('detonador.chatOpen', chatOpen ? '1' : '0'); } catch (e) { /* sin almacenamiento */ } set({ chatOpen }); },
  setPreview: (preview) => set({ preview }),
  setAgentState: (id, patch) => set((s) => ({ agentState: { ...s.agentState, [id]: { ...s.agentState[id], ...patch } } })),
}));

// Ejemplos SOLO para evaluar el diseño visual. Sin porcentajes ni resultados.
const PREVIEW = {
  'titan-x':      { status: 'working', task: { title: 'Supervisando (ejemplo)' } },
  'viral-hunter': { status: 'working', task: { title: 'Tarea de ejemplo' } },
  'hook-master':  { status: 'working', task: { title: 'Tarea de ejemplo' } },
  'pixel-queen':  { status: 'done',    task: { title: 'Entrega de ejemplo' } },
  'filter-x':     { status: 'waiting', task: { title: 'Espera de ejemplo' } },
  'idea-storm':   { status: 'available' },
  'data-boss':    { status: 'working', alert: 'Alerta de ejemplo' },
};

/* Vista consolidada de un agente (acción de animación, luz, etc.) */
export function getAgentView(id) {
  const s = useStore.getState();
  const raw = (s.preview ? PREVIEW[id] : s.agentState[id]) || {};
  const status = raw.status || 'offline';
  const alert = raw.alert || (status === 'error' ? (raw.detail || 'Error') : null);
  const action = alert ? 'look' : status === 'working' ? 'type' : status === 'done' ? 'talk' : (status === 'waiting' || status === 'reviewing') ? 'look' : 'sit';
  return { status, st: STATUS[status] || STATUS.offline, task: raw.task || null, alert, action, active: status !== 'offline' && status !== 'available' };
}

if (typeof window !== 'undefined' && new URLSearchParams(location.search).has('debug')) window.__detonador = useStore;
