# Release 2.0

A complete rewrite. The extension no longer just adds a "Check Shifts" button to
the native roster — it now **replaces the roster with a redesigned view** and
adds real shift actions (pick up, give away) directly on the calendar. Built on
Vue 3 + Vite, with matching desktop and mobile layouts.

## ✨ Highlights

- **Redesigned roster** — a clean fortnight/cycle calendar takes over the roster
  page, on both desktop and mobile. Same data, much clearer view.
- **Give away shifts** 🎁 — offer a rostered shift to **anyone** or to a
  **specific employee ID**. The offered day is marked red on the calendar, and a
  pending offer can be **cancelled in one click**.
- **Pick up open shifts** — available shifts show right on each future day
  (hover on desktop, tap-through on mobile), with a confirmation dialog.
- **Pay estimates** — every shift shows an estimated pay figure from your
  configurable hourly rate, plus per-fortnight hours/pay summaries.
- **Mobile layout** — day tiles with a detail pane; give-away works here too.
- **Infinite scroll** — keep scrolling to load future roster cycles.
- **Auto-update check** — an **"Update available"** button appears in the header
  when a newer release is out.

## 🛠 Fixes & under the hood

- **Update check now actually works** — the manifest was missing the `storage`
  permission and the `api.github.com` host it relies on; both are now declared.
- **Manifest cleanup** — removed unused `scripting` / `webRequest` permissions
  and stale commented-out config.
- **Faster offer reconciliation** — checking your pending give-aways on load no
  longer makes a request per historical message (previously could take 20s+); it
  now only resolves outstanding offers, in parallel.
- Reorganised into a Vue 3 + Vite codebase (components / composables / core /
  api), with a dev-only mock API so the whole app runs offline.

## 🚧 Not wired up yet

- **Swap** and **Early Out** appear in the shift actions but are shown as
  disabled / "Coming soon" — the request payloads still need to be captured.

## ⬆️ Upgrading

Because the extension is sideloaded, updates are manual — download the zip below
and reinstall over your existing copy (see the README for per-device steps).

> On update you'll see a **new permissions prompt** (Storage + access to
> `api.github.com`). These power the update-available check — accept them.
