<script setup>
import { computed, ref } from "vue";
import DayHeader from "./DayHeader.vue";
import OpenShiftList from "./OpenShiftList.vue";
import { shiftSegs, shiftPay } from "../../core/pay.js";
import { useSettings } from "../../composables/useSettings.js";
import { useGiveaway } from "../../composables/useGiveaway.js";
import GiveawayDialog from "../shared/GiveawayDialog.vue";

const props = defineProps({ day: Object });
const { rate } = useSettings();
const { offers, ready, cancel } = useGiveaway();

const segs = computed(() => (props.day.kind === "work" ? shiftSegs(props.day.dow, props.day.time) : []));
const pay = computed(() => shiftPay(props.day.dow, props.day.time, rate.value));

// Give-away UI state. Offer status is keyed by the shift's raw start.
const offer = computed(() => (props.day.startRaw ? offers[props.day.startRaw] : null));
const pending = computed(() => offer.value && offer.value.status === "pending");
const busy = computed(() => !!(offer.value && offer.value.busy));

const hover = ref(false);
const popover = ref(null); // 'swap' | null
const giveOpen = ref(false);

const canAct = computed(() => props.day.kind === "work" && !props.day.past);
// Until messages are checked we don't know if a future work shift is already
// offered, so show a loading badge rather than the (possibly wrong) actions.
const checking = computed(() => canAct.value && !ready.value);
// The icon group is always mounted (for a smooth fade) once actions are known;
// visibility is driven by hover via the .iacts--show class. Early Out always
// shows (disabled when unavailable), so any future work shift gets the group.
const hasActions = computed(() => ready.value && canAct.value && !pending.value);

function open(which) { popover.value = which; }
function close() { popover.value = null; }

async function onCancel() {
  try { await cancel(props.day); } catch { /* surfaced via offer.error */ }
}
</script>

<template>
  <div :data-day="day.dateStr" class="cell" @mouseenter="hover = true" @mouseleave="hover = false">
    <div v-if="day.isToday" class="today-ring"></div>
    <div v-if="day.past" class="past-veil"></div>

    <!-- checking messages: hold state until reconcile resolves -->
    <div v-if="checking" class="acts">
      <span class="loading" title="Checking offers">
        <span class="loading__dot"></span><span class="loading__dot"></span><span class="loading__dot"></span>
      </span>
    </div>

    <!-- hover actions: round icon buttons, fade in on hover -->
    <div v-else-if="hasActions" class="iacts" :class="{ 'iacts--show': hover }">
      <button class="ibtn ibtn--eo" :disabled="!day.eo" :title="day.eo ? 'Apply for early out' : 'Early out not available'" @click="open('eo')">
        <svg viewBox="0 0 24 24" class="ico"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg>
      </button>
      <button class="ibtn ibtn--swap" disabled title="Swap not available yet">
        <svg viewBox="0 0 24 24" class="ico"><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg>
      </button>
      <button v-if="day.canGive" class="ibtn ibtn--give" title="Give away shift" @click="giveOpen = true">
        <svg viewBox="0 0 24 24" class="ico"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
      </button>
    </div>

    <!-- pending offer: badge + cancel control -->
    <div v-if="pending" class="acts acts--pending">
      <span class="pill">Offered</span>
      <button class="act" :disabled="busy" @click="onCancel">{{ busy ? "…" : "Cancel" }}</button>
    </div>

    <!-- give-away confirmation dialog (shared with mobile) -->
    <GiveawayDialog v-if="giveOpen" :day="day" @close="giveOpen = false" />

    <!-- early-out popover (scaffold — needs the request payload) -->
    <div v-if="popover === 'eo'" class="pop">
      <div class="pop__head">
        <span class="pop__title">Early out</span>
        <button class="pop__x" @click="close">×</button>
      </div>
      <span class="pop__note">Not wired up yet</span>
      <button class="pop__send" disabled title="Early out coming soon">Apply for early out</button>
    </div>

    <!-- work -->
    <div v-if="day.kind === 'work'" class="work">
      <div class="work__fill" :class="day.past ? 'work__fill--past' : (pending ? 'work__fill--offered' : 'work__fill--future')"></div>
      <DayHeader :day="day" :dark="true" class="work__header" />
      <div class="work__body">
        <div class="work__time">{{ day.time }}</div>
        <div class="work__meta">
          <span class="work__loc">{{ day.loc }}</span>
          <span class="work__tags">
            <span v-if="day.warn" :title="day.warnText" class="warn-flag">!</span>
            <span class="work__dept">{{ day.dept }}</span>
          </span>
        </div>
        <div class="work__bar-row">
          <div class="bar">
            <div v-for="(s, i) in segs" :key="i" class="bar__seg" :style="{ background: s.color, width: s.w }"></div>
          </div>
          <span class="work__pay">{{ pay }}</span>
        </div>
      </div>
    </div>

    <!-- draft -->
    <div v-else-if="day.kind === 'draft'" class="draft">
      <div class="draft__date">
        <span class="draft__num">{{ day.num }}</span>
        <span class="draft__mon">{{ day.mon }}</span>
      </div>
      <div class="draft__label" :class="{ 'draft__label--set': day.draftShift }">{{ day.draftLabel || "Not yet published" }}</div>
    </div>

    <!-- leave / empty (+ open shifts) -->
    <div v-else class="off">
      <DayHeader :day="day" :dark="false" />
      <div v-if="day.state === 'rdo'" class="off__rdo">Rostered day off</div>
      <div v-else class="off__status">{{ day.state === "unav" ? "Unavailable" : "" }}</div>
      <OpenShiftList v-if="day.canFindWork" :day="day" />
      <div v-else class="off__none">{{ day.past ? "—" : "No shifts" }}</div>
    </div>
  </div>
