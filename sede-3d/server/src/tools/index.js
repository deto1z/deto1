import crypto from 'node:crypto';
import { now, j, parse } from '../db.js';
import { safeFetch, isAuthorized } from '../security.js';
import { validate } from '../schema.js';
import { htmlToText, htmlTitle, parseFeed, sanitizeSvg, hostOf, validDate } from './helpers.js';

/* Registro de herramientas REALES. Cada una: permisos por agente, autorización del propietario cuando usa un servicio externo,
   validación de entrada y registro. Una herramienta sin clave/autorización devuelve un error claro: NUNCA datos inventados.
   Importante: NO existe ninguna herramienta de publicación. Esta fase no publica nada en ninguna red. */
const S = (o) => ({ type: 'object', additionalProperties: false, ...o });
const str = (max = 500, extra = {}) => ({ type: 'string', maxLength: max, ...extra });
const PLATFORMS = ['youtube_shorts', 'youtube', 'tiktok', 'instagram_reels', 'facebook_reels', 'x'];
const norm = (t) => t.toLowerCase().normalize('NFD').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

const tools = {
  fetch_url: {
    description: 'Descarga una página web pública (solo lectura) y devuelve su título y texto. Úsala para leer la fuente original.',
    input_schema: S({ required: ['url'], properties: { url: str(1000) } }),
    async run({ url }, ctx) {
      const r = await safeFetch(url, { maxBytes: ctx.cfg.limits.fetchMaxBytes, timeoutMs: ctx.cfg.limits.fetchTimeoutMs, allowPrivate: !!ctx.testHooks?.allowPrivateFetch });
      ctx.fetched.add(url); ctx.fetched.add(r.url);
      const isHtml = /html/i.test(r.type);
      return { url: r.url, status: r.status, title: isHtml ? htmlTitle(r.text) : '', text: (isHtml ? htmlToText(r.text) : r.text).slice(0, 6000) };
    },
  },
  rss_feed: {
    description: 'Lee un canal RSS/Atom público y devuelve sus entradas (título, enlace, fecha, fuente).',
    input_schema: S({ required: ['url'], properties: { url: str(1000), limit: { type: 'integer', minimum: 1, maximum: 30 } } }),
    async run({ url, limit = 15 }, ctx) {
      const r = await safeFetch(url, { maxBytes: ctx.cfg.limits.fetchMaxBytes, timeoutMs: ctx.cfg.limits.fetchTimeoutMs, allowPrivate: !!ctx.testHooks?.allowPrivateFetch });
      ctx.fetched.add(url); const items = parseFeed(r.text, limit); items.forEach((i) => ctx.seen.add(i.url));
      return { feed: url, items };
    },
  },
  news_rss_search: {
    description: 'Busca noticias recientes en Google Noticias (canal RSS gratuito, sin clave). Devuelve titulares reales con enlace, fecha y medio.',
    input_schema: S({ required: ['query'], properties: { query: str(200), hours: { type: 'integer', minimum: 1, maximum: 72 }, limit: { type: 'integer', minimum: 1, maximum: 30 }, language: { type: 'string', enum: ['es', 'en'] } } }),
    async run({ query, hours = 24, limit = 15, language = 'es' }, ctx) {
      const base = ctx.testHooks?.rssBase ?? 'https://news.google.com/rss/search';
      const u = `${base}?q=${encodeURIComponent(`${query} when:${hours}h`)}&hl=${language === 'es' ? 'es-419' : 'en-US'}&gl=US&ceid=US:${language === 'es' ? 'es-419' : 'en'}`;
      const r = await safeFetch(u, { maxBytes: ctx.cfg.limits.fetchMaxBytes, timeoutMs: ctx.cfg.limits.fetchTimeoutMs, allowPrivate: !!ctx.testHooks?.allowPrivateFetch });
      ctx.fetched.add(u); const items = parseFeed(r.text, limit); items.forEach((i) => ctx.seen.add(i.url));
      return { query, retrieved_at: now(), items };
    },
  },
  brave_search: {
    description: 'Búsqueda web con la API de Brave (de pago por uso; requiere clave y autorización del propietario).',
    requires: { auth: 'brave_search', key: 'brave' },
    input_schema: S({ required: ['query'], properties: { query: str(200), freshness: { type: 'string', enum: ['pd', 'pw', 'pm'] }, count: { type: 'integer', minimum: 1, maximum: 20 } } }),
    async run({ query, freshness = 'pd', count = 10 }, ctx) {
      const base = ctx.testHooks?.braveBase ?? 'https://api.search.brave.com/res/v1/web/search';
      const r = await safeFetch(`${base}?q=${encodeURIComponent(query)}&freshness=${freshness}&count=${count}`, { headers: { 'x-subscription-token': ctx.cfg.keys.brave, accept: 'application/json' }, allowPrivate: !!ctx.testHooks?.allowPrivateFetch });
      const d = parse(r.text, {}); const items = (d.web?.results ?? []).map((x) => ({ title: x.title, url: x.url, published_at: x.page_age ?? '', source: hostOf(x.url), summary: htmlToText(x.description ?? '').slice(0, 300) }));
      items.forEach((i) => ctx.seen.add(i.url)); ctx.billed.braveQueries = (ctx.billed.braveQueries ?? 0) + 1; return { query, items };
    },
  },
  youtube_trending: {
    description: 'Videos más populares de YouTube por región y categoría, con estadísticas reales (vistas, me gusta, comentarios). API oficial de YouTube; requiere clave y autorización.',
    requires: { auth: 'youtube_data', key: 'youtube' },
    input_schema: S({ properties: { region: str(2, { pattern: '^[A-Z]{2}$' }), category_id: str(3), max: { type: 'integer', minimum: 1, maximum: 25 } } }),
    async run({ region = 'US', category_id = '17', max = 10 }, ctx) {
      const base = ctx.testHooks?.youtubeBase ?? 'https://www.googleapis.com/youtube/v3/videos';
      const r = await safeFetch(`${base}?part=snippet,statistics&chart=mostPopular&regionCode=${region}&videoCategoryId=${category_id}&maxResults=${max}&key=${encodeURIComponent(ctx.cfg.keys.youtube)}`, { accept: /json/i, allowPrivate: !!ctx.testHooks?.allowPrivateFetch });
      const d = parse(r.text, {}); if (d.error) throw new Error(`YouTube API: ${d.error.message ?? 'error'}`);
      const items = (d.items ?? []).map((v) => ({ title: v.snippet?.title, url: `https://www.youtube.com/watch?v=${v.id}`, published_at: v.snippet?.publishedAt, source: v.snippet?.channelTitle, views: Number(v.statistics?.viewCount ?? 0), likes: Number(v.statistics?.likeCount ?? 0), comments: Number(v.statistics?.commentCount ?? 0) }));
      items.forEach((i) => ctx.seen.add(i.url)); ctx.billed.youtubeUnits = (ctx.billed.youtubeUnits ?? 0) + 1; return { region, retrieved_at: now(), items };
    },
  },
  save_news_item: {
    description: 'Guarda una noticia/tema candidato. La URL debe provenir de una herramienta de búsqueda o lectura usada en esta tarea. Queda "sin verificar" hasta que FILTER X la revise.',
    input_schema: S({ required: ['title', 'url', 'published_at', 'evidence_type', 'evidence'], properties: { title: str(300), url: str(1000), source: str(120), published_at: str(60),
      evidence_type: { type: 'string', enum: ['youtube_stats', 'rss_multiple_outlets', 'search_ranking', 'other'] }, evidence: str(600) } }),
    async run(i, ctx) {
      if (!/^https?:\/\//.test(i.url)) throw new Error('URL inválida');
      if (!ctx.seen.has(i.url) && !ctx.fetched.has(i.url)) throw new Error('Esa URL no fue devuelta por ninguna herramienta en esta tarea: no se pueden guardar fuentes inventadas.');
      if (!validDate(i.published_at)) throw new Error('Fecha de publicación inválida o futura.');
      const dup = ctx.db.prepare('SELECT id FROM news_items WHERE url=?').get(i.url); if (dup) return { duplicate: true, id: dup.id };
      const t = norm(i.title).slice(0, 60), same = ctx.db.prepare('SELECT id,title FROM news_items ORDER BY id DESC LIMIT 300').all().find((r) => norm(r.title).slice(0, 60) === t);
      const id = ctx.db.prepare('INSERT INTO news_items(task_id,title,url,source,published_at,fetched_at,popularity_evidence,verification_status,verification_notes,canonical) VALUES(?,?,?,?,?,?,?,?,?,?)')
        .run(ctx.taskId, i.title, i.url, i.source ?? hostOf(i.url), new Date(i.published_at).toISOString(), now(), `${i.evidence_type}: ${i.evidence}`, 'unverified', same ? `Posible repetida de #${same.id}` : null, t).lastInsertRowid;
      return { id: Number(id), possible_duplicate_of: same?.id ?? null };
    },
  },
  list_news_items: {
    description: 'Lista noticias guardadas por estado de verificación.',
    input_schema: S({ properties: { status: { type: 'string', enum: ['unverified', 'verified', 'rumor', 'rejected', 'duplicate', 'outdated'] }, limit: { type: 'integer', minimum: 1, maximum: 50 }, since_hours: { type: 'integer', minimum: 1, maximum: 720 } } }),
    async run({ status, limit = 25, since_hours = 72 }, ctx) {
      const since = new Date(Date.now() - since_hours * 3600_000).toISOString();
      const rows = status ? ctx.db.prepare('SELECT * FROM news_items WHERE verification_status=? AND fetched_at>=? ORDER BY id DESC LIMIT ?').all(status, since, limit) : ctx.db.prepare('SELECT * FROM news_items WHERE fetched_at>=? ORDER BY id DESC LIMIT ?').all(since, limit);
      return { items: rows.map((r) => ({ id: r.id, title: r.title, url: r.url, source: r.source, published_at: r.published_at, status: r.verification_status, evidence: r.popularity_evidence, notes: r.verification_notes })) };
    },
  },
  list_content_items: {
    description: 'Lista los ganchos, títulos, guiones, CTA y portadas ya guardados para una noticia (con sus IDs).',
    input_schema: S({ required: ['news_id'], properties: { news_id: { type: 'integer', minimum: 1 } } }),
    async run({ news_id }, ctx) {
      const items = ctx.db.prepare('SELECT id,kind,payload_json FROM content_items WHERE news_id=? ORDER BY id').all(news_id).map((r) => ({ id: r.id, kind: r.kind, ...parse(r.payload_json, {}) }));
      const covers = ctx.db.prepare('SELECT id,concept_json FROM covers WHERE news_id=? ORDER BY id').all(news_id).map((r) => { const c = parse(r.concept_json, {}); return { id: r.id, concept: c.concept, text_overlay: c.text_overlay }; });
      return { news_id, items, covers };
    },
  },
  set_verification: {
    description: 'Fija el estado de verificación de una noticia. "verified" exige haber leído la fuente original Y al menos una fuente adicional independiente (otro dominio) en esta tarea.',
    input_schema: S({ required: ['news_id', 'status', 'notes'], properties: { news_id: { type: 'integer', minimum: 1 }, status: { type: 'string', enum: ['verified', 'rumor', 'rejected', 'duplicate', 'outdated'] }, notes: str(800), corroborating_urls: { type: 'array', maxItems: 6, items: str(1000) } } }),
    async run(i, ctx) {
      const n = ctx.db.prepare('SELECT * FROM news_items WHERE id=?').get(i.news_id); if (!n) throw new Error('Noticia inexistente');
      if (i.status === 'verified') {
        if (!ctx.fetched.has(n.url)) throw new Error('Debes leer la fuente original (fetch_url) antes de marcarla como verificada.');
        const extra = (i.corroborating_urls ?? []).filter((u) => ctx.fetched.has(u) && hostOf(u) && hostOf(u) !== hostOf(n.url));
        if (!extra.length) throw new Error('Para marcar "verified" necesitas al menos una fuente adicional de OTRO dominio que hayas leído en esta tarea (corroborating_urls).');
        i.notes = `${i.notes}\nCorroboran: ${extra.join(' , ')}`;
      }
      ctx.db.prepare('UPDATE news_items SET verification_status=?, verification_notes=? WHERE id=?').run(i.status, i.notes, i.news_id);
      return { id: i.news_id, status: i.status };
    },
  },
  save_content_item: {
    description: 'Guarda un gancho, título, guion o llamada a la acción para una noticia VERIFICADA. Guiones: duración 15, 30, 60 o 90 s (límite de palabras según duración).',
    input_schema: S({ required: ['news_id', 'kind', 'text'], properties: { news_id: { type: 'integer', minimum: 1 }, kind: { type: 'string', enum: ['hook', 'title', 'script', 'cta'] }, text: str(4000), duration_sec: { type: 'integer', enum: [15, 30, 60, 90] }, variant: { type: 'integer', minimum: 1, maximum: 10 } } }),
    async run(i, ctx) {
      const n = ctx.db.prepare('SELECT verification_status FROM news_items WHERE id=?').get(i.news_id);
      if (!n) throw new Error('Noticia inexistente'); if (n.verification_status !== 'verified') throw new Error('Solo se crea contenido sobre noticias verificadas por FILTER X.');
      const words = i.text.trim().split(/\s+/).length;
      if (i.kind === 'hook' && i.text.length > 220) throw new Error('Un gancho de 3 segundos debe ser corto (máx. 220 caracteres).');
      if (i.kind === 'title' && i.text.length > 100) throw new Error('El título debe tener máx. 100 caracteres.');
      if (i.kind === 'script') { if (!i.duration_sec) throw new Error('Un guion requiere duration_sec.'); const max = Math.round(i.duration_sec * 2.8); if (words > max) throw new Error(`Guion demasiado largo para ${i.duration_sec} s: ${words} palabras (máx. ${max}).`); }
      const id = ctx.db.prepare('INSERT INTO content_items(kind,task_id,news_id,payload_json,created_at) VALUES(?,?,?,?,?)').run(i.kind, ctx.taskId, i.news_id, j({ text: i.text, duration_sec: i.duration_sec ?? null, variant: i.variant ?? null, words }), now()).lastInsertRowid;
      return { id: Number(id), words };
    },
  },
  save_cover_svg: {
    description: 'Guarda una propuesta visual de portada: concepto + SVG real (1280x720) generado por ti. El SVG se sanea (sin scripts ni imágenes externas).',
    input_schema: S({ required: ['news_id', 'concept', 'svg', 'text_overlay'], properties: { news_id: { type: 'integer', minimum: 1 }, concept: str(800), svg: str(60000), text_overlay: str(80) } }),
    async run(i, ctx) {
      const n = ctx.db.prepare('SELECT verification_status FROM news_items WHERE id=?').get(i.news_id); if (!n || n.verification_status !== 'verified') throw new Error('Solo se diseñan portadas de noticias verificadas.');
      const svg = sanitizeSvg(i.svg); if (!svg) throw new Error('SVG rechazado: debe empezar por <svg>, usar solo formas/texto/degradados y no incluir scripts, enlaces ni imágenes externas.');
      const id = ctx.db.prepare('INSERT INTO covers(task_id,news_id,concept_json,created_at) VALUES(?,?,?,?)').run(ctx.taskId, i.news_id, j({ concept: i.concept, text_overlay: i.text_overlay, svg }), now()).lastInsertRowid;
      return { id: Number(id) };
    },
  },
  calendar_add: {
    description: 'Programa un tema en el calendario editorial (mañana/tarde/noche). Rechaza temas ya programados en los últimos 14 días.',
    input_schema: S({ required: ['slot', 'day', 'news_id', 'platform'], properties: { slot: { type: 'string', enum: ['morning', 'afternoon', 'night'] }, day: str(10, { pattern: '^\\d{4}-\\d{2}-\\d{2}$' }), news_id: { type: 'integer', minimum: 1 }, platform: { type: 'string', enum: PLATFORMS }, note: str(400) } }),
    async run(i, ctx) {
      const n = ctx.db.prepare('SELECT id FROM news_items WHERE id=?').get(i.news_id); if (!n) throw new Error('Noticia inexistente');
      const since = new Date(Date.now() - 14 * 86400_000).toISOString();
      const dup = ctx.db.prepare('SELECT day FROM calendar_entries WHERE news_id=? AND created_at>=?').get(i.news_id, since); if (dup) throw new Error(`Ese tema ya está programado (${dup.day}): se evita repetirlo.`);
      const id = ctx.db.prepare('INSERT INTO calendar_entries(slot,day,news_id,platform,note,created_at) VALUES(?,?,?,?,?,?)').run(i.slot, i.day, i.news_id, i.platform, i.note ?? null, now()).lastInsertRowid;
      return { id: Number(id) };
    },
  },
  calendar_list: {
    description: 'Lista el calendario editorial desde una fecha.',
    input_schema: S({ properties: { from_day: str(10, { pattern: '^\\d{4}-\\d{2}-\\d{2}$' }) } }),
    async run({ from_day }, ctx) { const f = from_day ?? new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10); return { entries: ctx.db.prepare('SELECT c.id,c.slot,c.day,c.platform,c.note,n.title FROM calendar_entries c LEFT JOIN news_items n ON n.id=c.news_id WHERE c.day>=? ORDER BY c.day,c.slot').all(f) }; },
  },
  query_history: {
    description: 'Resumen REAL de resultados de publicaciones ya registradas (por plataforma). Si no hay datos, lo dice.',
    input_schema: S({ properties: { platform: { type: 'string', enum: PLATFORMS }, days: { type: 'integer', minimum: 1, maximum: 365 } } }),
    async run({ platform, days = 90 }, ctx) {
      const since = new Date(Date.now() - days * 86400_000).toISOString();
      const rows = (platform ? ctx.db.prepare('SELECT * FROM post_results WHERE platform=? AND collected_at>=?').all(platform, since) : ctx.db.prepare('SELECT * FROM post_results WHERE collected_at>=?').all(since));
      if (!rows.length) return { has_data: false, message: 'No hay resultados reales registrados todavía. No se puede comparar con el historial.' };
      return { has_data: true, count: rows.length, posts: rows.slice(0, 40).map((r) => ({ platform: r.platform, url: r.post_url, metrics: parse(r.metrics_json, {}), source: r.source, collected_at: r.collected_at })) };
    },
  },
  social_metrics: {
    description: 'Estadísticas de cuentas propias autorizadas (YouTube, Facebook, Instagram, TikTok). Solo funciona cuando el propietario conectó y autorizó el conector.',
    input_schema: S({ required: ['platform'], properties: { platform: { type: 'string', enum: ['youtube', 'facebook', 'instagram', 'tiktok'] } } }),
    async run({ platform }, ctx) {
      const tok = ctx.db.prepare('SELECT 1 FROM connector_tokens WHERE platform=?').get(platform);
      if (!tok || !isAuthorized(ctx.db, 'connector', platform)) return { connected: false, message: `El conector de ${platform} no está conectado/autorizado por el propietario. No hay estadísticas que mostrar.` };
      return { connected: true, message: 'Conector preparado pero la lectura de métricas aún no está activada en esta fase.' };
    },
  },
  recall_memory: {
    description: 'Busca en la memoria de la empresa (preferencias del propietario y lecciones aprendidas).',
    input_schema: S({ required: ['query'], properties: { query: str(200) } }),
    async run({ query }, ctx) {
      const q = query.replace(/[^\p{L}\p{N} ]/gu, ' ').trim().split(/\s+/).filter(Boolean).map((w) => `"${w}"`).join(' OR ');
      const notes = q ? ctx.db.prepare('SELECT text,kind FROM memory_fts WHERE memory_fts MATCH ? LIMIT 10').all(q) : [];
      return { preferences: ctx.db.prepare('SELECT key,value,source FROM preferences ORDER BY updated_at DESC LIMIT 30').all(), notes };
    },
  },
  submit_result: {
    description: 'Entrega el resultado final de tu tarea a TITAN X. Llama a esta herramienta una sola vez, al terminar. No inventes nada: si no pudiste hacer algo, dilo en "limitations".',
    input_schema: S({ required: ['summary'], properties: { summary: str(3000), data: { type: 'object' }, limitations: str(1500) } }),
    async run(i) { return { __final: true, ...i }; },
  },
};

