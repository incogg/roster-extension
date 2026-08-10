// Sends usage events to umami on behalf of the content script.
// Runs in the extension context, so it is not subject to the roster page's CSP.

const UMAMI_WEBSITE_ID = "df63f504-e092-42ce-aa55-6c942d469e2d";
const UMAMI_ENDPOINT = "https://cloud.umami.is/api/send";

function sendToUmami(type, payload) {
    return fetch(UMAMI_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, payload }),
    });
}

// ---- update check ---------------------------------------------------------
// Polls the GitHub releases API for the latest tag and compares it to the
// installed version. Runs in the background (extension) context so it is not
// subject to the roster page's CSP. Results are cached to avoid hammering the
// API (GitHub rate-limits unauthenticated requests to 60/hr per IP).

const GITHUB_LATEST_RELEASE = "https://api.github.com/repos/incogg/roster-extension/releases/latest";
const UPDATE_CACHE_KEY = "updateCheck";
const UPDATE_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

function parseVersion(v) {
    return String(v).replace(/^v/i, "").split(".").map((n) => parseInt(n, 10) || 0);
}

// True if `latest` is a strictly higher semver-ish version than `current`.
function isNewer(latest, current) {
    const a = parseVersion(latest), b = parseVersion(current);
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
        const x = a[i] || 0, y = b[i] || 0;
        if (x !== y) return x > y;
    }
    return false;
}

async function getUpdateStatus() {
    const current = chrome.runtime.getManifest().version;

    // Serve a fresh cached result without touching the network.
    const cached = (await chrome.storage.local.get(UPDATE_CACHE_KEY))[UPDATE_CACHE_KEY];
    if (cached && Date.now() - cached.checkedAt < UPDATE_CACHE_TTL_MS) {
        return { current, latestVersion: cached.latestVersion, url: cached.url,
                 updateAvailable: isNewer(cached.latestVersion, current) };
    }

    try {
        const res = await fetch(GITHUB_LATEST_RELEASE, { headers: { Accept: "application/vnd.github+json" } });
        if (!res.ok) throw new Error("github " + res.status);
        const data = await res.json();
        const result = { latestVersion: data.tag_name, url: data.html_url, checkedAt: Date.now() };
        await chrome.storage.local.set({ [UPDATE_CACHE_KEY]: result });
        return { current, latestVersion: result.latestVersion, url: result.url,
                 updateAvailable: isNewer(result.latestVersion, current) };
    } catch (e) {
        console.error("[update] check failed:", e);
        // Fall back to any stale cache so a transient failure doesn't hide a
        // previously-detected update.
        if (cached) {
            return { current, latestVersion: cached.latestVersion, url: cached.url,
                     updateAvailable: isNewer(cached.latestVersion, current) };
        }
        return { current, updateAvailable: false, error: String(e) };
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type !== "check-update") return;
    getUpdateStatus().then(sendResponse);
    return true; // keep the message channel open for the async response
});

chrome.runtime.onMessage.addListener((message) => {
    if (message?.type !== "umami-track") return;
    console.log("[umami] track received:", message);

    // `id` sets the visitor's distinct id to the roster employee id.
    const payload = {
        website: UMAMI_WEBSITE_ID,
        hostname: message.hostname,
        url: message.url,
        title: message.title,
        id: message.empId,
    };

    // identify binds the session to the employee id; the nameless payload is
    // logged as a pageview (a `name` would make it a custom event instead).
    sendToUmami("identify", payload)
        .then(() => sendToUmami("event", payload))
        .then((r) => r.text().then((b) => console.log("[umami] pageview", r.status, b)))
        .catch((e) => console.error("[umami] track failed:", e));
});
