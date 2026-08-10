// Persisted user settings (localStorage) + pit-preference helpers. Browser-only
// (touches localStorage); a reactive composable will wrap these later.
const LS_RATE = "newRoster.hourlyRate";
const LS_CONTRACT = "newRoster.contractHours";
const LS_PIT_ORDER = "newRoster.pitOrder"; // user-preferred pit order (array of names)
const LS_PIT_SEEN = "newRoster.pitsSeen";  // every pit name seen in open shifts

export const getRate = () => { const v = parseFloat(localStorage.getItem(LS_RATE)); return isNaN(v) ? 38.68 : v; };
export const getContract = () => { const v = parseFloat(localStorage.getItem(LS_CONTRACT)); return isNaN(v) ? 16 : v; };
export const setRate = (v) => localStorage.setItem(LS_RATE, String(v));
export const setContract = (v) => localStorage.setItem(LS_CONTRACT, String(v));

const loadArr = (key) => { try { const v = JSON.parse(localStorage.getItem(key)); return Array.isArray(v) ? v : []; } catch { return []; } };
export const getPitOrder = () => loadArr(LS_PIT_ORDER);
export const getPitsSeen = () => loadArr(LS_PIT_SEEN);
export const setPitOrder = (arr) => localStorage.setItem(LS_PIT_ORDER, JSON.stringify(arr));

// Accumulate pit names seen in open-shift data so the preference list can be
// built even before the current session has loaded shifts for every pit.
export function recordPits(data) {
  if (!data || !data.Shifts || !data.Shifts.length) return;
  const locName = Object.fromEntries((data.Locations || []).map((l) => [l.ID, l.Name]));
  const seen = getPitsSeen();
  let changed = false;
  for (const s of data.Shifts) {
    const name = locName[s.LocationID];
    if (name && !seen.includes(name)) { seen.push(name); changed = true; }
  }
  if (changed) localStorage.setItem(LS_PIT_SEEN, JSON.stringify(seen));
}

// User-ordered pits first (still-known), then remaining seen pits alphabetically.
export function orderedPits() {
  const seen = getPitsSeen();
  const order = getPitOrder().filter((p) => seen.includes(p));
  const rest = seen.filter((p) => !order.includes(p)).sort();
  return [...order, ...rest];
}

// Role/department name for a pill — strips an "N." ordering prefix ("1.DLR" → "DLR").
export const roleLabel = (name) => (name || "").replace(/^\s*\d+\s*\.\s*/, "").trim();

// Sort open shifts by pit preference, then by start time within a pit.
export function sortByPitPref(shifts, data) {
  const locName = Object.fromEntries((data.Locations || []).map((l) => [l.ID, l.Name]));
  const order = orderedPits();
  const rank = (s) => { const i = order.indexOf(locName[s.LocationID]); return i === -1 ? 1e9 : i; };
  return [...shifts].sort((a, b) => rank(a) - rank(b) || (a.StartDateTime < b.StartDateTime ? -1 : a.StartDateTime > b.StartDateTime ? 1 : 0));
}
