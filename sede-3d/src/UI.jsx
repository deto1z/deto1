import { useRef, useState } from 'react';
import { useStore } from './store';
import { AGENTS, PRESETS, STATUS } from './constants';

function Joystick() {
  const setJoy = useStore((s) => s.setJoy);
  const knob = useRef(), base = useRef();
  const move = (e) => {
    const r = base.current.getBoundingClientRect();
    let x = (e.clientX - r.left - r.width / 2) / (r.width / 2), y = (e.clientY - r.top - r.height / 2) / (r.height / 2);
    const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; }
    knob.current.style.transform = `translate(${x * 38}px, ${y * 38}px)`; setJoy({ x, y });
  };
  const end = () => { knob.current.style.transform = ''; setJoy({ x: 0, y: 0 }); };
  return (
    <div className="joy" ref={base} onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); move(e); }}
         onPointerMove={(e) => e.buttons && move(e)} onPointerUp={end} onPointerCancel={end}>
      <div className="knob" ref={knob} />
    </div>
  );
}

function AgentPanel() {
  const id = useStore((s) => s.selected), select = useStore((s) => s.select);
  const a = AGENTS.find((x) => x.id === id);
  if (!a) return null;
  const st = STATUS.offline;
  return (
    <aside className="panel" style={{ '--c': a.color }}>
      <button className="x" onClick={() => select(null)} aria-label="Cerrar">×</button>
      <h2>{a.name}</h2>
      <p className="role">{a.role}</p>
      <p className="status"><i style={{ background: st.color }} /> {st.label}</p>
      <h3>Funciones previstas</h3>
      <ul>{a.duties.map((d) => <li key={d}>{d}</li>)}</ul>
      <h3>Herramientas</h3>
      <ul>{a.tools.map((d) => <li key={d}>{d}</li>)}</ul>
      <h3>Tareas</h3><p className="muted">Ninguna. El agente aún no está conectado.</p>
      <h3>Historial de trabajos</h3><p className="muted">Vacío.</p>
      <p className="note">Fase 2: solo el edificio. El agente, sus tareas y su historial llegan en las Fases 3–4. No se muestra ningún resultado simulado.</p>
    </aside>
  );
}

export default function UI() {
  const { mode, setMode, level, setLevel, quality, setQuality, flyTo, mobile } = useStore();
  const [open, setOpen] = useState(!mobile);
  const act = (fn) => () => { fn(); if (mobile) setOpen(false); };
  return (
    <>
      <header className="brand">
        <b>DETONADOR</b><span>AI EMPIRE</span>
        <small>Sede virtual 3D · Fase 2 · entorno de desarrollo</small>
      </header>
      <button className="burger" onClick={() => setOpen(!open)}>{open ? '✕' : '☰'}</button>
      {open && (
        <nav className="dock">
          <div className="grp">
            <label>Vistas</label>
            <div className="row">{Object.entries(PRESETS).map(([k, p]) => (
              <button key={k} onClick={act(() => flyTo(p))}>{p.label}</button>))}</div>
          </div>
          <div className="grp">
            <label>Modo</label>
            <div className="row">
              <button className={mode === 'orbit' ? 'on' : ''} onClick={act(() => setMode('orbit'))}>Orbitar</button>
              <button className={mode === 'walk' ? 'on' : ''} onClick={act(() => setMode('walk'))}>Caminar</button>
              <button className={mode === 'tour' ? 'on' : ''} onClick={act(() => setMode('tour'))}>Recorrido cine</button>
            </div>
          </div>
          <div className="grp">
            <label>Plantas</label>
            <div className="row">{[['all', 'Todo'], ['1', 'Planta 1'], ['2', 'Planta 2']].map(([k, l]) => (
              <button key={k} className={level === k ? 'on' : ''} onClick={act(() => setLevel(k))}>{l}</button>))}</div>
          </div>
          <div className="grp">
            <label>Calidad</label>
            <div className="row">{[['high', 'Alta'], ['medium', 'Media'], ['low', 'Baja']].map(([k, l]) => (
              <button key={k} className={quality === k ? 'on' : ''} onClick={() => setQuality(k)}>{l}</button>))}</div>
          </div>
        </nav>
      )}
      <div className="hint">
        {mode === 'orbit' && (mobile ? 'Arrastra para girar · pellizca para zoom · toca un escritorio' : 'Arrastra: girar 360° · Rueda: zoom · Clic derecho: mover · Clic en un escritorio: ver agente')}
        {mode === 'walk' && (mobile ? 'Joystick: moverte · Arrastra: mirar' : 'W A S D / flechas: moverte · Arrastra: mirar · Shift: correr · Esc: salir')}
        {mode === 'tour' && 'Recorrido cinematográfico · toca o mueve la cámara para tomar el control'}
      </div>
      {mode === 'walk' && mobile && <Joystick />}
      <AgentPanel />
    </>
  );
}
