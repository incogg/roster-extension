// Entry point. Exposes window.NewRoster (mount/unmount/isMounted) exactly like
// the old roster.js so content.js's observer needs no changes. In the built
// extension we mount into a Shadow DOM for full style isolation from the ESS
// host page; in `vite dev` (import.meta.env.DEV) there's no host page, so we
// mount straight into the standalone dev page and let Vite hot-inject styles.
import { createApp } from "vue";
import App from "./components/App.vue";
import "./ui/tokens.css";

const USE_SHADOW = !import.meta.env.DEV;

let app = null; // the Vue app instance
let hostEl = null; // the element we add to the page (shadow host or plain div)
let originalEl = null;
let originalDisplay = null;

function mount(container, originalRosterEl) {
  if (app) return;

  hostEl = document.createElement("div");
  hostEl.id = "newRosterHost";

  let mountPoint;
  if (USE_SHADOW) {
    const shadow = hostEl.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = globalThis.__ROSTER_CSS__ || "";
    shadow.appendChild(style);
    mountPoint = document.createElement("div");
    shadow.appendChild(mountPoint);
  } else {
    mountPoint = hostEl;
  }

  (container || document.body).appendChild(hostEl);

  if (originalRosterEl) {
    originalEl = originalRosterEl;
    originalDisplay = originalRosterEl.style.display;
    originalRosterEl.style.display = "none";
  }
  document.body.classList.add("newRosterActive");

  app = createApp(App);
  app.mount(mountPoint);
}

function unmount() {
  if (app) {
    app.unmount();
    app = null;
  }
  if (hostEl) {
    hostEl.remove();
    hostEl = null;
  }
  if (originalEl) {
    originalEl.style.display = originalDisplay || "";
    originalEl = null;
  }
  document.body.classList.remove("newRosterActive");
}

window.NewRoster = { mount, unmount, isMounted: () => !!app };

// Standalone dev: no content.js to drive us, so mount ourselves.
if (import.meta.env.DEV) {
  mount(document.getElementById("app"));
}
