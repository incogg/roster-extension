// Main-world guard, injected by content.js only while the new-roster overlay is
// mounted. The legacy ESS roster page occasionally reloads itself (session
// keep-alive / SPA housekeeping). Under our overlay that reload is invisible but
// races the session, so GetRosterData comes back 403 and the user lands on the
// error screen. We can't reach the page's own reload logic from the isolated
// content-script world, so this runs in the page's main world and neutralises
// the common self-reload vectors. Best-effort and defensive: every override is
// wrapped so a hardened browser Location can't break the page.
//
// Our own reloads (the "Old roster" / "New roster" toggle, the error-screen
// "Try again" button) run in the content-script world, which has a separate
// window/location, so they are unaffected by these main-world overrides.
(function () {
  const self = document.currentScript;
  if (window.__rosterReloadGuard) {
    if (self) self.remove();
    return;
  }
  window.__rosterReloadGuard = true;

  const log = (...a) => console.warn("[newRoster] reload-guard:", ...a);

  // 1. location.reload() — the most likely vector. Try both instance and
  //    prototype redefinition; either may be blocked depending on the engine.
  const suppress = function () { log("suppressed location.reload()"); };
  let overrode = false;
  try {
    Object.defineProperty(window.location, "reload", { configurable: true, value: suppress });
    overrode = true;
  } catch (_) { /* Location is exotic; fall through */ }
  if (!overrode) {
    try {
      Object.defineProperty(Location.prototype, "reload", { configurable: true, value: suppress });
      overrode = true;
    } catch (_) { /* ignore */ }
  }
  if (!overrode) {
    try { window.location.reload = suppress; overrode = true; } catch (_) { /* ignore */ }
  }
  if (!overrode) log("could not override location.reload()");

  // 2. <meta http-equiv="refresh"> auto-refresh tags — strip on sight.
  const stripMetaRefresh = () => {
    document.querySelectorAll('meta[http-equiv="refresh" i]').forEach((m) => {
      log("stripped meta refresh", m.content);
      m.remove();
    });
  };
  stripMetaRefresh();
  new MutationObserver(stripMetaRefresh).observe(document.documentElement, { childList: true, subtree: true });

  if (self) self.remove();
})();
