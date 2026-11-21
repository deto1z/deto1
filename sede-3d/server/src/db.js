import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

/* Base de datos persistente (SQLite integrado en Node ≥ 22.5). Sin dependencias nativas. */
const MIGRATIONS = [
`
CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL, pass_hash TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL, csrf TEXT NOT NULL, created_at TEXT NOT NULL, expires_at TEXT NOT NULL, ip TEXT, ua TEXT);
CREATE TABLE login_attempts (id INTEGER PRIMARY KEY, key TEXT NOT NULL, ts TEXT NOT NULL, ok INTEGER NOT NULL);
CREATE INDEX idx_login_key ON login_attempts(key, ts);
CREATE TABLE settings (key TEXT PRIMARY KEY, value_json TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE authorizations (id INTEGER PRIMARY KEY, kind TEXT NOT NULL, name TEXT NOT NULL, granted_at TEXT NOT NULL, revoked_at TEXT, note TEXT);
CREATE INDEX idx_auth ON authorizations(kind, name);
CREATE TABLE conversations (id INTEGER PRIMARY KEY, title TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE messages (id INTEGER PRIMARY KEY, conversation_id INTEGER NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL, attachments_json TEXT, created_at TEXT NOT NULL, task_id INTEGER);
CREATE INDEX idx_msg_conv ON messages(conversation_id, id);
CREATE TABLE tasks (id INTEGER PRIMARY KEY, root_id INTEGER, parent_id INTEGER, conversation_id INTEGER, agent TEXT NOT NULL, title TEXT NOT NULL, instructions TEXT NOT NULL,
  depends_on_json TEXT NOT NULL DEFAULT '[]', status TEXT NOT NULL, result_json TEXT, error TEXT, steps INTEGER NOT NULL DEFAULT 0, tool_calls INTEGER NOT NULL DEFAULT 0,
  attempt INTEGER NOT NULL DEFAULT 1, review_notes TEXT, cost_usd REAL NOT NULL DEFAULT 0, transcript_json TEXT, created_at TEXT NOT NULL, started_at TEXT, finished_at TEXT);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE TABLE task_events (id INTEGER PRIMARY KEY, task_id INTEGER NOT NULL, ts TEXT NOT NULL, type TEXT NOT NULL, data_json TEXT);
CREATE INDEX idx_te_task ON task_events(task_id, id);
CREATE TABLE agent_state (agent TEXT PRIMARY KEY, status TEXT NOT NULL, task_id INTEGER, title TEXT, since TEXT NOT NULL, steps INTEGER, detail TEXT);
CREATE TABLE news_items (id INTEGER PRIMARY KEY, task_id INTEGER, title TEXT NOT NULL, url TEXT NOT NULL, source TEXT, published_at TEXT, fetched_at TEXT NOT NULL,
  popularity_evidence TEXT, verification_status TEXT NOT NULL DEFAULT 'unverified', verification_notes TEXT, canonical TEXT);
CREATE UNIQUE INDEX idx_news_url ON news_items(url);
CREATE TABLE content_items (id INTEGER PRIMARY KEY, kind TEXT NOT NULL, task_id INTEGER, news_id INTEGER, payload_json TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE covers (id INTEGER PRIMARY KEY, task_id INTEGER, news_id INTEGER, concept_json TEXT NOT NULL, file_path TEXT, created_at TEXT NOT NULL);
CREATE TABLE calendar_entries (id INTEGER PRIMARY KEY, slot TEXT NOT NULL, day TEXT NOT NULL, news_id INTEGER, proposal_id INTEGER, platform TEXT, note TEXT, created_at TEXT NOT NULL);
CREATE TABLE post_results (id INTEGER PRIMARY KEY, proposal_id INTEGER, platform TEXT NOT NULL, post_url TEXT, metrics_json TEXT NOT NULL, collected_at TEXT NOT NULL, source TEXT NOT NULL);
CREATE TABLE proposals (id INTEGER PRIMARY KEY, root_id INTEGER, conversation_id INTEGER, status TEXT NOT NULL, data_json TEXT NOT NULL, created_at TEXT NOT NULL, decided_at TEXT, decision_notes TEXT, parent_proposal_id INTEGER);
CREATE TABLE ai_usage (id INTEGER PRIMARY KEY, ts TEXT NOT NULL, provider TEXT NOT NULL, model TEXT NOT NULL, input_tokens INTEGER NOT NULL, output_tokens INTEGER NOT NULL,
  cache_read INTEGER NOT NULL DEFAULT 0, cache_write INTEGER NOT NULL DEFAULT 0, web_searches INTEGER NOT NULL DEFAULT 0, cost_usd REAL NOT NULL, task_id INTEGER, agent TEXT, purpose TEXT, price_verified INTEGER NOT NULL DEFAULT 0);
CREATE INDEX idx_usage_ts ON ai_usage(ts);
CREATE TABLE errors (id INTEGER PRIMARY KEY, ts TEXT NOT NULL, source TEXT NOT NULL, message TEXT NOT NULL, detail_json TEXT, task_id INTEGER);
CREATE TABLE preferences (id INTEGER PRIMARY KEY, key TEXT UNIQUE NOT NULL, value TEXT NOT NULL, source TEXT NOT NULL, updated_at TEXT NOT NULL, evidence_message_id INTEGER);
CREATE TABLE memory_notes (id INTEGER PRIMARY KEY, kind TEXT NOT NULL, text TEXT NOT NULL, task_id INTEGER, created_at TEXT NOT NULL);
CREATE TABLE routines (id TEXT PRIMARY KEY, name TEXT NOT NULL, time_hhmm TEXT NOT NULL, timezone TEXT NOT NULL, focus TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 0, last_run_key TEXT);
CREATE TABLE audit_log (id INTEGER PRIMARY KEY, ts TEXT NOT NULL, actor TEXT NOT NULL, action TEXT NOT NULL, target TEXT, detail_json TEXT, ip TEXT, prev_hash TEXT NOT NULL, hash TEXT NOT NULL);
CREATE TABLE uploads (id INTEGER PRIMARY KEY, original_name TEXT NOT NULL, stored_name TEXT NOT NULL, mime TEXT NOT NULL, size INTEGER NOT NULL, sha256 TEXT NOT NULL, conversation_id INTEGER, created_at TEXT NOT NULL);
CREATE TABLE connector_tokens (platform TEXT PRIMARY KEY, token_enc TEXT NOT NULL, scopes TEXT, created_at TEXT NOT NULL);
CREATE VIRTUAL TABLE memory_fts USING fts5(text, kind UNINDEXED, ref UNINDEXED);
`,
];

export function openDb(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  const v = db.prepare('PRAGMA user_version').get().user_version;
  for (let i = v; i < MIGRATIONS.length; i++) { db.exec('BEGIN'); try { db.exec(MIGRATIONS[i]); db.exec(`PRAGMA user_version = ${i + 1}`); db.exec('COMMIT'); } catch (e) { db.exec('ROLLBACK'); throw e; } }
  return db;
}

export const now = () => new Date().toISOString();
export const j = (x) => JSON.stringify(x ?? null);
export const parse = (s, d = null) => { try { return s == null ? d : JSON.parse(s); } catch { return d; } };

/* Acceso simple a settings (JSON) */
export const getSetting = (db, key, d = null) => { const r = db.prepare('SELECT value_json FROM settings WHERE key=?').get(key); return r ? parse(r.value_json, d) : d; };
export const setSetting = (db, key, value) => db.prepare('INSERT INTO settings(key,value_json,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json, updated_at=excluded.updated_at').run(key, j(value), now());
