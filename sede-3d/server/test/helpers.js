import http from 'node:http';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { hashPassword, grantAuthorization } from '../src/security.js';
import { now } from '../src/db.js';
process.env.NODE_ENV = 'test';

/* Servidor local de ejemplo: canal RSS y "artículos" (dominios distintos: 127.0.0.1 y localhost). Solo para pruebas. */
export async function startFixtureServer() {
  let port; const hits = [];
  const server = http.createServer((req, res) => {
    hits.push(req.url); const u = new URL(req.url, 'http://x');
    if (u.pathname === '/rss') {
      const d = new Date(Date.now() - 2 * 3600_000).toUTCString();
      const items = [1, 2, 3].map((n) => `<item><title>Titular real de prueba ${n}: el club anuncia fichaje ${n}</title><link>http://127.0.0.1:${port}/a${n}</link><pubDate>${d}</pubDate><source>Diario Uno</source><description>Resumen ${n}</description></item>`).join('');
      res.writeHead(200, { 'content-type': 'application/rss+xml' }); return res.end(`<?xml version="1.0"?><rss><channel>${items}</channel></rss>`);
    }
    const m = u.pathname.match(/^\/([ab])(\d)$/);
    if (m) { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(`<html><head><title>${m[1] === 'a' ? 'Original' : 'Confirmación'} ${m[2]}</title></head><body><p>El club confirmó el fichaje número ${m[2]} esta mañana.</p><script>alert(1)</script></body></html>`); }
    if (u.pathname === '/evil') { res.writeHead(200, { 'content-type': 'application/octet-stream' }); return res.end('x'); }
    res.writeHead(404); res.end('no');
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r)); port = server.address().port;
  return { port, hits, close: () => new Promise((r) => { server.close(r); server.closeAllConnections?.(); }) };
}

const J = (o) => JSON.parse(o);
const lastResults = (messages) => { const m = messages[messages.length - 1]; return Array.isArray(m?.content) ? m.content.filter((b) => b.type === 'tool_result').map((b) => b.content) : []; };
const toolsOf = (messages) => messages.flatMap((m) => Array.isArray(m.content) ? m.content.filter((b) => b.type === 'tool_use') : []);
const resultsFor = (messages, name) => { const uses = toolsOf(messages); const out = []; for (const m of messages) if (Array.isArray(m.content)) for (const b of m.content) if (b.type === 'tool_result') { const u = uses.find((x) => x.id === b.tool_use_id); if (u?.name === name) out.push({ input: u.input, content: b.content, isError: b.is_error }); } return out; };
let idc = 0; const tu = (name, input) => ({ type: 'tool_use', id: `tu_${++idc}`, name, input });
const text = (t) => ({ type: 'text', text: t });

/* "Modelo" guionizado SOLO PARA PRUEBAS: decide la siguiente llamada a herramienta según el rol (prompt de sistema) y los resultados reales previos.
   Sirve para verificar el orquestador, las herramientas, los costos y los estados; NO es inteligencia y nunca existe fuera de NODE_ENV=test. */
