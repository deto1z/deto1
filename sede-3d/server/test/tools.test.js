import test from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv } from './helpers.js';
import { TOOL_DEFS, runTool, hasPublishTool } from '../src/tools/index.js';
import { sanitizeSvg, parseFeed } from '../src/tools/helpers.js';
import { grantAuthorization } from '../src/security.js';

const mk = async () => { const env = await makeEnv(); const ctx = (agent, allowed, extra = {}) => ({ db: env.db, cfg: env.cfg, taskId: null, rootId: null, agent, fetched: new Set(), seen: new Set(), billed: {}, counters: { toolCalls: 0 }, allowed, testHooks: { allowPrivateFetch: true, rssBase: `http://127.0.0.1:${env.fx.port}/rss` }, ...extra }); return { env, ctx }; };

test('NO existe ninguna herramienta de publicación', () => assert.equal(hasPublishTool(), false));
test('news_rss_search devuelve titulares reales del canal y registra las URLs vistas', async () => {
  const { env, ctx } = await mk(); const c = ctx('viral-hunter', ['news_rss_search']);
  const r = await runTool('news_rss_search', { query: 'fútbol' }, c); assert.ok(!r.isError, r.text); assert.equal(r.raw.items.length, 3); assert.ok(c.seen.has(r.raw.items[0].url)); await env.close();
});
test('save_news_item rechaza URLs inventadas, fechas futuras y esquemas raros', async () => {
  const { env, ctx } = await mk(); const c = ctx('viral-hunter', ['save_news_item']);
  const base = { title: 'T', source: 's', evidence_type: 'other', evidence: 'e' };
  let r = await runTool('save_news_item', { ...base, url: 'https://inventada.example/x', published_at: new Date().toISOString() }, c); assert.ok(r.isError && /no fue devuelta/.test(r.text));
  c.seen.add('https://ok.example/x'); r = await runTool('save_news_item', { ...base, url: 'https://ok.example/x', published_at: new Date(Date.now() + 5 * 86400_000).toISOString() }, c); assert.ok(r.isError && /fecha/i.test(r.text));
  r = await runTool('save_news_item', { ...base, url: 'javascript:alert(1)', published_at: new Date().toISOString() }, c); assert.ok(r.isError);
  r = await runTool('save_news_item', { ...base, url: 'https://ok.example/x', published_at: new Date().toISOString() }, c); assert.ok(!r.isError, r.text); await env.close();
});
test('set_verification: "verified" exige haber leído la original y una fuente de OTRO dominio', async () => {
  const { env, ctx } = await mk(); const vh = ctx('viral-hunter', ['news_rss_search', 'save_news_item']); const rss = await runTool('news_rss_search', { query: 'x' }, vh); const it = rss.raw.items[0];
  await runTool('save_news_item', { title: it.title, url: it.url, published_at: it.published_at, evidence_type: 'rss_multiple_outlets', evidence: 'varios' }, vh);
  const fx = ctx('filter-x', ['fetch_url', 'set_verification']);
  let r = await runTool('set_verification', { news_id: 1, status: 'verified', notes: 'n' }, fx); assert.ok(r.isError && /fuente original/.test(r.text));
  await runTool('fetch_url', { url: it.url }, fx); r = await runTool('set_verification', { news_id: 1, status: 'verified', notes: 'n', corroborating_urls: ['https://inventada.example/y'] }, fx); assert.ok(r.isError && /OTRO dominio/.test(r.text));
  r = await runTool('set_verification', { news_id: 1, status: 'verified', notes: 'n', corroborating_urls: [it.url.replace('127.0.0.1', 'localhost')] }, fx); assert.ok(r.isError, 'misma ruta no leída');   // no leída → rechazada
  const corr = `http://localhost:${env.fx.port}/b1`; await runTool('fetch_url', { url: corr }, fx); r = await runTool('set_verification', { news_id: 1, status: 'verified', notes: 'n', corroborating_urls: [corr] }, fx); assert.ok(!r.isError, r.text);
  assert.equal(env.db.prepare('SELECT verification_status s FROM news_items WHERE id=1').get().s, 'verified'); await env.close();
});
test('permisos por agente: una herramienta fuera de la lista se rechaza', async () => {
  const { env, ctx } = await mk(); const r = await runTool('set_verification', { news_id: 1, status: 'verified', notes: 'x' }, ctx('viral-hunter', ['news_rss_search'])); assert.ok(r.isError && /no permitida/.test(r.text)); await env.close();
});
test('herramientas de pago/API: sin clave o sin autorización devuelven error, nunca datos', async () => {
  const { env, ctx } = await mk(); const c = ctx('viral-hunter', ['brave_search', 'youtube_trending']);
  let r = await runTool('brave_search', { query: 'x' }, c); assert.ok(r.isError && /clave/.test(r.text));
  env.cfg.keys.brave = 'k'; r = await runTool('brave_search', { query: 'x' }, c); assert.ok(r.isError && /autorización/.test(r.text)); grantAuthorization(env.db, 'tool', 'brave_search', 't');
  r = await runTool('brave_search', { query: 'x' }, { ...c, cfg: env.cfg, testHooks: { ...c.testHooks, braveBase: `http://127.0.0.1:${env.fx.port}/brave` } }); assert.ok(r.isError, 'la API de ejemplo no existe: error real, no datos inventados'); await env.close();
});
test('fetch_url: bloquea destinos privados reales y contenido no permitido', async () => {
  const { env, ctx } = await mk(); const strict = { ...ctx('filter-x', ['fetch_url']), testHooks: {} };
  let r = await runTool('fetch_url', { url: 'http://127.0.0.1:1/' }, strict); assert.ok(r.isError && /no permitido|Destino/i.test(r.text));
  r = await runTool('fetch_url', { url: 'http://169.254.169.254/latest/meta-data' }, strict); assert.ok(r.isError);
  r = await runTool('fetch_url', { url: `http://127.0.0.1:${env.fx.port}/evil` }, ctx('filter-x', ['fetch_url'])); assert.ok(r.isError && /Tipo de contenido/.test(r.text));
  r = await runTool('fetch_url', { url: `http://127.0.0.1:${env.fx.port}/a1` }, ctx('filter-x', ['fetch_url'])); assert.ok(!r.isError); assert.ok(!r.raw.text.includes('alert(1)'), 'los scripts se eliminan del texto'); await env.close();
});
test('límites de ejecución: máximo de llamadas a herramientas por tarea', async () => {
  const { env, ctx } = await mk(); const c = ctx('viral-hunter', ['calendar_list']); c.counters.toolCalls = env.cfg.limits.maxToolCallsPerTask;
  const r = await runTool('calendar_list', {}, c); assert.ok(r.isError && /Límite/.test(r.text)); await env.close();
});
test('SVG: se sanean scripts, manejadores, enlaces y recursos externos', () => {
  assert.ok(sanitizeSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="5" height="5" fill="#fff"/></svg>'));
  for (const bad of ['<svg><script>alert(1)</script></svg>', '<svg onload="x()"><rect/></svg>', '<svg><image href="http://e.com/a.png"/></svg>', '<svg><a href="javascript:x"><rect/></a></svg>', '<svg><foreignObject><div/></foreignObject></svg>', '<svg><rect fill="url(http://e.com/x)"/></svg>', '<!DOCTYPE svg><svg/>', 'no es svg']) assert.equal(sanitizeSvg(bad), null, bad);
});
test('RSS: parseo de canal con CDATA y Atom', () => { const x = '<rss><channel><item><title><![CDATA[Hola &amp; adiós]]></title><link>https://a.com/1</link><pubDate>Mon, 01 Jan 2026 00:00:00 GMT</pubDate></item></channel></rss>'; assert.equal(parseFeed(x)[0].title, 'Hola & adiós'); });
test('contenido: guiones respetan el límite de palabras por duración; solo sobre noticias verificadas', async () => {
  const { env, ctx } = await mk(); env.db.prepare("INSERT INTO news_items(id,title,url,fetched_at,verification_status) VALUES(1,'t','https://a.com/1','x','verified'),(2,'u','https://a.com/2','x','unverified')").run();
  const c = ctx('hook-master', ['save_content_item']); let r = await runTool('save_content_item', { news_id: 2, kind: 'hook', text: 'x' }, c); assert.ok(r.isError && /verificad/.test(r.text));
  r = await runTool('save_content_item', { news_id: 1, kind: 'script', duration_sec: 15, text: 'palabra '.repeat(80) }, c); assert.ok(r.isError && /demasiado largo/.test(r.text));
  r = await runTool('save_content_item', { news_id: 1, kind: 'script', duration_sec: 15, text: 'palabra '.repeat(30) }, c); assert.ok(!r.isError, r.text);
  r = await runTool('save_content_item', { news_id: 1, kind: 'script', text: 'x' }, c); assert.ok(r.isError); r = await runTool('save_content_item', { news_id: 1, kind: 'hook', text: 'x'.repeat(300) }, c); assert.ok(r.isError); await env.close();
});
test('calendario: no repite temas ya programados', async () => {
  const { env, ctx } = await mk(); env.db.prepare("INSERT INTO news_items(id,title,url,fetched_at,verification_status) VALUES(1,'t','https://a.com/1','x','verified')").run();
  const c = ctx('idea-storm', ['calendar_add']); const a = { slot: 'morning', day: '2026-11-22', news_id: 1, platform: 'tiktok' }; let r = await runTool('calendar_add', a, c); assert.ok(!r.isError);
  r = await runTool('calendar_add', { ...a, slot: 'night' }, c); assert.ok(r.isError && /ya está programado/.test(r.text)); await env.close();
});
test('historial y métricas sociales: sin datos/conectores lo dicen, no inventan', async () => {
  const { env, ctx } = await mk(); const c = ctx('data-boss', ['query_history', 'social_metrics']);
  let r = await runTool('query_history', {}, c); assert.equal(r.raw.has_data, false); r = await runTool('social_metrics', { platform: 'youtube' }, c); assert.equal(r.raw.connected, false); await env.close();
});
