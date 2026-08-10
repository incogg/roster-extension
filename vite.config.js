import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { essMockPlugin } from "./dev/mock/plugin.js";

// The shipped artifact is a browser-extension *content script*, which cannot be
// an ES module — it must be a single classic IIFE. So we build in library mode
// with formats:['iife'], entry src/main.js → dist/roster.js. content.js and
// background.js stay vanilla and are copied into dist/ by build/copy-static.js.
//
// CSS isolation: in the extension the app is a full-screen overlay dropped onto
// the ESS page, so its styles must not leak either way. We mount into a Shadow
// DOM (see src/main.js) and inject the bundle's CSS as a string. `inlineCss`
// pulls the emitted stylesheet out of the bundle and hands it to the runtime as
// globalThis.__ROSTER_CSS__. In `vite dev` there's no host page (we run the
// standalone dev/index.html), so main.js skips the shadow root and lets the Vue
// plugin hot-inject styles into <head> as usual — keeping HMR intact.
function inlineCss() {
  let css = "";
  return {
    name: "roster-inline-css",
    apply: "build",
    // enforce:'post' + generateBundle order:'post' so this runs AFTER Vite's own
    // CSS plugin has emitted the stylesheet asset — otherwise the bundle has no
    // css yet and we'd inline an empty string.
    enforce: "post",
    generateBundle: {
      order: "post",
      handler(_opts, bundle) {
        for (const [file, chunk] of Object.entries(bundle)) {
          if (chunk.type === "asset" && file.endsWith(".css")) {
            css += chunk.source;
            delete bundle[file];
          }
        }
        for (const chunk of Object.values(bundle)) {
          if (chunk.type === "chunk" && chunk.isEntry) {
            chunk.code =
              `globalThis.__ROSTER_CSS__=${JSON.stringify(css)};\n` + chunk.code;
          }
        }
      },
    },
  };
}

export default defineConfig(({ command }) => ({
  // Root is the repo root: `vite dev` serves the standalone index.html here and
  // can reach /src/*. In lib-build mode Vite ignores index.html and uses the
  // entry below, so index.html stays a dev-only file (never copied into dist/).
  // host:true binds 0.0.0.0 so the dev server is reachable from other LAN
  // devices (e.g. a phone). The app fetches same-origin, so the mock still
  // intercepts when the page is loaded via the machine's LAN IP.
  server: { host: true },
  // Vue's runtime references process.env.NODE_ENV. Vite's library mode does NOT
  // inject it, and the shipped content script has no `process` — so it throws
  // "process is not defined" and the bundle never sets window.NewRoster. Define
  // it for the production build only; dev keeps Vue's full dev build + warnings.
  define: command === "build" ? { "process.env.NODE_ENV": JSON.stringify("production") } : {},
  plugins: [vue(), inlineCss(), essMockPlugin()],
  build: {
    cssCodeSplit: false,
    outDir: "dist",
    emptyOutDir: true,
    lib: {
      entry: "src/main.js",
      formats: ["iife"],
      name: "RosterExtensionApp",
      fileName: () => "roster.js",
    },
  },
}));
