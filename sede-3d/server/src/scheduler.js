import { now, j } from './db.js';
import { audit, isAuthorized } from './security.js';
import { zonedToUtc, nextRun } from '../../src/schedule.js';

/* Rutinas diarias (America/New_York por defecto, horarios editables). TODAS desactivadas hasta que el propietario las autorice:
   hacen falta DOS pasos: (1) autorización global de "automation" y (2) activar cada rutina. */
export const DEFAULT_ROUTINES = [
  { id: 'am', name: 'Reunión de la mañana (7:00)', time: '07:00', focus: 'Mejores oportunidades de la mañana: tendencias, noticias y propuestas.' },
  { id: 'noon', name: 'Reunión del mediodía (12:00)', time: '12:00', focus: 'Novedades y tendencias de la tarde.' },
  { id: 'pm', name: 'Reunión de la noche (18:00)', time: '18:00', focus: 'Mejores oportunidades nocturnas y análisis del rendimiento del día.' },
];
export function seedRoutines(db, tz = 'America/New_York') {
  for (const r of DEFAULT_ROUTINES) db.prepare('INSERT OR IGNORE INTO routines(id,name,time_hhmm,timezone,focus,enabled) VALUES(?,?,?,?,?,0)').run(r.id, r.name, r.time, tz, r.focus);
}
export const listRoutines = (db) => db.prepare('SELECT * FROM routines ORDER BY time_hhmm').all().map((r) => ({ ...r, enabled: !!r.enabled, next_run_utc: nextRun(r.time_hhmm, r.timezone).toISOString() }));
export function updateRoutine(db, id, patch, actor = 'propietario') {
  const r = db.prepare('SELECT * FROM routines WHERE id=?').get(id); if (!r) throw new Error('Rutina inexistente');
  const time = patch.time ?? r.time_hhmm, tz = patch.timezone ?? r.timezone, focus = patch.focus ?? r.focus;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Hora inválida (HH:MM)');
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); } catch { throw new Error('Zona horaria inválida'); }
  if (typeof focus !== 'string' || focus.length > 400) throw new Error('Enfoque inválido');
  let enabled = patch.enabled === undefined ? !!r.enabled : !!patch.enabled;
  if (enabled && !isAuthorized(db, 'automation', 'routines')) throw new Error('Primero debes autorizar la automatización de rutinas (Costos y autorizaciones).');
  db.prepare('UPDATE routines SET time_hhmm=?, timezone=?, focus=?, enabled=? WHERE id=?').run(time, tz, focus, enabled ? 1 : 0, id);
  audit(db, { actor, action: 'rutina.actualizada', target: id, detail: { time, tz, enabled } }); return listRoutines(db).find((x) => x.id === id);
}
/* Una pasada del planificador. `at` permite probar con un reloj simulado. Devuelve las rutinas lanzadas. */
export async function schedulerTick(db, orchestrator, at = new Date()) {
  if (!isAuthorized(db, 'automation', 'routines')) return [];
  const fired = [];
  for (const r of db.prepare('SELECT * FROM routines WHERE enabled=1').all()) {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: r.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(at).map((x) => [x.type, x.value]));
    const [hh, mm] = r.time_hhmm.split(':').map(Number);
    const due = zonedToUtc(+p.year, +p.month, +p.day, hh, mm, r.timezone);
    const key = `${p.year}-${p.month}-${p.day}`;
    if (at >= due && at.getTime() - due.getTime() < 10 * 60_000 && r.last_run_key !== key) {      // ventana de 10 min: no lanza rutinas "viejas"
      db.prepare('UPDATE routines SET last_run_key=? WHERE id=?').run(key, r.id);
      audit(db, { actor: 'planificador', action: 'rutina.lanzada', target: r.id, detail: { key } });
      fired.push(r.id); orchestrator.runRoutine(r).catch(() => {});
    }
  }
  return fired;
}
export function startScheduler(db, orchestrator, everyMs = 30_000) { const t = setInterval(() => schedulerTick(db, orchestrator).catch(() => {}), everyMs); t.unref?.(); return () => clearInterval(t); }
