// Reactive wrapper over the persisted settings (src/core/settings.js). Shared
// singleton refs so every component sees the same rate/contract/pit order.
import { ref } from "vue";
import {
  getRate, getContract, setRate, setContract,
  getPitOrder, setPitOrder, orderedPits,
} from "../core/settings.js";

const rate = ref(getRate());
const contract = ref(getContract());
// Bumped whenever pit data changes (new pits seen, or order edited) so pit-driven
// computeds re-run — orderedPits() reads localStorage, not a ref.
const pitVersion = ref(0);

export function useSettings() {
  return {
    rate,
    contract,
    updateRate(v) { const n = parseFloat(v); if (!isNaN(n)) { rate.value = n; setRate(n); } },
    updateContract(v) { const n = parseFloat(v); if (!isNaN(n)) { contract.value = n; setContract(n); } },
    pitVersion,
    // Reads pitVersion so callers in a template/computed stay reactive.
    listPits() { pitVersion.value; return orderedPits(); },
    savePitOrder(arr) { setPitOrder(arr); pitVersion.value++; },
    notePitsChanged() { pitVersion.value++; },
    getPitOrder,
  };
}
