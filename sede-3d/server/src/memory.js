import { now, j, parse } from './db.js';
import { audit } from './security.js';

/* Memoria empresarial persistente: preferencias del propietario, lecciones, y un contexto compacto para TITAN X. */
export function setPreference(db, key, value, source = 'owner_said', evidenceMessageId = null) {
  if (typeof key !== 'string' || !key.trim() || key.length > 80 || typeof value !== 'string' || !value.trim() || value.length > 500) throw new Error('Preferencia inválida');
  db.prepare('INSERT INTO preferences(key,value,source,updated_at,evidence_message_id) VALUES(?,?,?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, source=excluded.source, updated_at=excluded.updated_at, evidence_message_id=excluded.evidence_message_id')
    .run(key.trim(), value.trim(), source, now(), evidenceMessageId);
  addMemoryNote(db, 'preference', `${key.trim()}: ${value.trim()}`);
}
export const listPreferences = (db) => db.prepare('SELECT key,value,source,updated_at FROM preferences ORDER BY updated_at DESC').all();
export const deletePreference = (db, key, actor) => { db.prepare('DELETE FROM preferences WHERE key=?').run(key); audit(db, { actor, action: 'preferencia.eliminada', target: key }); };
export function addMemoryNote(db, kind, text, taskId = null) {
  const id = db.prepare('INSERT INTO memory_notes(kind,text,task_id,created_at) VALUES(?,?,?,?)').run(kind, text.slice(0, 1500), taskId, now()).lastInsertRowid;
  db.prepare('INSERT INTO memory_fts(text,kind,ref) VALUES(?,?,?)').run(text.slice(0, 1500), kind, String(id));
  return Number(id);
}
// Aprendizaje a partir de resultados REALES: se resume de forma determinista (sin IA) y queda disponible para TITAN X.
export function learnFromResults(db) {
  const rows = db.prepare('SELECT platform, metrics_json FROM post_results').all(); if (!rows.length) return null;
  const by = {}; for (const r of rows) { const m = parse(r.metrics_json, {}); (by[r.platform] ??= []).push(Number(m.views ?? 0)); }
  const text = Object.entries(by).map(([p, v]) => `${p}: ${v.length} publicaciones con resultados reales; vistas medias ${Math.round(v.reduce((a, b) => a + b, 0) / v.length)}`).join(' | ');
  return addMemoryNote(db, 'results_summary', `Resumen de resultados reales: ${text}`);
}
export function buildContext(db, { budgetStatus } = {}) {
  const prefs = listPreferences(db).slice(0, 25).map((p) => `- ${p.key}: ${p.value}`).join('\n') || '(sin preferencias guardadas todavía)';
  const lessons = db.prepare("SELECT text FROM memory_notes WHERE kind IN ('lesson','results_summary') ORDER BY id DESC LIMIT 8").all().map((r) => `- ${r.text}`).join('\n') || '(sin lecciones aún)';
  const open = db.prepare("SELECT id,agent,title,status FROM tasks WHERE status IN ('queued','working','reviewing') ORDER BY id DESC LIMIT 12").all().map((t) => `#${t.id} ${t.agent}: ${t.title} [${t.status}]`).join('\n') || '(ninguna)';
  return `CONTEXTO ACTUAL (datos reales del sistema, ${now()}):\nPreferencias del Jefe:\n${prefs}\nLecciones / resultados históricos:\n${lessons}\nTareas abiertas:\n${open}${budgetStatus ? `\nPresupuesto: ${budgetStatus}` : ''}`;
}
