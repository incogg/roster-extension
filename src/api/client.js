// Low-level ESS POST helper. Replicates the page's own authenticated JSON calls
// (session cookies + anti-CSRF token) since the main-world `comms` client can't
// be reached from the content-script world.
//
// `fetchCsrfToken` is a content-script global provided by content.js (both files
// share the one content-script scope). It only exists in the built extension; in
// `vite dev` the mock ignores the token, and the CSRF branch below is guarded by
// `typeof fetchCsrfToken` so it's simply skipped.
import { apiUrl, soapUrl } from "../config.js";

async function csrfToken() {
  let token = localStorage.getItem("csrfToken");
  // Re-read from the page's main world if we have no cached token. This awaits
  // the injected-script message round-trip — reading localStorage synchronously
  // right after injectScript races the async postMessage and yields null (403).
  if (!token && typeof fetchCsrfToken === "function") {
    token = await fetchCsrfToken();
  }
  return token;
}

export async function essPost(method, body) {
  const token = await csrfToken();
  const res = await fetch(apiUrl(method), {
    method: "POST",
    headers: { Accept: "*/*", "Content-Type": "application/json", "X-Csrf-Token": token },
    credentials: "include",
    referrer: "https://vr.star.com.au/syd/Default.aspx?",
    body: JSON.stringify(body),
    mode: "cors",
  });
  if (!res.ok) {
    localStorage.removeItem("csrfToken"); // token may have refreshed — force re-read next time
    throw new Error(`${method} HTTP ${res.status}`);
  }
  return res.json();
}

// Some ESS methods (give-away, swap, messages) are SOAP rather than JSON. Same
// auth (session cookies + csrf token), but the method lives in the SOAPAction
// header and the body/response are XML. `innerXml` is the method element and its
// payload, e.g. `<InitShiftGive><singleshiftgiveaway .../></InitShiftGive>`.
export async function essSoap(method, innerXml) {
  const token = await csrfToken();
  const envelope =
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">' +
    "<soap:Body>" + innerXml + "</soap:Body></soap:Envelope>";
  const res = await fetch(soapUrl(), {
    method: "POST",
    headers: {
      Accept: "*/*",
      "Content-Type": "text/xml",
      SOAPAction: "http://localhost/ess/ws/ess.asmx/" + method,
      "X-Csrf-Token": token,
    },
    credentials: "include",
    referrer: "https://vr.star.com.au/syd/Default.aspx?",
    body: envelope,
    mode: "cors",
  });
  if (!res.ok) {
    localStorage.removeItem("csrfToken");
    throw new Error(`${method} HTTP ${res.status}`);
  }
  return res.text();
}
