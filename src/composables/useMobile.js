// Mobile-view paging state: which fortnight the pager is on, and which day (if
// any) is selected in the detail pane.
import { ref } from "vue";

// null = the fortnight containing today (resolved against the model).
const mobileFn = ref(null);
// undefined = auto-select today; null = show the fortnight summary; else a day key.
const mobileSelKey = ref(undefined);

export function useMobile() {
  return { mobileFn, mobileSelKey };
}
