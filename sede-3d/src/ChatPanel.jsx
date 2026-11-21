import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from './store';
import { useChat, ORCH_CONNECTED } from './chatStore';
import ServerPanel, { LoginForm } from './ServerPanel';
import { useSrv, refresh, api } from './backend';
import { AUTOMATION_AVAILABLE, loadSchedule, saveSchedule, nextRun, formatRun, fmtCountdown } from './schedule';

const SR = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
const fmtT = (ts) => new Date(ts).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
const fmtSize = (b) => (b > 1e6 ? (b / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1e3)) + ' KB');

function speakText(text) {
  try {
    const u = new SpeechSynthesisUtterance(text); u.lang = 'es-ES'; u.rate = 0.98; u.pitch = 0.85;
    const v = speechSynthesis.getVoices().find((x) => /^es/i.test(x.lang) && /natural|neural|online|google/i.test(x.name)) || speechSynthesis.getVoices().find((x) => /^es/i.test(x.lang));
    if (v) u.voice = v; speechSynthesis.cancel(); speechSynthesis.speak(u);
  } catch (e) { /* sin síntesis de voz */ }
}

function Chat() {
  const { conversations, activeId, send, speak, setSpeak } = useChat();
  const conv = conversations.find((c) => c.id === activeId);
  const [text, setText] = useState(''), [files, setFiles] = useState([]), [listening, setListening] = useState(false);
  const end = useRef(), rec = useRef(), fileIn = useRef();
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [conv?.messages.length]);
  const submit = () => {
    if (!text.trim() && !files.length) return;
    const r = send(text.trim(), files); setText(''); setFiles([]);
    if (speak && r) speakText(r.text);
  };
  const toggleMic = () => {
    if (!SR) return;
    if (listening) { rec.current?.stop(); return; }
    const r = new SR(); r.lang = 'es-ES'; r.interimResults = true; r.continuous = false;
    r.onresult = (e) => setText(Array.from(e.results).map((x) => x[0].transcript).join(' '));
    r.onend = () => setListening(false); r.onerror = () => setListening(false);
    rec.current = r; r.start(); setListening(true);
  };
  return (
    <>
      <div className="msgs">
        {!conv.messages.length && <p className="empty">Habla con TITAN X. Él es tu único interlocutor: coordina a los seis agentes y te presenta los resultados para tu aprobación antes de publicar nada.</p>}
        {conv.messages.map((m) => (
          <div key={m.id} className={`msg ${m.from}`}>
            <div className="bubble">
              {m.from === 'sistema' && <b className="tag">SISTEMA</b>}
              {m.text && <p>{m.text}</p>}
              {m.attachments?.map((a, i) => <span key={i} className="chip">📎 {a.name} · {fmtSize(a.size)}</span>)}
            </div>
            <small>{fmtT(m.ts)}</small>
          </div>
        ))}
        <div ref={end} />
      </div>
      {files.length > 0 && <div className="files">{files.map((f, i) => <span key={i} className="chip">📎 {f.name} <a onClick={() => setFiles(files.filter((_, j) => j !== i))}>×</a></span>)}</div>}
      <div className="composer">
        <input ref={fileIn} type="file" multiple hidden onChange={(e) => { setFiles([...files, ...e.target.files]); e.target.value = ''; }} />
        <button title="Adjuntar archivos" onClick={() => fileIn.current.click()}>📎</button>
        <textarea rows={2} value={text} placeholder="Escribe tu orden para TITAN X…" onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }} />
        <button className={listening ? 'on' : ''} disabled={!SR} title={SR ? 'Dictar por voz (es-ES)' : 'Tu navegador no soporta entrada de voz (usa Chrome o Edge)'} onClick={toggleMic}>{listening ? '⏺' : '🎤'}</button>
        <button className="send" onClick={submit}>Enviar</button>
      </div>
      <label className="check"><input type="checkbox" checked={speak} onChange={(e) => setSpeak(e.target.checked)} /> Leer respuestas en voz alta (voz del navegador, español)</label>
    </>
  );
}

