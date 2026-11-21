import { useRef, useState } from 'react';
import { useStore } from './store';
import { AGENTS, PRESETS, WORKER_VIEWS } from './constants';
import { getAgentView } from './store';

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
  const v = useStore((x) => { void x.preview; void x.agentState; return getAgentView(a.id); }), st = v.st;
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
      <h3>Tarea actual</h3><p className="muted">{v.task ? v.task.title : 'Ninguna. El agente aún no está conectado.'}</p>{v.alert && <p className="alertline">⚠ {v.alert}</p>}
      <h3>Historial de trabajos</h3><p className="muted">Vacío.</p>
      <p className="note">Fase 2: solo el edificio. El agente, sus tareas y su historial llegan en las Fases 3–4. No se muestra ningún resultado simulado.</p>
    </aside>
  );
}

function GraphicsPanel({ onClose }) {
  const { quality, setQuality, gfx, setGfxOpt } = useStore();
  const Opt = ({ k, l, hint }) => <label className="opt"><input type="checkbox" checked={gfx[k]} onChange={(e) => setGfxOpt(k, e.target.checked)} /> {l}<small>{hint}</small></label>;
  return (
    <div className="credits" onClick={onClose}><div onClick={(e) => e.stopPropagation()}>
      <h3>Opciones gráficas</h3>
      <p>Calidad general (ajusta todo a la vez)</p>
      <div className="row">{[['high', 'Alta'], ['medium', 'Media'], ['low', 'Baja'], ['min', 'Mínima']].map(([k, l]) => <button key={k} className={quality === k ? 'on' : ''} onClick={() => setQuality(k)}>{l}</button>)}</div>
      <p>Ajustes finos</p>
      <Opt k="shadows" l="Sombras suaves" hint=" · cuesta rendimiento" /><Opt k="reflections" l="Reflejos en el suelo" hint=" · cuesta mucho" />
      <Opt k="bloom" l="Brillo neón (bloom)" hint="" /><Opt k="fps" l="Mostrar FPS" hint="" />
      <label className="opt">Resolución<input type="range" min="0.5" max="1" step="0.25" value={gfx.res} onChange={(e) => setGfxOpt('res', +e.target.value)} /> {Math.round(gfx.res * 100)}%</label>
      <p className="muted">Tu elección se guarda en este navegador. Si la app va lenta, baja a Media o Baja.</p>
      <button onClick={onClose}>Cerrar</button>
    </div></div>
  );
}

export default function UI() {
  const { mode, setMode, level, setLevel, flyTo, mobile, phase, sound, setSound, preview, setPreview, placeOverride, setPlace } = useStore();
  const [credits, setCredits] = useState(false), [gfx, setGfx] = useState(false);
  const [open, setOpen] = useState(!mobile);
  const act = (fn) => () => { fn(); if (mobile) setOpen(false); };
  if (phase !== 'app') return null;
  return (
    <>
      {preview && <div className="banner">VISTA PREVIA DE DISEÑO · estados de ejemplo para evaluar el aspecto, NO son tareas ni resultados reales</div>}
      <header className="brand">
        <b>DETONADOR</b><span>AI EMPIRE</span>
        <small>Sede virtual 3D · entorno de desarrollo</small>
      </header>
      <button className="burger" onClick={() => setOpen(!open)}>{open ? '✕' : '☰'}</button>
      {open && (
        <nav className="dock">
          <div className="grp">
            <label>Cámara estratégica</label>
            <div className="row">{Object.entries(PRESETS).map(([k, p]) => (
              <button key={k} className={k === 'general' ? 'hl' : ''} onClick={act(() => flyTo(p))}>{p.label}</button>))}</div>
          </div>
          <div className="grp">
            <label>Trabajadores (vista individual)</label>
            <div className="row">{WORKER_VIEWS.map((w) => (
              <button key={w.id} style={{ borderColor: w.color }} onClick={act(() => flyTo(w))}>{w.label}</button>))}</div>
          </div>
          <div className="grp">
            <label>Modo</label>
            <div className="row">
              <button className={mode === 'orbit' ? 'on' : ''} onClick={act(() => setMode('orbit'))}>Orbitar</button>
              <button className={mode === 'walk' ? 'on' : ''} onClick={act(() => setMode('walk'))}>Caminar (opcional)</button>
              <button className={mode === 'tour' ? 'on' : ''} onClick={act(() => setMode('tour'))}>Recorrido cine</button>
            </div>
          </div>
          <div className="grp">
            <label>Plantas</label>
            <div className="row">{[['all', 'Todo'], ['1', 'Planta 1'], ['2', 'Planta 2']].map(([k, l]) => (
              <button key={k} className={level === k ? 'on' : ''} onClick={act(() => setLevel(k))}>{l}</button>))}</div>
          </div>
          <div className="grp">
            <label>Extras</label>
            <div className="row">
              <button className={sound ? 'on' : ''} onClick={() => setSound(!sound)}>{sound ? '🔊 Sonido' : '🔇 Sonido'}</button>
              <button className={preview ? 'on' : ''} onClick={() => setPreview(!preview)}>Vista previa de estados</button>
              <button onClick={() => window.open('?casting', '_blank')}>Casting</button>
              <button onClick={() => setGfx(true)}>⚙ Gráficos</button>
              <button onClick={() => setCredits(true)}>Créditos</button>
            </div>
          </div>
          {preview && <div className="grp">
            <label>Probar movimientos (solo diseño)</label>
            <div className="row">{[['auto', 'Automático'], ['desk', 'A sus escritorios'], ['meeting', 'Reunión'], ['rest', 'Descanso']].map(([k, l]) => (
              <button key={k} className={placeOverride === k ? 'on' : ''} onClick={() => setPlace(k)}>{l}</button>))}</div>
          </div>}
        </nav>
      )}
      {gfx && <GraphicsPanel onClose={() => setGfx(false)} />}
      {credits && <div className="credits" onClick={() => setCredits(false)}><div onClick={(e) => e.stopPropagation()}>
        <h3>Créditos de modelos 3D</h3>
        <p>Modelos GLB © Wayfair, LLC / Darmstadt Graphics Group GmbH / colaboradores, de <a href="https://github.com/KhronosGroup/glTF-Sample-Assets" target="_blank" rel="noreferrer">KhronosGroup/glTF-Sample-Assets</a>. Redimensionados y comprimidos.</p>
        <ul><li>SheenChair — CC0 1.0</li><li>GlassVaseFlowers — CC0 1.0</li><li>GlamVelvetSofa — CC BY 4.0 (Wayfair)</li><li>SheenWoodLeatherSofa — CC BY 4.0 (Darmstadt Graphics Group)</li><li>DiffuseTransmissionPlant — CC BY 4.0 (Darmstadt Graphics Group)</li><li>IridescenceLamp — CC BY 4.0 (Wayfair)</li></ul>
        <p>Resto del edificio, mobiliario gaming, avatares y texturas: creación propia (procedural).</p>
        <button onClick={() => setCredits(false)}>Cerrar</button></div></div>}
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
