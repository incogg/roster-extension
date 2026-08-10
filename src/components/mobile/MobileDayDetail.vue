<script setup>
// Detail pane when a day is selected: its shift, pay, and open shifts.
import { computed, ref } from "vue";
import { DAY_NAMES } from "../../core/dates.js";
import { loadSplit, durOf, effOf, shiftSegs, money } from "../../core/pay.js";
import { useSettings } from "../../composables/useSettings.js";
import { useGiveaway } from "../../composables/useGiveaway.js";
import MobileDayOpen from "./MobileDayOpen.vue";
import GiveawayDialog from "../shared/GiveawayDialog.vue";

const props = defineProps({ day: Object });
const { rate } = useSettings();
const { offers, ready, cancel } = useGiveaway();

const isWork = computed(() => props.day.kind === "work");

// Give-away state, keyed by the shift's raw start.
const offer = computed(() => (props.day.startRaw ? offers[props.day.startRaw] : null));
const pending = computed(() => offer.value && offer.value.status === "pending");
const busy = computed(() => !!(offer.value && offer.value.busy));
const err = computed(() => (offer.value && offer.value.error) || "");
const checking = computed(() => isWork.value && !props.day.past && !ready.value);
const canGive = computed(() => ready.value && isWork.value && !props.day.past && props.day.canGive);

const giveOpen = ref(false);
async function onCancel() { try { await cancel(props.day); } catch { /* shown via err */ } }
const sp = computed(() => (isWork.value ? loadSplit(props.day.dow, props.day.time) : {}));
const hrs = computed(() => durOf(props.day.time));
const eff = computed(() => effOf(sp.value));
const accent = computed(() => (props.day.past ? "oklch(0.82 0.008 80)" : "var(--work-accent)"));
const segs = computed(() => shiftSegs(props.day.dow, props.day.time));
const rateLine = computed(() => Object.keys(sp.value).map(Number).sort((a, b) => a - b).map((r) => r.toFixed(2) + "× " + sp.value[r].toFixed(1) + " h").join(" · "));
const payEst = computed(() => money(eff.value * rate.value));
const statusText = computed(() => {
  const day = props.day;
  return day.kind === "draft"
    ? "Not yet published" + (day.draftLabel ? " · " + day.draftLabel : "")
    : (day.state === "rdo" ? "Rostered day off" : day.state === "unav" ? "Marked unavailable" : "No shift rostered");
});
</script>

<template>
  <div class="detail">
    <div class="detail__head">
      <span class="detail__title">{{ DAY_NAMES[day.dow] }} {{ day.num }} {{ day.mon }}</span>
      <span v-if="day.isToday" class="detail__today">TODAY</span>
    </div>

    <template v-if="isWork">
      <div class="shift" :style="{ borderLeftColor: accent }">
        <div class="shift__top">
          <span class="shift__time">{{ day.time }}</span>
          <span class="shift__loc">{{ day.loc }}</span>
        </div>
        <div class="shift__meta">
          <span class="shift__dept">{{ day.dept }}</span>
          <span class="shift__hrs">{{ hrs.toFixed(1) }} h · {{ eff.toFixed(1) }} h effective</span>
        </div>
        <div class="shift__bar">
          <div v-for="(s, i) in segs" :key="i" class="shift__seg" :style="{ background: s.color, width: s.w }"></div>
        </div>
      </div>

      <div v-if="day.warn" class="warn">
        <span class="warn__flag">!</span>
        <span class="warn__text">{{ day.warnText }}</span>
      </div>

      <div class="pay">
        <div class="pay__lines">
          <span class="pay__label">Estimated pay</span>
          <span class="pay__rate">{{ rateLine }}</span>
        </div>
        <span class="pay__val">{{ payEst }}</span>
      </div>

      <!-- checking messages: hold state until reconcile resolves -->
      <div v-if="checking" class="mload">
        <span class="mload__dots">
          <span class="mload__dot"></span><span class="mload__dot"></span><span class="mload__dot"></span>
        </span>
        <span class="mload__text">Checking offers</span>
      </div>

      <!-- pending give-away offer -->
      <div v-else-if="pending" class="acted">
        <span class="acted__label">Offered to anyone</span>
        <button class="acted__cancel" :disabled="busy" @click="onCancel">{{ busy ? "…" : "Cancel" }}</button>
      </div>

      <!-- give / early-out / swap actions -->
      <button v-if="canGive && !pending" class="mact mact--give" @click="giveOpen = true">
        <span class="mact__title">Give away shift</span>
        <span class="mact__sub">Anyone or by ID</span>
      </button>
      <button v-if="!pending" class="mact mact--eo" disabled title="Early out not available yet">
        <span class="mact__title">Apply for early out</span>
        <span class="mact__sub">Coming soon</span>
      </button>
      <button v-if="!pending" class="mact mact--swap" disabled title="Swap not available yet">
        <span class="mact__title">Swap shift</span>
        <span class="mact__sub">Coming soon</span>
      </button>
      <div v-if="err" class="mact__err">{{ err }}</div>
    </template>
    <div v-else class="status">{{ statusText }}</div>

    <MobileDayOpen :day="day" />

    <GiveawayDialog v-if="giveOpen" :day="day" @close="giveOpen = false" />
  </div>
