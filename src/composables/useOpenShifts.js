// Open-shift (FindWork) cache + pickup. Each cell asks for its date via ensure();
// the reactive `cache` entry drives its loading/rows state. Pickup goes through
// takeWork then reloads the roster and clears the cache.
import { reactive, ref } from "vue";
import { fetchOpenShifts } from "../api/openShifts.js";
import { takeWork } from "../api/pickup.js";
import { recordPits } from "../core/settings.js";
import { useRoster } from "./useRoster.js";
import { useSettings } from "./useSettings.js";

// date(YYYYMMDD) -> { loading, checked, data, error }
const cache = reactive({});
const showOpen = ref(true);

async function ensure(date) {
  if (cache[date] && (cache[date].loading || cache[date].checked)) return;
  cache[date] = { loading: true, checked: false, data: null, error: null };
  try {
    const d = await fetchOpenShifts(date);
    const data = d && d.d;
    recordPits(data);
    useSettings().notePitsChanged();
    cache[date] = { loading: false, checked: true, data, error: null };
  } catch (e) {
    console.error("[newRoster] FindWork failed", e);
    cache[date] = { loading: false, checked: true, data: null, error: e.message || "Couldn’t load" };
  }
}

function clearCache() {
  for (const k of Object.keys(cache)) delete cache[k];
}

async function pickup(shift) {
  await takeWork(shift);          // throws on body-level failure
  clearCache();
  await useRoster().reload();
}

export function useOpenShifts() {
  return { cache, showOpen, ensure, clearCache, pickup };
}
