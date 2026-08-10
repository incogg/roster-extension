// Layout + tab state: responsive breakpoints (narrow / mobile), a manual layout
// override, the active tab, and the settings-menu open flag. "Embed" mode (a
// non-roster tab) hides the site's own header and lets its SPA content show
// beneath our fixed header.
import { ref, computed } from "vue";

const NARROW_BREAKPOINT = 1420;
const MOBILE_BREAKPOINT = 1264;

const tab = ref("roster");
const menuOpen = ref(false);
const forceMobile = ref(null); // null = auto (by width)
const winWidth = ref(typeof window !== "undefined" ? window.innerWidth : 1600);

const mobile = computed(() => (forceMobile.value != null ? forceMobile.value : winWidth.value < MOBILE_BREAKPOINT));
const narrow = computed(() => winWidth.value < NARROW_BREAKPOINT && !mobile.value);

function onResize() { winWidth.value = window.innerWidth; }

let started = false;
function startResize() {
  if (started || typeof window === "undefined") return;
  started = true;
  window.addEventListener("resize", onResize);
}
function stopResize() {
  if (typeof window !== "undefined") window.removeEventListener("resize", onResize);
  started = false;
}

function setLayout(m) { forceMobile.value = m; menuOpen.value = false; }

// Non-roster tab: hide the site's native header, push its content below our
// fixed header (roster.css reads --newRosterHeaderH + .newRosterEmbed), and stop
// locking the host page's scroll so its own content can scroll.
function setEmbed(on, headerH) {
  if (on) {
    document.documentElement.style.setProperty("--newRosterHeaderH", (headerH || 54) + "px");
    document.body.classList.add("newRosterEmbed");
  } else {
    document.body.classList.remove("newRosterEmbed");
  }
  document.documentElement.classList.toggle("newRosterLocked", !on);
  document.body.classList.toggle("newRosterLocked", !on);
}

export function useLayout() {
  return { tab, menuOpen, forceMobile, mobile, narrow, winWidth, setLayout, setEmbed, startResize, stopResize };
}
