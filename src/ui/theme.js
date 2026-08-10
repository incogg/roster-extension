// Small shared UI helper. All theme COLOURS now live as CSS custom properties in
// ui/tokens.css (the one place to tweak them) — reference them as var(--…) from
// scoped styles or `:style` bindings rather than importing constants here.

// star.svg lives in the extension package (chrome.runtime.getURL) or, in dev, is
// served from the repo root by Vite.
export const starImgSrc = () =>
  typeof chrome !== "undefined" && chrome.runtime ? chrome.runtime.getURL("star.svg") : "/star.svg";
