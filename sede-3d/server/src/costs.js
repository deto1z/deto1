import { now, getSetting, setSetting } from './db.js';
import { audit } from './security.js';

/* ───────── Tabla de precios (USD por millón de tokens) ─────────
   Fuente: documentación oficial de Anthropic (platform.claude.com/docs/en/about-claude/pricing), consultada el 2026-11-21.
   Los precios pueden cambiar: el propietario puede editarlos. `verified` indica si provienen de la fuente oficial. */
export const DEFAULT_PRICING = {
  'claude-opus-5-5':   { provider: 'anthropic', in: 4,    out: 20,   cacheRead: 0.20, cacheWrite: 5,     verified: true },
  'claude-sonnet-5-5': { provider: 'anthropic', in: 2,    out: 10,   cacheRead: 0.10, cacheWrite: 2.5,   verified: true },
  'claude-haiku-5-5':  { provider: 'anthropic', in: 0.10, out: 0.50, cacheRead: 0.01, cacheWrite: 0.125, verified: true },   // ≤100 000 tokens de prompt
  'claude-fable-5-2':  { provider: 'anthropic', in: 8,    out: 40,   cacheRead: 0.20, cacheWrite: 10,    verified: true },
  'claude-opus-4-8':   { provider: 'anthropic', in: 5,    out: 25,   cacheRead: 0.50, cacheWrite: 6.25,  verified: true },   // posible modelo de respaldo
  'claude-sonnet-5':   { provider: 'anthropic', in: 2,    out: 10,   cacheRead: 0.20, cacheWrite: 2.5,   verified: true },   // posible modelo de respaldo
};
export const WEB_SEARCH_USD_PER_1000 = 10;     // herramienta de búsqueda web de Anthropic (oficial)

export class BudgetError extends Error { constructor(msg, code) { super(msg); this.code = code; } }

export function getPricing(db) { return { ...DEFAULT_PRICING, ...(getSetting(db, 'pricing', {}) ?? {}) }; }
export function priceFor(db, model, provider) {
  const p = getPricing(db)[model];
  if (p) return p;
  if (provider === 'openai_compat' || provider === 'local') return { provider, in: 0, out: 0, cacheRead: 0, cacheWrite: 0, verified: false, unknown: true };   // coste desconocido: se registra 0 y se marca
  return null;
}
export const costOf = (p, u) => ((u.input ?? 0) * p.in + (u.output ?? 0) * p.out + (u.cacheRead ?? 0) * p.cacheRead + (u.cacheWrite ?? 0) * p.cacheWrite) / 1e6 + ((u.webSearches ?? 0) * WEB_SEARCH_USD_PER_1000) / 1000;

export function getBudget(db, defaults) { return { ...defaults, ...(getSetting(db, 'budget', {}) ?? {}) }; }
export function setBudget(db, patch, actor) {
  const cur = getSetting(db, 'budget', {}) ?? {}, next = { ...cur };
  for (const k of ['perTaskUsd', 'dailyUsd', 'monthlyUsd', 'perRunUsd']) if (patch[k] !== undefined) { const v = Number(patch[k]); if (!Number.isFinite(v) || v < 0 || v > 10_000) throw new Error(`Límite inválido: ${k}`); next[k] = v; }
  setSetting(db, 'budget', next); audit(db, { actor, action: 'presupuesto.cambiado', detail: next }); return next;
}

export const isKilled = (db) => !!getSetting(db, 'killSwitch', false);
export function setKillSwitch(db, on, reason, actor = 'propietario') { setSetting(db, 'killSwitch', !!on); audit(db, { actor, action: on ? 'killswitch.activado' : 'killswitch.desactivado', detail: { reason } }); }

