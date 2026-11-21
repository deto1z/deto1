import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '..', '..');

/* Configuración del backend. Las CLAVES de API solo se leen del entorno del servidor (.env); nunca se envían al navegador. */
export function loadConfig(env = process.env, overrides = {}) {
  const n = (v, d) => (v === undefined || v === '' || Number.isNaN(Number(v)) ? d : Number(v));
  const cfg = {
    env: env.NODE_ENV || 'development',
    host: env.DETONADOR_HOST || '127.0.0.1',            // solo local por defecto (no expuesto a la red)
    port: n(env.DETONADOR_PORT, 8787),
    dataDir: env.DETONADOR_DATA_DIR || path.join(ROOT, 'server', 'data'),
    secureCookies: env.DETONADOR_SECURE_COOKIES === '1',
    sessionTtlHours: n(env.DETONADOR_SESSION_HOURS, 12),
    keys: {                                              // solo presencia; el valor jamás sale del servidor
      anthropic: env.ANTHROPIC_API_KEY || '',
      openaiCompat: env.OPENAI_COMPAT_API_KEY || '',
      brave: env.BRAVE_SEARCH_API_KEY || '',
      youtube: env.YOUTUBE_API_KEY || '',
      tokenEncryption: env.DETONADOR_TOKEN_KEY || '',    // cifrado de tokens OAuth en reposo (AES-256-GCM)
    },
    openaiCompatBaseUrl: env.OPENAI_COMPAT_BASE_URL || '',   // p. ej. http://localhost:11434/v1 (Ollama, gratis)
    anthropicFallbacks: env.ANTHROPIC_FALLBACKS !== 'off',
    limits: {                                            // límites de ejecución (duros; no los cambia un agente)
      maxConcurrentTasks: n(env.DETONADOR_MAX_CONCURRENT, 3),
      maxStepsPerTask: n(env.DETONADOR_MAX_STEPS, 20),
      maxToolCallsPerTask: n(env.DETONADOR_MAX_TOOLCALLS, 30),
      taskTimeoutMs: n(env.DETONADOR_TASK_TIMEOUT_MS, 8 * 60_000),
      maxCorrectionsPerTask: 2,
      maxUploadBytes: n(env.DETONADOR_MAX_UPLOAD, 5 * 1024 * 1024),
      maxMessageChars: 8000,
      fetchMaxBytes: 1_500_000,
      fetchTimeoutMs: 12_000,
      loginMaxFailures: 5,
      loginLockMinutes: 15,
    },
    // Presupuesto por defecto: conservador. El propietario lo edita en la app. 0 = bloqueado.
    budgetDefaults: { perTaskUsd: 0.5, dailyUsd: 2, monthlyUsd: 30, perRunUsd: 3 },
    tz: 'America/New_York',
    staticDir: path.join(ROOT, 'dist'),
  };
  return deepMerge(cfg, overrides);
}
function deepMerge(a, b) { for (const k of Object.keys(b)) { if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k])) a[k] = deepMerge(a[k] ?? {}, b[k]); else a[k] = b[k]; } return a; }