function Orders() {
  const orders = useChat((s) => s.orders);
  const label = { pendiente_envio: ['Pendiente de envío', '#ffc531'], cancelada: ['Cancelada', '#6b7088'] };
  return (
    <div className="list">
      {!ORCH_CONNECTED && <p className="note">El orquestador no está conectado: las órdenes se guardan aquí, pero ningún agente las ejecuta todavía.</p>}
      {!orders.length && <p className="empty">Sin órdenes todavía.</p>}
      {orders.map((o) => (
        <div key={o.id} className="card"><p>{o.text || '(solo archivos adjuntos)'}</p>
          <small><i style={{ background: label[o.status][1] }} /> {label[o.status][0]} · {fmtT(o.ts)}{o.attachments ? ` · ${o.attachments} adjunto(s)` : ''}</small></div>
      ))}
    </div>
  );
}

function Approvals() {
  const { approvals, decide } = useChat();
  return (
    <div className="list">
      {!approvals.length && <p className="empty">No hay resultados esperando tu aprobación.<br />Cuando TITAN X te entregue propuestas reales (videos, portadas, textos) aparecerán aquí. <b>Nada se publica sin tu aprobación explícita.</b></p>}
      {approvals.map((a) => (
        <div key={a.id} className="card"><h4>{a.title}</h4><p>{a.summary}</p>
          {a.sources?.map((s, i) => <a key={i} href={s.url} target="_blank" rel="noreferrer">{s.url} · {s.date}</a>)}
          {!a.decision ? <div className="row"><button className="ok" onClick={() => decide(a.id, 'aprobado')}>Aprobar</button><button onClick={() => decide(a.id, 'correccion')}>Pedir corrección</button><button onClick={() => decide(a.id, 'rechazado')}>Rechazar</button></div> : <small>Decisión: {a.decision}</small>}
        </div>
      ))}
    </div>
  );
}

function Summary() {
  const { orders, approvals } = useChat();
  const sched = loadSchedule();
  const today = new Date().toDateString();
  const todays = orders.filter((o) => new Date(o.ts).toDateString() === today);
  const rows = [['Órdenes de hoy', todays.length], ['Pendientes de envío', orders.filter((o) => o.status === 'pendiente_envio').length], ['Esperando tu aprobación', approvals.filter((a) => !a.decision).length], ['Tareas completadas por agentes', '—'], ['Videos / propuestas entregadas', '—']];
  return (
    <div className="list">
      <h4>Resumen ejecutivo · {new Intl.DateTimeFormat('es', { dateStyle: 'full', timeZone: sched.timezone }).format(new Date())}</h4>
      <div className="kpis">{rows.map(([k, v]) => <div key={k}><b>{v}</b><span>{k}</span></div>)}</div>
      <p className="note">Las cifras con «—» solo existirán cuando haya agentes reales ejecutando tareas. Este resumen no inventa datos de rendimiento.</p>
    </div>
  );
}

function Routine() {
  const [s, setS] = useState(loadSchedule), [, tick] = useState(0);
  useEffect(() => { const i = setInterval(() => tick((n) => n + 1), 30000); return () => clearInterval(i); }, []);
  const upd = (id, patch) => { const n = { ...s, meetings: s.meetings.map((m) => m.id === id ? { ...m, ...patch } : m) }; setS(n); saveSchedule(n); };
  const zones = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Mexico_City', 'America/Bogota', 'America/Santiago', 'America/Argentina/Buenos_Aires', 'Europe/Madrid', 'UTC'];
  return (
    <div className="list">
      <label className="tz">Zona horaria <select value={s.timezone} onChange={(e) => { const n = { ...s, timezone: e.target.value }; setS(n); saveSchedule(n); }}>{zones.map((z) => <option key={z}>{z}</option>)}</select></label>
      {s.meetings.map((m) => {
        const nx = nextRun(m.time, s.timezone);
        return (
          <div key={m.id} className="card">
            <div className="row between"><b>{m.label}</b><input type="time" value={m.time} onChange={(e) => e.target.value && upd(m.id, { time: e.target.value })} /></div>
            <p>{m.focus}</p>
            <small>Próxima: {formatRun(nx, s.timezone)} · en {fmtCountdown(nx - Date.now())}</small>
            <label className="check lock"><input type="checkbox" checked={false} disabled /> Automatización {AUTOMATION_AVAILABLE ? '' : 'BLOQUEADA'}</label>
          </div>
        );
      })}
      <p className="note">Las reuniones automáticas permanecen <b>inactivas</b> hasta que las herramientas reales estén conectadas y tú las autorices (Fase 5). Los horarios sí se pueden ajustar desde ya.</p>
    </div>
  );
}

