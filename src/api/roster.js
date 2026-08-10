// Roster data acquisition (GetRosterData) + cycle-aligned windowing.
import { essPost } from "./client.js";
import { CYCLE_DAYS, DAYMS, parseYmd, addDays, d3 } from "../core/dates.js";

// GetRosterData for an explicit inclusive date window.
export function fetchRosterRange(startYmd, endYmd) {
  return essPost("GetRosterData", { aStartDate: startYmd, aEndDate: endYmd });
}

// Cycle-aligned window: previous cycle start → next cycle end, clamped to the
// employee's visible range. LastRosteredDate is always a cycle end (the phase);
// cycles are a fixed 4 weeks.
export function cycleAlignedRange(payload, day) {
  const d = payload && payload.d;
  if (!d || !d.LastRosteredDate) return null;
  const anchorStart = addDays(parseYmd(d.LastRosteredDate), -(CYCLE_DAYS - 1));
  const dayDiff = (a, b) => Math.round((a - b) / DAYMS);
  const curStart = addDays(anchorStart, Math.floor(dayDiff(day, anchorStart) / CYCLE_DAYS) * CYCLE_DAYS);
  let start = addDays(curStart, -CYCLE_DAYS);          // previous cycle start
  let endIncl = addDays(curStart, 2 * CYCLE_DAYS - 1); // next cycle last day
  const earliest = d.EarliestRosteredDate ? parseYmd(d.EarliestRosteredDate) : null;
  const lastVisible = d.LastVisibleDate ? parseYmd(d.LastVisibleDate) : null;
  if (earliest && start < earliest) start = earliest;
  if (lastVisible && endIncl > lastVisible) endIncl = lastVisible;
  return { start: d3(start), end: d3(endIncl) };
}

export async function fetchRoster() {
  // Phase 1: probe this week to learn the current cycle's boundaries.
  const today = new Date();
  const monday = addDays(today, -((today.getDay() + 6) % 7));
  const probe = await fetchRosterRange(d3(monday), d3(addDays(monday, 6)));
  // Phase 2: fetch exactly the cycle-aligned window (prev → next cycle).
  const range = cycleAlignedRange(probe, monday);
  if (!range) return probe; // today isn't in a known cycle — use the probe as-is
  return fetchRosterRange(range.start, range.end);
}