</template>

<style scoped>
.detail {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.detail__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
.detail__title {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
}
.detail__today {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: var(--white);
  background: var(--gold);
  border-radius: 4px;
  padding: 2px 6px;
}

.shift {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 2px 2px 4px 12px;
  border-left: 4px solid transparent;
}
.shift__top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
.shift__time {
  font-family: var(--font-mono);
  font-size: 22px;
  font-weight: 500;
  letter-spacing: -0.03em;
  white-space: nowrap;
}
.shift__loc {
  font-size: 13px;
  font-weight: 500;
  color: oklch(0.45 0.02 250);
}
.shift__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.shift__dept,
.shift__hrs {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--ink-muted);
}
.shift__bar {
  display: flex;
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
  background: oklch(0.93 0.008 85);
}
.shift__seg {
  height: 100%;
}

.warn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 13px;
  border-radius: 12px;
  background: oklch(0.96 0.05 82);
  border: 1px solid oklch(0.88 0.09 80);
}
.warn__flag {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 5px;
  background: var(--warn);
  color: var(--warn-ink);
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
}
.warn__text {
  font-size: 13px;
  color: oklch(0.4 0.06 70);
}

.pay {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 54px;
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--white);
  border: 1px solid var(--border-panel);
}
.pay__lines {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.pay__label {
  font-size: 14px;
  font-weight: 500;
}
.pay__rate {
  font-size: 11px;
  color: var(--ink-400);
}
.pay__val {
  font-family: var(--font-mono);
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: oklch(0.34 0.04 82);
}

.status {
  display: flex;
  align-items: center;
  min-height: 54px;
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--white);
  border: 1px solid var(--border-panel);
  font-size: 14px;
  color: var(--ink-muted);
}

/* give / swap actions */
.mact {
  min-height: 54px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  text-align: left;
  padding: 10px 14px;
  border-radius: 12px;
  background: var(--white);
  border: 1px solid oklch(0.92 0.006 85);
  cursor: pointer;
}
.mact:disabled { cursor: default; opacity: 0.6; }
.mact__title {
  font-size: 14px;
  font-weight: 500;
}
.mact__sub {
  font-size: 11px;
  color: oklch(0.65 0.012 80);
}
.mact--give:active:not(:disabled) { background: oklch(0.96 0.04 25); }
.mact--give .mact__title { color: oklch(0.5 0.15 25); }
.mact--eo .mact__title { color: oklch(0.5 0.12 70); }
.mact--swap .mact__title { color: oklch(0.47 0.14 300); }
.mact__err {
  font-size: 12px;
  color: var(--danger);
}
.acted {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 54px;
  padding: 12px 14px;
  border-radius: 12px;
  background: oklch(0.96 0.04 25);
  border: 1px solid oklch(0.9 0.05 30);
  border-left: 4px solid oklch(0.5 0.15 25);
}
.acted__label {
  font-size: 13px;
  font-weight: 600;
  color: oklch(0.45 0.12 30);
}
.acted__cancel {
  min-height: 40px;
  border: 1px solid oklch(0.9 0.01 80);
  background: var(--white);
  border-radius: 10px;
  padding: 9px 14px;
  font-size: 13px;
  font-weight: 600;
  color: oklch(0.45 0.02 80);
  cursor: pointer;
}
.acted__cancel:disabled { cursor: default; opacity: 0.6; }
.mload {
  min-height: 54px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--white);
  border: 1px solid oklch(0.92 0.006 85);
}
.mload__dots {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 8px;
}
.mload__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: oklch(0.72 0.012 80);
  animation: rosterDot 1.1s ease-in-out infinite;
}
.mload__dot:nth-child(2) { animation-delay: 0.15s; }
.mload__dot:nth-child(3) { animation-delay: 0.3s; }
.mload__text {
  font-size: 12px;
  color: oklch(0.66 0.01 80);
}
</style>