export function spendSince(db, sinceIso, { taskId, rootId } = {}) {
  if (taskId) return db.prepare('SELECT COALESCE(SUM(cost_usd),0) s FROM ai_usage WHERE task_id=?').get(taskId).s;
  if (rootId) return db.prepare('SELECT COALESCE(SUM(u.cost_usd),0) s FROM ai_usage u JOIN tasks t ON t.id=u.task_id WHERE t.root_id=? OR t.id=?').get(rootId, rootId).s;
  return db.prepare('SELECT COALESCE(SUM(cost_usd),0) s FROM ai_usage WHERE ts>=?').get(sinceIso).s;
}
const startOfDay = (d = new Date(), tz = 'America/New_York') => { const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d).map((x) => [x.type, x.value])); return `${p.year}-${p.month}-${p.day}`; };
export const dayKey = startOfDay;
// Gasto del día / mes calendario en la zona horaria de la empresa (aprox. por prefijo de fecha UTC desplazado 1 día de margen)
export function spendToday(db, tz) { const since = new Date(Date.now() - 36 * 3600_000).toISOString(); const key = startOfDay(new Date(), tz); return db.prepare('SELECT ts,cost_usd FROM ai_usage WHERE ts>=?').all(since).filter((r) => startOfDay(new Date(r.ts), tz) === key).reduce((a, r) => a + r.cost_usd, 0); }
export function spendMonth(db, tz) { const key = startOfDay(new Date(), tz).slice(0, 7); const since = new Date(Date.now() - 32 * 86400_000).toISOString(); return db.prepare('SELECT ts,cost_usd FROM ai_usage WHERE ts>=?').all(since).filter((r) => startOfDay(new Date(r.ts), tz).slice(0, 7) === key).reduce((a, r) => a + r.cost_usd, 0); }

/* Comprobación PREVIA a cada llamada de pago: usa el peor caso (entrada estimada + máximo de salida). */
export function assertBudget(db, cfg, { model, provider, estInputTokens, maxOutputTokens, taskId, rootId }) {
  if (isKilled(db)) throw new BudgetError('Interruptor de emergencia activo: todo el gasto está detenido.', 'kill_switch');
  const price = priceFor(db, model, provider);
  if (!price) throw new BudgetError(`Sin precio configurado para el modelo ${model}: bloqueado por seguridad.`, 'no_price');
  const budget = getBudget(db, cfg.budgetDefaults), est = costOf(price, { input: estInputTokens, output: maxOutputTokens });
  const task = taskId ? spendSince(db, null, { taskId }) : 0, run = rootId ? spendSince(db, null, { rootId }) : 0, day = spendToday(db, cfg.tz), month = spendMonth(db, cfg.tz);
  if (task + est > budget.perTaskUsd) throw new BudgetError(`Límite por tarea (USD ${budget.perTaskUsd}) excedido o en riesgo.`, 'per_task');
  if (rootId && run + est > budget.perRunUsd) throw new BudgetError(`Límite por encargo completo (USD ${budget.perRunUsd}) excedido o en riesgo.`, 'per_run');
  if (day + est > budget.dailyUsd) { setKillSwitch(db, true, 'límite diario', 'sistema'); throw new BudgetError(`Límite diario (USD ${budget.dailyUsd}) alcanzado: se activó el interruptor de emergencia.`, 'daily'); }
  if (month + est > budget.monthlyUsd) { setKillSwitch(db, true, 'límite mensual', 'sistema'); throw new BudgetError(`Límite mensual (USD ${budget.monthlyUsd}) alcanzado: se activó el interruptor de emergencia.`, 'monthly'); }
  return { estimatedUsd: est };
}

export function recordUsage(db, { provider, model, usage, taskId, agent, purpose }) {
  const price = priceFor(db, model, provider) ?? { in: 0, out: 0, cacheRead: 0, cacheWrite: 0, verified: false };
  const cost = costOf(price, usage);
  db.prepare('INSERT INTO ai_usage(ts,provider,model,input_tokens,output_tokens,cache_read,cache_write,web_searches,cost_usd,task_id,agent,purpose,price_verified) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .run(now(), provider, model, usage.input ?? 0, usage.output ?? 0, usage.cacheRead ?? 0, usage.cacheWrite ?? 0, usage.webSearches ?? 0, cost, taskId ?? null, agent ?? null, purpose ?? null, price.verified ? 1 : 0);
  if (taskId) db.prepare('UPDATE tasks SET cost_usd = cost_usd + ? WHERE id=?').run(cost, taskId);
  return cost;
}

export function costSummary(db, cfg) {
  const b = getBudget(db, cfg.budgetDefaults);
  const byAgent = db.prepare('SELECT agent, COUNT(*) calls, SUM(input_tokens) input, SUM(output_tokens) output, SUM(cost_usd) usd FROM ai_usage GROUP BY agent ORDER BY usd DESC').all();
  const byModel = db.prepare('SELECT model, COUNT(*) calls, SUM(cost_usd) usd FROM ai_usage GROUP BY model').all();
  return { budget: b, spentToday: spendToday(db, cfg.tz), spentMonth: spendMonth(db, cfg.tz), killSwitch: isKilled(db), byAgent, byModel, pricing: getPricing(db), searchUsdPer1000: WEB_SEARCH_USD_PER_1000 };
}
