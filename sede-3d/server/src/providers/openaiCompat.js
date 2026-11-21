/* Proveedor compatible con la API de chat de OpenAI. Sirve para alternativas GRATUITAS o locales (Ollama en tu PC, niveles gratuitos
   de otros servicios). Es un proveedor de respaldo para tareas sencillas; no sustituye a Claude en la dirección de TITAN X. */
export function createOpenAICompatProvider({ baseUrl, apiKey, timeoutMs = 180_000, fetchImpl = fetch }) {
  const toMessages = (system, messages) => {
    const out = [{ role: 'system', content: system }];
    for (const m of messages) {
      if (typeof m.content === 'string') { out.push({ role: m.role, content: m.content }); continue; }
      if (m.role === 'assistant') {
        const text = m.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
        const calls = m.content.filter((b) => b.type === 'tool_use').map((b) => ({ id: b.id, type: 'function', function: { name: b.name, arguments: JSON.stringify(b.input ?? {}) } }));
        out.push({ role: 'assistant', content: text || null, ...(calls.length ? { tool_calls: calls } : {}) });
      } else {
        for (const b of m.content) { if (b.type === 'tool_result') out.push({ role: 'tool', tool_call_id: b.tool_use_id, content: typeof b.content === 'string' ? b.content : JSON.stringify(b.content) }); else if (b.type === 'text') out.push({ role: 'user', content: b.text }); }
      }
    }
    return out;
  };
  return {
    name: 'openai_compat',
    isConfigured: () => !!baseUrl,
    async complete({ model, system, messages, tools, maxTokens, signal }) {
      const body = { model, messages: toMessages(system, messages), max_tokens: maxTokens };
      if (tools?.length) body.tools = tools.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.input_schema } }));
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), timeoutMs); signal?.addEventListener('abort', () => ctl.abort());
      try {
        const r = await fetchImpl(`${baseUrl.replace(/\/$/, '')}/chat/completions`, { method: 'POST', signal: ctl.signal, headers: { 'content-type': 'application/json', ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}) }, body: JSON.stringify(body) });
        if (!r.ok) throw new Error(`Proveedor compatible respondió ${r.status}`);
        const d = await r.json(), c = d.choices?.[0]; if (!c) throw new Error('Respuesta sin opciones');
        const content = [];
        if (c.message?.content) content.push({ type: 'text', text: c.message.content });
        for (const tc of c.message?.tool_calls ?? []) { let input = {}; try { input = JSON.parse(tc.function.arguments || '{}'); } catch { /* argumentos inválidos: se detectan al validar */ } content.push({ type: 'tool_use', id: tc.id, name: tc.function.name, input }); }
        return { content, stopReason: content.some((b) => b.type === 'tool_use') ? 'tool_use' : (c.finish_reason === 'length' ? 'max_tokens' : 'end_turn'), model: d.model ?? model,
          usage: { input: d.usage?.prompt_tokens ?? 0, output: d.usage?.completion_tokens ?? 0, cacheRead: 0, cacheWrite: 0, webSearches: 0 } };
      } finally { clearTimeout(t); }
    },
  };
}
