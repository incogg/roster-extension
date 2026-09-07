// Persisted user settings (localStorage) + pit-preference helpers. Browser-only
// (touches localStorage); a reactive composable will wrap these later.
const LS_RATE = "newRoster.hourlyRate";
const LS_CONTRACT = "newRoster.contractHours";
const LS_PIT_FAVS = "newRoster.pitFavs";   // favourited pit names (array)
const LS_PIT_SEEN = "newRoster.pitsSeen";  // every pit name seen in open shifts

export const getRate = () => { const v = parseFloat(localStorage.getItem(LS_RATE)); return isNaN(v) ? 38.68 : v; };
export const getContract = () => { const v = parseFloat(localStorage.getItem(LS_CONTRACT)); return isNaN(v) ? 16 : v; };
export const setRate = (v) => localStorage.setItem(LS_RATE, String(v));
export const setContract = (v) => localStorage.setItem(LS_CONTRACT, String(v));

const loadArr = (key) => { try { const v = JSON.parse(localStorage.getItem(key)); return Array.isArray(v) ? v : []; } catch { return []; } };
export const getPitFavs = () => loadArr(LS_PIT_FAVS);
export const getPitsSeen = () => loadArr(LS_PIT_SEEN);
export const setPitFavs = (arr) => localStorage.setItem(LS_PIT_FAVS, JSON.stringify(arr));
export const isPitFav = (name) => getPitFavs().includes(name);

// Add/remove a pit from favourites; returns the updated list.
export function togglePitFav(name) {
  const favs = getPitFavs();
  const i = favs.indexOf(name);
  if (i === -1) favs.push(name); else favs.splice(i, 1);
  setPitFavs(favs);
  return favs;
}

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

// Favourited pits first, then the rest — both alphabetical.
export function orderedPits() {
  const seen = getPitsSeen();
  const favs = getPitFavs().filter((p) => seen.includes(p)).sort();
  const rest = seen.filter((p) => !favs.includes(p)).sort();
  return [...favs, ...rest];
}

// Role/department name for a pill — strips an "N." ordering prefix ("1.DLR" → "DLR").
export const roleLabel = (name) => (name || "").replace(/^\s*\d+\s*\.\s*/, "").trim();

// Favourited pits float to the top of the open-shift list; then by start time.
export function sortByPitPref(shifts, data) {
  const locName = Object.fromEntries((data.Locations || []).map((l) => [l.ID, l.Name]));
  const favs = new Set(getPitFavs());
  const rank = (s) => (favs.has(locName[s.LocationID]) ? 0 : 1);
  return [...shifts].sort((a, b) => rank(a) - rank(b) || (a.StartDateTime < b.StartDateTime ? -1 : a.StartDateTime > b.StartDateTime ? 1 : 0));
}
