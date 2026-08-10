// Pay / penalty-rate math. Ported VERBATIM from the original roster.js — these
// are the real enterprise-agreement rules (confirmed with the user), so they
// must not be "cleaned up". No browser globals — node-testable.

export const parseTime = (t) => {
  const m = t.match(/(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const s = +m[1] + +m[2] / 60;
  let e = +m[3] + +m[4] / 60;
  if (e <= s) e += 24;
  return { s, e };
};

// Position/width of a shift within a 06:00-anchored 24h band (for the day bar).
export const band = (t) => {
  const p = parseTime(t);
  if (!p) return { left: "0%", width: "0%", night: false };
  const start = ((p.s - 6) + 24) % 24;
  return {
    left: (start / 24 * 100).toFixed(2) + "%",
    width: Math.max(3, (p.e - p.s) / 24 * 100).toFixed(2) + "%",
    night: p.s >= 17 || p.s < 5,
  };
};

// Penalty-rate rule (verified against the enterprise agreement):
//   day/night split at 07:00 / 19:00.
//   Mon–Fri day 1.00 · Mon–Thu night 1.15 · Fri–Sun night 1.50
//   (Sun night rolls to 1.15 for Mon 00:00–07:00) · Sat day 1.25 · Sun day 1.50
export const loadFor = (dow, hour) => {
  const night = hour >= 19 || hour < 7;
  if (night) {
    if (hour >= 19) return dow >= 4 ? 1.5 : 1.15;
    return (dow === 5 || dow === 6) ? 1.5 : 1.15;
  }
  if (dow === 5) return 1.25;
  if (dow === 6) return 1.5;
  return 1;
};

export const loadSplit = (dow, time) => {
  const p = parseTime(time);
  const out = {};
  if (!p) return out;
  const stepH = 0.25;
  for (let t = p.s; t < p.e - 1e-9; t += stepH) {
    const d = (dow + Math.floor(t / 24)) % 7;
    const r = loadFor(d, t % 24);
    out[r] = (out[r] || 0) + Math.min(stepH, p.e - t);
  }
  return out;
};

// effective (penalty-weighted) hours for a rate split
export const effOf = (sp) => Object.keys(sp).reduce((t, r) => t + sp[r] * Number(r), 0);
// duration in hours of a "HH:MM – HH:MM" range
export const durOf = (time) => { const p = parseTime(time); return p ? p.e - p.s : 0; };
// compact "HH–HH" label for a narrow calendar chip
export const tinyT = (time) => {
  const p = parseTime(time);
  if (!p) return time;
  const h = (x) => String(Math.floor(x % 24)).padStart(2, "0");
  return h(p.s) + "–" + h(p.e);
};

// penalty-rate → swatch colour (central tokens in ui/tokens.css; these strings
// end up in `:style` bindings inside the shadow tree, so var() resolves).
export const RATE_COLOR = {
  1: "var(--rate-100)",
  1.15: "var(--rate-115)",
  1.25: "var(--rate-125)",
  1.5: "var(--rate-150)",
};
export const rateColor = (r) => RATE_COLOR[r] || "var(--rate-default)";
export const money = (n) => "$" + Math.round(n).toLocaleString("en-AU");

// Hours under contract are topped up with annual leave, paid at a 1.2× loading.
export const AL_LOADING = 1.2;
export const AL_COLOR = "var(--leave-rate)";

// Left-summary computation for a "section" (a fortnight: { weeks: [...] }).
export function sectionSummary(section, rate, contract) {
  const load = {};
  let mins = 0;
  for (const w of section.weeks) {
    mins += w.totalMins;
    for (const day of w.days) {
      if (day.kind === "work") {
        const split = loadSplit(day.dow, day.time);
        for (const k in split) load[k] = (load[k] || 0) + split[k];
      }
    }
  }
  const published = section.weeks.some((w) => w.published);
  const hrs = mins / 60;
  const weekCount = section.weeks.length;
  const target = contract * weekCount;
  const rates = Object.keys(load).map(Number).sort((a, b) => a - b);
  const scale = (Math.max(hrs, target) || 1) * 1.15;
  const breakdown = rates.map((r) => ({
    rate: r.toFixed(2) + "×", color: rateColor(r),
    hrs: load[r].toFixed(1) + " h",
    w: (load[r] / scale * 100).toFixed(2) + "%",
  }));
  const eff = rates.reduce((s, r) => s + load[r] * r, 0);
  const alHours = published && hrs < target ? target - hrs : 0;
  if (alHours > 0) breakdown.push({
    rate: "Leave 1.20×", color: AL_COLOR,
    hrs: alHours.toFixed(1) + " h",
    w: (alHours / scale * 100).toFixed(2) + "%",
  });
  const effTotal = eff + alHours * AL_LOADING;
  return {
    published, hrs, target, breakdown, alHours,
    markerPct: (target / scale * 100).toFixed(2) + "%",
    effHours: effTotal.toFixed(1),
    payEst: money(effTotal * rate),
    note: !published
      ? "Not published yet"
      : (hrs < target ? (target - hrs).toFixed(1) + " h short of contract"
        : (hrs - target).toFixed(1) + " h above contract"),
  };
}

// shift penalty segments for a work-day card bar
export function shiftSegs(dow, time) {
  const sp = loadSplit(dow, time);
  const tot = Object.keys(sp).reduce((t, r) => t + sp[r], 0) || 1;
  return Object.keys(sp).map(Number).sort((a, b) => a - b)
    .map((r) => ({ w: (sp[r] / tot * 100).toFixed(2) + "%", color: rateColor(r) }));
}
export function shiftPay(dow, time, rate) {
  const sp = loadSplit(dow, time);
  const e = Object.keys(sp).reduce((t, r) => t + sp[r] * Number(r), 0);
  return money(e * rate);
}
