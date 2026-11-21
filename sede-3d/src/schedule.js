// Rutina diaria de reuniones ejecutivas. Horarios editables; zona por defecto: America/New_York.
// AUTOMATIZACIÓN BLOQUEADA hasta que existan herramientas reales conectadas y autorizadas (Fase 5).
export const AUTOMATION_AVAILABLE = false;
export const DEFAULT_SCHEDULE = {
  timezone: 'America/New_York',
  meetings: [
    { id: 'am',   label: 'Reunión de la mañana',   time: '07:00', focus: 'Tendencias, noticias y propuestas de la mañana', enabled: false },
    { id: 'noon', label: 'Reunión del mediodía',   time: '12:00', focus: 'Novedades virales y oportunidades de la tarde', enabled: false },
    { id: 'pm',   label: 'Reunión de la noche',    time: '18:00', focus: 'Tendencias nocturnas y análisis del rendimiento del día', enabled: false },
  ],
};
const KEY = 'detonador.schedule.v1';
export function loadSchedule() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s?.meetings?.length) return { ...DEFAULT_SCHEDULE, ...s, meetings: s.meetings.map((m) => ({ ...m, enabled: false })) }; } catch (e) { /* sin datos */ }
  return structuredClone(DEFAULT_SCHEDULE);
}
export function saveSchedule(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* almacenamiento no disponible */ } }

/* Diferencia (ms) entre la hora local de `tz` y UTC en el instante `date` */
export function tzOffsetMs(date, tz) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' })
    .formatToParts(date).map((x) => [x.type, +x.value]));
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(date.getTime() / 1000) * 1000;
}
/* Instante UTC en que el reloj de `tz` marca y-m-d hh:mm (maneja el cambio de horario de verano) */
export function zonedToUtc(y, m, d, hh, mm, tz) {
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  let r = guess - tzOffsetMs(new Date(guess), tz);
  r = guess - tzOffsetMs(new Date(r), tz);
  return new Date(r);
}
/* Próxima ocurrencia (Date UTC) de "HH:MM" en la zona `tz` */
export function nextRun(time, tz, now = new Date()) {
  const [hh, mm] = time.split(':').map(Number);
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(now).map((x) => [x.type, +x.value]));
  let c = zonedToUtc(p.year, p.month, p.day, hh, mm, tz);
  if (c <= now) { const n = new Date(Date.UTC(p.year, p.month - 1, p.day + 1)); c = zonedToUtc(n.getUTCFullYear(), n.getUTCMonth() + 1, n.getUTCDate(), hh, mm, tz); }
  return c;
}
export function formatRun(date, tz) {
  return new Intl.DateTimeFormat('es', { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }).format(date);
}
export function fmtCountdown(ms) { const m = Math.max(0, Math.round(ms / 60000)); return `${Math.floor(m / 60)} h ${m % 60} min`; }