</template>

<style scoped>
.cell {
  border-radius: 10px;
  height: 176px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}
.today-ring {
  position: absolute;
  inset: 0;
  border: 3px solid var(--today-ring);
  border-radius: 10px;
  pointer-events: none;
  z-index: 4;
  box-shadow: 0 0 0 3px oklch(0.3 0.025 255 / 0.14), 0 6px 16px oklch(0.3 0.025 255 / 0.2);
}
.past-veil {
  position: absolute;
  inset: 0;
  border-radius: 10px;
  pointer-events: none;
  z-index: 3;
  background: oklch(0.975 0.004 85 / 0.45);
}

/* give-away hover actions */
.acts {
  position: absolute;
  top: 7px;
  right: 7px;
  z-index: 6;
  display: flex;
  align-items: center;
  gap: 3px;
}
.acts--pending {
  gap: 5px;
}
.act {
  border: 1px solid oklch(0.88 0.02 80);
  background: var(--white);
  color: oklch(0.45 0.02 80);
  border-radius: 5px;
  padding: 3px 6px;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.2;
  cursor: pointer;
  box-shadow: 0 1px 3px oklch(0.3 0.025 255 / 0.1);
}
.act:disabled {
  cursor: default;
  opacity: 0.6;
}

/* round icon action buttons */
.iacts {
  position: absolute;
  top: 7px;
  right: 7px;
  z-index: 6;
  display: flex;
  align-items: center;
  gap: 4px;
  opacity: 0;
  transform: translateY(-2px);
  pointer-events: none;
  transition: opacity 0.13s ease, transform 0.13s ease;
}
.iacts--show {
  opacity: 1;
  transform: none;
  pointer-events: auto;
}
.ibtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 1px solid oklch(0.9 0.01 80);
  background: var(--white);
  color: oklch(0.45 0.02 80);
  border-radius: 8px;
  cursor: pointer;
  box-shadow: 0 1px 4px oklch(0.3 0.025 255 / 0.14);
  transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease, transform 0.08s ease;
}
.ibtn:hover { transform: translateY(-1px); }
.ibtn:active { transform: none; }
.ibtn:disabled {
  opacity: 0.4;
  cursor: default;
  color: oklch(0.55 0.01 80);
}
.ibtn:disabled:hover { transform: none; background: var(--white); border-color: oklch(0.9 0.01 80); }
.ibtn .ico {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.ibtn--eo:hover { color: oklch(0.5 0.12 70); border-color: oklch(0.8 0.09 75); background: oklch(0.97 0.04 78); }
.ibtn--give:hover { color: oklch(0.5 0.15 25); border-color: oklch(0.82 0.09 28); background: oklch(0.97 0.035 25); }
.ibtn--swap:hover { color: oklch(0.47 0.14 300); border-color: oklch(0.82 0.07 300); background: oklch(0.97 0.03 300); }

.pill {
  border-radius: 5px;
  padding: 3px 6px;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.2;
  color: var(--white);
  background: oklch(0.5 0.15 25);
  box-shadow: 0 1px 3px oklch(0.3 0.025 255 / 0.1);
}
.loading {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 4px 6px;
  border-radius: 5px;
  background: var(--white);
  box-shadow: 0 1px 3px oklch(0.3 0.025 255 / 0.1);
}
.loading__dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: oklch(0.72 0.012 80);
  animation: rosterDot 1.1s ease-in-out infinite;
}
.loading__dot:nth-child(2) { animation-delay: 0.15s; }
.loading__dot:nth-child(3) { animation-delay: 0.3s; }

