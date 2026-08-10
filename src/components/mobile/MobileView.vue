<script setup>
// The phone-shaped roster: fixed fortnight nav + calendar (day-names, a drag-snap
// tile carousel, footer) + a fixed scrolling detail pane. Only the tile grid is
// dragged; everything else snap-updates once a swipe commits a new fortnight.
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from "vue";
import MobileFnNav from "./MobileFnNav.vue";
import MobileDayNames from "./MobileDayNames.vue";
import MobileWeekRows from "./MobileWeekRows.vue";
import MobileFnSummary from "./MobileFnSummary.vue";
import MobileDayDetail from "./MobileDayDetail.vue";
import { sectionSummary } from "../../core/pay.js";
import { useRoster } from "../../composables/useRoster.js";
import { useSettings } from "../../composables/useSettings.js";
import { useOpenShifts } from "../../composables/useOpenShifts.js";
import { useMobile } from "../../composables/useMobile.js";

const { model, loadingMore, loadNextCycle } = useRoster();
const { rate, contract } = useSettings();
const { showOpen, ensure } = useOpenShifts();
const { mobileFn, mobileSelKey } = useMobile();

const flatDays = (fn) => fn.weeks.reduce((a, w) => a.concat(w.days), []);

const fns = computed(() => (model.value ? model.value.fortnights : []));
const todayFnIdx = computed(() => {
  let idx = fns.value.findIndex((f) => f.weeks.some((w) => w.days.some((d) => d.isToday)));
  if (idx < 0) idx = fns.value.findIndex((f) => f.currentCycle);
  return idx < 0 ? 0 : idx;
});
const fnIdx = computed(() => {
  const last = fns.value.length - 1;
  if (last < 0) return 0;
  if (mobileFn.value == null) return Math.min(todayFnIdx.value, last);
  return Math.max(0, Math.min(last, mobileFn.value));
});
const fn = computed(() => fns.value[fnIdx.value] || null);
const prevFn = computed(() => (fnIdx.value > 0 ? fns.value[fnIdx.value - 1] : null));
const nextFn = computed(() => (fnIdx.value < fns.value.length - 1 ? fns.value[fnIdx.value + 1] : null));
const sum = computed(() => (fn.value ? sectionSummary(fn.value, rate.value, contract.value) : null));

const selKey = computed(() => {
  if (!fn.value) return null;
  if (mobileSelKey.value === undefined) {
    const t = flatDays(fn.value).find((d) => d.isToday);
    return t ? t.key : null;
  }
  return mobileSelKey.value;
});
const selDay = computed(() => (selKey.value ? flatDays(fn.value).find((d) => d.key === selKey.value) : null));

// Footer note + "checking" state.
const noteText = computed(() => (sum.value ? (sum.value.published ? sum.value.hrs.toFixed(1) + " h · " + sum.value.note : sum.value.note) : ""));
const { cache } = useOpenShifts();
const checking = computed(() => showOpen.value && fn.value && fn.value.weeks.some((w) => w.days.some((d) => {
  if (!d.canFindWork) return false;
  const e = cache[d.dateStr];
  return !e || e.loading;
})));

function moveFn(delta) {
  const next = fnIdx.value + delta;
  if (next < 0) return;
  mobileSelKey.value = null;
  mobileFn.value = next;
  if (next > fns.value.length - 1 && !loadingMore.value) loadNextCycle();
}
// Clear the cache then re-fetch the visible fortnight. (Unlike desktop, mobile
// tiles don't self-fetch — prefetch drives them — so we must kick it off here.)
function checkShifts() {
  for (const k of Object.keys(cache)) delete cache[k];
  prefetch();
}

// Prefetch open shifts for the visible fortnight's pick-up-able days.
function prefetch() {
  if (!showOpen.value || !fn.value) return;
  for (const w of fn.value.weeks) for (const d of w.days) if (d.canFindWork) ensure(d.dateStr);
}
watch([fnIdx, model], prefetch, { immediate: true });

// --- carousel (drag the tile grid to page fortnights) ----------------------
const tilesVp = ref(null);
const tilesTrack = ref(null);
const setX = (px) => { if (tilesTrack.value) tilesTrack.value.style.transform = `translateX(${px}px)`; };
const setAnim = (on) => { if (tilesTrack.value) tilesTrack.value.style.transition = on ? "transform 230ms cubic-bezier(0.2,0.8,0.3,1)" : "none"; };

let x0 = 0, y0 = 0, vw = 0, pid = null, active = false, decided = false, dragged = false;

