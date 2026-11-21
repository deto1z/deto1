import { EventEmitter } from 'node:events';
import { now, j, parse, getSetting, setSetting } from './db.js';
import { audit, isAuthorized } from './security.js';
import { AGENT_DEFS, AGENT_IDS, WORKERS } from './agents.js';
import { TOOL_DEFS, runTool } from './tools/index.js';
import { assertBudget, recordUsage, BudgetError, getPricing, isKilled, setKillSwitch, getBudget, costSummary } from './costs.js';
import { setPreference, buildContext, addMemoryNote } from './memory.js';
import { buildProposal, decideProposal, ProposalError } from './proposals.js';
import { zonedToUtc } from '../../src/schedule.js';

/* Orquestador: TITAN X dirige; los agentes trabajan con herramientas reales; todo queda en la base de datos y se emite en tiempo real.
   No hay respuestas preprogramadas: sin proveedor de IA autorizado, el sistema lo dice y no hace nada más. */
export function createOrchestrator({ db, cfg, providers, testHooks = {} }) {
  const bus = new EventEmitter(); bus.setMaxListeners(100);
  const running = new Map(); const locks = new Map(); let tickQueued = false;
  const emit = (type, data = {}) => bus.emit('event', { type, ts: now(), ...data });
  const HOLD = { done: testHooks.doneHoldMs ?? 45_000, error: testHooks.errorHoldMs ?? 600_000 };

  /* ───────── Configuración por agente (modelo, esfuerzo, tope) ───────── */
  const agentCfg = (id) => ({ provider: 'anthropic', ...AGENT_DEFS[id], ...(getSetting(db, 'agentConfig', {})?.[id] ?? {}) });
  const estTokens = (...x) => Math.ceil(JSON.stringify(x).length / 3.2);

  /* ───────── Estado visible de cada agente ───────── */
  function setAgentState(agent, status, { taskId = null, title = null, steps = null, detail = null } = {}) {
    const prev = db.prepare('SELECT status,task_id,title,detail FROM agent_state WHERE agent=?').get(agent);
    const same = prev && prev.status === status && prev.task_id === taskId && prev.detail === detail;
    db.prepare('INSERT INTO agent_state(agent,status,task_id,title,since,steps,detail) VALUES(?,?,?,?,?,?,?) ON CONFLICT(agent) DO UPDATE SET status=excluded.status, task_id=excluded.task_id, title=excluded.title, since=CASE WHEN agent_state.status=excluded.status AND agent_state.task_id IS excluded.task_id THEN agent_state.since ELSE excluded.since END, steps=excluded.steps, detail=excluded.detail')
      .run(agent, status, taskId, title, now(), steps, detail);
    if (!same || steps != null) emit('agent_state', { agent, status, taskId, title, steps, detail });
  }
  const anyProvider = () => providers.anyUsable() && !isKilled(db);
  function idleStatusFor(agent) { if (!anyProvider()) return ['offline', isKilled(db) ? 'Interruptor de emergencia activo' : 'Sin proveedor de IA autorizado']; return ['available', null]; }
  function refreshStates() {
    for (const a of AGENT_IDS) {
      const cur = db.prepare('SELECT * FROM agent_state WHERE agent=?').get(a);
      const busy = db.prepare("SELECT id,title,steps,status FROM tasks WHERE agent=? AND status IN ('working','reviewing') ORDER BY id DESC LIMIT 1").get(a);
      if (busy) { setAgentState(a, busy.status === 'reviewing' ? 'reviewing' : 'working', { taskId: busy.id, title: busy.title, steps: busy.steps }); continue; }
      const age = cur ? Date.now() - new Date(cur.since).getTime() : Infinity;
      if (cur && cur.status === 'done' && age < HOLD.done) continue;
      if (cur && cur.status === 'error' && age < HOLD.error && anyProvider()) continue;
      const [st, d] = idleStatusFor(a); if (!cur || cur.status !== st || cur.detail !== d) setAgentState(a, st, { detail: d });
    }
  }
  const timer = setInterval(refreshStates, 4000); timer.unref?.();

  /* ───────── Llamada al modelo con control de costos ───────── */
  async function callLLM({ agent, taskId = null, rootId = null, system, messages, tools, purpose, signal, maxTokens }) {
    const a = agentCfg(agent);
    if (!providers.usable(a.provider)) throw new ProviderUnavailable(`El proveedor "${a.provider}" no está configurado y autorizado.`);
    const mt = maxTokens ?? a.maxTokens;
    assertBudget(db, cfg, { model: a.model, provider: a.provider, estInputTokens: estTokens(system, messages, tools), maxOutputTokens: mt, taskId, rootId });
    const res = await providers.get(a.provider).complete({ model: a.model, system, messages, tools, maxTokens: mt, effort: a.effort, signal });
    const priced = getPricing(db)[res.model] ? res.model : a.model;
    const cost = recordUsage(db, { provider: a.provider, model: priced, usage: res.usage, taskId, agent, purpose });
    emit('cost', { agent, taskId, usd: cost });
    return res;
  }
  class ProviderUnavailable extends Error {}

  /* ───────── Mensajes y conversaciones ───────── */
  const addMessage = (conversationId, role, content, extra = {}) => {
    const id = db.prepare('INSERT INTO messages(conversation_id,role,content,attachments_json,created_at,task_id) VALUES(?,?,?,?,?,?)').run(conversationId, role, content, j(extra.attachments ?? null), now(), extra.taskId ?? null).lastInsertRowid;
    db.prepare('UPDATE conversations SET updated_at=? WHERE id=?').run(now(), conversationId);
    const m = { id: Number(id), conversation_id: conversationId, role, content, created_at: now(), attachments: extra.attachments ?? null };
    emit('message', m); return m;
  };
  function newConversation(title) { const id = db.prepare('INSERT INTO conversations(title,created_at,updated_at) VALUES(?,?,?)').run(title, now(), now()).lastInsertRowid; return Number(id); }
  const history = (conversationId, limit = 16) => {
    const rows = db.prepare("SELECT role,content FROM messages WHERE conversation_id=? AND role IN ('owner','titan') ORDER BY id DESC LIMIT ?").all(conversationId, limit).reverse();
    const out = []; for (const r of rows) { const role = r.role === 'owner' ? 'user' : 'assistant'; if (out.length && out[out.length - 1].role === role) out[out.length - 1].content += `\n${r.content}`; else out.push({ role, content: r.content }); }
    while (out.length && out[0].role !== 'user') out.shift(); return out;
  };

  /* ───────── Tareas ───────── */
  function createTask({ rootId = null, conversationId = null, agent, title, instructions, dependsOn = [] }) {
    if (!WORKERS.includes(agent)) throw new Error(`Agente desconocido: ${agent}`);
    const id = Number(db.prepare("INSERT INTO tasks(root_id,conversation_id,agent,title,instructions,depends_on_json,status,created_at) VALUES(?,?,?,?,?,?,'queued',?)").run(rootId, conversationId, agent, title.slice(0, 200), instructions.slice(0, 6000), j(dependsOn), now()).lastInsertRowid);
    if (!rootId) db.prepare('UPDATE tasks SET root_id=? WHERE id=?').run(id, id);
    taskEvent(id, 'created', { agent, title }); emit('task', { id, status: 'queued', agent, title }); scheduleTick(); return id;
  }
  const taskEvent = (taskId, type, data) => db.prepare('INSERT INTO task_events(task_id,ts,type,data_json) VALUES(?,?,?,?)').run(taskId, now(), type, j(data));
  const getTask = (id) => db.prepare('SELECT * FROM tasks WHERE id=?').get(id);
  function setStatus(id, status, extra = {}) {
    const sets = ['status=?']; const vals = [status];
    for (const [k, v] of Object.entries(extra)) { sets.push(`${k}=?`); vals.push(v); }
    db.prepare(`UPDATE tasks SET ${sets.join(',')} WHERE id=?`).run(...vals, id);
    const t = getTask(id); emit('task', { id, status, agent: t.agent, title: t.title, rootId: t.root_id, error: t.error }); return t;
  }
  function scheduleTick() { if (tickQueued) return; tickQueued = true; setImmediate(() => { tickQueued = false; tick().catch((e) => logError('tick', e)); }); }
  const logError = (source, e, taskId = null) => { db.prepare('INSERT INTO errors(ts,source,message,detail_json,task_id) VALUES(?,?,?,?,?)').run(now(), source, String(e?.message ?? e).slice(0, 500), j({ stack: String(e?.stack ?? '').slice(0, 800) }), taskId); emit('alert', { source, message: String(e?.message ?? e) }); };

  async function tick() {
    if (isKilled(db)) return;
    const queued = db.prepare("SELECT * FROM tasks WHERE status='queued' ORDER BY id").all();
    for (const t of queued) {
      if (running.size >= cfg.limits.maxConcurrentTasks) break;
      if (running.has(t.id)) continue;
      const deps = parse(t.depends_on_json, []);
      const depRows = deps.map((d) => getTask(d));
      if (depRows.some((d) => d && ['error', 'cancelled'].includes(d.status))) { setStatus(t.id, 'cancelled', { error: 'Cancelada: una tarea previa falló', finished_at: now() }); checkRoot(t.root_id); continue; }
      if (depRows.some((d) => !d || d.status !== 'done')) continue;
      if (db.prepare("SELECT 1 FROM tasks WHERE agent=? AND status IN ('working','reviewing') LIMIT 1").get(t.agent)) continue;   // un agente = una tarea a la vez
      const ctl = new AbortController(); running.set(t.id, ctl);
      runWorkerTask(t.id, depRows, ctl).catch((e) => logError('task', e, t.id)).finally(() => { running.delete(t.id); scheduleTick(); });
    }
  }

  /* ───────── Ejecución de un agente ───────── */
  const newCtx = (task, agent, allowed) => ({ db, cfg, taskId: task?.id ?? null, rootId: task?.root_id ?? null, agent, fetched: new Set(), seen: new Set(), billed: {}, counters: { toolCalls: 0 }, allowed, testHooks });
  const defsFrom = (registry, names) => names.filter((n) => registry[n]).map((n) => ({ name: n, description: registry[n].description, input_schema: registry[n].input_schema }));

  async function runWorkerTask(taskId, depRows, ctl) {
    let task = getTask(taskId); const def = AGENT_DEFS[task.agent];
    const deadline = setTimeout(() => ctl.abort(new Error('Tiempo máximo de la tarea excedido')), cfg.limits.taskTimeoutMs);
    try {
      task = setStatus(taskId, 'working', { started_at: now(), steps: 0, tool_calls: 0, error: null });
      setAgentState(task.agent, 'working', { taskId, title: task.title, steps: 0 }); taskEvent(taskId, 'started', { attempt: task.attempt });
      const prior = depRows.filter(Boolean).map((d) => `### Resultado de ${AGENT_DEFS[d.agent].name} (tarea #${d.id}: ${d.title})\n${(d.result_json ?? '').slice(0, 5000)}`).join('\n\n');
      const first = `${task.instructions}${task.review_notes ? `\n\nCORRECCIONES SOLICITADAS POR TITAN X (atiéndelas):\n${task.review_notes}` : ''}${prior ? `\n\n<datos_de_tareas_previas>\n${prior}\n</datos_de_tareas_previas>` : ''}\n\nCuando termines, llama a submit_result.`;
      const messages = [{ role: 'user', content: first }]; const ctx = newCtx(task, task.agent, def.tools); const registry = TOOL_DEFS; const tools = defsFrom(registry, def.tools);
      let nudged = false;
      for (let step = 1; step <= cfg.limits.maxStepsPerTask; step++) {
        if (ctl.signal.aborted) throw ctl.signal.reason ?? new Error('Cancelada');
        const res = await callLLM({ agent: task.agent, taskId, rootId: task.root_id, system: def.system, messages, tools, purpose: 'task', signal: ctl.signal });
        messages.push({ role: 'assistant', content: res.content });
        db.prepare('UPDATE tasks SET steps=? WHERE id=?').run(step, taskId); setAgentState(task.agent, 'working', { taskId, title: task.title, steps: step });
        const uses = res.content.filter((b) => b.type === 'tool_use');
        if (!uses.length) {
          if (res.stopReason === 'max_tokens') throw new Error('La respuesta del agente se cortó (límite de salida)');
          if (nudged) throw new Error('El agente terminó sin entregar resultado (submit_result)');
          nudged = true; messages.push({ role: 'user', content: 'Debes entregar tu resultado llamando a submit_result (si no pudiste hacer algo, explícalo en limitations).' }); continue;
        }
        const results = []; let final = null;
        for (const u of uses) {
          const out = await runTool(u.name, u.input, ctx, { registry });
          taskEvent(taskId, 'tool', { name: u.name, input: JSON.stringify(u.input).slice(0, 400), ok: !out.isError, ms: out.ms, out: out.text.slice(0, 300) });
          db.prepare('UPDATE tasks SET tool_calls=? WHERE id=?').run(ctx.counters.toolCalls, taskId);
          results.push({ type: 'tool_result', tool_use_id: u.id, content: out.text, is_error: out.isError }); if (out.final) final = out.final;
        }
        messages.push({ role: 'user', content: results });
        if (final) {
          const { __final, ...result } = final;
          db.prepare('UPDATE tasks SET result_json=?, transcript_json=? WHERE id=?').run(j(result), j(messages.map((m) => ({ role: m.role, content: typeof m.content === 'string' ? m.content.slice(0, 1500) : '[bloques]' }))), taskId);
          await reviewTask(taskId, ctl); return;
        }
      }
      throw new Error(`Se alcanzó el máximo de pasos (${cfg.limits.maxStepsPerTask}) sin resultado`);
    } catch (err) {
      const cancelled = ctl.signal.aborted && /cancel/i.test(String(ctl.signal.reason?.message ?? ctl.signal.reason ?? ''));
      const msg = err instanceof BudgetError ? `Presupuesto: ${err.message}` : err instanceof ProviderUnavailable ? err.message : String(err.message ?? err);
      if (cancelled) { setStatus(taskId, 'cancelled', { error: 'Cancelada por el propietario', finished_at: now() }); taskEvent(taskId, 'cancelled', {}); }
      else { setStatus(taskId, 'error', { error: msg, finished_at: now() }); taskEvent(taskId, 'error', { message: msg }); logError('agent', err, taskId); setAgentState(task.agent, 'error', { taskId, title: task.title, detail: msg }); }
      checkRoot(task.root_id);
    } finally { clearTimeout(deadline); }
  }

  /* ───────── Revisión por TITAN X ───────── */
  async function reviewTask(taskId, ctl) {
    let task = setStatus(taskId, 'reviewing'); setAgentState(task.agent, 'reviewing', { taskId, title: task.title, steps: task.steps });
    const titan = AGENT_DEFS['titan-x']; let decision = null;
    const registry = { ...TOOL_DEFS, review_decision: {
      description: 'Decide si el trabajo cumple los criterios. accept = aceptar; correct = pedir corrección con instrucciones concretas.',
      input_schema: { type: 'object', additionalProperties: false, required: ['decision', 'notes'], properties: { decision: { type: 'string', enum: ['accept', 'correct'] }, notes: { type: 'string', maxLength: 1500 } } },
      async run(i) { decision = i; return { recorded: true }; } } };
    const ctx = newCtx(null, 'titan-x', ['review_decision', 'list_news_items']); ctx.taskId = null;
    const prompt = `Revisa el trabajo de ${AGENT_DEFS[task.agent].name}.\nTarea #${task.id}: ${task.title}\nInstrucciones originales:\n${task.instructions}\n\nResultado entregado:\n${task.result_json}\n\nIntento ${task.attempt} de ${cfg.limits.maxCorrectionsPerTask + 1}. Acepta si cumple lo pedido y es honesto con sus limitaciones; pide corrección concreta si falta algo verificable (puedes consultar list_news_items). Llama a review_decision.`;
    const messages = [{ role: 'user', content: prompt }];
    try {
      for (let s = 0; s < 4 && !decision; s++) {
        const res = await callLLM({ agent: 'titan-x', taskId, rootId: task.root_id, system: titan.system, messages, tools: defsFrom(registry, ctx.allowed), purpose: 'review', signal: ctl.signal });
        messages.push({ role: 'assistant', content: res.content });
        const uses = res.content.filter((b) => b.type === 'tool_use'); if (!uses.length) { messages.push({ role: 'user', content: 'Llama a review_decision.' }); continue; }
        const results = []; for (const u of uses) { const o = await runTool(u.name, u.input, ctx, { registry }); results.push({ type: 'tool_result', tool_use_id: u.id, content: o.text, is_error: o.isError }); }
        messages.push({ role: 'user', content: results });
      }
      if (!decision) throw new Error('TITAN X no emitió una decisión de revisión');
    } catch (err) {   // sin poder revisar (p. ej. presupuesto): la tarea queda en revisión y se avisa; no se acepta a ciegas
      const msg = err instanceof BudgetError ? `Presupuesto: ${err.message}` : String(err.message ?? err);
      setStatus(taskId, 'error', { error: `No se pudo revisar: ${msg}`, finished_at: now() }); setAgentState(task.agent, 'error', { taskId, title: task.title, detail: msg }); logError('review', err, taskId); checkRoot(task.root_id); return;
    }
    taskEvent(taskId, 'review', decision);
    if (decision.decision === 'accept') {
      setStatus(taskId, 'done', { finished_at: now(), review_notes: null }); setAgentState(task.agent, 'done', { taskId, title: task.title }); addMemoryNote(db, 'task', `${AGENT_DEFS[task.agent].name} completó "${task.title}"`, taskId); checkRoot(task.root_id);
    } else if (task.attempt <= cfg.limits.maxCorrectionsPerTask) {
      db.prepare("UPDATE tasks SET status='queued', attempt=attempt+1, review_notes=?, result_json=NULL WHERE id=?").run(decision.notes, taskId); emit('task', { id: taskId, status: 'queued', agent: task.agent, title: task.title, correction: true }); refreshStates(); scheduleTick();
    } else { setStatus(taskId, 'error', { error: `No cumplió tras ${task.attempt} intentos: ${decision.notes}`, finished_at: now() }); setAgentState(task.agent, 'error', { taskId, title: task.title, detail: 'Rechazada tras correcciones' }); checkRoot(task.root_id); }
  }

  /* ───────── Cierre de un encargo: TITAN arma las propuestas finales ───────── */
  const finalizing = new Set();
  function checkRoot(rootId) {
    if (!rootId || finalizing.has(rootId)) return;
    const open = db.prepare("SELECT COUNT(*) c FROM tasks WHERE root_id=? AND status IN ('queued','working','reviewing')").get(rootId).c;
    if (open) return; const meta = getSetting(db, `root:${rootId}`, null); if (!meta || meta.finalized) return;
    finalizing.add(rootId); finalizeRoot(rootId, meta).catch((e) => logError('finalize', e)).finally(() => finalizing.delete(rootId));
  }
  async function finalizeRoot(rootId, meta) {
    const tasks = db.prepare('SELECT * FROM tasks WHERE root_id=? ORDER BY id').all(rootId); const conv = meta.conversationId;
    const failed = tasks.filter((t) => ['error', 'cancelled'].includes(t.status));
    const summary = tasks.map((t) => `#${t.id} ${AGENT_DEFS[t.agent].name} [${t.status}] ${t.title}${t.error ? ` — ERROR: ${t.error}` : ''}\n${(t.result_json ?? '').slice(0, 1200)}`).join('\n\n');
    const created = []; const registry = { ...TOOL_DEFS, ...titanOnlyTools({ rootId, conversationId: conv, created, titanCtx: null }) };
    const allowed = ['create_proposal', 'list_news_items', 'list_content_items', 'calendar_list', 'query_history'];
    const ctx = newCtx({ id: null, root_id: rootId }, 'titan-x', allowed); ctx.taskId = null; ctx.rootId = rootId;
    const verified = db.prepare("SELECT id,title FROM news_items WHERE verification_status='verified' ORDER BY id DESC LIMIT 15").all();
    const prompt = `Encargo del Jefe: "${meta.goal}" (pedir hasta ${meta.count ?? 5} propuestas).\nEstado de las tareas del equipo:\n${summary}\n${failed.length ? `\nATENCIÓN: hubo ${failed.length} tarea(s) fallida(s)/canceladas; dilo con claridad al Jefe.\n` : ''}\nNoticias VERIFICADAS disponibles: ${verified.map((v) => `#${v.id} ${v.title}`).join(' | ') || 'ninguna'}.\nArma con create_proposal las mejores propuestas (solo con elementos que existan: ganchos, guiones, título y portada guardados; consulta list_news_items/calendar_list si lo necesitas). Después responde al Jefe con un resumen honesto en texto: qué se propone, qué falló o quedó sin hacer, y el costo si lo sabes. No inventes nada.`;
    const messages = [{ role: 'user', content: prompt }]; let text = '';
    try {
      for (let s = 0; s < 10; s++) {
        const res = await callLLM({ agent: 'titan-x', rootId, system: AGENT_DEFS['titan-x'].system, messages, tools: defsFrom(registry, allowed), purpose: 'finalize', maxTokens: 6000 });
        messages.push({ role: 'assistant', content: res.content });
        text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim() || text;
        const uses = res.content.filter((b) => b.type === 'tool_use'); if (!uses.length) break;
        const results = []; for (const u of uses) { const o = await runTool(u.name, u.input, ctx, { registry }); results.push({ type: 'tool_result', tool_use_id: u.id, content: o.text, is_error: o.isError }); }
        messages.push({ role: 'user', content: results });
      }
    } catch (err) { text = `Jefe, el equipo terminó pero no pude armar el informe final: ${err.message}`; logError('finalize', err); }
    setSetting(db, `root:${rootId}`, { ...meta, finalized: true });
    addMessage(conv, 'titan', text || 'Jefe, el encargo terminó sin propuestas que presentar.', { attachments: { proposals: created.map((c) => c.id) } });
    for (const c of created) emit('proposal', { id: c.id, status: 'pending' });
    setAgentState('titan-x', 'done', { title: meta.goal }); refreshStates();
  }

  /* ───────── Herramientas exclusivas de TITAN X ───────── */
  function titanOnlyTools({ rootId, conversationId, created, ownerCtx }) {
    return {
      create_pipeline: {
        description: 'Crea el flujo completo de oportunidades de contenido: VIRAL HUNTER investiga → FILTER X verifica → HOOK MASTER (ganchos/guiones), PIXEL QUEEN (portadas) y DATA BOSS (historial) en paralelo → IDEA STORM (calendario). Al terminar volverás a recibir el control para armar las propuestas.',
        input_schema: { type: 'object', additionalProperties: false, required: ['goal'], properties: { goal: { type: 'string', maxLength: 600 }, count: { type: 'integer', minimum: 1, maximum: 10 }, topics: { type: 'string', maxLength: 300 } } },
        async run(i) { return buildPipeline(i, { conversationId, ownerCtx }); },
      },
      delegate_task: {
        description: 'Delega una tarea a un agente. Instrucciones claras con criterios de aceptación. depends_on: IDs de tareas que deben terminar antes.',
        input_schema: { type: 'object', additionalProperties: false, required: ['agent', 'title', 'instructions'], properties: { agent: { type: 'string', enum: WORKERS }, title: { type: 'string', maxLength: 160 }, instructions: { type: 'string', maxLength: 5000 }, depends_on: { type: 'array', maxItems: 8, items: { type: 'integer' } } } },
        async run(i) { const id = createTask({ rootId: ownerCtx.rootId ?? null, conversationId, agent: i.agent, title: i.title, instructions: i.instructions, dependsOn: i.depends_on ?? [] }); if (!ownerCtx.rootId) { ownerCtx.rootId = id; setSetting(db, `root:${id}`, { goal: ownerCtx.goal, conversationId, count: 5 }); } return { task_id: id }; },
      },
      get_tasks: {
        description: 'Estado actual de tareas recientes.', input_schema: { type: 'object', additionalProperties: false, properties: { limit: { type: 'integer', minimum: 1, maximum: 30 } } },
        async run({ limit = 15 }) { return { tasks: db.prepare('SELECT id,agent,title,status,steps,error,cost_usd FROM tasks ORDER BY id DESC LIMIT ?').all(limit) }; },
      },
      remember_preference: {
        description: 'Guarda una preferencia que el Jefe expresó (tono, temas, horarios, estilo visual, límites de gasto, etc.).',
        input_schema: { type: 'object', additionalProperties: false, required: ['key', 'value'], properties: { key: { type: 'string', maxLength: 80 }, value: { type: 'string', maxLength: 500 } } },
        async run({ key, value }) { setPreference(db, key, value, 'owner_said'); audit(db, { actor: 'titan-x', action: 'preferencia.guardada', target: key }); return { saved: true }; },
      },
      create_proposal: {
        description: 'Crea una propuesta final para aprobación del Jefe. Referencia IDs ya guardados: news_id (verificada), 5 hook_ids, 1–4 script_ids (una por duración), 1–3 title_ids, cover_id. El servidor arma el contenido con los datos reales.',
        input_schema: { type: 'object', additionalProperties: false, required: ['news_id', 'topic', 'why_it_works', 'hook_ids', 'script_ids', 'title_ids', 'cover_id', 'platform', 'slot', 'day', 'history_note'], properties: {
          news_id: { type: 'integer' }, topic: { type: 'string', maxLength: 200 }, why_it_works: { type: 'string', maxLength: 1200 }, hook_ids: { type: 'array', items: { type: 'integer' }, minItems: 5, maxItems: 5 },
          script_ids: { type: 'array', items: { type: 'integer' }, minItems: 1, maxItems: 4 }, title_ids: { type: 'array', items: { type: 'integer' }, minItems: 1, maxItems: 3 }, cta_ids: { type: 'array', items: { type: 'integer' }, maxItems: 2 },
          cover_id: { type: 'integer' }, platform: { type: 'string', enum: ['youtube_shorts', 'youtube', 'tiktok', 'instagram_reels', 'facebook_reels', 'x'] }, slot: { type: 'string', enum: ['morning', 'afternoon', 'night'] },
          day: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' }, history_note: { type: 'string', maxLength: 600 } } },
        async run(i) { try { const r = buildProposal(db, i, { rootId, conversationId }); created.push({ id: r.id }); return { proposal_id: r.id }; } catch (e) { if (e instanceof ProposalError) throw e; throw e; } },
      },
    };
  }
  function buildPipeline({ goal, count = 5, topics = 'fútbol, noticias internacionales, entretenimiento y tendencias de redes' }, { conversationId, ownerCtx }) {
    const n = Math.min(10, Math.max(1, count)); const rootSeed = ownerCtx.rootId ?? null;
    const T = (agent, title, instructions, deps = []) => createTask({ rootId: ownerCtx.rootId ?? rootSeed, conversationId, agent, title, instructions, dependsOn: deps });
    const vh = T('viral-hunter', 'Investigar oportunidades virales de hoy', `Objetivo del Jefe: ${goal}\nTemas: ${topics}.\nBusca información de las últimas 24 horas y encuentra las ${n * 2} mejores oportunidades de contenido viral. Para cada una guarda (save_news_item) titular, enlace original, fecha y evidencia real de popularidad. Evita duplicados. Entrega un resumen con los IDs guardados.`);
    if (!ownerCtx.rootId) { ownerCtx.rootId = vh; setSetting(db, `root:${vh}`, { goal: ownerCtx.goal ?? goal, conversationId, count: n }); }
    const fx = T('filter-x', 'Verificar y depurar lo encontrado', `Verifica todas las noticias "unverified" guardadas por VIRAL HUNTER: lee la fuente original y al menos otra independiente, descarta repetidas, rumores y desactualizadas, y marca el estado con set_verification. Entrega el recuento por estado y los IDs verificados.`, [vh]);
    const hm = T('hook-master', 'Ganchos, títulos y guiones', `Para las ${n} noticias verificadas más fuertes (list_news_items status=verified): 5 ganchos distintos de 3 s, 1–3 títulos, guiones de 15, 30, 60 y 90 s y una CTA, guardando todo con save_content_item. Entrega los IDs creados por noticia.`, [fx]);
    const pq = T('pixel-queen', 'Portadas y conceptos visuales', `Para las ${n} noticias verificadas más fuertes: una portada (save_cover_svg) con identidad de marca coherente. Entrega los IDs de portada por noticia.`, [fx]);
    const db_ = T('data-boss', 'Comparar con el rendimiento histórico', `Consulta el historial REAL (query_history, social_metrics) y compara con los temas verificados. Si no hay datos o conectores, dilo exactamente así y no estimes nada.`, [fx]);
    const is = T('idea-storm', 'Calendario editorial recomendado', `Para los temas verificados, recomienda franja (morning/afternoon/night) y plataforma, evita repetir temas ya programados y registra con calendar_add. Si no hay historial real, indica que la recomendación es sin datos.`, [hm, pq, db_]);
    return { root: ownerCtx.rootId, tasks: { viral_hunter: vh, filter_x: fx, hook_master: hm, pixel_queen: pq, data_boss: db_, idea_storm: is } };
  }

  /* ───────── Mensaje del propietario → TITAN X ───────── */
  async function ownerMessage(conversationId, text, { attachments = null, actor = 'propietario', routine = null } = {}) {
    if (typeof text !== 'string' || !text.trim() || text.length > cfg.limits.maxMessageChars) throw new Error('Mensaje inválido');
    const msg = addMessage(conversationId, routine ? 'system' : 'owner', text.trim(), { attachments });
    audit(db, { actor, action: routine ? 'rutina.mensaje' : 'mensaje.propietario', target: `conversation:${conversationId}` });
    if (!anyProvider()) {
      addMessage(conversationId, 'system', isKilled(db) ? 'El interruptor de emergencia está activo: TITAN X no puede trabajar hasta que lo desactives.' : 'No hay ningún proveedor de IA configurado y autorizado, así que TITAN X todavía no puede pensar ni dirigir a los agentes. Tu mensaje quedó guardado. No se creó ninguna tarea. Revisa "Costos y autorizaciones".');
      return { accepted: true, thinking: false };
    }
    const run = (locks.get(conversationId) ?? Promise.resolve()).then(() => titanTurn(conversationId, msg.id, text.trim(), routine)).catch((e) => { logError('titan', e); addMessage(conversationId, 'system', e instanceof BudgetError ? `Presupuesto: ${e.message}` : `TITAN X no pudo responder: ${e.message}`); });
    locks.set(conversationId, run); return { accepted: true, thinking: true, done: run };
  }
  async function titanTurn(conversationId, messageId, text, routine) {
    const titan = AGENT_DEFS['titan-x']; setAgentState('titan-x', 'working', { title: routine ? routine.name : 'Atendiendo al Jefe' });
    const ownerCtx = { rootId: null, goal: text.slice(0, 300), conversationId };
    const registry = { ...TOOL_DEFS, ...titanOnlyTools({ rootId: null, conversationId, created: [], ownerCtx }) };
    const allowed = [...titan.tools, 'create_pipeline', 'delegate_task', 'get_tasks', 'remember_preference'];
    const ctx = newCtx(null, 'titan-x', allowed);
    const bs = getBudget(db, cfg.budgetDefaults); const system = `${titan.system}\n\n${buildContext(db, { budgetStatus: `límite por tarea USD ${bs.perTaskUsd}, diario USD ${bs.dailyUsd}, mensual USD ${bs.monthlyUsd}` })}\nHoy: ${now()} (zona de la empresa: ${cfg.tz}).`;
    const messages = history(conversationId); if (!messages.length || messages[messages.length - 1].role !== 'user') messages.push({ role: 'user', content: text });
    let reply = '';
    try {
      for (let s = 0; s < 6; s++) {
        const res = await callLLM({ agent: 'titan-x', rootId: ownerCtx.rootId, system, messages, tools: defsFrom(registry, allowed), purpose: 'owner_turn' });
        messages.push({ role: 'assistant', content: res.content });
        reply = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim() || reply;
        const uses = res.content.filter((b) => b.type === 'tool_use'); if (!uses.length) break;
        const results = []; for (const u of uses) { const o = await runTool(u.name, u.input, ctx, { registry }); results.push({ type: 'tool_result', tool_use_id: u.id, content: o.text, is_error: o.isError }); }
        messages.push({ role: 'user', content: results });
      }
    } finally { refreshStates(); }
    if (reply) addMessage(conversationId, 'titan', reply);
  }

  /* ───────── Acciones del propietario ───────── */
  function stopAll(actor = 'propietario') {
    const ids = db.prepare("SELECT id FROM tasks WHERE status IN ('queued','working','reviewing')").all().map((r) => r.id);
    for (const id of ids) { running.get(id)?.abort(new Error('cancelada por el propietario')); const t = getTask(id); if (t.status === 'queued') setStatus(id, 'cancelled', { error: 'Cancelada por el propietario', finished_at: now() }); }
    audit(db, { actor, action: 'tareas.detenidas', detail: { count: ids.length } }); refreshStates(); return ids.length;
  }
  function cancelTask(id, actor = 'propietario') { const t = getTask(id); if (!t || ['done', 'error', 'cancelled'].includes(t.status)) return false; running.get(id)?.abort(new Error('cancelada por el propietario')); if (t.status === 'queued') setStatus(id, 'cancelled', { error: 'Cancelada por el propietario', finished_at: now() }); audit(db, { actor, action: 'tarea.cancelada', target: `task:${id}` }); return true; }
  async function decide(id, decision, notes, actor) {
    const r = decideProposal(db, id, decision, notes, actor); emit('proposal', { id, status: r.status });
    if (decision === 'improve') { const p = db.prepare('SELECT conversation_id FROM proposals WHERE id=?').get(id); const conv = p.conversation_id ?? newConversation(`Mejorar propuesta #${id}`); await ownerMessage(conv, `Jefe: pidió MEJORAR la propuesta #${id}. Indicaciones: ${notes || '(sin detalle)'}. Decide qué agentes deben corregir qué.`, { actor }); }
    return r;
  }
  function recover() {   // reinicio: tareas a medias se marcan como interrumpidas (no se re-ejecutan solas para no gastar sin permiso)
    const stuck = db.prepare("SELECT id,root_id FROM tasks WHERE status IN ('working','reviewing')").all();
    for (const t of stuck) setStatus(t.id, 'error', { error: 'Interrumpida por un reinicio del servidor', finished_at: now() });
    refreshStates(); return stuck.length;
  }
  function snapshot() {
    return { agents: db.prepare('SELECT * FROM agent_state').all(), tasks: db.prepare('SELECT id,root_id,agent,title,status,steps,tool_calls,error,cost_usd,attempt,created_at,started_at,finished_at FROM tasks ORDER BY id DESC LIMIT 60').all(), cost: costSummary(db, cfg) };
  }
  async function runRoutine(r) {
    const conv = newConversation(`${r.name} · ${new Date().toISOString().slice(0, 10)}`);
    return ownerMessage(conv, `Reunión ejecutiva programada: ${r.name}. Enfoque: ${r.focus}. Dirige al equipo para traer las mejores oportunidades (create_pipeline) y prepárame propuestas para aprobación.`, { actor: 'rutina', routine: r });
  }
  async function idle() { await Promise.all([...locks.values()]); while (running.size) await new Promise((r) => setTimeout(r, 15)); await new Promise((r) => setTimeout(r, 30)); while (running.size || db.prepare("SELECT 1 FROM tasks WHERE status IN ('queued','working','reviewing')").get()) { if (isKilled(db)) break; await new Promise((r) => setTimeout(r, 25)); if (!running.size && !db.prepare("SELECT 1 FROM tasks WHERE status IN ('queued','working','reviewing')").get()) break; } await Promise.all([...locks.values()]); await new Promise((r) => setTimeout(r, 120)); }
  const close = () => clearInterval(timer);

  refreshStates();
  return { bus, emit, ownerMessage, newConversation, addMessage, createTask, stopAll, cancelTask, decide, recover, snapshot, refreshStates, runRoutine, idle, close, tick, getTask, setAgentState };
}
