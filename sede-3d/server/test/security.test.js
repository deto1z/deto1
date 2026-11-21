import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/db.js';
import { hashPassword, verifyPassword, passwordProblem, audit, verifyAuditChain, isPrivateIp, assertPublicUrl, sniffFile, encryptToken, decryptToken, createSession, getSession, loginLocked, recordLogin, isAuthorized, grantAuthorization, revokeAuthorization } from '../src/security.js';
import { loadConfig } from '../src/config.js';

test('contraseñas: scrypt, verificación y política mínima', () => {
  const h = hashPassword('una-clave-bastante-larga'); assert.match(h, /^scrypt\$/);
  assert.ok(verifyPassword('una-clave-bastante-larga', h)); assert.ok(!verifyPassword('otra', h));
  assert.ok(passwordProblem('corta')); assert.equal(passwordProblem('una-clave-bastante-larga'), null);
});
test('sesiones: caducan y se validan; token distinto no entra', () => {
  const db = openDb(':memory:'); db.prepare("INSERT INTO users(username,pass_hash,created_at) VALUES('a','x','t')").run();
  const s = createSession(db, 1, { ttlHours: 1 }); assert.ok(getSession(db, s.token)); assert.equal(getSession(db, s.token + 'x'), null);
  db.prepare('UPDATE sessions SET expires_at=?').run(new Date(Date.now() - 1000).toISOString()); assert.equal(getSession(db, s.token), null);
});
test('bloqueo tras intentos fallidos', () => {
  const db = openDb(':memory:'); const L = loadConfig().limits;
  for (let i = 0; i < L.loginMaxFailures; i++) recordLogin(db, 'ip|a', false);
  assert.ok(loginLocked(db, 'ip|a', L)); assert.ok(!loginLocked(db, 'ip|otra', L));
});
test('registro de acciones: cadena de hashes detecta alteraciones', () => {
  const db = openDb(':memory:'); audit(db, { action: 'a' }); audit(db, { action: 'b' }); audit(db, { action: 'c' });
  assert.ok(verifyAuditChain(db).ok);
  db.prepare("UPDATE audit_log SET action='alterado' WHERE id=2").run(); const r = verifyAuditChain(db); assert.ok(!r.ok); assert.equal(r.brokenAt, 2);
});
test('SSRF: bloquea redes privadas, localhost, metadatos y esquemas no http', async () => {
  for (const ip of ['127.0.0.1', '10.0.0.5', '192.168.1.1', '172.16.0.1', '169.254.169.254', '::1', 'fd00::1', '100.64.0.1']) assert.ok(isPrivateIp(ip), ip);
  assert.ok(!isPrivateIp('8.8.8.8'));
  for (const u of ['http://127.0.0.1/', 'http://localhost/', 'http://169.254.169.254/latest', 'file:///etc/passwd', 'ftp://x.com/', 'http://user:pw@example.com/']) await assert.rejects(() => assertPublicUrl(u), /no permitid|inválida|Solo|credenciales|resolver|Destino/i, u);
});
test('archivos: valida por firma real; rechaza ejecutables y disfrazados', () => {
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(20)]);
  assert.equal(sniffFile(png, 'x.png').mime, 'image/png'); assert.equal(sniffFile(Buffer.from('%PDF-1.7 ...'), 'a.pdf').mime, 'application/pdf');
  assert.equal(sniffFile(Buffer.from('MZ\x90\x00 ejecutable'), 'foto.png'), null);                 // .exe renombrado a .png
  assert.equal(sniffFile(Buffer.from('<script>alert(1)</script>'), 'a.html'), null);              // html no permitido
  assert.equal(sniffFile(Buffer.from('{"a":1}'), 'a.json').mime, 'application/json'); assert.equal(sniffFile(Buffer.from('{roto'), 'a.json'), null);
  assert.equal(sniffFile(Buffer.from([0, 1, 2, 3]), 'a.txt'), null);
});
test('tokens de conectores: cifrado AES-GCM ida y vuelta; clave débil rechazada; manipulación detectada', () => {
  const key = 'x'.repeat(40); const enc = encryptToken('token-secreto', key); assert.ok(!enc.includes('token-secreto')); assert.equal(decryptToken(enc, key), 'token-secreto');
  assert.throws(() => encryptToken('a', 'corta')); const bad = enc.slice(0, -4) + 'AAAA'; assert.throws(() => decryptToken(bad, key));
});
test('autorizaciones: otorgar y revocar quedan registradas', () => {
  const db = openDb(':memory:'); assert.ok(!isAuthorized(db, 'provider', 'anthropic')); grantAuthorization(db, 'provider', 'anthropic', 'n'); assert.ok(isAuthorized(db, 'provider', 'anthropic'));
  revokeAuthorization(db, 'provider', 'anthropic'); assert.ok(!isAuthorized(db, 'provider', 'anthropic')); assert.equal(db.prepare('SELECT COUNT(*) c FROM audit_log').get().c, 2);
});
