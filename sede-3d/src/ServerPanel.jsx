import { useEffect, useRef, useState } from 'react';
import { useSrv, api, login, logout, selectConv, newConv, refresh } from './backend';

const fmtT = (s) => new Date(s).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
const usd = (n) => `$${(+n || 0).toFixed(n < 0.1 && n > 0 ? 4 : 2)}`;
const guard = (fn) => async (...a) => { try { await fn(...a); } catch (e) { useSrv.setState({ toast: `⚠ ${e.message}` }); } };
const STCOL = { queued: '#6b7088', working: '#2f7bff', reviewing: '#ffc531', done: '#b45bff', error: '#ff3b4d', cancelled: '#6b7088' };
const STLAB = { queued: 'En cola', working: 'Trabajando', reviewing: 'Revisando', done: 'Completada', error: 'Error', cancelled: 'Cancelada' };

export function LoginForm() {
  const [u, setU] = useState(''), [p, setP] = useState(''), [err, setErr] = useState('');
  const go = async () => { try { await login(u, p); setErr(''); } catch (e) { setErr(e.message); } };
  return (
    <div className="list">
      <h4>Acceso privado</h4>
      <p className="note">El servidor está activo. Inicia sesión con el usuario creado con <code>npm run setup-owner</code>.</p>
      <input value={u} placeholder="Usuario" autoComplete="username" onChange={(e) => setU(e.target.value)} />
      <input value={p} type="password" placeholder="Contraseña" autoComplete="current-password" onChange={(e) => setP(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go()} />
      {err && <p className="note" style={{ color: '#ff6b7a' }}>{err}</p>}
      <button className="send" onClick={go}>Entrar</button>
    </div>
  );
}

function Chat() {
  const { activeConv, messages, sys } = useSrv();
  const msgs = messages[activeConv] ?? [];
  const [text, setText] = useState(''), [busy, setBusy] = useState(false), [files, setFiles] = useState([]);
  const end = useRef(), fileIn = useRef();
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [msgs.length]);
  const submit = guard(async () => {
    if (!text.trim() && !files.length) return; setBusy(true);
    try {
      const uploadIds = [];
      for (const f of files) { const fd = new FormData(); fd.append('file', f); uploadIds.push((await api.upload(fd)).id); }
      const t = text; setText(''); setFiles([]);
      await api.post(`/api/conversations/${activeConv}/messages`, { text: t, uploadIds });
    } finally { setBusy(false); }
  });
  const roleName = { owner: 'user', titan: 'titan', system: 'sistema' };
  return (
    <>
      {sys && !Object.values(sys.providers ?? {}).some((p) => p.configured && p.authorized) && <p className="note">⚠ Ningún proveedor de IA está autorizado y configurado. TITAN X no puede pensar todavía: tus mensajes se guardan, pero no se ejecuta ni se simula nada. Ve a «Costos» → autorizaciones.</p>}
      <div className="msgs">
        {!msgs.length && <p className="empty">Habla con TITAN X, Jefe. Las respuestas y tareas son reales: si algo no puede ejecutarse, te lo dirá.</p>}
        {msgs.map((m) => (
          <div key={m.id} className={`msg ${roleName[m.role] ?? 'sistema'}`}>
            <div className="bubble">{m.role === 'system' && <b className="tag">SISTEMA</b>}<p style={{ whiteSpace: 'pre-wrap' }}>{m.content}</p>
              {m.attachments?.files?.map((a) => <span key={a.id} className="chip">📎 {a.original_name}</span>)}</div>
            <small>{fmtT(m.created_at)}</small>
          </div>
        ))}
        <div ref={end} />
      </div>
      {files.length > 0 && <div className="files">{files.map((f, i) => <span key={i} className="chip">📎 {f.name} <a onClick={() => setFiles(files.filter((_, j) => j !== i))}>×</a></span>)}</div>}
      <div className="composer">
        <input ref={fileIn} type="file" hidden onChange={(e) => { setFiles([...files, ...e.target.files]); e.target.value = ''; }} />
        <button title="Adjuntar (validado por el servidor)" onClick={() => fileIn.current.click()}>📎</button>
        <textarea rows={2} value={text} placeholder="Escribe tu orden para TITAN X…" onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }} />
        <button className="send" disabled={busy} onClick={submit}>{busy ? '…' : 'Enviar'}</button>
      </div>
    </>
  );
}

