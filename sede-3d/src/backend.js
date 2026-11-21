import { create } from 'zustand';
import { useStore } from './store';

/* Cliente del backend (Fase 3). Las claves de API NUNCA pasan por aquí: viven solo en el servidor.
   Si no hay backend (p. ej. la versión web de demostración), la app sigue funcionando en modo visual local. */
export const useSrv = create(() => ({
  status: 'unknown',            // unknown | absent | login | connected
  user: null, csrf: null, tasks: [], proposals: [], conversations: [], activeConv: null, messages: {}, costs: null, sys: null, authz: null, routines: null, prefs: [], agents: [], toast: null, tab: 'chat',
}));
const set = (p) => useSrv.setState(typeof p === 'function' ? p(useSrv.getState()) : p);
const get = () => useSrv.getState();
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('timeout')), ms))]);

async function http(method, url, body, isForm = false) {
  const res = await fetch(url, { method, credentials: 'same-origin', headers: { ...(body && !isForm ? { 'content-type': 'application/json' } : {}), ...(method !== 'GET' && get().csrf ? { 'x-csrf-token': get().csrf } : {}) }, body: isForm ? body : body ? JSON.stringify(body) : undefined });
  if (!(res.headers.get('content-type') || '').includes('json')) throw new Error('no-json');
  const data = await res.json(); if (!res.ok) throw Object.assign(new Error(data.error || res.statusText), { status: res.status }); return data;
}
export const api = { get: (u) => http('GET', u), post: (u, b) => http('POST', u, b ?? {}), put: (u, b) => http('PUT', u, b), del: (u) => http('DELETE', u), upload: (form) => http('POST', '/api/uploads', form, true) };

export async function initBackend() {
  try { const h = await withTimeout(http('GET', '/api/health'), 8000); if (!h.ok) throw new Error('x'); } catch { set({ status: 'absent' }); return; }
  try { const me = await api.get('/api/me'); set({ status: 'connected', user: me.user, csrf: me.csrf }); await loadAll(); startEvents(); } catch { set({ status: 'login' }); }
}
export async function login(username, password) { const r = await http('POST', '/api/auth/login', { username, password }); set({ user: r.user, csrf: r.csrf, status: 'connected' }); await loadAll(); startEvents(); }
export async function logout() { try { await api.post('/api/auth/logout'); } catch { /* sesión ya cerrada */ } es?.close(); useStore.setState({ agentState: {} }); set({ status: 'login', user: null, csrf: null }); }

export async function loadAll() {
  const [conversations, st, tasks, proposals, costs, routines, prefs, authz, agents] = await Promise.all(['/api/conversations', '/api/status', '/api/tasks', '/api/proposals', '/api/costs', '/api/routines', '/api/preferences', '/api/authorizations', '/api/agents'].map((u) => api.get(u).catch(() => null)));
  set({ conversations: conversations ?? [], sys: st, tasks: tasks ?? [], proposals: proposals ?? [], costs, routines, prefs: prefs ?? [], authz, agents: agents ?? [] });
  if (st?.agents) applyAgents(st.agents);
  if (!get().activeConv) { if (conversations?.[0]) await selectConv(conversations[0].id); else await newConv(); }
}
export async function selectConv(id) { const m = await api.get(`/api/conversations/${id}/messages`); set((s) => ({ activeConv: id, messages: { ...s.messages, [id]: m } })); }
export async function newConv(title) { const { id } = await api.post('/api/conversations', { title: title ?? 'Nueva conversación' }); set({ conversations: await api.get('/api/conversations') }); await selectConv(id); return id; }
export const refresh = {
  proposals: async () => set({ proposals: await api.get('/api/proposals') }),
  tasks: async () => set({ tasks: await api.get('/api/tasks') }),
  costs: async () => set({ costs: await api.get('/api/costs'), sys: await api.get('/api/status') }),
  authz: async () => set({ authz: await api.get('/api/authorizations'), sys: await api.get('/api/status') }),
  routines: async () => set({ routines: await api.get('/api/routines') }),
  prefs: async () => set({ prefs: await api.get('/api/preferences') }),
};

function applyAgents(list) { for (const a of list) applyAgent(a.agent ?? a.agent, a); }
function applyAgent(agent, e) {
  useStore.getState().setAgentState(agent, { status: e.status, task: e.title ? { title: e.title, ...(typeof e.steps === 'number' ? { steps: e.steps } : {}) } : null, alert: null, detail: e.status === 'error' ? e.detail : null });
}
let es = null, costTimer = null;
function startEvents() {
  es?.close(); es = new EventSource('/api/events');
  es.onmessage = (m) => {
    let e; try { e = JSON.parse(m.data); } catch { return; }
    if (e.type === 'snapshot') { applyAgents(e.agents ?? []); set({ tasks: e.tasks ?? get().tasks }); }
    else if (e.type === 'agent_state') applyAgent(e.agent, e);
    else if (e.type === 'task') refresh.tasks();
    else if (e.type === 'message') set((s) => ({ messages: { ...s.messages, [e.conversation_id]: [...(s.messages[e.conversation_id] ?? []).filter((x) => x.id !== e.id), e] } }));
    else if (e.type === 'proposal') refresh.proposals();
    else if (e.type === 'cost') { clearTimeout(costTimer); costTimer = setTimeout(() => refresh.costs().catch(() => {}), 800); }
    else if (e.type === 'alert') set({ toast: `⚠ ${e.message}` });
  };
  es.onerror = () => { /* EventSource reintenta solo */ };
}

useSrv.subscribe((s, p) => { if (s.toast && s.toast !== p.toast) { useStore.setState({ toast: s.toast }); set({ toast: null }); } });
