import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createAnthropicProvider, RefusalError } from '../src/providers/anthropic.js';
import { createOpenAICompatProvider } from '../src/providers/openaiCompat.js';

async function fakeApi(handler) {
  const seen = []; const srv = http.createServer((req, res) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => { const body = b ? JSON.parse(b) : {}; seen.push({ url: req.url, headers: req.headers, body }); const out = handler(body, req); res.writeHead(out.status ?? 200, { 'content-type': 'application/json' }); res.end(JSON.stringify(out.json)); }); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r)); return { url: `http://127.0.0.1:${srv.address().port}`, seen, close: () => { srv.closeAllConnections?.(); return new Promise((r) => srv.close(r)); } };
}
const msg = (o = {}) => ({ id: 'msg_1', type: 'message', role: 'assistant', model: 'claude-opus-5-5', content: [{ type: 'text', text: 'hola' }], stop_reason: 'end_turn', usage: { input_tokens: 120, output_tokens: 30, cache_read_input_tokens: 5, cache_creation_input_tokens: 7 }, ...o });

test('Claude: la solicitud sigue el contrato vigente (sin temperature ni tool_choice forzado; esfuerzo; herramientas; respaldo)', async () => {
  const api = await fakeApi(() => ({ json: msg({ content: [{ type: 'tool_use', id: 'tu1', name: 'fetch_url', input: { url: 'https://a.com' } }], stop_reason: 'tool_use' }) }));
  const p = createAnthropicProvider({ apiKey: 'sk-ant-test', baseURL: api.url, fallbacks: true });
  const r = await p.complete({ model: 'claude-opus-5-5', system: 'sys', messages: [{ role: 'user', content: 'x' }], tools: [{ name: 'fetch_url', description: 'd', input_schema: { type: 'object', properties: {} } }], maxTokens: 1000, effort: 'low' });
  const s = api.seen[0]; assert.equal(s.headers.authorization, 'Bearer sk-ant-test'); assert.ok(s.headers['anthropic-version']); assert.match(s.headers['anthropic-beta'] ?? '', /server-side-fallback/);
  assert.equal(s.body.model, 'claude-opus-5-5'); assert.equal(s.body.max_tokens, 1000); assert.equal(s.body.system, 'sys'); assert.deepEqual(s.body.output_config, { effort: 'low' }); assert.equal(s.body.fallbacks, 'default');
  for (const k of ['temperature', 'top_p', 'top_k', 'tool_choice', 'thinking']) assert.ok(!(k in s.body), `no debe enviar ${k}`);
  assert.equal(s.body.tools[0].name, 'fetch_url'); assert.deepEqual(r.usage, { input: 120, output: 30, cacheRead: 5, cacheWrite: 7, webSearches: 0 }); assert.equal(r.content[0].type, 'tool_use'); assert.equal(r.stopReason, 'tool_use'); await api.close();
});
test('Claude: con respaldo desactivado usa la solicitud normal; refusal se trata como error explícito', async () => {
  const api = await fakeApi((b) => (b.messages[0].content === 'rechazame' ? { json: msg({ stop_reason: 'refusal', stop_details: { type: 'refusal', category: 'cyber' }, content: [] }) } : { json: msg() }));
  const p = createAnthropicProvider({ apiKey: 'k', baseURL: api.url, fallbacks: false }); await p.complete({ model: 'claude-opus-5-5', system: 's', messages: [{ role: 'user', content: 'x' }], maxTokens: 10 });
  assert.ok(!api.seen[0].headers['anthropic-beta']); assert.ok(!('fallbacks' in api.seen[0].body));
  await assert.rejects(() => p.complete({ model: 'claude-opus-5-5', system: 's', messages: [{ role: 'user', content: 'rechazame' }], maxTokens: 10 }), (e) => e instanceof RefusalError); await api.close();
});
test('Claude: sin clave el proveedor no está configurado y no llama a la red', async () => { const p = createAnthropicProvider({ apiKey: '' }); assert.equal(p.isConfigured(), false); await assert.rejects(() => p.complete({}), /sin clave/); });
test('compatible OpenAI (Ollama/otros): traduce mensajes y llamadas a herramientas en ambos sentidos', async () => {
  const api = await fakeApi(() => ({ json: { model: 'llama3', choices: [{ finish_reason: 'tool_calls', message: { content: null, tool_calls: [{ id: 'c1', type: 'function', function: { name: 'fetch_url', arguments: '{"url":"https://a.com"}' } }] } }], usage: { prompt_tokens: 50, completion_tokens: 9 } } }));
  const p = createOpenAICompatProvider({ baseUrl: `${api.url}/v1`, apiKey: '' });
  const r = await p.complete({ model: 'llama3', system: 'sys', messages: [{ role: 'user', content: 'hola' }, { role: 'assistant', content: [{ type: 'tool_use', id: 'c0', name: 'fetch_url', input: { url: 'x' } }] }, { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'c0', content: 'ok' }] }], tools: [{ name: 'fetch_url', description: 'd', input_schema: { type: 'object' } }], maxTokens: 100 });
  const b = api.seen[0].body; assert.equal(b.messages[0].role, 'system'); assert.equal(b.messages[2].tool_calls[0].function.name, 'fetch_url'); assert.equal(b.messages[3].role, 'tool'); assert.equal(b.tools[0].type, 'function');
  assert.deepEqual(r.content[0], { type: 'tool_use', id: 'c1', name: 'fetch_url', input: { url: 'https://a.com' } }); assert.equal(r.usage.input, 50); assert.ok(!api.seen[0].headers.authorization); await api.close();
});