function onDown(e) {
  if (e.button != null && e.button !== 0) return;
  if (pid != null) return;
  dragged = false;
  pid = e.pointerId; x0 = e.clientX; y0 = e.clientY;
  vw = tilesVp.value.clientWidth || 1; active = false; decided = false;
  setAnim(false);
}
function onMove(e) {
  if (pid == null || e.pointerId !== pid) return;
  const dx = e.clientX - x0, dy = e.clientY - y0;
  if (!decided) {
    if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
    decided = true;
    if (Math.abs(dy) > Math.abs(dx)) { pid = null; return; } // vertical → ignore
    active = true;
    tilesVp.value.setPointerCapture(pid);
    dragged = true;
  }
  if (!active) return;
  e.preventDefault();
  let d = dx;
  if ((d > 0 && !prevFn.value) || (d < 0 && !nextFn.value)) d *= 0.3; // rubber-band at an edge
  setX(d);
}
function onUp(e) {
  if (pid == null || e.pointerId !== pid) return;
  const dx = e.clientX - x0;
  const wasActive = active;
  pid = null; active = false;
  if (!wasActive) return;
  const threshold = Math.max(64, vw * 0.22);
  let commit = 0;
  if (dx <= -threshold && nextFn.value) commit = 1;
  else if (dx >= threshold && prevFn.value) commit = -1;
  setAnim(true);
  setX(commit * -vw);
  if (dx <= -threshold && !nextFn.value && !loadingMore.value) loadNextCycle();
  if (commit !== 0) setTimeout(() => {
    mobileSelKey.value = null;
    mobileFn.value = fnIdx.value + commit;
  }, 240);
}
// Swallow the click that trails a drag so a swipe doesn't also select a day.
function onClickCapture(e) { if (dragged) { e.stopPropagation(); e.preventDefault(); dragged = false; } }

// After a commit (or arrow move) the track must snap back to 0 without animation
// for the freshly-rendered fortnight.
watch(fnIdx, () => nextTick(() => { setAnim(false); setX(0); }));

onMounted(() => {
  const vp = tilesVp.value;
  vp.addEventListener("pointerdown", onDown);
  vp.addEventListener("pointermove", onMove);
  vp.addEventListener("pointerup", onUp);
  vp.addEventListener("pointercancel", onUp);
  vp.addEventListener("click", onClickCapture, true);
});
onBeforeUnmount(() => {
  const vp = tilesVp.value;
  if (!vp) return;
  vp.removeEventListener("pointerdown", onDown);
  vp.removeEventListener("pointermove", onMove);
  vp.removeEventListener("pointerup", onUp);
  vp.removeEventListener("pointercancel", onUp);
  vp.removeEventListener("click", onClickCapture, true);
});
</script>

<template>
  <div class="mv">
    <template v-if="fn">
      <MobileFnNav :fn="fn" :can-prev="fnIdx > 0" @move="moveFn" />

      <div class="cal">
        <MobileDayNames />
        <div ref="tilesVp" class="cal__vp">
          <div ref="tilesTrack" class="cal__track">
            <div class="cal__pane"><MobileWeekRows :fn="fn" /></div>
            <div v-if="prevFn" class="cal__pane cal__pane--prev"><MobileWeekRows :fn="prevFn" /></div>
            <div v-if="nextFn" class="cal__pane cal__pane--next"><MobileWeekRows :fn="nextFn" /></div>
          </div>
        </div>

        <!-- footer -->
        <div class="foot">
          <span class="foot__note">{{ noteText }}</span>
          <button @click="checkShifts" class="foot__check">
            <span v-if="checking" class="dots">
              <span v-for="d in [0, 0.15, 0.3]" :key="d" class="dots__dot" :style="{ animationDelay: d + 's' }"></span>
            </span>
            <span>{{ checking ? "Checking" : "Check shifts" }}</span>
          </button>
          <span class="foot__pay">{{ sum && sum.published ? sum.payEst + " est" : "—" }}</span>
        </div>
      </div>

      <div class="detail">
        <MobileDayDetail v-if="selDay" :day="selDay" />
        <MobileFnSummary v-else :fn="fn" :sum="sum" />
      </div>
    </template>
    <div v-else class="mv__empty">No roster loaded.</div>
  </div>
</template>

<style scoped>
.mv {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.mv__empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  font-size: 14px;
  color: oklch(0.58 0.01 80);
}

.cal {
  flex-shrink: 0;
  background: var(--white);
  border-bottom: 1px solid var(--hairline);
  padding: 8px 10px 10px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.cal__vp {
  position: relative;
  overflow: hidden;
  touch-action: none;
  padding: 4px 0;
}
.cal__track {
  position: relative;
  will-change: transform;
}
.cal__pane {
  position: relative;
  width: 100%;
}
.cal__pane--prev {
  position: absolute;
  top: 0;
  left: -100%;
}
.cal__pane--next {
  position: absolute;
  top: 0;
  left: 100%;
}

.foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-top: 7px;
  border-top: 1px solid var(--border-faint);
}
.foot__note {
  font-size: 11px;
  color: oklch(0.58 0.02 82);
  min-width: 0;
  margin-right: auto;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.foot__check {
  flex-shrink: 0;
  min-height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid var(--hairline);
  background: var(--white);
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 500;
  color: oklch(0.35 0.015 80);
  cursor: pointer;
  white-space: nowrap;
}
.foot__pay {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 600;
  color: oklch(0.4 0.05 82);
  white-space: nowrap;
}
.dots {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 8px;
}
.dots__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--ink-300);
  animation: rosterDot 1.1s ease-in-out infinite;
}

.detail {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 12px 14px 34px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