function Tasks() {
  const tasks = useSrv((s) => s.tasks);
  return (
    <div className="list">
      {!tasks.length && <p className="empty">Sin tareas todavía. Aquí aparecen solo tareas reales creadas por TITAN X.</p>}
      {tasks.map((t) => (
        <div key={t.id} className="card"><p><b>#{t.id}</b> · {t.agent} · {t.title}</p>
          <small><i style={{ background: STCOL[t.status] ?? '#888' }} /> {STLAB[t.status] ?? t.status} · pasos {t.steps ?? 0} · herramientas {t.tool_calls ?? 0} · {usd(t.cost_usd)}{t.error ? ` · ${t.error}` : ''}</small>
          {['queued', 'working', 'reviewing'].includes(t.status) && <a onClick={guard(async () => { await api.post(`/api/tasks/${t.id}/cancel`); refresh.tasks(); })}>Cancelar</a>}
        </div>
      ))}
    </div>
  );
}

function Proposal({ p }) {
  const d = p.data ?? {}; const [notes, setNotes] = useState(''), [open, setOpen] = useState(false);
  const decide = (decision) => guard(async () => { await api.post(`/api/proposals/${p.id}/decision`, { decision, notes }); refresh.proposals(); })();
  const src = d.verified_sources?.[0];
  return (
    <div className="card">
      <h4>#{p.id} · {d.topic}</h4>
      <small>Estado: {p.status} · {d.publish_status}</small>
      <p>{d.why_it_works}</p>
      {src && <p><a href={src.url} target="_blank" rel="noreferrer">{src.source} · {src.title}</a> <small>({src.published_at})</small></p>}
      <small>Plataforma: {d.platform} · Horario sugerido: {d.schedule?.day} {d.schedule?.slot} ({d.schedule?.timezone})</small>
      <a onClick={() => setOpen(!open)}>{open ? 'Ocultar detalle' : 'Ver ganchos, guiones, títulos y portada'}</a>
      {open && <div>
        <h5>Ganchos</h5>{d.hooks?.map((h) => <p key={h.id}>• {h.text ?? JSON.stringify(h)}</p>)}
        <h5>Títulos</h5>{d.titles?.map((h) => <p key={h.id}>• {h.text ?? JSON.stringify(h)}</p>)}
        <h5>Guiones</h5>{d.scripts?.map((h) => <p key={h.id}><b>{h.duration_sec}s</b> — {h.text ?? JSON.stringify(h)}</p>)}
        {d.ctas?.length > 0 && <><h5>CTA</h5>{d.ctas.map((h) => <p key={h.id}>• {h.text}</p>)}</>}
        <h5>Portada / visual</h5><p>{d.visual?.concept}</p>
        {d.visual?.svg && <img alt="Portada propuesta" style={{ width: '100%', borderRadius: 8 }} src={`data:image/svg+xml;utf8,${encodeURIComponent(d.visual.svg)}`} />}
      </div>}
      {p.status === 'pending' && <>
        <input value={notes} placeholder="Notas (para Mejorar/Rechazar)" onChange={(e) => setNotes(e.target.value)} />
        <div className="row"><button className="ok" onClick={() => decide('approve')}>Aprobar</button><button onClick={() => decide('improve')}>Mejorar</button><button onClick={() => decide('reject')}>Rechazar</button></div>
        <small>Aprobar NO publica nada: la publicación no existe en esta fase.</small></>}
    </div>
  );
}
const Approvals = () => { const ps = useSrv((s) => s.proposals); return <div className="list">{!ps.length && <p className="empty">No hay propuestas. Cuando TITAN X cierre un ciclo real aparecerán aquí. <b>Nada se publica automáticamente.</b></p>}{ps.map((p) => <Proposal key={p.id} p={p} />)}</div>; };