function History() {
  const { conversations, activeId, select, newConv, deleteConv } = useChat();
  return (
    <div className="list">
      <button className="send" onClick={newConv}>+ Nueva conversación</button>
      {conversations.map((c) => (
        <div key={c.id} className={`card hist ${c.id === activeId ? 'cur' : ''}`} onClick={() => select(c.id)}>
          <p>{c.title}</p><small>{new Date(c.ts).toLocaleDateString('es')} · {c.messages.filter((m) => m.from === 'user').length} mensajes tuyos</small>
          <a onClick={(e) => { e.stopPropagation(); deleteConv(c.id); }}>Eliminar</a>
        </div>
      ))}
    </div>
  );
}

export default function ChatPanel() {
  const { chatOpen, setChatOpen, phase } = useStore();
  const [tab, setTab] = useState('chat'), [stopMsg, setStopMsg] = useState(null);
  const { orders, approvals, stopAll } = useChat();
  const srv = useSrv((s) => s.status), srvTasks = useSrv((s) => s.tasks), srvProps = useSrv((s) => s.proposals);
  const live = srv === 'connected';
  const pend = live ? srvTasks.filter((t) => ['queued', 'working', 'reviewing'].includes(t.status)).length : orders.filter((o) => o.status === 'pendiente_envio').length;
  const appr = live ? srvProps.filter((p) => p.status === 'pending').length : approvals.filter((a) => !a.decision).length;
  if (phase !== 'app') return null;
  const tabs = [['chat', 'Chat'], ['ordenes', `Órdenes${pend ? ` (${pend})` : ''}`], ['aprob', `Aprobar${appr ? ` (${appr})` : ''}`], ['resumen', 'Resumen'], ['rutina', 'Rutina'], ['hist', 'Historial']];
  const stop = async () => {
    if (stopMsg !== 'confirm') { setStopMsg('confirm'); setTimeout(() => setStopMsg((m) => (m === 'confirm' ? null : m)), 4000); return; }   // doble clic: confirm() no existe en el visor
    let n; if (live) { try { n = (await api.post('/api/stop-all')).cancelled; refresh.tasks(); } catch { n = 0; } } else n = stopAll();
    setStopMsg(n ? `${n} cancelada(s)` : 'Nada que detener'); setTimeout(() => setStopMsg(null), 2500);
  };
  return (
    <>
      <button className="titan-fab" onClick={() => setChatOpen(!chatOpen)}><b>TX</b> {chatOpen ? 'Cerrar' : 'Hablar con TITAN X'}{!chatOpen && (pend + appr > 0) && <i>{pend + appr}</i>}</button>
      {chatOpen && (
        <section className="chat">
          <header><div className="av">TX</div><div><h3>TITAN X</h3><small>CEO · tu único interlocutor · {live ? 'servidor conectado' : srv === 'login' ? 'servidor: inicia sesión' : 'modo visual local · sin servidor'}</small></div>
            <button className="stop" onClick={stop} title="Detener todas las tareas">{stopMsg === 'confirm' ? '¿Seguro? Clic otra vez' : stopMsg ?? '⏹ Detener'}</button></header>
          {srv === 'login' ? <div className="body"><LoginForm /></div> : live ? <ServerPanel /> : <>
          <nav>{tabs.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</nav>
          <div className="body">{tab === 'chat' && <Chat />}{tab === 'ordenes' && <Orders />}{tab === 'aprob' && <Approvals />}{tab === 'resumen' && <Summary />}{tab === 'rutina' && <Routine />}{tab === 'hist' && <History />}</div></>}
        </section>
      )}
    </>
  );
}
