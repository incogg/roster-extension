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
