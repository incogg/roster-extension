// Pure date/time helpers. No browser globals — safe to unit-test in node.
export const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const DAYMS = 86400000;
export const CYCLE_DAYS = 28; // roster cycles are always 4 weeks

// "20260804" or "20260804 1800" → local Date at midnight of that day.
export const parseYmd = (s) => {
  const y = +s.slice(0, 4), m = +s.slice(4, 6) - 1, d = +s.slice(6, 8);
  return new Date(y, m, d);
};

// "20260804 1800" → "18:00"
export const fmtHM = (s) => {
  const t = s.split(" ")[1];
  if (!t) return "";
  return t.slice(0, 2) + ":" + t.slice(2, 4);
};

export const fmtD = (d) => d.getDate() + " " + MON[d.getMonth()];

export const addDays = (date, n) => { const x = new Date(date); x.setDate(x.getDate() + n); return x; };

// Date → "YYYYMMDD"
export const d3 = (date) =>
  "" + date.getFullYear() + String(date.getMonth() + 1).padStart(2, "0") + String(date.getDate()).padStart(2, "0");

export const dayDiff = (a, b) => Math.round((a - b) / DAYMS);
