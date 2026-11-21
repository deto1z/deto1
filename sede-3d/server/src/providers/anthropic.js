import Anthropic from '@anthropic-ai/sdk';

/* Proveedor Claude (SDK oficial). La clave vive solo en el servidor. Modelos y precios: ver costs.js.
   Notas de API vigentes (Claude 5.x): sin `temperature`/`top_p`; sin `tool_choice` forzado; el razonamiento adaptativo es el predeterminado;
   el esfuerzo se fija con output_config.effort; los bloques de razonamiento se devuelven tal cual en el siguiente turno. */
export class RefusalError extends Error { constructor(detail) { super('El modelo declinó la solicitud (política de seguridad).'); this.detail = detail; } }

export function createAnthropicProvider({ apiKey, fallbacks = true, baseURL, timeoutMs = 180_000 }) {
  const client = apiKey ? new Anthropic({ apiKey, baseURL, maxRetries: 2, timeout: timeoutMs }) : null;
  return {
    name: 'anthropic',
    isConfigured: () => !!client,
    async complete({ model, system, messages, tools, maxTokens, effort = 'medium', signal }) {
      if (!client) throw new Error('Proveedor Anthropic sin clave configurada');
      const params = { model, max_tokens: maxTokens, system, messages, output_config: { effort } };
      if (tools?.length) params.tools = tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.input_schema }));
      // Reintento automático en otro modelo si el modelo principal declina (activado por defecto; desactivar con ANTHROPIC_FALLBACKS=off)
      const res = fallbacks
        ? await client.beta.messages.create({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' }, { signal })
        : await client.messages.create(params, { signal });
      if (res.stop_reason === 'refusal') throw new RefusalError(res.stop_details ?? null);
      const u = res.usage ?? {};
      return {
        content: res.content, stopReason: res.stop_reason, model: res.model ?? model,
        usage: { input: u.input_tokens ?? 0, output: u.output_tokens ?? 0, cacheRead: u.cache_read_input_tokens ?? 0, cacheWrite: u.cache_creation_input_tokens ?? 0, webSearches: u.server_tool_use?.web_search_requests ?? 0 },
      };
    },
  };
}
