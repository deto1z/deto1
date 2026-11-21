import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import fs from 'node:fs';
import path from 'node:path';

/* Carga opcional de .env (solo en el servidor). Nunca se sube a git. */
const envFile = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..', '.env');
try { for (const l of fs.readFileSync(decodeURIComponent(envFile.replace(/^\/([A-Za-z]:)/, '$1')), 'utf8').split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); } } catch { /* sin .env */ }

const cfg = loadConfig();
const major = Number(process.versions.node.split('.')[0]);
if (major < 22) { console.error(`Se requiere Node.js 22 o superior (tienes ${process.version}).`); process.exit(1); }
const { app, db } = await buildApp({ cfg, scheduler: true, logger: { level: 'info' } });
if (!db.prepare('SELECT 1 FROM users LIMIT 1').get()) console.warn('\n⚠  No hay propietario creado. Ejecuta primero:  npm run setup-owner\n');
await app.listen({ host: cfg.host, port: cfg.port });
console.log(`\nDETONADOR AI EMPIRE (staging) en http://${cfg.host}:${cfg.port}  ·  datos en ${cfg.dataDir}`);
