// Normalise the raw GetRosterData payload into the render model. Pure — no
// browser globals, no fetch — so it can be unit-tested against a fixture.
import { MON, DAYMS, CYCLE_DAYS, parseYmd, fmtHM, addDays, d3, dayDiff } from "./dates.js";

export function buildModel(payload) {
  const d = payload.d;
  const loc = Object.fromEntries((d.Locations || []).map((x) => [x.ID, x.Name]));
  const dept = Object.fromEntries((d.Departments || []).map((x) => [x.ID, x.Name]));
  const leaveType = Object.fromEntries((d.LeaveTypes || []).map((x) => [x.ID, x.Name]));
  const shiftClass = Object.fromEntries((d.ShiftClasses || []).map((x) => [x.ID, x.Name]));
  const today = parseYmd(d.ServerNowDateTime);
  const findRanges = (d.CanFindWorkRanges || []).map((r) => [parseYmd(r.StartDate), parseYmd(r.EndDate)]);
  const inFindRange = (date) => findRanges.some(([a, b]) => date >= a && date <= b);

  // Returns { text, shift } — `shift` marks a projected day/night shift (bold in
  // the cell) as opposed to unavailable/leave.
  const prefLabel = (pref) => {
    if (!pref) return { text: "", shift: false };
    if (pref.LeaveTypeID) return { text: leaveType[pref.LeaveTypeID] === "RDO" ? "Rostered day off" : "Unavailable", shift: false };
    if (pref.ShiftClassIDs && pref.ShiftClassIDs.length) {
      const nm = shiftClass[pref.ShiftClassIDs[0]];
      const text = nm === "D" ? "Day shift" : (nm === "N" ? "Night shift" : (nm ? nm + " shift" : "Shift"));
      return { text, shift: true };
    }
    return { text: "", shift: false };
  };

  const allWeeks = (d.Weeks || []).map((w) => {
    const wStart = parseYmd(w.StartDate);
    const days = w.Days.map((day, dow) => {
      const date = new Date(wStart.getTime() + dow * DAYMS);
      const shift = (day.Shifts || [])[0] || null;
      const r = shift && shift.Rostered;
      let kind, time = "", location = "", department = "", state = null, canGive = false, canSwap = false, eo = false, warn = false, warnText = "", posId = 0, startRaw = "";
      if (r && r.LeaveTypeID) {
        kind = "leave";
        state = leaveType[r.LeaveTypeID] === "RDO" ? "rdo" : "unav";
      } else if (r && r.StartDateTime && r.EndDateTime) {
        kind = "work";
        time = fmtHM(r.StartDateTime) + " – " + fmtHM(r.EndDateTime);
        const a = shift.Actual || {};
        location = loc[a.LocationID] || "";
        department = dept[a.RoleID] || "";
        // PositionID (per-shift row id) is required to give a shift away; it is 0
        // on non-giveable shifts, so gate canGive on it defensively. startRaw is
        // the verbatim "YYYYMMDD HHMM" the give-away SOAP call echoes back.
        posId = a.PositionID || 0;
        startRaw = r.StartDateTime;
        canGive = !!shift.CanGive && !!posId; canSwap = !!shift.CanSwap; eo = !!shift.EOAvailable;
        warn = !!a.ShowWarning;
        warnText = shift.Notes || "This shift has a warning";
      } else if (!w.IsPublished) {
        kind = "draft";
      } else {
        kind = "empty";
      }
      const pref = prefLabel(day.Preferences);
      return {
        date, dow, num: String(date.getDate()), mon: MON[date.getMonth()],
        kind, time, loc: location, dept: department, state,
        canGive, canSwap, eo, warn, warnText, posId, startRaw,
        draftLabel: pref.text, draftShift: pref.shift,
        isToday: date.getTime() === today.getTime(),
        past: date < today,
        // Pickups open only from two days out — you can't pick up a shift for
        // today or tomorrow. (Production's CanFindWorkRanges normally encodes
        // this; we enforce it explicitly so it holds regardless.)
        canFindWork: kind !== "work" && kind !== "draft" && dayDiff(date, today) >= 2 && inFindRange(date),
        key: w.StartDate + "-" + dow,
        dateStr: d3(date),
      };
    });
    return { start: wStart, published: w.IsPublished, totalMins: w.TotalRosteredMins || 0, days };
  });

  // Cycles are always 4 weeks; LastRosteredDate is always a cycle end, giving a
  // reliable phase. Group weeks into fixed 28-day blocks aligned to it, each
  // split into two 2-week pay fortnights.
  const anchorStart = d.LastRosteredDate
    ? addDays(parseYmd(d.LastRosteredDate), -(CYCLE_DAYS - 1))
    : (allWeeks[0] ? allWeeks[0].start : today);
  const cycleStartOf = (dt) => addDays(anchorStart, Math.floor(dayDiff(dt, anchorStart) / CYCLE_DAYS) * CYCLE_DAYS);

  const weeks = allWeeks;
  const curCycleStart = cycleStartOf(today);

  const fortnights = [];
  let cur = null, prevCycleKey;
  for (const w of weeks) {
    const cs = cycleStartOf(w.start);
    const cycleKey = cs.getTime();
    const fIndex = Math.floor(Math.round(dayDiff(w.start, cs) / 7) / 2); // 0 or 1
    const key = cycleKey + ":" + fIndex;
    if (!cur || cur.key !== key) {
      cur = { key, cycleStart: cs, weeks: [], newCycle: cycleKey !== prevCycleKey, currentCycle: false };
      prevCycleKey = cycleKey;
      fortnights.push(cur);
    }
    cur.weeks.push(w);
  }
  const curFn = fortnights.find((f) => f.cycleStart.getTime() === curCycleStart.getTime());
  if (curFn) curFn.currentCycle = true;

  return { today, weeks, fortnights, inFindRange };
}
