import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { makeEnv, waitFor } from './helpers.js';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { hashPassword } from '../src/security.js';
import { now } from '../src/db.js';

async function login(env, pass = 'clave-de-prueba-segura', ip = '10.1.1.1') {
  const r = await env.app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'jefe', password: pass }, remoteAddress: ip });
  const cookie = r.cookies.find((c) => c.name === 'detonador_session')?.value; return { r, cookie, csrf: r.json().csrf };
}
const call = (env, s, method, url, payload, extra = {}) => env.app.inject({ method, url, payload, cookies: { detonador_session: s.cookie }, headers: { 'x-csrf-token': s.csrf, ...extra } });

test('API protegida: sin sesión todo devuelve 401, salvo health y login', async () => {
  const env = await makeEnv(); for (const u of ['/api/status', '/api/costs', '/api/tasks', '/api/proposals', '/api/conversations', '/api/audit', '/api/events', '/api/library/news', '/api/preferences', '/api/authorizations']) assert.equal((await env.app.inject({ method: 'GET', url: u })).statusCode, 401, u);
  assert.equal((await env.app.inject({ method: 'GET', url: '/api/health' })).statusCode, 200); await env.close();
});
test('login: credenciales incorrectas → 401; 5 fallos → bloqueo 429; cookie httpOnly + SameSite=Strict', async () => {
  const env = await makeEnv(); const ok = await login(env, undefined, '10.9.9.1'); assert.equal(ok.r.statusCode, 200);
  const sc = ok.r.headers['set-cookie']; assert.match(sc, /HttpOnly/i); assert.match(sc, /SameSite=Strict/i);
  for (let i = 0; i < 5; i++) assert.equal((await login(env, 'mala', '10.9.9.2')).r.statusCode, 401);
  assert.equal((await login(env, 'clave-de-prueba-segura', '10.9.9.2')).r.statusCode, 429, 'bloqueado incluso con la clave correcta'); assert.ok(env.db.prepare("SELECT 1 FROM audit_log WHERE action='login.bloqueado'").get()); await env.close();
});
test('CSRF y origen: las acciones que cambian datos exigen token y el mismo origen', async () => {
  const env = await makeEnv(); const s = await login(env);
  assert.equal((await env.app.inject({ method: 'POST', url: '/api/conversations', payload: {}, cookies: { detonador_session: s.cookie } })).statusCode, 403);
  assert.equal((await call(env, s, 'POST', '/api/conversations', {}, { origin: 'https://evil.example', host: 'localhost:8787' })).statusCode, 403);
  assert.equal((await call(env, s, 'POST', '/api/conversations', { title: 'x' })).statusCode, 200); await env.close();
});
test('cabeceras de seguridad presentes; no hay ninguna ruta de publicación', async () => {
  const env = await makeEnv(); const r = await env.app.inject({ method: 'GET', url: '/api/health' });
  assert.equal(r.headers['x-content-type-options'], 'nosniff'); assert.equal(r.headers['x-frame-options'], 'DENY'); assert.match(r.headers['content-security-policy'], /default-src 'self'/); assert.match(r.headers['content-security-policy'], /frame-ancestors 'none'/);
  const routes = env.app.printRoutes({ commonPrefix: false }); assert.ok(!/publish|publicar/i.test(routes), 'no debe existir ruta de publicación'); await env.close();
});
test('autorizaciones: exigen escribir AUTORIZO y que la clave exista en el servidor', async () => {
  const cfg = loadConfig({}, { dataDir: ':memory:', staticDir: '/nope' }); const env = await buildApp({ cfg }); env.db.prepare('INSERT INTO users(username,pass_hash,created_at) VALUES(?,?,?)').run('jefe', hashPassword('clave-de-prueba-segura'), now());
  const s = await login(env);
  assert.equal((await call(env, s, 'POST', '/api/authorizations', { kind: 'provider', name: 'anthropic' })).statusCode, 400);
  const r = await call(env, s, 'POST', '/api/authorizations', { kind: 'provider', name: 'anthropic', confirm: 'AUTORIZO' }); assert.equal(r.statusCode, 400); assert.match(r.json().error, /clave/);
  assert.equal((await call(env, s, 'POST', '/api/authorizations', { kind: 'provider', name: 'inventado', confirm: 'AUTORIZO' })).statusCode, 400);
  assert.deepEqual((await call(env, s, 'GET', '/api/authorizations')).json().granted, []); await env.app.close();
});
test('las claves de API nunca salen del servidor: ninguna respuesta las contiene', async () => {
  const SECRET = 'sk-ant-SECRETO-no-debe-salir-123'; const cfg = loadConfig({ ANTHROPIC_API_KEY: SECRET, BRAVE_SEARCH_API_KEY: 'brave-SECRETO-456', YOUTUBE_API_KEY: 'yt-SECRETO-789' }, { dataDir: ':memory:', staticDir: '/nope' });
  const env = await buildApp({ cfg }); env.db.prepare('INSERT INTO users(username,pass_hash,created_at) VALUES(?,?,?)').run('jefe', hashPassword('clave-de-prueba-segura'), now()); const s = await login(env);
  const all = []; for (const u of ['/api/status', '/api/costs', '/api/authorizations', '/api/agents', '/api/audit', '/api/routines', '/api/me', '/api/library/errors', '/api/library/usage']) all.push((await call(env, s, 'GET', u)).body);
  const st = JSON.parse(all[0]); assert.equal(st.providers.anthropic.configured, true); assert.equal(st.keysPresent.brave, true);
  for (const b of all) for (const k of [SECRET, 'brave-SECRETO', 'yt-SECRETO']) assert.ok(!b.includes(k)); await env.app.close();
});
test('flujo por API: mensaje → tareas → propuesta → aprobar; costos y kill-switch', async () => {
  const env = await makeEnv(); const s = await login(env);
  const conv = (await call(env, s, 'POST', '/api/conversations', { title: 'c' })).json().id;
  const r = await call(env, s, 'POST', `/api/conversations/${conv}/messages`, { text: 'Busca las cinco mejores oportunidades de contenido viral sobre fútbol y noticias de hoy' }); assert.equal(r.json().accepted, true);
  await waitFor(async () => (await call(env, s, 'GET', '/api/proposals?status=pending')).json().length === 1, { timeout: 15000 });
  const st = (await call(env, s, 'GET', '/api/status')).json(); assert.equal(st.tasks.filter((t) => t.status === 'done').length, 6); assert.ok(st.agents.length >= 7); assert.equal(st.publishToolPresent, false); assert.ok(st.auditChain.ok);
  const p = (await call(env, s, 'GET', '/api/proposals')).json()[0]; assert.equal(p.data.hooks.length, 5);
  const costs = (await call(env, s, 'GET', '/api/costs')).json(); assert.ok(costs.spentToday > 0 && costs.byAgent.length >= 6 && costs.budget.dailyUsd > 0);
  assert.equal((await call(env, s, 'PUT', '/api/budget', { dailyUsd: -5 })).statusCode, 400); assert.equal((await call(env, s, 'PUT', '/api/budget', { dailyUsd: 7 })).json().dailyUsd, 7);
  const d = await call(env, s, 'POST', `/api/proposals/${p.id}/decision`, { decision: 'approve', notes: 'ok' }); assert.equal(d.json().status, 'approved'); assert.equal((await call(env, s, 'POST', `/api/proposals/${p.id}/decision`, { decision: 'reject' })).statusCode, 400);
  assert.equal((await call(env, s, 'POST', '/api/kill-switch', { on: true, reason: 'prueba' })).json().killSwitch, true); assert.equal((await call(env, s, 'GET', '/api/status')).json().killSwitch, true);
  const audit = (await call(env, s, 'GET', '/api/audit')).json(); assert.ok(audit.entries.some((e) => e.action === 'propuesta.approved') && audit.entries.some((e) => e.action === 'killswitch.activado')); await env.close();
});
test('subida de archivos: acepta PNG/TXT válidos; rechaza ejecutables disfrazados y archivos enormes', async () => {
  const env = await makeEnv(); const s = await login(env);
  const mp = (name, buf) => { const b = '----t'; return { payload: Buffer.concat([Buffer.from(`--${b}\r\nContent-Disposition: form-data; name="f"; filename="${name}"\r\nContent-Type: application/octet-stream\r\n\r\n`), buf, Buffer.from(`\r\n--${b}--\r\n`)]), headers: { 'content-type': `multipart/form-data; boundary=${b}`, 'x-csrf-token': s.csrf } }; };
  const up = (name, buf) => { const m = mp(name, buf); return env.app.inject({ method: 'POST', url: '/api/uploads', payload: m.payload, headers: m.headers, cookies: { detonador_session: s.cookie } }); };
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);
  assert.equal((await up('portada.png', png)).statusCode, 200); assert.equal((await up('notas.txt', Buffer.from('hola jefe'))).statusCode, 200);
  assert.equal((await up('virus.png', Buffer.from('MZ\x90\x00\x03 ejecutable'))).statusCode, 400); assert.equal((await up('pagina.html', Buffer.from('<html></html>'))).statusCode, 400);
  const big = await up('grande.png', Buffer.concat([png, Buffer.alloc(env.cfg.limits.maxUploadBytes + 10)])); assert.ok(big.statusCode >= 400);
  const files = env.db.prepare('SELECT stored_name FROM uploads').all(); assert.ok(files.every((f) => /^[0-9a-f]{32}\.(png|txt)$/.test(f.stored_name)), 'nombres aleatorios en disco'); await env.close();
});
test('tiempo real (SSE): el navegador recibe el estado inicial y los cambios de estado de los agentes', async () => {
  const env = await makeEnv(); const s = await login(env); await env.app.listen({ host: '127.0.0.1', port: 0 }); const port = env.app.server.address().port;
  const got = []; const req = http.get({ host: '127.0.0.1', port, path: '/api/events', headers: { cookie: `detonador_session=${s.cookie}` } }, (res) => { res.on('data', (c) => String(c).split('\n\n').forEach((l) => l.startsWith('data: ') && got.push(JSON.parse(l.slice(6))))); });
  await waitFor(() => got.some((e) => e.type === 'snapshot')); const snap = got.find((e) => e.type === 'snapshot'); assert.ok(snap.agents.length >= 7);
  const conv = env.orch.newConversation('x'); await env.orch.ownerMessage(conv, 'Busca las cinco mejores oportunidades de contenido viral sobre fútbol'); await waitFor(() => got.some((e) => e.type === 'agent_state' && e.agent === 'viral-hunter' && e.status === 'working') && got.some((e) => e.type === 'agent_state' && e.agent === 'viral-hunter' && e.status === 'reviewing'), { timeout: 10000 });
  req.destroy(); env.orch.stopAll(); await new Promise((r) => setTimeout(r, 100)); await env.close();
});
test('conexión SSE sin sesión es rechazada', async () => {
  const env = await makeEnv(); await env.app.listen({ host: '127.0.0.1', port: 0 }); const port = env.app.server.address().port;
  const code = await new Promise((res) => http.get({ host: '127.0.0.1', port, path: '/api/events' }, (r) => { res(r.statusCode); r.resume(); })); assert.equal(code, 401); await env.close();
});
