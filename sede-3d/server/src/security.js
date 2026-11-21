import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import net from 'node:net';
import { now, j, parse } from './db.js';

/* ───────────── Contraseña (scrypt) ───────────── */
export function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(pw, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$8$1$${salt.toString('hex')}$${key.toString('hex')}`;
}
export function verifyPassword(pw, stored) {
  try {
    const [, N, r, p, saltHex, keyHex] = stored.split('$');
    const key = crypto.scryptSync(pw, Buffer.from(saltHex, 'hex'), 64, { N: +N, r: +r, p: +p });
    return crypto.timingSafeEqual(key, Buffer.from(keyHex, 'hex'));
  } catch { return false; }
}
export const passwordProblem = (pw) => (typeof pw !== 'string' || pw.length < 12 ? 'La contraseña debe tener al menos 12 caracteres.' : null);

/* ───────────── Sesiones y CSRF ───────────── */
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
export function createSession(db, userId, { ip, ua, ttlHours }) {
  const token = crypto.randomBytes(32).toString('base64url'), csrf = crypto.randomBytes(24).toString('base64url');
  const created = now(), expires = new Date(Date.now() + ttlHours * 3600_000).toISOString();
  db.prepare('INSERT INTO sessions(token_hash,user_id,csrf,created_at,expires_at,ip,ua) VALUES(?,?,?,?,?,?,?)').run(sha(token), userId, csrf, created, expires, ip ?? null, (ua ?? '').slice(0, 200));
  return { token, csrf, expires };
}
export function getSession(db, token) {
  if (!token) return null;
  const s = db.prepare('SELECT * FROM sessions WHERE token_hash=?').get(sha(token));
  if (!s) return null;
  if (s.expires_at < now()) { db.prepare('DELETE FROM sessions WHERE token_hash=?').run(s.token_hash); return null; }
  return s;
}
export const destroySession = (db, token) => db.prepare('DELETE FROM sessions WHERE token_hash=?').run(sha(token));

/* ───────────── Bloqueo por intentos fallidos ───────────── */
export function loginLocked(db, key, { loginMaxFailures, loginLockMinutes }) {
  const since = new Date(Date.now() - loginLockMinutes * 60_000).toISOString();
  const fails = db.prepare('SELECT COUNT(*) c FROM login_attempts WHERE key=? AND ts>? AND ok=0').get(key, since).c;
  const lastOk = db.prepare('SELECT MAX(ts) t FROM login_attempts WHERE key=? AND ok=1').get(key).t;
  return fails >= loginMaxFailures && (!lastOk || lastOk < since);
}
export const recordLogin = (db, key, ok) => db.prepare('INSERT INTO login_attempts(key,ts,ok) VALUES(?,?,?)').run(key, now(), ok ? 1 : 0);

/* ───────────── Registro de acciones (cadena de hashes a prueba de alteración) ───────────── */
export function audit(db, { actor = 'sistema', action, target = null, detail = null, ip = null }) {
  const prev = db.prepare('SELECT hash FROM audit_log ORDER BY id DESC LIMIT 1').get()?.hash ?? 'GENESIS';
  const ts = now(), d = j(detail);
  const hash = sha(`${prev}|${ts}|${actor}|${action}|${target}|${d}`);
  db.prepare('INSERT INTO audit_log(ts,actor,action,target,detail_json,ip,prev_hash,hash) VALUES(?,?,?,?,?,?,?,?)').run(ts, actor, action, target, d, ip, prev, hash);
}
export function verifyAuditChain(db) {
  let prev = 'GENESIS';
  for (const r of db.prepare('SELECT * FROM audit_log ORDER BY id').all()) {
    if (r.prev_hash !== prev || sha(`${r.prev_hash}|${r.ts}|${r.actor}|${r.action}|${r.target}|${r.detail_json}`) !== r.hash) return { ok: false, brokenAt: r.id };
    prev = r.hash;
  }
  return { ok: true };
}

/* ───────────── Protección SSRF para herramientas que descargan URLs ───────────── */
export function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  if (net.isIPv6(ip)) { const x = ip.toLowerCase(); return x === '::1' || x === '::' || x.startsWith('fc') || x.startsWith('fd') || x.startsWith('fe80') || x.startsWith('::ffff:') && isPrivateIp(x.split(':').pop()); }
  return true;
}
export async function assertPublicUrl(raw, { allowPrivate = false } = {}) {
  let u; try { u = new URL(raw); } catch { throw new SecurityError('URL inválida'); }
  if (!['http:', 'https:'].includes(u.protocol)) throw new SecurityError('Solo se permiten URLs http(s)');
  if (u.username || u.password) throw new SecurityError('URL con credenciales no permitida');
  if (allowPrivate) return u;                                          // solo pruebas con servidores locales de ejemplo
  const host = u.hostname.replace(/^\[|\]$/g, '');
  const addrs = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true }).catch(() => { throw new SecurityError('No se pudo resolver el dominio'); });
  if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) throw new SecurityError('Destino no permitido (red privada o local)');
  return u;
}
export class SecurityError extends Error {}

/* Descarga con límites: tamaño, tiempo, redirecciones (cada salto se revalida) y tipos de contenido. */
export async function safeFetch(url, { maxBytes = 1_500_000, timeoutMs = 12_000, maxRedirects = 3, allowPrivate = false, headers = {}, accept = /^(text\/|application\/(xml|json|rss\+xml|atom\+xml|xhtml\+xml))/i } = {}) {
  let current = url;
  for (let i = 0; i <= maxRedirects; i++) {
    await assertPublicUrl(current, { allowPrivate });
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const res = await fetch(current, { redirect: 'manual', signal: ctl.signal, headers: { 'user-agent': 'DETONADOR-AI-EMPIRE/0.3 (+lector de noticias; solo lectura)', ...headers } });
      if (res.status >= 300 && res.status < 400 && res.headers.get('location')) { current = new URL(res.headers.get('location'), current).href; continue; }
      const type = res.headers.get('content-type') || '';
      if (!accept.test(type)) throw new SecurityError(`Tipo de contenido no permitido: ${type || 'desconocido'}`);
      const reader = res.body.getReader(); const chunks = []; let size = 0;
      for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > maxBytes) { ctl.abort(); throw new SecurityError('Respuesta demasiado grande'); } chunks.push(value); }
      return { status: res.status, url: current, type, text: Buffer.concat(chunks).toString('utf8') };
    } finally { clearTimeout(t); }
  }
  throw new SecurityError('Demasiadas redirecciones');
}

/* ───────────── Validación de archivos subidos (por firma real, no por extensión) ───────────── */
const SIGS = [
  { mime: 'image/png', ext: 'png', test: (b) => b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: 'image/jpeg', ext: 'jpg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: 'image/webp', ext: 'webp', test: (b) => b.length > 12 && b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP' },
  { mime: 'application/pdf', ext: 'pdf', test: (b) => b.subarray(0, 5).toString() === '%PDF-' },
];
export function sniffFile(buf, originalName = '') {
  for (const s of SIGS) if (s.test(buf)) return { mime: s.mime, ext: s.ext };
  const ext = originalName.toLowerCase().split('.').pop();
  if (['txt', 'csv', 'md', 'json'].includes(ext)) {                       // texto: debe ser UTF-8 válido, sin NUL ni binario
    if (buf.includes(0)) return null;
    const text = buf.toString('utf8'); if (text.includes('�')) return null;
    if (ext === 'json') { try { JSON.parse(text); } catch { return null; } }
    return { mime: { txt: 'text/plain', csv: 'text/csv', md: 'text/markdown', json: 'application/json' }[ext], ext };
  }
  return null;
}
export const safeStoredName = (ext) => `${crypto.randomBytes(16).toString('hex')}.${ext}`;       // nunca se usa el nombre original en disco
export const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

/* ───────────── Cifrado en reposo de tokens de conectores (AES-256-GCM) ───────────── */
export function encryptToken(plain, keyMaterial) {
  if (!keyMaterial || keyMaterial.length < 32) throw new Error('DETONADOR_TOKEN_KEY debe tener al menos 32 caracteres');
  const key = crypto.createHash('sha256').update(keyMaterial).digest(), iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key, iv); const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return `${iv.toString('base64')}.${c.getAuthTag().toString('base64')}.${enc.toString('base64')}`;
}
export function decryptToken(blob, keyMaterial) {
  const [iv, tag, enc] = blob.split('.').map((x) => Buffer.from(x, 'base64'));
  const key = crypto.createHash('sha256').update(keyMaterial).digest(), d = crypto.createDecipheriv('aes-256-gcm', key, iv); d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString('utf8');
}

/* Autorizaciones explícitas del propietario */
export const isAuthorized = (db, kind, name) => !!db.prepare('SELECT 1 FROM authorizations WHERE kind=? AND name=? AND revoked_at IS NULL').get(kind, name);
export function grantAuthorization(db, kind, name, note, actor = 'propietario') { if (!isAuthorized(db, kind, name)) db.prepare('INSERT INTO authorizations(kind,name,granted_at,note) VALUES(?,?,?,?)').run(kind, name, now(), note ?? null); audit(db, { actor, action: 'autorizacion.otorgada', target: `${kind}:${name}`, detail: { note } }); }
export function revokeAuthorization(db, kind, name, actor = 'propietario') { db.prepare('UPDATE authorizations SET revoked_at=? WHERE kind=? AND name=? AND revoked_at IS NULL').run(now(), kind, name); audit(db, { actor, action: 'autorizacion.revocada', target: `${kind}:${name}` }); }