function Costs() {
  const { costs: c, sys, authz } = useSrv(); const [b, setB] = useState(null), [typed, setTyped] = useState({});
  if (!c) return <div className="list"><p className="empty">Cargando…</p></div>;
  const bud = b ?? c.budget;
  const save = guard(async () => { await api.put('/api/budget', bud); setB(null); refresh.costs(); });
  const kill = guard(async () => { await api.post('/api/kill-switch', { on: !c.killSwitch, reason: 'manual' }); refresh.costs(); });
  const grant = (kind, name) => guard(async () => { await api.post('/api/authorizations', { kind, name, confirm: typed[`${kind}.${name}`] }); refresh.authz(); refresh.costs(); })();
  const revoke = (kind, name) => guard(async () => { await api.del(`/api/authorizations/${kind}/${name}`); refresh.authz(); })();
  const granted = (k, n) => authz?.granted?.some((g) => g.kind === k && g.name === n);
  return (
    <div className="list">
      <div className="kpis"><div><b>{usd(c.spentToday)}</b><span>Hoy / límite {usd(c.budget.dailyUsd)}</span></div><div><b>{usd(c.spentMonth)}</b><span>Mes / límite {usd(c.budget.monthlyUsd)}</span></div></div>
      <button className={c.killSwitch ? 'ok' : 'stop'} onClick={kill}>{c.killSwitch ? '▶ Reanudar IA (interruptor apagado)' : '⏹ INTERRUPTOR DE EMERGENCIA: bloquear todo gasto'}</button>
      <h4>Límites (USD)</h4>
      {[['perTaskUsd', 'Por tarea'], ['perRunUsd', 'Por ciclo'], ['dailyUsd', 'Diario'], ['monthlyUsd', 'Mensual']].map(([k, l]) => (
        <label key={k} className="tz">{l} <input type="number" min="0" step="0.1" value={bud[k]} onChange={(e) => setB({ ...bud, [k]: +e.target.value })} /></label>))}
      {b && <button className="send" onClick={save}>Guardar límites</button>}
      <h4>Gasto por agente</h4>
      {c.byAgent.length ? c.byAgent.map((a) => <p key={a.agent}>{a.agent}: {usd(a.usd)} · {a.calls} llamadas</p>) : <p className="note">Sin gasto registrado.</p>}
      <h4>Autorizaciones</h4>
      <p className="note">Nada de pago se activa sin tu autorización explícita y sin la clave en el servidor (.env). Escribe AUTORIZO para confirmar.</p>
      {authz && Object.entries(authz.catalog).flatMap(([kind, items]) => Object.entries(items).map(([name, label]) => (
        <div key={`${kind}.${name}`} className="card"><p><b>{kind}:{name}</b> — {label}</p>
          {granted(kind, name) ? <><small>✅ Autorizado</small> <a onClick={() => revoke(kind, name)}>Revocar</a></> : (
            <div className="row"><input placeholder="AUTORIZO" value={typed[`${kind}.${name}`] ?? ''} onChange={(e) => setTyped({ ...typed, [`${kind}.${name}`]: e.target.value })} /><button onClick={() => grant(kind, name)}>Autorizar</button></div>)}
        </div>)))}
      {sys && <p className="note">Proveedores: {Object.entries(sys.providers ?? {}).map(([n, p]) => `${n}: ${p.configured && p.authorized ? 'usable' : p.configured ? 'configurado, sin autorizar' : 'sin clave en el servidor'}`).join(' · ') || '—'}</p>}
    </div>
  );
}

