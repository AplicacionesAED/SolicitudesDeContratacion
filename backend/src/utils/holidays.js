// Puerto literal de src/lib/holidays.ts (app Next.js original) -- festivos de
// Colombia calculados a mano (algoritmo de Butcher para Semana Santa + Ley
// Emiliani para el traslado a lunes), sin dependencia npm. America/Bogota no
// entra explícitamente acá porque el original tampoco la usaba en este
// archivo -- las fechas se comparan como fechas locales del proceso.
function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function nextMonday(date) {
  const d = new Date(date);
  const dow = d.getDay();
  if (dow === 1) return d;
  const diff = dow === 0 ? 1 : 8 - dow;
  d.setDate(d.getDate() + diff);
  return d;
}

function toKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getHolidaysCO(year) {
  const holidays = new Set();
  const add = (d) => holidays.add(toKey(d));

  add(new Date(year, 0, 1));
  add(new Date(year, 4, 1));
  add(new Date(year, 6, 20));
  add(new Date(year, 7, 7));
  add(new Date(year, 11, 8));
  add(new Date(year, 11, 25));

  add(nextMonday(new Date(year, 0, 6)));
  add(nextMonday(new Date(year, 2, 19)));
  add(nextMonday(new Date(year, 5, 29)));
  add(nextMonday(new Date(year, 7, 15)));
  add(nextMonday(new Date(year, 9, 12)));
  add(nextMonday(new Date(year, 10, 1)));
  add(nextMonday(new Date(year, 10, 11)));

  const easter = easterSunday(year);
  add(addDays(easter, -3));
  add(addDays(easter, -2));

  add(nextMonday(addDays(easter, 39)));
  add(nextMonday(addDays(easter, 60)));
  add(nextMonday(addDays(easter, 68)));

  return holidays;
}

function isBusinessDay(date, holidays) {
  const dow = date.getDay();
  if (dow === 0) return false;
  return !holidays.has(toKey(date));
}

function addBusinessDays(from, days) {
  const years = new Set([from.getFullYear()]);
  const result = new Date(from);
  let added = 0;
  const holidays = getHolidaysCO(from.getFullYear());

  while (added < days) {
    result.setDate(result.getDate() + 1);
    const yr = result.getFullYear();
    if (!years.has(yr)) {
      years.add(yr);
      getHolidaysCO(yr).forEach((h) => holidays.add(h));
    }
    if (isBusinessDay(result, holidays)) added++;
  }
  return result;
}

function countBusinessDays(start, end) {
  const holidays = new Set();
  for (let y = start.getFullYear(); y <= end.getFullYear(); y++) {
    getHolidaysCO(y).forEach((h) => holidays.add(h));
  }
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    if (isBusinessDay(cur, holidays)) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

// Fecha mínima para iniciar: N días hábiles desde hoy.
function getMinStartDate(days = 13) {
  return addBusinessDays(new Date(), days);
}

module.exports = { getHolidaysCO, isBusinessDay, addBusinessDays, countBusinessDays, getMinStartDate };
