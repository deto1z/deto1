import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { makeEnv, waitFor } from './helpers.js';
import { openDb } from '../src/db.js';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { grantAuthorization } from '../src/security.js';

const ORDER = 'Busca las cinco mejores oportunidades de contenido viral sobre fútbol y noticias de hoy';
const q = (env, sql, ...a) => env.db.prepare(sql).all(...a);
async function run(env, text = ORDER) {
  const events = []; env.orch.bus.on('event', (e) => events.push(e));
  const conv = env.orch.newConversation('Prueba'); const r = await env.orch.ownerMessage(conv, text); await r.done;
  // terminado = hay tareas, ninguna abierta, y TITAN ya entregó su informe final (segundo mensaje suyo)
  await waitFor(() => q(env, 'SELECT 1 FROM tasks').length > 0 && q(env, "SELECT 1 FROM tasks WHERE status IN ('queued','working','reviewing')").length === 0 && q(env, "SELECT 1 FROM messages WHERE role='titan'").length >= 2, { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 150));
  return { events, conv };
}

test('flujo completo: orden del Jefe → TITAN crea el encargo → 6 agentes colaboran → revisión → propuesta pendiente', async () => {
  const env = await makeEnv(); const { events, conv } = await run(env);
  const tasks = q(env, 'SELECT * FROM tasks ORDER BY id');
  assert.deepEqual(tasks.map((t) => t.agent), ['viral-hunter', 'filter-x', 'hook-master', 'pixel-queen', 'data-boss', 'idea-storm']);
  assert.ok(tasks.every((t) => t.status === 'done'), JSON.stringify(tasks.map((t) => [t.agent, t.status, t.error])));
  assert.deepEqual(JSON.parse(tasks[1].depends_on_json), [tasks[0].id]); assert.deepEqual(JSON.parse(tasks[5].depends_on_json), [tasks[2].id, tasks[3].id, tasks[4].id]);
  const news = q(env, 'SELECT verification_status s FROM news_items ORDER BY id').map((n) => n.s); assert.deepEqual([...news].sort(), ['rumor', 'verified']);
  assert.equal(q(env, 'SELECT * FROM content_items').length, 11); assert.equal(q(env, 'SELECT * FROM covers').length, 1); assert.equal(q(env, 'SELECT * FROM calendar_entries').length, 1);
  const props = q(env, 'SELECT * FROM proposals'); assert.equal(props.length, 1); assert.equal(props[0].status, 'pending');
  const d = JSON.parse(props[0].data_json); assert.equal(d.hooks.length, 5); assert.equal(d.scripts.length, 4); assert.ok(d.verified_sources[0].url.startsWith('http://127.0.0.1')); assert.match(d.publish_status, /NO PUBLICADO/); assert.equal(d.verified_sources[0].corroborating_urls.length, 1);
  const msgs = q(env, 'SELECT role,content FROM messages WHERE conversation_id=? ORDER BY id', conv); assert.equal(msgs[0].role, 'owner'); assert.ok(msgs.some((m) => m.role === 'titan' && /Jefe/.test(m.content)));
  // estados reales en orden: working → reviewing → done (→ available)
  const seq = events.filter((e) => e.type === 'agent_state' && e.agent === 'viral-hunter').map((e) => e.status); assert.ok(seq.indexOf('working') < seq.indexOf('reviewing') && seq.indexOf('reviewing') < seq.indexOf('done'), seq.join(','));
  // costos reales registrados por cada llamada
  const u = q(env, 'SELECT * FROM ai_usage'); assert.ok(u.length >= 14 && u.every((x) => x.cost_usd > 0)); assert.ok(u.some((x) => x.purpose === 'review') && u.some((x) => x.purpose === 'finalize') && u.some((x) => x.purpose === 'owner_turn'));
  const sumTasks = q(env, 'SELECT SUM(cost_usd) s FROM tasks')[0].s, sumAll = q(env, 'SELECT SUM(cost_usd) s FROM ai_usage')[0].s; assert.ok(sumAll >= sumTasks && sumTasks > 0);
  // nada se publicó y todo quedó auditado
  assert.equal(q(env, "SELECT 1 FROM audit_log WHERE action LIKE '%publica%'").length, 0); assert.ok(q(env, "SELECT 1 FROM audit_log WHERE action='propuesta.creada'").length === 1);
  await env.close();
});