function Routines() {
  const r = useSrv((s) => s.routines);
  const upd = (id, patch) => guard(async () => { await api.put(`/api/routines/${id}`, patch); refresh.routines(); })();
  if (!r) return <div className="list"><p className="empty">Cargando…</p></div>;
  return (
    <div className="list">
      {r.routines.map((x) => (
        <div key={x.id} className="card"><div className="row between"><b>{x.name}</b><input type="time" value={x.time_hhmm} onChange={(e) => e.target.value && upd(x.id, { time: e.target.value })} /></div>
          <p>{x.focus}</p><small>{x.timezone} · próxima: {new Date(x.next_run_utc).toLocaleString('es', { timeZone: x.timezone })}</small>
          <label className="check"><input type="checkbox" checked={x.enabled} onChange={(e) => upd(x.id, { enabled: e.target.checked })} /> Ejecución automática {r.automationAuthorized ? '' : '(requiere autorizar «automation:routines» en Costos)'}</label></div>))}
    </div>
  );
}

function Memory() {
  const { prefs, conversations, activeConv } = useSrv(); const [k, setK] = useState(''), [v, setV] = useState('');
  return (
    <div className="list">
      <button className="send" onClick={guard(newConv)}>+ Nueva conversación</button>
      {conversations.map((c) => <div key={c.id} className={`card hist ${c.id === activeConv ? 'cur' : ''}`} onClick={() => selectConv(c.id)}><p>{c.title}</p><small>{new Date(c.updated_at).toLocaleString('es')}</small></div>)}
      <h4>Preferencias que TITAN X recuerda</h4>
      {!prefs.length && <p className="note">Aún no hay preferencias guardadas.</p>}
      {prefs.map((p) => <div key={p.key} className="card"><p><b>{p.key}</b>: {p.value}</p><a onClick={guard(async () => { await api.del(`/api/preferences/${encodeURIComponent(p.key)}`); refresh.prefs(); })}>Olvidar</a></div>)}
      <div className="row"><input placeholder="clave" value={k} onChange={(e) => setK(e.target.value)} /><input placeholder="valor" value={v} onChange={(e) => setV(e.target.value)} /><button onClick={guard(async () => { await api.put('/api/preferences', { key: k, value: v }); setK(''); setV(''); refresh.prefs(); })}>Guardar</button></div>
    </div>
  );
}

export default function ServerPanel() {
  const { tasks, proposals, tab, user, sys } = useSrv();
  const setTab = (t) => useSrv.setState({ tab: t });
  const open = tasks.filter((t) => ['queued', 'working', 'reviewing'].includes(t.status)).length, pend = proposals.filter((p) => p.status === 'pending').length;
  const tabs = [['chat', 'Chat'], ['tareas', `Tareas${open ? ` (${open})` : ''}`], ['aprob', `Aprobar${pend ? ` (${pend})` : ''}`], ['costos', 'Costos'], ['rutina', 'Rutinas'], ['mem', 'Memoria']];
  return (
    <>
      <nav>{tabs.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}<button onClick={logout} title={`Sesión: ${user ?? ''}`}>Salir</button></nav>
      {sys?.killSwitch && <p className="note" style={{ color: '#ff6b7a' }}>⏹ Interruptor de emergencia ACTIVO: ninguna llamada de IA se ejecuta.</p>}
      <div className="body">{tab === 'chat' && <Chat />}{tab === 'tareas' && <Tasks />}{tab === 'aprob' && <Approvals />}{tab === 'costos' && <Costs />}{tab === 'rutina' && <Routines />}{tab === 'mem' && <Memory />}</div>
    </>
  );
}
export const serverBadge = () => { const s = useSrv.getState(); return { open: s.tasks.filter((t) => ['queued', 'working', 'reviewing'].includes(t.status)).length, pend: s.proposals.filter((p) => p.status === 'pending').length }; };
