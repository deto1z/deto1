import { now, j, parse } from './db.js';
import { audit } from './security.js';
import { hostOf } from './tools/helpers.js';

/* Propuesta final para aprobación. El contenido NO lo dicta el modelo: el modelo solo referencia IDs de elementos ya guardados
   (noticia verificada, ganchos, guiones, título, portada); el servidor arma la propuesta con los datos reales de la base. */
export class ProposalError extends Error {}
export function buildProposal(db, i, { rootId, conversationId }) {
  const news = db.prepare('SELECT * FROM news_items WHERE id=?').get(i.news_id);
  if (!news) throw new ProposalError('Noticia inexistente');
  if (news.verification_status !== 'verified') throw new ProposalError('La noticia no está verificada por FILTER X: no puede proponerse.');
  const items = (ids, kind, min, max) => {
    const rows = (ids ?? []).map((id) => db.prepare('SELECT * FROM content_items WHERE id=?').get(id));
    if (rows.some((r) => !r || r.kind !== kind || r.news_id !== news.id)) throw new ProposalError(`Hay ${kind}s que no existen o no pertenecen a esta noticia.`);
    if (rows.length < min || rows.length > max) throw new ProposalError(`Se requieren entre ${min} y ${max} elementos de tipo ${kind} (recibidos ${rows.length}).`);
    return rows.map((r) => ({ id: r.id, ...parse(r.payload_json, {}) }));
  };
  const hooks = items(i.hook_ids, 'hook', 5, 5);
  const scripts = items(i.script_ids, 'script', 1, 4); if (new Set(scripts.map((s) => s.duration_sec)).size !== scripts.length) throw new ProposalError('Un guion por duración (15/30/60/90 s).');
  const titles = items(i.title_ids, 'title', 1, 3);
  const ctas = items(i.cta_ids ?? [], 'cta', 0, 2);
  const cover = db.prepare('SELECT * FROM covers WHERE id=? AND news_id=?').get(i.cover_id, news.id); if (!cover) throw new ProposalError('Falta la propuesta visual (portada) de esta noticia.');
  const cov = parse(cover.concept_json, {});
  const corroborating = (news.verification_notes ?? '').split('Corroboran:')[1]?.split(' , ').map((u) => u.trim()).filter(Boolean) ?? [];
  const data = {
    topic: i.topic, why_it_works: i.why_it_works, history_note: i.history_note,
    verified_sources: [{ news_id: news.id, title: news.title, url: news.url, source: news.source, published_at: news.published_at, popularity_evidence: news.popularity_evidence, verification_notes: news.verification_notes, corroborating_urls: corroborating }],
    hooks, titles, scripts, ctas,
    visual: { cover_id: cover.id, concept: cov.concept, text_overlay: cov.text_overlay, svg: cov.svg },
    platform: i.platform, schedule: { slot: i.slot, day: i.day, timezone: 'America/New_York' },
    publish_status: 'NO PUBLICADO — requiere aprobación del Jefe',
  };
  const id = db.prepare('INSERT INTO proposals(root_id,conversation_id,status,data_json,created_at) VALUES(?,?,?,?,?)').run(rootId ?? null, conversationId ?? null, 'pending', j(data), now()).lastInsertRowid;
  audit(db, { actor: 'titan-x', action: 'propuesta.creada', target: `proposal:${id}`, detail: { news_id: news.id } });
  return { id: Number(id), data };
}
export const listProposals = (db, status) => db.prepare(`SELECT * FROM proposals ${status ? 'WHERE status=?' : ''} ORDER BY id DESC LIMIT 100`).all(...(status ? [status] : [])).map((r) => ({ ...r, data: parse(r.data_json), data_json: undefined }));
export function decideProposal(db, id, decision, notes, actor = 'propietario') {
  const p = db.prepare('SELECT * FROM proposals WHERE id=?').get(id); if (!p) throw new ProposalError('Propuesta inexistente');
  if (p.status !== 'pending') throw new ProposalError(`La propuesta ya fue ${p.status}.`);
  const status = { approve: 'approved', reject: 'rejected', improve: 'improving' }[decision]; if (!status) throw new ProposalError('Decisión inválida');
  db.prepare('UPDATE proposals SET status=?, decided_at=?, decision_notes=? WHERE id=?').run(status, now(), notes ?? null, id);
  audit(db, { actor, action: `propuesta.${status}`, target: `proposal:${id}`, detail: { notes } });   // aprobar NO publica: no existe ninguna función de publicación en esta fase
  return { id, status };
}