test('aprobar/rechazar/mejorar: decisión registrada, aprobar NO publica, no se decide dos veces', async () => {
  const env = await makeEnv(); await run(env); const id = q(env, 'SELECT id FROM proposals')[0].id;
  const r = await env.orch.decide(id, 'approve', 'ok'); assert.equal(r.status, 'approved'); await assert.rejects(() => env.orch.decide(id, 'reject', 'x'), /ya fue/);
  const a = q(env, "SELECT action FROM audit_log WHERE target=?", `proposal:${id}`).map((x) => x.action); assert.ok(a.includes('propuesta.approved')); assert.ok(!a.some((x) => /publi/.test(x)));
  await assert.rejects(() => env.orch.decide(id, 'borrar', ''), /ya fue|inválida/); await env.close();
});

test('supervisión: TITAN X pide una corrección, el agente la rehace y luego se acepta', async () => {
  const env = await makeEnv({ provider: { correctOnce: 'Investigar oportunidades' } }); await run(env);
  const vh = q(env, "SELECT * FROM tasks WHERE agent='viral-hunter'")[0]; assert.equal(vh.attempt, 2); assert.equal(vh.status, 'done');
  assert.ok(q(env, "SELECT 1 FROM task_events WHERE task_id=? AND type='review' AND data_json LIKE '%correct%'", vh.id).length === 1); assert.ok(q(env, "SELECT 1 FROM task_events WHERE task_id=? AND type='review' AND data_json LIKE '%accept%'", vh.id).length === 1); await env.close();
});

test('error real de un agente: estado ROJO, dependientes canceladas, error registrado y TITAN lo informa', async () => {
  const env = await makeEnv({ provider: { failAgent: 'viral-hunter' }, errorHoldMs: 60_000 }); const { events } = await run(env);
  const t = q(env, 'SELECT agent,status,error FROM tasks ORDER BY id'); assert.equal(t[0].status, 'error'); assert.match(t[0].error, /fallo simulado/); assert.ok(t.slice(1).every((x) => x.status === 'cancelled'), JSON.stringify(t));
  assert.equal(q(env, "SELECT status FROM agent_state WHERE agent='viral-hunter'")[0].status, 'error'); assert.ok(q(env, 'SELECT 1 FROM errors').length >= 1);
  assert.ok(events.some((e) => e.type === 'agent_state' && e.agent === 'viral-hunter' && e.status === 'error')); assert.equal(q(env, 'SELECT 1 FROM proposals').length, 0);
  assert.ok(q(env, "SELECT 1 FROM messages WHERE role='titan'").length >= 1); await env.close();
});

test('control de costos: presupuesto agotado detiene al agente ANTES de gastar', async () => {
  const env = await makeEnv({ budget: { perTaskUsd: 0.0001, dailyUsd: 100, monthlyUsd: 100, perRunUsd: 100 } });
  const conv = env.orch.newConversation('x'); const r = await env.orch.ownerMessage(conv, ORDER); await r.done.catch(() => {});
  await waitFor(() => q(env, 'SELECT 1 FROM messages WHERE conversation_id=? AND role=?', conv, 'system').length >= 1 || q(env, "SELECT 1 FROM tasks WHERE status='error'").length >= 1);
  assert.equal(q(env, 'SELECT 1 FROM ai_usage').length, 0, 'no se gastó nada'); assert.ok(q(env, "SELECT 1 FROM messages WHERE role='system' AND content LIKE '%Presupuesto%'").length >= 1); await env.close();
});

test('sin proveedor autorizado: no hay respuestas ni tareas inventadas; los agentes figuran DESCONECTADOS', async () => {
  const env = await makeEnv({ authorize: false }); const conv = env.orch.newConversation('x'); const r = await env.orch.ownerMessage(conv, ORDER); assert.equal(r.thinking, false);
  const m = q(env, 'SELECT role,content FROM messages WHERE conversation_id=? ORDER BY id', conv); assert.deepEqual(m.map((x) => x.role), ['owner', 'system']); assert.match(m[1].content, /No hay ningún proveedor/);
  assert.equal(q(env, 'SELECT 1 FROM tasks').length, 0); assert.equal(q(env, 'SELECT 1 FROM ai_usage').length, 0); assert.equal(env.fake.calls.length, 0);
  assert.ok(q(env, 'SELECT status FROM agent_state').every((a) => a.status === 'offline')); await env.close();
});

