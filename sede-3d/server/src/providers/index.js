import { createAnthropicProvider } from './anthropic.js';
import { createOpenAICompatProvider } from './openaiCompat.js';
import { isAuthorized } from '../security.js';

/* Registro de proveedores. Un proveedor SOLO es utilizable si (1) tiene clave/URL en el servidor Y (2) el propietario lo autorizó explícitamente. */
export function createProviders(cfg, db, { anthropicBaseURL } = {}) {
  const map = {
    anthropic: createAnthropicProvider({ apiKey: cfg.keys.anthropic, fallbacks: cfg.anthropicFallbacks, baseURL: anthropicBaseURL }),
    openai_compat: createOpenAICompatProvider({ baseUrl: cfg.openaiCompatBaseUrl, apiKey: cfg.keys.openaiCompat }),
  };
  return {
    get: (name) => map[name],
    status: () => Object.fromEntries(Object.entries(map).map(([n, p]) => [n, { configured: p.isConfigured(), authorized: isAuthorized(db, 'provider', n) }])),
    usable: (name) => !!map[name]?.isConfigured() && isAuthorized(db, 'provider', name),
    anyUsable: () => Object.keys(map).some((n) => !!map[n].isConfigured() && isAuthorized(db, 'provider', n)),
    // Solo para pruebas automáticas. En producción/staging esta función no existe: no hay forma de inyectar un proveedor falso.
    registerForTests(name, impl) { if (process.env.NODE_ENV !== 'test') throw new Error('registerForTests solo existe en NODE_ENV=test'); map[name] = impl; },
  };
}
