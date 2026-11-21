import test from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, waitFor } from './helpers.js';
import { schedulerTick, updateRoutine, listRoutines } from '../src/scheduler.js';
import { grantAuthorization, revokeAuthorization } from '../src/security.js';

const at = (iso) => new Date(iso);
test('rutinas: nacen DESACTIVADAS, en America/New_York, 7:00 / 12:00 / 18:00', async () => {
  const env = await makeEnv(); const r = listRoutines(env.db); assert.deepEqual(r.map((x) => x.time_hhmm), ['07:00', '12:00', '18:00']); assert.ok(r.every((x) => !x.enabled && x.timezone === 'America/New_York')); await env.close();
});
test('no se pueden activar sin autorizar antes la automatización', async () => {
  const env = await makeEnv(); assert.throws(() => updateRoutine(env.db, 'am', { enabled: true }), /autorizar la automatización/); await env.close();
});
test('desactivadas o sin autorización global: el planificador no lanza nada', async () => {
  const env = await makeEnv(); assert.deepEqual(await schedulerTick(env.db, env.orch, at('2026-11-23T12:00:30Z')), []);
  grantAuthorization(env.db, 'automation', 'routines', 't'); assert.deepEqual(await schedulerTick(env.db, env.orch, at('2026-11-23T12:00:30Z')), [], 'autorizada pero ninguna activada'); assert.equal(env.fake.calls.length, 0); await env.close();
});
test('activada y autorizada: se lanza a las 7:00 de Nueva York (EST = 12:00 UTC), una sola vez por día', async () => {
  const env = await makeEnv(); grantAuthorization(env.db, 'automation', 'routines', 't'); updateRoutine(env.db, 'am', { enabled: true });
  assert.deepEqual(await schedulerTick(env.db, env.orch, at('2026-11-23T11:59:00Z')), [], 'un minuto antes no');
  assert.deepEqual(await schedulerTick(env.db, env.orch, at('2026-11-23T12:00:30Z')), ['am']);
  assert.deepEqual(await schedulerTick(env.db, env.orch, at('2026-11-23T12:05:00Z')), [], 'ya corrió hoy');
  assert.deepEqual(await schedulerTick(env.db, env.orch, at('2026-11-24T12:00:10Z')), ['am'], 'al día siguiente vuelve a correr');
  await waitFor(() => env.db.prepare('SELECT 1 FROM conversations').all().length >= 2 && env.fake.calls.length >= 2); assert.ok(env.db.prepare("SELECT 1 FROM audit_log WHERE action='rutina.lanzada'").all().length === 2); await env.close();
});
test('horario de verano: en julio (EDT) 7:00 NY = 11:00 UTC', async () => {
  const env = await makeEnv(); grantAuthorization(env.db, 'automation', 'routines', 't'); updateRoutine(env.db, 'am', { enabled: true });
  assert.deepEqual(await schedulerTick(env.db, env.orch, at('2026-07-15T12:00:30Z')), [], 'a las 12:00 UTC ya pasaron 60 min: no se lanza una rutina vieja');
  assert.deepEqual(await schedulerTick(env.db, env.orch, at('2026-07-15T11:02:00Z')), ['am']); await env.close();
});
test('horarios editables y validados', async () => {
  const env = await makeEnv(); grantAuthorization(env.db, 'automation', 'routines', 't'); updateRoutine(env.db, 'am', { enabled: true, time: '07:30' });
  assert.deepEqual(await schedulerTick(env.db, env.orch, at('2026-11-23T12:00:30Z')), []); assert.deepEqual(await schedulerTick(env.db, env.orch, at('2026-11-23T12:30:30Z')), ['am']);
  assert.throws(() => updateRoutine(env.db, 'am', { time: '25:99' }), /Hora inválida/); assert.throws(() => updateRoutine(env.db, 'am', { timezone: 'Marte/Olimpo' }), /Zona/);
  updateRoutine(env.db, 'noon', { timezone: 'America/Los_Angeles' }); assert.equal(listRoutines(env.db).find((r) => r.id === 'noon').timezone, 'America/Los_Angeles'); await env.close();
});
