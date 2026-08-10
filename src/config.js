// Environment seam. In `vite dev` (import.meta.env.DEV) API_BASE is empty, so
// requests go same-origin (/ws/ess.asmx/…) and the dev mock plugin answers. In
// the built extension it targets the real ESS origin.
export const API_BASE = import.meta.env.DEV ? "" : "https://vr.star.com.au/syd";

export const apiUrl = (method) => `${API_BASE}/ws/ess.asmx/${method}`;

// SOAP calls (give-away/swap) POST to the bare endpoint — the method goes in the
// SOAPAction header, not the URL path.
export const soapUrl = () => `${API_BASE}/ws/ess.asmx`;
