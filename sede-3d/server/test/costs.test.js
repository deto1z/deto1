import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/db.js';
import { loadConfig } from '../src/config.js';
import { costOf, getPricing, assertBudget, recordUsage, BudgetError, isKilled, setKillSwitch, setBudget, DEFAULT_PRICING, costSummary } from '../src/costs.js';

const cfg = loadConfig({}, { dataDir: ':memory:' });
test('cálculo de costo = tokens × precio oficial (Opus 5.5: $4/$20 por millón)', () => {
  const p = DEFAULT_PRICING['claude-opus-5-5'];
  assert.ok(Math.abs(costOf(p, { input: 1_000_000, output: 1_000_000 }) - 24) < 1e-9);
  assert.ok(Math.abs(costOf(p, { input: 100_000, output: 10_000, cacheRead: 50_000 }) - (0.4 + 0.2 + 0.01)) < 1e-9);
  assert.ok(Math.abs(costOf(p, { webSearches: 100 }) - 1) < 1e-9);          // $10 por 1000 búsquedas
});
test('presupuesto: bloquea ANTES de gastar si la peor estimación excede el límite por tarea', () => {
  const db = openDb(':memory:'); setBudget(db, { perTaskUsd: 0.01 }, 't');
  assert.throws(() => assertBudget(db, cfg, { model: 'claude-opus-5-5', provider: 'anthropic', estInputTokens: 50_000, maxOutputTokens: 4000, taskId: 1 }), (e) => e instanceof BudgetError && e.code === 'per_task');
});
test('límite diario: se bloquea y activa el interruptor de emergencia automáticamente', () => {
  const db = openDb(':memory:'); setBudget(db, { dailyUsd: 0.05, perTaskUsd: 5 }, 't');
  recordUsage(db, { provider: 'anthropic', model: 'claude-opus-5-5', usage: { input: 10_000, output: 2000 }, agent: 'x' });     // 0.08 USD
  assert.throws(() => assertBudget(db, cfg, { model: 'claude-opus-5-5', provider: 'anthropic', estInputTokens: 1000, maxOutputTokens: 500 }), (e) => e.code === 'daily');
  assert.ok(isKilled(db));
  assert.throws(() => assertBudget(db, cfg, { model: 'claude-opus-5-5', provider: 'anthropic', estInputTokens: 1, maxOutputTokens: 1 }), (e) => e.code === 'kill_switch');
  setKillSwitch(db, false, 'reinicio'); assert.ok(!isKilled(db));
});
test('modelo sin precio configurado: bloqueado por seguridad', () => {
  const db = openDb(':memory:'); assert.throws(() => assertBudget(db, cfg, { model: 'modelo-raro', provider: 'anthropic', estInputTokens: 1, maxOutputTokens: 1 }), (e) => e.code === 'no_price');
});
test('registro de gasto: acumula por tarea y resume por agente', () => {
  const db = openDb(':memory:'); db.prepare("INSERT INTO tasks(agent,title,instructions,status,created_at) VALUES('a','t','i','working','x')").run();
  recordUsage(db, { provider: 'anthropic', model: 'claude-haiku-5-5', usage: { input: 1_000_000, output: 0 }, taskId: 1, agent: 'a' }); recordUsage(db, { provider: 'anthropic', model: 'claude-haiku-5-5', usage: { input: 0, output: 1_000_000 }, taskId: 1, agent: 'a' });
  assert.ok(Math.abs(db.prepare('SELECT cost_usd c FROM tasks WHERE id=1').get().c - 0.6) < 1e-9);
  const s = costSummary(db, cfg); assert.equal(s.byAgent[0].agent, 'a'); assert.ok(Math.abs(s.spentToday - 0.6) < 1e-6);
});
test('valores de presupuesto inválidos se rechazan', () => { const db = openDb(':memory:'); assert.throws(() => setBudget(db, { dailyUsd: -1 }, 't')); assert.throws(() => setBudget(db, { dailyUsd: 'abc' }, 't')); });
test('los precios por defecto proceden de la fuente oficial y están marcados', () => { for (const m of ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5']) assert.ok(getPricing(openDb(':memory:'))[m].verified); });