/* give / swap popover */
.pop {
  position: absolute;
  inset: 0;
  z-index: 5;
  background: var(--white);
  border: 1px solid oklch(0.7 0.09 250);
  border-radius: 10px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  box-shadow: 0 6px 18px oklch(0.3 0.025 255 / 0.12);
}
.pop__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}
.pop__title {
  font-size: 11px;
  font-weight: 600;
  color: oklch(0.4 0.04 250);
}
.pop__x {
  border: none;
  background: none;
  padding: 0 2px;
  font-size: 13px;
  line-height: 1;
  color: oklch(0.6 0.01 80);
  cursor: pointer;
}
.pop__note {
  font-size: 10px;
  color: oklch(0.58 0.01 80);
}
.pop__input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid oklch(0.91 0.006 85);
  border-radius: 6px;
  padding: 5px 7px;
  font-family: var(--font-mono);
  font-size: 11px;
  color: oklch(0.3 0.012 80);
  outline: none;
}
.pop__input:disabled { background: oklch(0.97 0.004 85); }
.pop__send {
  border: 1px solid oklch(0.55 0.08 80);
  background: oklch(0.64 0.087 82);
  color: var(--white);
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}
.pop__send:disabled { cursor: default; opacity: 0.55; }

/* work */
.work {
  position: relative;
  flex: 1;
  border-radius: 10px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
}
.work__fill {
  position: absolute;
  inset: 0;
  z-index: 0;
  border-radius: 10px;
}
.work__fill--past {
  background: var(--surface-muted);
  border: 1px solid var(--border-card);
  border-left: 4px solid oklch(0.8 0.008 80);
  opacity: 0.85;
}
.work__fill--future {
  background: var(--work-bg);
  border: 1px solid var(--work-border);
  border-left: 4px solid var(--work-accent);
}
.work__fill--offered {
  background: oklch(0.95 0.04 27);
  border: 1px solid oklch(0.87 0.08 28);
  border-left: 4px solid oklch(0.5 0.15 25);
}
.work__header {
  position: relative;
  z-index: 1;
}
.work__body {
  position: relative;
  z-index: 1;
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.work__time {
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 500;
  color: var(--work-ink);
  letter-spacing: -0.02em;
  white-space: nowrap;
}
.work__meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px;
}
.work__loc {
  font-size: 12px;
  font-weight: 500;
  color: var(--work-ink-soft);
  white-space: nowrap;
}
.work__tags {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
}
.work__dept {
  font-family: var(--font-mono);
  font-size: 10px;
  color: oklch(0.58 0.015 250);
}
.warn-flag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 4px;
  background: var(--warn);
  color: var(--warn-ink);
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  cursor: default;
}
.work__bar-row {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 4px;
}
.bar {
  flex: 1;
  min-width: 0;
  display: flex;
  height: 7px;
  border-radius: 4px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.12);
}
.bar__seg {
  height: 100%;
}
.work__pay {
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  color: oklch(0.35 0.02 80);
  white-space: nowrap;
}

/* draft */
.draft {
  flex: 1;
  min-height: 0;
  background: var(--surface-muted);
  border: 1px dashed oklch(0.89 0.006 85);
  border-radius: 10px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
}
.draft__date {
  display: flex;
  align-items: baseline;
  gap: 5px;
}
.draft__num {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: oklch(0.68 0.01 80);
}
.draft__mon {
  font-size: 11px;
  color: var(--ink-300);
}
.draft__label {
  margin-top: auto;
  font-size: 11px;
  color: oklch(0.68 0.01 80);
}
.draft__label--set {
  font-weight: 600;
}

/* leave / empty */
.off {
  flex: 1;
  min-height: 0;
  background: var(--white);
  border: 1px solid var(--border-card);
  border-radius: 10px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.off__rdo {
  min-height: 15px;
  font-size: 11px;
  font-weight: 500;
  color: oklch(0.45 0.06 160);
}
.off__status {
  min-height: 15px;
  font-size: 11px;
  color: oklch(0.62 0.01 80);
}
.off__none {
  margin-top: auto;
  font-size: 11px;
  color: var(--ink-faint);
}
</style>
