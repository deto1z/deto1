import { create } from 'zustand';

/* Conversación privada con TITAN X + cola de órdenes.
   Todo se guarda localmente (localStorage). Hasta que exista el orquestador (Fase 4),
   las órdenes quedan "pendientes de envío": NO se ejecutan ni se simulan respuestas de TITAN X. */
const KEY = 'detonador.chat.v1';
const uid = () => Math.random().toString(36).slice(2, 10);
const load = () => { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s?.conversations?.length) return s; } catch (e) { /* vacío */ } return null; };
const blank = () => ({ id: uid(), title: 'Nueva conversación', ts: Date.now(), messages: [] });
const init = load() ?? (() => { const c = blank(); return { conversations: [c], activeId: c.id, orders: [], approvals: [] }; })();

export const ORCH_CONNECTED = false;   // pasa a true cuando exista el backend (Fase 4)

export const useChat = create((set, get) => ({
  ...init,
  speak: false,
  persist() { try { const { conversations, activeId, orders, approvals } = get(); localStorage.setItem(KEY, JSON.stringify({ conversations, activeId, orders, approvals })); } catch (e) { /* sin almacenamiento */ } },
  newConv() { const c = blank(); set((s) => ({ conversations: [c, ...s.conversations], activeId: c.id })); get().persist(); },
  select(id) { set({ activeId: id }); get().persist(); },
  deleteConv(id) {
    set((s) => { let cs = s.conversations.filter((c) => c.id !== id); if (!cs.length) cs = [blank()]; return { conversations: cs, activeId: cs.find((c) => c.id === s.activeId)?.id ?? cs[0].id }; });
    get().persist();
  },
  setSpeak(speak) { set({ speak }); },
  send(text, files = []) {
    const { activeId } = get(), ts = Date.now();
    const msg = { id: uid(), from: 'user', text, ts, attachments: files.map((f) => ({ name: f.name, size: f.size, type: f.type })) };
    const reply = ORCH_CONNECTED ? null : { id: uid(), from: 'sistema', ts: ts + 1,
      text: 'Orden guardada en la cola local. El orquestador de TITAN X todavía no está conectado (Fase 4), así que no se asignó a ningún agente ni se ejecutó nada. Quedará pendiente de envío.' };
    const order = { id: uid(), convId: activeId, text, ts, status: 'pendiente_envio', attachments: msg.attachments.length };
    set((s) => ({
      conversations: s.conversations.map((c) => c.id !== activeId ? c : { ...c, title: c.messages.length ? c.title : text.slice(0, 40) || 'Conversación', messages: [...c.messages, msg, ...(reply ? [reply] : [])] }),
      orders: [order, ...s.orders],
    }));
    get().persist();
    return reply;
  },
  // Botón "Detener tareas": cancela todo lo pendiente/activo. (Con backend, también enviará la orden de parada.)
  stopAll() {
    const n = get().orders.filter((o) => o.status === 'pendiente_envio').length;
    set((s) => ({ orders: s.orders.map((o) => o.status === 'pendiente_envio' ? { ...o, status: 'cancelada' } : o) }));
    get().persist(); return n;
  },
  // Aprobaciones: las llenará el orquestador cuando haya resultados reales
  decide(id, decision) { set((s) => ({ approvals: s.approvals.map((a) => a.id === id ? { ...a, decision } : a) })); get().persist(); },
}));
