
// On the native mobile site (/syd/m/…), jump straight to the desktop version —
// it hosts the new roster, which already has its own responsive mobile rendering.
// Mirrors the site's own "View desktop version" link by adding ?mobile=no. Guard
// against a loop in case the server ignores the flag and bounces us back.
console.log("[newRoster] content.js injected @", location.href);

(function redirectMobileToDesktop() {
    if (!/\/m\//.test(location.pathname)) return;
    if (/[?&]mobile=no\b/.test(location.search)) return;
    const desktopPath = location.pathname.replace("/m/", "/");
    const p = new URLSearchParams(location.search).get("p");
    const hash = p ? "#/" + p : (location.hash || "");
    location.replace(location.origin + desktopPath + "?mobile=no" + hash);
})();

// The page's anti-CSRF token lives in the main world (window.antiCsrfToken),
// unreachable from this isolated content-script world. injected.js runs in the
// page context, reads it, and postMessages it back here for the roster app's
// authenticated fetches (see src/api/client.js).
let _csrfWaiters = [];

window.addEventListener("message", (event) => {
    if (
        event.source !== window ||
        !event.data ||
        event.data.type !== "csrfToken"
    )
        return;
    if (event.data.token) localStorage.setItem("csrfToken", event.data.token);
    const waiters = _csrfWaiters;
    _csrfWaiters = [];
    waiters.forEach((resolve) => resolve(event.data.token || null));
});

// Returns a Promise resolving to the page's current anti-CSRF token. injected.js
// runs in the main world, reads window.antiCsrfToken, and postMessages it back to
// the listener above. The roster bundle (src/api/client.js) shares this scope and
// awaits this instead of racing a synchronous localStorage read. A short fallback
// timeout resolves with whatever's cached in case injected.js posts nothing.
function fetchCsrfToken() {
    return new Promise((resolve) => {
        _csrfWaiters.push(resolve);
        injectScript(chrome.runtime.getURL("injected.js"));
        setTimeout(() => {
            const i = _csrfWaiters.indexOf(resolve);
            if (i !== -1) {
                _csrfWaiters.splice(i, 1);
                resolve(localStorage.getItem("csrfToken"));
            }
        }, 1000);
    });
}

// Inject a page-context script (used for injected.js). The roster bundle also
// calls this by name (it shares this content-script scope) to (re)fetch the csrf
// token on demand.
function injectScript(file) {
    const script = document.createElement("script");
    script.id = "injectedScript";
    script.setAttribute("type", "text/javascript");
    script.setAttribute("src", file);
    document.body.appendChild(script);
}

// --- Usage tracking (umami) ---
// The roster page's CSP (default-src 'none') blocks fetching cloud.umami.is
// from this context, so the request is delegated to the background script.

let trackedEmpId = null;

function extractEmpId() {
    const sources = [
        document.querySelector(".empName")?.textContent,
        document.getElementById("empInfo")?.textContent,
    ];
    for (const text of sources) {
        const match = text?.match(/\[(\d+)\]/);
        if (match) return match[1];
    }
    return null;
}

function trackUsage() {
    const empId = extractEmpId();
    if (!empId || empId === trackedEmpId) return;
    trackedEmpId = empId;

    chrome.runtime.sendMessage({
        type: "umami-track",
        empId,
        hostname: location.hostname,
        url: location.pathname,
        title: document.title,
    });
}

injectScript(chrome.runtime.getURL("./injected.js"));

// --- New roster takeover toggle ---
// The new design (roster.js, built from src/) replaces the desktop roster by
// default. The user can switch back to the original page ("Old roster" button in
// the new header), which sets a persisted flag and injects a "New roster" button
// to switch back.

const NEW_ROSTER_DISABLED_KEY = "newRoster.disabled";
const newRosterDisabled = () => localStorage.getItem(NEW_ROSTER_DISABLED_KEY) === "1";

// Mount the new-roster takeover as a full-screen overlay. On desktop we hide the
// original #rosterContent behind it; on mobile there's no such element, so the
// overlay simply covers the native mobile page (originalEl stays null).
function mountNewRoster(originalEl) {
    if (!window.NewRoster) return;
    const original = originalEl || document.getElementById("rosterContent") || null;
    localStorage.removeItem(NEW_ROSTER_DISABLED_KEY);
    removeNewRosterButton();
    document.body.classList.add("newRosterActive");
    window.NewRoster.mount(document.body, original);
}

// Switching between old and new is done via a flag + full reload: unmounting the
// overlay in place doesn't reliably restore the site's own roster (its SPA state
// is stale), whereas a reload lets the observer re-evaluate from a clean page.
function exitNewRoster() {
    localStorage.setItem(NEW_ROSTER_DISABLED_KEY, "1");
    location.reload();
}

function injectNewRosterButton() {
    if (document.getElementById("newRosterButton")) return;
    // The tabs list (Roster/Noticeboard/Messages/Leave) lives inside
    // .navbar-collapse. Avoid the earlier "settings" ul, which also matches
    // .nav.navbar-nav but hosts the cog dropdown.
    const nav = document.querySelector(".navbar-collapse ul.nav.navbar-nav");
    const button = document.createElement("a");
    button.id = "newRosterButton";
    button.textContent = "New roster ↗";
    button.href = "#";
    button.onclick = (e) => { e.preventDefault(); localStorage.removeItem(NEW_ROSTER_DISABLED_KEY); location.reload(); };
    if (nav) {
        // Inject into the old page's gold top nav bar (after the last tab). The
        // white CTA pill is designed for exactly this gold background.
        button.className = "newRosterNavButton";
        const li = document.createElement("li");
        // Stretch the li to the navbar's full height so the shorter pill
        // centers vertically against the full-height tab items beside it.
        li.style.cssText = `display:flex; align-items:center; height:${nav.clientHeight}px;`;
        li.appendChild(button);
        nav.appendChild(li);
    } else {
        button.className = "newRosterFloatingButton";
        document.body.appendChild(button);
    }
}

function removeNewRosterButton() {
    const b = document.getElementById("newRosterButton");
    if (b) b.remove();
}

document.addEventListener("newroster:exit", exitNewRoster);

let _nrDiagLogged = false;

new MutationObserver(() => {
    trackUsage();

    // Take over the roster page with the new design (roster.js), unless the user
    // has switched back to the original. The site (v2.125.3+) no longer exposes
    // #rosterContent — the roster renders inside .tabContent — so we key off the
    // app shell (.tabContent) while the roster route is active (hash contains
    // "roster"). The new roster fetches its own data and mounts as a full-screen
    // overlay, so it works with originalEl = null. The legacy #rosterContent
    // selector is kept as a fallback.
    const rosterContent = document.getElementById("rosterContent");
    const tabContent = document.querySelector(".tabContent");
    const onRosterRoute = /roster/i.test(location.hash || "");
    const onRosterPage = rosterContent || (tabContent && onRosterRoute);

    // One-time diagnostic to make "nothing injected" debuggable from the console.
    if (!_nrDiagLogged) {
        _nrDiagLogged = true;
        console.log("[newRoster] observer alive —",
            "NewRoster:", !!window.NewRoster,
            "#rosterContent:", !!rosterContent,
            ".tabContent:", !!tabContent,
            "hash:", location.hash,
            "onRosterPage:", !!onRosterPage,
            "disabled:", newRosterDisabled());
    }

    if (onRosterPage && window.NewRoster) {
        if (newRosterDisabled()) injectNewRosterButton();
        else if (!window.NewRoster.isMounted()) mountNewRoster(rosterContent);
    }
}).observe(document.body, { childList: true, subtree: true });

// trigger an initial check in case rosterContent is already in the DOM
const _dummy = document.createElement("div");
document.body.appendChild(_dummy);
_dummy.remove();
