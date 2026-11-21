import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import fastifyMultipart from '@fastify/multipart';
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig } from './config.js';
import { openDb, now, parse, getSetting, setSetting } from './db.js';
import { hashPassword, verifyPassword, createSession, getSession, destroySession, loginLocked, recordLogin, audit, verifyAuditChain, grantAuthorization, revokeAuthorization, isAuthorized, sniffFile, safeStoredName, sha256, passwordProblem } from './security.js';
import { createProviders } from './providers/index.js';
import { createOrchestrator } from './orchestrator.js';
import { costSummary, setBudget, setKillSwitch, isKilled, getPricing } from './costs.js';
import { listProposals } from './proposals.js';
import { listPreferences, setPreference, deletePreference, learnFromResults } from './memory.js';
import { seedRoutines, listRoutines, updateRoutine, startScheduler } from './scheduler.js';
import { AGENT_DEFS, AGENT_IDS } from './agents.js';
import { hasPublishTool } from './tools/index.js';

/* Elementos que el propietario puede autorizar. Nada de pago funciona sin esto. */
export const AUTH_CATALOG = {
  provider: { anthropic: 'IA de Claude (Anthropic) — de pago por uso', openai_compat: 'IA compatible/local (p. ej. Ollama) — gratis o de pago según proveedor' },
  tool: { brave_search: 'Búsqueda web Brave — de pago por uso', youtube_data: 'YouTube Data API — gratis dentro de la cuota diaria' },
  automation: { routines: 'Ejecución automática de las 3 rutinas diarias' },
  connector: { youtube: 'Cuenta de YouTube (lectura de estadísticas)', facebook: 'Facebook (lectura de estadísticas)', instagram: 'Instagram (lectura de estadísticas)', tiktok: 'TikTok (lectura de estadísticas)' },
};

