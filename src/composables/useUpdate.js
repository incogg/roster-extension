// "Update available" banner. Asks the background script (which escapes the page
// CSP) whether a newer GitHub release exists. No-op in dev (no chrome runtime).
import { ref } from "vue";

const update = ref(null);

function checkForUpdate() {
  try {
    if (typeof chrome === "undefined" || !chrome.runtime) return;
    chrome.runtime.sendMessage({ type: "check-update" }, (res) => {
      if (chrome.runtime.lastError || !res || !res.updateAvailable) return;
      update.value = res;
    });
  } catch (e) {
    /* extension context unavailable; ignore */
  }
}

export function useUpdate() {
  return { update, checkForUpdate };
}
