// Roster data store: initial load, cycle accumulation, and future-only infinite
// scroll. `model` is a shallowRef (rebuilt wholesale on each ingest) that drives
// the whole desktop/mobile render.
import { shallowRef, ref } from "vue";
import { fetchRoster, fetchRosterRange } from "../api/roster.js";
import { buildModel } from "../core/model.js";
import { CYCLE_DAYS, DAYMS, parseYmd, addDays, d3 } from "../core/dates.js";

const model = shallowRef(null);
const loading = ref(false);
const error = ref(null);
const loadingMore = ref(false);

// Raw accumulation (not reactive — only `model` needs to be).
let meta = null;
let weeksByStart = {};
let firstCycleStart = null;
let lastCycleStart = null;

const LOOKUP_KEYS = ["Locations", "Departments", "LeaveTypes", "ShiftClasses", "Areas", "Sites", "Tags"];
const SCALAR_KEYS = ["LastRosteredDate", "EarliestRosteredDate", "LastVisibleDate", "ServerNowDateTime", "Result", "ShowTimesheet"];

function mergeMeta(base, incoming) {
  for (const key of LOOKUP_KEYS) {
    const map = new Map();
    [...(base[key] || []), ...(incoming[key] || [])].forEach((x) => { if (x && x.ID != null) map.set(x.ID, x); });
    base[key] = [...map.values()];
  }
  base.CanFindWorkRanges = [...(base.CanFindWorkRanges || []), ...(incoming.CanFindWorkRanges || [])];
  for (const key of SCALAR_KEYS) if (incoming[key] != null) base[key] = incoming[key];
}

function ingestPayload(payload) {
  const d = payload && payload.d;
  if (!d) return;
  const { Weeks, ...m } = d;
  if (!meta) meta = {};
  mergeMeta(meta, m);
  (Weeks || []).forEach((w) => { if (w && w.StartDate) weeksByStart[w.StartDate] = w; });

  const lrd = meta.LastRosteredDate;
  const anchorStart = lrd ? addDays(parseYmd(lrd), -(CYCLE_DAYS - 1)) : null;
  const cycleStartOf = (dt) => anchorStart ? addDays(anchorStart, Math.floor(Math.round((dt - anchorStart) / DAYMS) / CYCLE_DAYS) * CYCLE_DAYS) : dt;
  let min = null, max = null;
  for (const k of Object.keys(weeksByStart)) {
    const cs = cycleStartOf(parseYmd(k));
    if (!min || cs < min) min = cs;
    if (!max || cs > max) max = cs;
  }
  firstCycleStart = min; lastCycleStart = max;
}

function rebuild() {
  const weeks = Object.keys(weeksByStart).sort().map((k) => weeksByStart[k]);
  model.value = buildModel({ d: Object.assign({}, meta, { Weeks: weeks }) });
}

async function load() {
  loading.value = true; error.value = null;
  try {
    const payload = await fetchRoster();
    ingestPayload(payload);
    rebuild();
  } catch (e) {
    console.error("[newRoster] failed to load", e);
    error.value = e.message || String(e);
  } finally {
    loading.value = false;
  }
}

// Re-fetch after a pickup so the new shift shows.
async function reload() {
  const payload = await fetchRoster();
  // Reset accumulation to the fresh window (matches the old reloadRoster).
  meta = null; weeksByStart = {};
  ingestPayload(payload);
  rebuild();
}

async function loadNextCycle() {
  if (loadingMore.value || !lastCycleStart) return;
  const start = addDays(lastCycleStart, CYCLE_DAYS);
  const lastVisible = meta.LastVisibleDate ? parseYmd(meta.LastVisibleDate) : null;
  if (lastVisible && start > lastVisible) return;
  let end = addDays(start, CYCLE_DAYS - 1);
  if (lastVisible && end > lastVisible) end = lastVisible;
  loadingMore.value = true;
  try {
    const p = await fetchRosterRange(d3(start), d3(end));
    ingestPayload(p);
    rebuild();
  } catch (e) {
    console.error("[newRoster] load next failed", e);
  } finally {
    loadingMore.value = false;
  }
}

export function useRoster() {
  return { model, loading, error, loadingMore, load, reload, loadNextCycle };
}
