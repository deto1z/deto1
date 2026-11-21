import { create } from 'zustand';
import { STATUS } from './constants';

const mobile = typeof window !== 'undefined' &&
  (window.matchMedia?.('(pointer: coarse)').matches || window.innerWidth < 800);

export const useStore = create((set) => ({
  phase: 'intro',         // intro | enter | app
  mode: 'intro',          // intro | enter | orbit | walk | tour
  goto: null,
  level: 'all',
  quality: (typeof window !== 'undefined' && ['low', 'medium', 'high'].includes(new URLSearchParams(location.search).get('q'))) ? new URLSearchParams(location.search).get('q') : mobile ? 'low' : 'high',
  mobile,
  selected: null,
  joy: { x: 0, y: 0 },
  sound: false,
  chatOpen: false,
  preview: false,         // VISTA PREVIA DE DISEÑO (estados de ejemplo, no son tareas reales)
  /* Estado REAL de los agentes. Lo alimentará el orquestador (WebSocket) en la Fase 4.
     { [id]: { status, task:{title, progress?:0..1}, alert?:string } }  — vacío = sin conectar */
  agentState: {},
  placeOverride: 'auto',   // solo vista previa de diseño: 'auto' | 'desk' | 'meeting' | 'rest'
  setPlace: (placeOverride) => set({ placeOverride }),
  setPhase: (phase) => set({ phase }),
  setMode: (mode) => set({ mode }),
  flyTo: (p) => set({ mode: 'orbit', goto: { ...p, id: Math.random() } }),
  setLevel: (level) => set({ level }),
  setQuality: (quality) => set({ quality }),
  select: (selected) => set({ selected }),
  setJoy: (joy) => set({ joy }),
  setSound: (sound) => set({ sound }),
  setChatOpen: (chatOpen) => set({ chatOpen }),
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
  const alert = raw.alert || null;
  const action = alert ? 'look' : status === 'working' ? 'type' : status === 'done' ? 'talk' : status === 'waiting' ? 'look' : 'sit';
  return { status, st: STATUS[status] || STATUS.offline, task: raw.task || null, alert, action, active: status !== 'offline' && status !== 'available' };
}

if (typeof window !== 'undefined' && new URLSearchParams(location.search).has('debug')) window.__detonador = useStore;