export const TOOL_DEFS = tools;
export const toolDefsFor = (names) => names.filter((n) => tools[n]).map((n) => ({ name: n, description: tools[n].description, input_schema: tools[n].input_schema }));
export const hasPublishTool = () => Object.keys(tools).some((k) => /publish|post_to|upload_video/i.test(k));

/* Ejecuta una herramienta con todos los controles. Devuelve { text, isError, final?, raw }. */
export async function runTool(name, input, ctx, extra = {}) {
  const reg = extra.registry ?? tools;
  const t = reg[name];
  const fail = (m) => ({ text: m, isError: true });
  if (!t || !ctx.allowed.includes(name)) return fail(`Herramienta no permitida para este agente: ${name}`);
  if (ctx.counters.toolCalls >= ctx.cfg.limits.maxToolCallsPerTask) return fail('Límite de llamadas a herramientas alcanzado para esta tarea.');
  if (t.requires) {
    if (!ctx.cfg.keys[t.requires.key] && !ctx.testHooks?.fakeKeys) return fail(`La herramienta ${name} no tiene clave configurada en el servidor.`);
    if (!isAuthorized(ctx.db, 'tool', t.requires.auth)) return fail(`La herramienta ${name} requiere autorización explícita del propietario (servicio externo).`);
  }
  const e = validate(t.input_schema, input ?? {}); if (e) return fail(`Entrada inválida: ${e}`);
  ctx.counters.toolCalls++;
  const started = Date.now(); let timer;
  try {
    const out = await Promise.race([t.run(input ?? {}, ctx), new Promise((_, rej) => { timer = setTimeout(() => rej(new Error('La herramienta superó el tiempo máximo')), ctx.cfg.limits.fetchTimeoutMs * 2 + 5000); })]);
    const text = JSON.stringify(out).slice(0, 14000);
    return { text, isError: false, final: out?.__final ? out : null, raw: out, ms: Date.now() - started };
  } catch (err) { return { text: `Error: ${err.message}`, isError: true, ms: Date.now() - started }; } finally { clearTimeout(timer); }
}
