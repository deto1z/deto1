// Prueba de la rutina: horarios en America/New_York, incluido el cambio de horario de verano.
import { nextRun, zonedToUtc } from './src/schedule.js';
const T = 'America/New_York';
const eq = (name, got, want) => { const ok = got.toISOString() === want; console.log(ok ? 'OK  ' : 'FALLO', name.padEnd(46), got.toISOString()); if (!ok) { console.log('   esperado', want); process.exitCode = 1; } };
eq('21 nov 2026 (EST): 07:00 NY', zonedToUtc(2026, 11, 21, 7, 0, T), '2026-11-21T12:00:00.000Z');
eq('15 jul 2026 (EDT): 07:00 NY', zonedToUtc(2026, 7, 15, 7, 0, T), '2026-07-15T11:00:00.000Z');
eq('Próxima 07:00 tras las 12:00Z del día', nextRun('07:00', T, new Date('2026-11-21T13:00:00Z')), '2026-11-22T12:00:00.000Z');
eq('Próxima 12:00 antes de las 17:00Z', nextRun('12:00', T, new Date('2026-11-21T15:00:00Z')), '2026-11-21T17:00:00.000Z');
eq('Próxima 18:00 (EST)', nextRun('18:00', T, new Date('2026-11-21T15:00:00Z')), '2026-11-21T23:00:00.000Z');
eq('Cambio a horario de verano (8 mar 2026)', nextRun('07:00', T, new Date('2026-03-07T20:00:00Z')), '2026-03-08T11:00:00.000Z');
eq('Fin del horario de verano (1 nov 2026)', nextRun('07:00', T, new Date('2026-10-31T20:00:00Z')), '2026-11-01T12:00:00.000Z');