export function makeFakeProvider({ usage = { input: 1500, output: 400 }, correctOnce = null, failAgent = null, port, onCall } = {}) {
  const corrected = new Set(); const calls = [];
  const policy = ({ system, messages, tools }) => {
    const names = tools.map((t) => t.name); const mine = (s) => system.includes(s);
    const first = messages.length === 1;
    if (names.includes('review_decision')) {
      const body = messages[0].content; const id = Number(body.match(/Tarea #(\d+)/)[1]);
      if (correctOnce && body.includes(correctOnce) && !corrected.has(id)) { corrected.add(id); return [tu('review_decision', { decision: 'correct', notes: 'Falta detalle verificable. Repite con más precisión.' })]; }
      return [tu('review_decision', { decision: 'accept', notes: 'Cumple.' })];
    }
    if (names.includes('create_proposal')) {
      const step = messages.length;
      if (step === 1) return [tu('list_news_items', { status: 'verified' })];
      const ver = resultsFor(messages, 'list_news_items').pop(); const items = ver ? J(ver.content).items : [];
      const done = resultsFor(messages, 'create_proposal').length;
      if (done < items.length && done < 2) {
        const it = items[done]; const lc = resultsFor(messages, 'list_content_items').find((r) => r.input.news_id === it.id);
        if (!lc) return [tu('list_content_items', { news_id: it.id })];
        const c = J(lc.content); const by = (k) => c.items.filter((x) => x.kind === k).map((x) => x.id);
        return [tu('create_proposal', { news_id: it.id, topic: it.title.slice(0, 150), why_it_works: 'Tema verificado por dos fuentes y de alta cobertura.', hook_ids: by('hook').slice(0, 5), script_ids: by('script'), title_ids: by('title').slice(0, 1), cta_ids: by('cta').slice(0, 1), cover_id: c.covers[0].id, platform: 'youtube_shorts', slot: 'morning', day: new Date().toISOString().slice(0, 10), history_note: 'Sin datos históricos reales todavía.' })];
      }
      return [text(`Jefe, preparé ${done} propuesta(s) con fuentes verificadas. Pendientes de su aprobación.`)];
    }
    if (names.includes('create_pipeline')) {
      if (first || !resultsFor(messages, 'create_pipeline').length) return [tu('create_pipeline', { goal: messages[0].content.slice(0, 200), count: 2 })];
      return [text('Jefe, ya puse a trabajar al equipo. Le avisaré cuando haya propuestas para aprobar.')];
    }
    if (mine('Eres VIRAL HUNTER')) {
      if (failAgent === 'viral-hunter') throw new Error('fallo simulado del proveedor');
      const s = resultsFor(messages, 'news_rss_search'); if (!s.length) return [tu('news_rss_search', { query: 'fútbol fichaje', hours: 24 })];
      const saved = resultsFor(messages, 'save_news_item'); const items = J(s[0].content).items;
      if (saved.length < 2) return [tu('save_news_item', { title: items[saved.length].title, url: items[saved.length].url, published_at: items[saved.length].published_at, evidence_type: 'rss_multiple_outlets', evidence: 'Cubierto por varios medios en el canal RSS consultado' })];
      return [tu('submit_result', { summary: `Guardé ${saved.length} temas`, limitations: 'Sin API de YouTube autorizada' })];
    }
    if (mine('Eres FILTER X')) {
      const l = resultsFor(messages, 'list_news_items'); if (!l.length) return [tu('list_news_items', { status: 'unverified' })];
      const items = J(l[0].content).items; const idx = resultsFor(messages, 'set_verification').length; const fetched = resultsFor(messages, 'fetch_url');
      if (idx >= items.length) return [tu('submit_result', { summary: `Verificadas: ${items.length}` })];
      const it = items[idx]; const n = it.url.match(/a(\d)/)[1]; const corr = `http://localhost:${port}/b${n}`;
      const needOrig = !fetched.find((f) => f.input.url === it.url), needCorr = !fetched.find((f) => f.input.url === corr);
      if (needOrig) return [tu('fetch_url', { url: it.url })]; if (idx === 0 && needCorr) return [tu('fetch_url', { url: corr })];
      return idx === 0 ? [tu('set_verification', { news_id: it.id, status: 'verified', notes: 'Confirmada por dos fuentes', corroborating_urls: [corr] })] : [tu('set_verification', { news_id: it.id, status: 'rumor', notes: 'Una sola fuente, sin confirmación independiente' })];
    }
    if (mine('Eres HOOK MASTER')) {
      const l = resultsFor(messages, 'list_news_items'); if (!l.length) return [tu('list_news_items', { status: 'verified' })];
      const items = J(l[0].content).items; const saved = resultsFor(messages, 'save_content_item').length; if (!items.length) return [tu('submit_result', { summary: 'Sin noticias verificadas', limitations: 'Nada que escribir' })];
      const plan = [...[1, 2, 3, 4, 5].map((v) => ({ kind: 'hook', text: `Gancho ${v}: no vas a creer este fichaje`, variant: v })), { kind: 'title', text: 'El fichaje que cambia todo' }, ...[15, 30, 60, 90].map((d) => ({ kind: 'script', duration_sec: d, text: 'Se confirmó el fichaje. '.repeat(Math.max(1, Math.floor(d / 8))) })), { kind: 'cta', text: 'Sígueme para más' }];
      const per = plan.length; const k = Math.floor(saved / per), p = saved % per; if (k >= items.length) return [tu('submit_result', { summary: `Contenido creado para ${items.length} noticia(s)` })];
      return [tu('save_content_item', { news_id: items[k].id, ...plan[p] })];
    }
    if (mine('Eres PIXEL QUEEN')) {
      const l = resultsFor(messages, 'list_news_items'); if (!l.length) return [tu('list_news_items', { status: 'verified' })];
      const items = J(l[0].content).items; const saved = resultsFor(messages, 'save_cover_svg').length; if (saved >= items.length) return [tu('submit_result', { summary: `${saved} portada(s)` })];
      return [tu('save_cover_svg', { news_id: items[saved].id, concept: 'Fondo negro con acento azul y violeta, titular grande', text_overlay: 'FICHAJE BOMBA', svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720"><rect width="1280" height="720" fill="#05060f"/><text x="60" y="360" font-size="96" fill="#1f6bff">FICHAJE BOMBA</text></svg>' })];
    }
    if (mine('Eres DATA BOSS')) { const q = resultsFor(messages, 'query_history'); if (!q.length) return [tu('query_history', {})]; return [tu('submit_result', { summary: 'No hay datos reales de rendimiento; no se puede comparar.', limitations: 'Sin conectores ni historial' })]; }
    if (mine('Eres IDEA STORM')) {
      const l = resultsFor(messages, 'list_news_items'); if (!l.length) return [tu('list_news_items', { status: 'verified' })];
      const items = J(l[0].content).items; const added = resultsFor(messages, 'calendar_add').length; if (added >= items.length) return [tu('submit_result', { summary: `${added} programados`, limitations: 'Sin historial real: horario por criterio, no por datos' })];
      return [tu('calendar_add', { slot: 'morning', day: new Date().toISOString().slice(0, 10), news_id: items[added].id, platform: 'youtube_shorts' })];
    }
    return [text('ok')];
  };
  return {
    name: 'anthropic', calls, isConfigured: () => true,
    async complete({ model, system, messages, tools, maxTokens }) {
      const blocks = policy({ system, messages, tools: tools ?? [] }); calls.push({ model, system: system.slice(0, 40), tools: (tools ?? []).map((t) => t.name), maxTokens }); onCall?.(calls.at(-1));
      const hasTool = blocks.some((b) => b.type === 'tool_use');
      return { content: blocks, stopReason: hasTool ? 'tool_use' : 'end_turn', model, usage: { input: usage.input, output: usage.output, cacheRead: 0, cacheWrite: 0, webSearches: 0 } };
    },
  };
}

export async function makeEnv({ budget = null, provider = {}, authorize = true, killed = false, doneHoldMs = 50, errorHoldMs = 50 } = {}) {
  const fx = await startFixtureServer();
  const cfg = loadConfig({}, { dataDir: ':memory:', staticDir: '/nonexistent', limits: { maxConcurrentTasks: 3 } });
  const fake = makeFakeProvider({ port: fx.port, ...provider });
  const built = await buildApp({ cfg, testHooks: { allowPrivateFetch: true, rssBase: `http://127.0.0.1:${fx.port}/rss`, doneHoldMs, errorHoldMs }, providersOverride: null });
  built.providers.registerForTests('anthropic', fake);
  if (budget) built.db.prepare("INSERT INTO settings(key,value_json,updated_at) VALUES('budget',?,?)").run(JSON.stringify(budget), now());
  if (authorize) grantAuthorization(built.db, 'provider', 'anthropic', 'prueba');
  if (killed) built.db.prepare("INSERT INTO settings(key,value_json,updated_at) VALUES('killSwitch','true',?)").run(now());
  built.orch.refreshStates();
  built.db.prepare('INSERT INTO users(username,pass_hash,created_at) VALUES(?,?,?)').run('jefe', hashPassword('clave-de-prueba-segura'), now());
  return { ...built, fx, fake, close: async () => { await built.app.close(); await fx.close(); } };
}
export async function waitFor(fn, { timeout = 8000, step = 20 } = {}) { const t0 = Date.now(); for (;;) { const v = await fn(); if (v) return v; if (Date.now() - t0 > timeout) throw new Error('waitFor: tiempo agotado'); await new Promise((r) => setTimeout(r, step)); } }
