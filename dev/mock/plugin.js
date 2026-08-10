// Vite dev-only plugin: mocks the ESS SOAP-ish JSON API so the app can be
// developed fully offline, with zero risk to the live roster (crucially,
// TakeWork is a no-op — no shift is ever really picked up in dev).
//
// GetRosterData is served from a captured fixture. FindWork is *generated* per
// day (seeded by the date so a day's shifts stay stable across reloads,
// pagination and pickup) with varied times / roles / pits / counts — matching
// how the live site looks, without shipping one fixed set of shifts. The field
// shape mirrors a real capture kept for reference at
// fixtures/FindWork.populated.json (that file is NOT loaded — see the pools below).
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const FIX = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
const load = (f) => JSON.parse(readFileSync(join(FIX, f), "utf8"));

// --- FindWork generation ----------------------------------------------------

// Pools drawn from what the live roster shows.
const ROLES = [
  { ID: 1099, Name: "1.DLR" }, // roleLabel → "DLR"
  { ID: 6, Name: "TG" },
];
const LOCATIONS = [
  { ID: 6, Name: "P04" }, { ID: 7, Name: "P05" }, { ID: 8, Name: "P06" },
  { ID: 9, Name: "P07" }, { ID: 11, Name: "P09" },
  { ID: 998, Name: "Pit 20" }, { ID: 999, Name: "Pit 21" },
  { ID: 1270, Name: "Rapid" }, { ID: 1271, Name: "Tournament" },
];
// [startHour, endHour] — end >= 24 rolls to the next day (e.g. 26 → 02:00).
const TIMES = [
  [12, 20], [14, 24], [16, 26], [18, 26], [20, 28],
  [20, 30], [10, 18], [10, 20], [16, 24], [22, 30],
];

// Deterministic RNG so a date always generates the same shifts.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pad = (n) => String(n).padStart(2, "0");
function nextDay(ymd) {
  const d = new Date(+ymd.slice(0, 4), +ymd.slice(4, 6) - 1, +ymd.slice(6, 8) + 1);
  return "" + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
}

function generateFindWork(dateString) {
  const ds = /^\d{8}$/.test(dateString) ? dateString : "20260101";
  const rng = mulberry32(parseInt(ds, 10));
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];

  // Count distribution: ~25% none, then 1–6 (so 1/2 and 1/3 pagers appear).
  const r = rng();
  const n = r < 0.25 ? 0 : r < 0.45 ? 1 : r < 0.65 ? 2 : r < 0.82 ? 3 : r < 0.93 ? 4 : rng() < 0.5 ? 5 : 6;

  if (n === 0) {
    return { d: { Result: "end", Success: true, Shifts: null, Sites: null, Departments: null, Areas: null, Locations: null } };
  }

  const shifts = [];
  const usedTimes = new Set();
  for (let i = 0; i < n; i++) {
    let t = pick(TIMES), guard = 0;
    while (usedTimes.has(t.join()) && guard++ < 6) t = pick(TIMES);
    usedTimes.add(t.join());
    const [sh, eh] = t;
    const role = pick(ROLES);
    const loc = pick(LOCATIONS);
    shifts.push({
      StartDateTime: `${ds} ${pad(sh)}00`,
      EndDateTime: `${eh >= 24 ? nextDay(ds) : ds} ${pad(eh % 24)}00`,
      SiteID: null, RoleID: role.ID, AreaID: null, LocationID: loc.ID,
      StationName: "", WorkloadID: Math.floor(rng() * 900000),
      OfferID: Math.floor(rng() * 900000), Checksum: Math.floor((rng() - 0.5) * 2e9),
      ChecksumShiftFields: 15,
    });
  }
  return { d: { Result: "more", Success: true, Shifts: shifts, Sites: null, Departments: ROLES, Areas: null, Locations: LOCATIONS } };
}

// --- middleware -------------------------------------------------------------

function readRaw(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
  });
}
function readBody(req) {
  return readRaw(req).then((data) => {
    try { return data ? JSON.parse(data) : {}; } catch { return {}; }
  });
}

// --- SOAP (give-away) mock --------------------------------------------------
// In-memory offer store so give → pending → cancel round-trips in dev. Keyed by
// sourcedatetime, each offer surfaces as a type-10 GetMessages item. Dev-only —
// nothing here touches the live site (give-away is a no-op, like TakeWork).
const offers = new Map(); // sourcedatetime -> { id, sortval }
let nextMsgId = 5000, nextSort = 1;
const attr = (xml, name) => (new RegExp(name + '="([^"]*)"').exec(xml) || [])[1];

function handleSoap(method, xml, send) {
  const ok = '<?xml version="1.0" encoding="UTF-8"?><response success="True" result="Success"/>';
  switch (method) {
    case "InitShiftGive": {
      const src = attr(xml, "sourcedatetime");
      if (src) offers.set(src, { id: String(nextMsgId++), sortval: nextSort++ });
      console.log("[ess-mock] InitShiftGive (no-op):", src);
      return send(ok);
    }
    case "CancelShiftOffer": {
      const id = attr(xml, "id");
      for (const [src, o] of offers) if (o.id === id) offers.delete(src);
      console.log("[ess-mock] CancelShiftOffer (no-op):", id);
      return send(ok);
    }
    case "GetMessages": {
      const items = [...offers.values()]
        .map((o) => `<item id="${o.id}" type="10" fromemp="" read="False" datetime="${new Date().toISOString()}" sortval="${o.sortval}"/>`)
        .join("");
      return send(`<?xml version="1.0" encoding="UTF-8"?><items>${items}</items>`);
    }
    case "GetMessageDetails": {
      const id = attr(xml, "id");
      let src = "";
      for (const [s, o] of offers) if (o.id === id) src = s;
      return send(`<?xml version="1.0" encoding="UTF-8"?><details sourcedatetime="${src}" issourceemp="True"/>`);
    }
    default:
      console.log("[ess-mock] unhandled SOAP method:", method);
      return send(ok);
  }
}

export function essMockPlugin() {
  return {
    name: "roster-ess-mock",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || "";
        if (req.method !== "POST" || !/\/ws\/ess\.asmx/.test(url)) return next();

        // SOAP calls POST to the bare endpoint with the method in the SOAPAction
        // header rather than the URL path.
        const soapAction = req.headers["soapaction"] || req.headers["SOAPAction"];
        if (soapAction && !/\/ws\/ess\.asmx\/\w/.test(url)) {
          const method = String(soapAction).replace(/"/g, "").split("/").pop();
          const xml = await readRaw(req);
          return handleSoap(method, xml, (text) => {
            res.setHeader("Content-Type", "text/xml");
            res.end(text);
          });
        }

        const m = /\/ws\/ess\.asmx\/(\w+)/.exec(url);
        if (!m) return next();

        const method = m[1];
        const body = await readBody(req);
        const send = (obj) => {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(obj));
        };

        switch (method) {
          case "GetRosterData":
            return send(load("GetRosterData.json"));

          case "FindWork":
            return send(generateFindWork(body.dateString));

          case "TakeWork":
            // The whole point: acknowledge success without doing anything.
            console.log("[ess-mock] TakeWork (no-op):", JSON.stringify(body));
            return send({ d: { Result: true, Success: true } });

          default:
            console.log("[ess-mock] unhandled method:", method);
            return send({ d: { Result: true } });
        }
      });
    },
  };
}