export async function buildApp({ cfg = loadConfig(), db = null, testHooks = {}, providersOverride = null, anthropicBaseURL = null, scheduler = false, logger = false } = {}) {
  db ??= openDb(cfg.dataDir === ':memory:' ? ':memory:' : path.join(cfg.dataDir, 'detonador.db'));
  seedRoutines(db, cfg.tz);
  const providers = providersOverride ?? createProviders(cfg, db, { anthropicBaseURL });
  const orch = createOrchestrator({ db, cfg, providers, testHooks });
  const recovered = orch.recover();
  const app = Fastify({ logger, bodyLimit: 1_000_000, trustProxy: false });
  await app.register(fastifyCookie);
  await app.register(fastifyRateLimit, { global: true, max: 600, timeWindow: '1 minute' });
  await app.register(fastifyMultipart, { limits: { fileSize: cfg.limits.maxUploadBytes, files: 3, fields: 5 } });

  const ip = (req) => req.ip;
  app.addHook('onSend', async (req, reply) => {                       // cabeceras de seguridad
    reply.header('x-content-type-options', 'nosniff'); reply.header('x-frame-options', 'DENY'); reply.header('referrer-policy', 'no-referrer');
    reply.header('permissions-policy', 'camera=(), geolocation=(), payment=()');
    reply.header('content-security-policy', "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self' blob: data:; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    if (req.url.startsWith('/api/')) reply.header('cache-control', 'no-store');
  });
  const PUBLIC = new Set(['/api/auth/login', '/api/health']);
  app.addHook('preHandler', async (req, reply) => {
    if (!req.url.startsWith('/api/')) return;
    const route = req.url.split('?')[0];
    if (PUBLIC.has(route)) return;
    const s = getSession(db, req.cookies?.detonador_session);
    if (!s) return reply.code(401).send({ error: 'No autenticado' });
    req.session = s;
    if (!['GET', 'HEAD'].includes(req.method)) {
      const origin = req.headers.origin; if (origin && new URL(origin).host !== req.headers.host) return reply.code(403).send({ error: 'Origen no permitido' });
      if (req.headers['x-csrf-token'] !== s.csrf) return reply.code(403).send({ error: 'CSRF inválido' });
    }
  });
  const wrap = (fn) => async (req, reply) => { try { return await fn(req, reply); } catch (e) { return reply.code(e.statusCode ?? 400).send({ error: e.message }); } };

  /* ───── Auth ───── */
  app.get('/api/health', async () => ({ ok: true, name: 'DETONADOR AI EMPIRE', phase: 3, usersConfigured: !!db.prepare('SELECT 1 FROM users LIMIT 1').get() }));
  app.post('/api/auth/login', { config: { rateLimit: { max: 15, timeWindow: '10 minutes' } } }, wrap(async (req, reply) => {
    const { username = '', password = '' } = req.body ?? {}; const key = `${ip(req)}|${String(username).toLowerCase()}`;
    if (loginLocked(db, key, cfg.limits)) { audit(db, { actor: 'anónimo', action: 'login.bloqueado', target: String(username).slice(0, 40), ip: ip(req) }); return reply.code(429).send({ error: `Demasiados intentos. Espera ${cfg.limits.loginLockMinutes} minutos.` }); }
    const u = db.prepare('SELECT * FROM users WHERE username=?').get(String(username).toLowerCase());
    const ok = !!u && verifyPassword(String(password), u.pass_hash);
    recordLogin(db, key, ok);
    if (!ok) { audit(db, { actor: 'anónimo', action: 'login.fallido', target: String(username).slice(0, 40), ip: ip(req) }); return reply.code(401).send({ error: 'Usuario o contraseña incorrectos' }); }
    const s = createSession(db, u.id, { ip: ip(req), ua: req.headers['user-agent'], ttlHours: cfg.sessionTtlHours });
    reply.setCookie('detonador_session', s.token, { httpOnly: true, sameSite: 'strict', secure: cfg.secureCookies, path: '/', maxAge: cfg.sessionTtlHours * 3600 });
    audit(db, { actor: u.username, action: 'login.correcto', ip: ip(req) });
    return { user: u.username, csrf: s.csrf };
  }));
  app.post('/api/auth/logout', wrap(async (req, reply) => { destroySession(db, req.cookies.detonador_session); reply.clearCookie('detonador_session', { path: '/' }); audit(db, { actor: 'propietario', action: 'logout', ip: ip(req) }); return { ok: true }; }));
  app.get('/api/me', async (req) => ({ user: db.prepare('SELECT username FROM users WHERE id=?').get(req.session.user_id).username, csrf: req.session.csrf }));

  /* ───── Estado general ───── */
  const status = () => ({
    providers: providers.status(),
    keysPresent: { brave: !!cfg.keys.brave, youtube: !!cfg.keys.youtube },                       // solo booleanos: las claves no salen del servidor
    authorizations: db.prepare('SELECT kind,name,granted_at FROM authorizations WHERE revoked_at IS NULL').all(),
    catalog: AUTH_CATALOG, killSwitch: isKilled(db), publishToolPresent: hasPublishTool(),         // siempre false en esta fase
    recoveredTasks: recovered, auditChain: verifyAuditChain(db), nodeVersion: process.version,
  });
  app.get('/api/status', async () => ({ ...status(), ...orch.snapshot() }));
  app.get('/api/events', async (req, reply) => {
    reply.hijack(); const raw = reply.raw;
    raw.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive', 'x-accel-buffering': 'no' });
    const send = (e) => raw.write(`data: ${JSON.stringify(e)}\n\n`);
    send({ type: 'snapshot', ts: now(), ...orch.snapshot(), killSwitch: isKilled(db) });
    const on = (e) => send(e); orch.bus.on('event', on); const hb = setInterval(() => raw.write(': ping\n\n'), 20_000);
    req.raw.on('close', () => { clearInterval(hb); orch.bus.off('event', on); });
  });

  /* ───── Conversaciones ───── */
  app.get('/api/conversations', async () => db.prepare('SELECT * FROM conversations ORDER BY updated_at DESC LIMIT 100').all());
  app.post('/api/conversations', wrap(async (req) => ({ id: orch.newConversation(String(req.body?.title ?? 'Nueva conversación').slice(0, 80)) })));
  app.get('/api/conversations/:id/messages', async (req) => db.prepare('SELECT * FROM messages WHERE conversation_id=? ORDER BY id').all(+req.params.id).map((m) => ({ ...m, attachments: parse(m.attachments_json) })));
  app.post('/api/conversations/:id/messages', { config: { rateLimit: { max: 40, timeWindow: '1 minute' } } }, wrap(async (req) => {
    const id = +req.params.id; if (!db.prepare('SELECT 1 FROM conversations WHERE id=?').get(id)) throw Object.assign(new Error('Conversación inexistente'), { statusCode: 404 });
    const up = (req.body?.uploadIds ?? []).map((u) => db.prepare('SELECT id,original_name,mime,size FROM uploads WHERE id=?').get(+u)).filter(Boolean);
    const r = await orch.ownerMessage(id, String(req.body?.text ?? ''), { attachments: up.length ? { files: up } : null });
    return { accepted: r.accepted, thinking: r.thinking };
  }));

  /* ───── Tareas, propuestas ───── */
  app.get('/api/tasks', async (req) => db.prepare(`SELECT id,root_id,agent,title,status,steps,tool_calls,error,cost_usd,attempt,created_at,started_at,finished_at FROM tasks ${req.query.status ? 'WHERE status=?' : ''} ORDER BY id DESC LIMIT 100`).all(...(req.query.status ? [req.query.status] : [])));
  app.get('/api/tasks/:id', wrap(async (req) => { const t = orch.getTask(+req.params.id); if (!t) throw Object.assign(new Error('No existe'), { statusCode: 404 }); return { ...t, result: parse(t.result_json), result_json: undefined, transcript_json: undefined, events: db.prepare('SELECT ts,type,data_json FROM task_events WHERE task_id=? ORDER BY id').all(t.id).map((e) => ({ ts: e.ts, type: e.type, data: parse(e.data_json) })) }; }));
  app.post('/api/tasks/:id/cancel', wrap(async (req) => ({ cancelled: orch.cancelTask(+req.params.id) })));
  app.post('/api/stop-all', wrap(async () => ({ cancelled: orch.stopAll() })));
  app.get('/api/proposals', async (req) => listProposals(db, req.query.status));
  app.post('/api/proposals/:id/decision', wrap(async (req) => orch.decide(+req.params.id, String(req.body?.decision), String(req.body?.notes ?? '').slice(0, 1000), 'propietario')));

  /* ───── Costos y autorizaciones ───── */
  app.get('/api/costs', async () => costSummary(db, cfg));
  app.put('/api/budget', wrap(async (req) => setBudget(db, req.body ?? {}, 'propietario')));
  app.post('/api/kill-switch', wrap(async (req) => { setKillSwitch(db, !!req.body?.on, String(req.body?.reason ?? 'manual').slice(0, 100)); if (req.body?.on) orch.stopAll(); orch.refreshStates(); return { killSwitch: isKilled(db) }; }));
  app.put('/api/pricing', wrap(async (req) => { const { model, in: i, out, cacheRead = 0, cacheWrite = 0 } = req.body ?? {}; if (!/^[\w.:-]{3,60}$/.test(model ?? '') || [i, out, cacheRead, cacheWrite].some((x) => !Number.isFinite(x) || x < 0 || x > 1000)) throw new Error('Precio inválido'); const cur = getSetting(db, 'pricing', {}) ?? {}; cur[model] = { provider: req.body.provider ?? 'anthropic', in: i, out, cacheRead, cacheWrite, verified: false }; setSetting(db, 'pricing', cur); audit(db, { actor: 'propietario', action: 'precio.cambiado', target: model, detail: cur[model] }); return getPricing(db)[model]; }));
  app.get('/api/authorizations', async () => ({ catalog: AUTH_CATALOG, granted: db.prepare('SELECT kind,name,granted_at,note FROM authorizations WHERE revoked_at IS NULL').all() }));
  app.post('/api/authorizations', wrap(async (req) => {
    const { kind, name, confirm, note } = req.body ?? {};
    if (!AUTH_CATALOG[kind]?.[name]) throw new Error('Elemento no autorizable');
    if (confirm !== 'AUTORIZO') throw new Error('Debes escribir AUTORIZO para confirmar.');
    if (kind === 'provider' && !providers.get(name)?.isConfigured()) throw new Error('Ese proveedor no tiene clave/URL en el servidor (.env). Configúrala primero; las claves nunca se escriben en el navegador.');
    if (kind === 'tool' && !{ brave_search: cfg.keys.brave, youtube_data: cfg.keys.youtube }[name]) throw new Error('Esa herramienta no tiene clave en el servidor (.env).');
    grantAuthorization(db, kind, name, note); orch.refreshStates(); return { granted: true };
  }));
  app.delete('/api/authorizations/:kind/:name', wrap(async (req) => { revokeAuthorization(db, req.params.kind, req.params.name); if (req.params.kind === 'automation') db.prepare('UPDATE routines SET enabled=0').run(); orch.refreshStates(); return { revoked: true }; }));

  /* ───── Agentes, memoria, rutinas, biblioteca ───── */
  app.get('/api/agents', async () => AGENT_IDS.map((id) => ({ id, name: AGENT_DEFS[id].name, role: AGENT_DEFS[id].role, tools: AGENT_DEFS[id].tools, ...(({ model, effort, maxTokens, perTaskUsd }) => ({ model, effort, maxTokens, perTaskUsd }))({ ...AGENT_DEFS[id], ...(getSetting(db, 'agentConfig', {})?.[id] ?? {}) }) })));
  app.put('/api/agents/:id', wrap(async (req) => {
    const id = req.params.id; if (!AGENT_IDS.includes(id)) throw new Error('Agente inexistente'); const { model, effort, provider } = req.body ?? {};
    if (model && !getPricing(db)[model] && provider !== 'openai_compat') throw new Error('Ese modelo no tiene precio configurado: añade su precio primero (control de costos).');
    if (effort && !['low', 'medium', 'high'].includes(effort)) throw new Error('Esfuerzo inválido');
    const all = getSetting(db, 'agentConfig', {}) ?? {}; all[id] = { ...(all[id] ?? {}), ...(model ? { model } : {}), ...(effort ? { effort } : {}), ...(provider ? { provider } : {}) }; setSetting(db, 'agentConfig', all); audit(db, { actor: 'propietario', action: 'agente.configurado', target: id, detail: all[id] }); return all[id];
  }));
  app.get('/api/preferences', async () => listPreferences(db));
  app.put('/api/preferences', wrap(async (req) => { setPreference(db, String(req.body?.key), String(req.body?.value), 'owner_said'); audit(db, { actor: 'propietario', action: 'preferencia.guardada', target: String(req.body?.key) }); return { saved: true }; }));
  app.delete('/api/preferences/:key', wrap(async (req) => { deletePreference(db, req.params.key, 'propietario'); return { deleted: true }; }));
  app.get('/api/routines', async () => ({ routines: listRoutines(db), automationAuthorized: isAuthorized(db, 'automation', 'routines') }));
  app.put('/api/routines/:id', wrap(async (req) => updateRoutine(db, req.params.id, req.body ?? {})));
  app.get('/api/library/:kind', wrap(async (req) => {
    const q = { news: 'SELECT * FROM news_items ORDER BY id DESC LIMIT 100', content: 'SELECT * FROM content_items ORDER BY id DESC LIMIT 200', covers: 'SELECT id,task_id,news_id,concept_json,created_at FROM covers ORDER BY id DESC LIMIT 50', calendar: 'SELECT * FROM calendar_entries ORDER BY day DESC LIMIT 100', errors: 'SELECT * FROM errors ORDER BY id DESC LIMIT 100', results: 'SELECT * FROM post_results ORDER BY id DESC LIMIT 100', usage: 'SELECT * FROM ai_usage ORDER BY id DESC LIMIT 200' }[req.params.kind];
    if (!q) throw new Error('Tipo desconocido'); return db.prepare(q).all();
  }));
  app.post('/api/results', wrap(async (req) => {      // el propietario registra resultados REALES de publicaciones (hasta que haya conectores)
    const { platform, post_url, metrics } = req.body ?? {}; if (!['youtube_shorts', 'youtube', 'tiktok', 'instagram_reels', 'facebook_reels', 'x'].includes(platform) || typeof metrics !== 'object') throw new Error('Datos inválidos');
    db.prepare('INSERT INTO post_results(proposal_id,platform,post_url,metrics_json,collected_at,source) VALUES(?,?,?,?,?,?)').run(req.body.proposal_id ?? null, platform, String(post_url ?? '').slice(0, 500), JSON.stringify(metrics), now(), 'manual_owner'); learnFromResults(db); audit(db, { actor: 'propietario', action: 'resultado.registrado', target: platform }); return { saved: true };
  }));
  app.get('/api/audit', async (req) => ({ chain: verifyAuditChain(db), entries: db.prepare('SELECT id,ts,actor,action,target,detail_json,ip FROM audit_log ORDER BY id DESC LIMIT ?').all(Math.min(+req.query.limit || 100, 500)) }));

  /* ───── Archivos adjuntos (validados por firma, nombre aleatorio, fuera de la carpeta web) ───── */
  app.post('/api/uploads', wrap(async (req, reply) => {
    const out = [];
    for await (const part of req.files()) {
      const buf = await part.toBuffer(); if (part.file.truncated) throw new Error(`"${part.filename}" supera el tamaño máximo (${Math.round(cfg.limits.maxUploadBytes / 1048576)} MB)`);
      const kind = sniffFile(buf, part.filename ?? ''); if (!kind) throw new Error(`"${part.filename}": tipo de archivo no permitido (solo PNG, JPG, WEBP, PDF, TXT, CSV, MD, JSON válidos)`);
      const stored = safeStoredName(kind.ext), dir = path.join(cfg.dataDir === ':memory:' ? path.join(process.cwd(), '.tmp-uploads') : cfg.dataDir, 'uploads'); fs.mkdirSync(dir, { recursive: true, mode: 0o700 }); fs.writeFileSync(path.join(dir, stored), buf, { mode: 0o600 });
      const id = Number(db.prepare('INSERT INTO uploads(original_name,stored_name,mime,size,sha256,created_at) VALUES(?,?,?,?,?,?)').run(String(part.filename ?? 'archivo').replace(/[^\w.\- ]/g, '_').slice(0, 100), stored, kind.mime, buf.length, sha256(buf), now()).lastInsertRowid);
      audit(db, { actor: 'propietario', action: 'archivo.subido', target: `upload:${id}`, detail: { mime: kind.mime, size: buf.length } }); out.push({ id, name: part.filename, mime: kind.mime, size: buf.length });
    }
    if (!out.length) throw new Error('No se recibió ningún archivo'); return { uploads: out };
  }));

  /* ───── Interfaz web (producción: sirve la carpeta dist) ───── */
  if (fs.existsSync(cfg.staticDir)) {
    await app.register(fastifyStatic, { root: cfg.staticDir, wildcard: false, index: ['index.html'] });
    app.setNotFoundHandler((req, reply) => (req.url.startsWith('/api/') ? reply.code(404).send({ error: 'No existe' }) : reply.sendFile('index.html')));
  }

  const stopSched = scheduler ? startScheduler(db, orch) : () => {};
  app.addHook('onClose', async () => { stopSched(); orch.close(); });
  return { app, db, orch, providers, cfg };
}