test('interruptor de emergencia: ninguna llamada ocurre mientras está activo', async () => {
  const env = await makeEnv({ killed: true }); const conv = env.orch.newConversation('x'); await env.orch.ownerMessage(conv, ORDER); assert.equal(env.fake.calls.length, 0);
  assert.match(q(env, "SELECT content FROM messages WHERE role='system'")[0].content, /interruptor/i); await env.close();
});

test('detener tareas: cancela lo pendiente y en curso', async () => {
  const env = await makeEnv(); const conv = env.orch.newConversation('x'); const r = await env.orch.ownerMessage(conv, ORDER); await r.done;
  const n = env.orch.stopAll(); assert.ok(n >= 1); await waitFor(() => q(env, "SELECT 1 FROM tasks WHERE status IN ('queued','working','reviewing')").length === 0, { timeout: 8000 });
  assert.ok(q(env, "SELECT 1 FROM tasks WHERE status='cancelled'").length >= 1); await env.close();
});

test('persistencia: los datos sobreviven al cierre y reinicio; tareas a medias se marcan interrumpidas', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'det-')); const file = path.join(dir, 'detonador.db');
  const env = await makeEnv(); await run(env);
  // copiar a un archivo real: exportar las tablas clave
  const real = openDb(file); for (const t of ['news_items', 'content_items', 'proposals', 'ai_usage']) { const rows = env.db.prepare(`SELECT * FROM ${t}`).all(); for (const r of rows) real.prepare(`INSERT INTO ${t}(${Object.keys(r).join(',')}) VALUES(${Object.keys(r).map(() => '?').join(',')})`).run(...Object.values(r)); }
  real.prepare("INSERT INTO tasks(agent,title,instructions,status,created_at) VALUES('hook-master','x','y','working','t')").run(); real.close(); await env.close();
  const cfg = loadConfig({}, { dataDir: dir, staticDir: '/nope' }); const again = await buildApp({ cfg });
  assert.equal(again.db.prepare('SELECT COUNT(*) c FROM proposals').get().c, 1); assert.equal(again.db.prepare('SELECT COUNT(*) c FROM news_items').get().c, 2); assert.ok(again.db.prepare('SELECT COUNT(*) c FROM ai_usage').get().c >= 14);
  assert.match(again.db.prepare("SELECT error FROM tasks WHERE title='x'").get().error, /reinicio/); await again.app.close(); fs.rmSync(dir, { recursive: true, force: true });
});

test('memoria: TITAN guarda preferencias y las recibe en su contexto', async () => {
  const env = await makeEnv(); const { setPreference, buildContext, addMemoryNote } = await import('../src/memory.js');
  setPreference(env.db, 'tono', 'directo y sin rodeos'); addMemoryNote(env.db, 'lesson', 'Los videos de fichajes por la mañana rindieron mejor'); const ctx = buildContext(env.db);
  assert.match(ctx, /tono: directo y sin rodeos/); assert.match(ctx, /fichajes por la mañana/); assert.ok(env.db.prepare("SELECT 1 FROM memory_fts WHERE memory_fts MATCH 'fichajes'").get()); assert.throws(() => setPreference(env.db, '', 'x')); await env.close();
});

test('propuestas: el servidor rechaza contenido que el modelo inventa (IDs ajenos, noticia sin verificar, sin portada)', async () => {
  const env = await makeEnv(); const { buildProposal } = await import('../src/proposals.js');
  env.db.prepare("INSERT INTO news_items(id,title,url,fetched_at,verification_status) VALUES(1,'a','https://a.com/1','x','unverified'),(2,'b','https://b.com/2','x','verified')").run();
  const base = { topic: 't', why_it_works: 'w', hook_ids: [1, 2, 3, 4, 5], script_ids: [6], title_ids: [7], cover_id: 1, platform: 'tiktok', slot: 'morning', day: '2026-11-22', history_note: 'sin datos' };
  assert.throws(() => buildProposal(env.db, { ...base, news_id: 1 }, {}), /no está verificada/); assert.throws(() => buildProposal(env.db, { ...base, news_id: 99 }, {}), /inexistente/);
  assert.throws(() => buildProposal(env.db, { ...base, news_id: 2 }, {}), /no existen|no pertenecen/); await env.close();
});
