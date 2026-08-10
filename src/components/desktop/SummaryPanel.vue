<script setup>
import { computed } from "vue";
import { fmtD } from "../../core/dates.js";

const props = defineProps({ section: Object, sum: Object });
const first = computed(() => props.section.weeks[0].start);
const last = computed(() => props.section.weeks[props.section.weeks.length - 1].days[6].date);
</script>

<template>
  <div data-summary-panel="1" class="panel">
    <div class="panel__range">{{ fmtD(first) }} – {{ fmtD(last) }}</div>
    <div class="hrs">
      <span class="hrs__num">{{ sum.published ? sum.hrs.toFixed(1) : "—" }}</span>
      <span class="hrs__unit">h</span>
    </div>

    <div class="track">
      <div v-for="(b, i) in sum.breakdown" :key="i" :title="b.rate" class="track__seg" :style="{ background: b.color, width: b.w }"></div>
      <span class="track__marker" :style="{ left: sum.markerPct }"></span>
    </div>
    <div class="note">{{ sum.note }}</div>

    <div v-if="sum.breakdown.length" class="legend">
      <div v-for="(b, i) in sum.breakdown" :key="i" class="legend__row">
        <span class="legend__swatch" :style="{ background: b.color }"></span>
        <span class="legend__rate">{{ b.rate }}</span>
        <span class="legend__hrs">{{ b.hrs }}</span>
      </div>
      <div class="legend__total">
        <span class="legend__eff-label">Effective</span>
        <span class="legend__eff-val">{{ sum.effHours }} h</span>
      </div>
    </div>

    <div v-if="sum.published" class="est">
      <span class="est__label">Estimated pay</span>
      <span class="est__val">{{ sum.payEst }}</span>
      <span class="est__sub">Est. before tax</span>
    </div>
  </div>
</template>

<style scoped>
.panel {
  padding: 14px 14px 14px 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-right: 1px solid var(--border-panel);
}
.panel__range {
  font-size: 12px;
  font-weight: 600;
  color: var(--ink-600);
}
.hrs {
  display: flex;
  align-items: baseline;
  gap: 4px;
}
.hrs__num {
  font-family: var(--font-mono);
  font-size: 22px;
  font-weight: 500;
  letter-spacing: -0.02em;
}
.hrs__unit {
  font-size: 12px;
  color: oklch(0.58 0.01 80);
}

.track {
  position: relative;
  display: flex;
  height: 10px;
  border-radius: 5px;
  background: oklch(0.93 0.008 85);
  overflow: hidden;
}
.track__seg {
  height: 100%;
}
.track__marker {
  position: absolute;
  top: -2px;
  bottom: -2px;
  width: 2px;
  background: var(--ink-800);
}
.note {
  font-size: 10px;
  color: oklch(0.58 0.02 82);
  line-height: 1.35;
}

.legend {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 9px;
  border-top: 1px solid var(--border-soft);
}
.legend__row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.legend__swatch {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 2px;
}
.legend__rate {
  font-family: var(--font-mono);
  font-size: 10px;
  color: oklch(0.5 0.02 80);
  white-space: nowrap;
}
.legend__hrs {
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: 10px;
  color: oklch(0.62 0.01 80);
  white-space: nowrap;
}
.legend__total {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px;
  padding-top: 4px;
}
.legend__eff-label {
  font-size: 10px;
  font-weight: 600;
  color: oklch(0.42 0.02 80);
}
.legend__eff-val {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 600;
  color: oklch(0.35 0.04 82);
}

.est {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 9px 10px;
  border-radius: 8px;
  background: var(--pay-bg);
  border: 1px solid var(--pay-border);
}
.est__label {
  font-size: 10px;
  font-weight: 600;
  color: var(--pay-label);
}
.est__val {
  font-family: var(--font-mono);
  font-size: 18px;
  font-weight: 500;
  color: var(--pay-strong);
  letter-spacing: -0.03em;
}
.est__sub {
  font-size: 9px;
  color: oklch(0.65 0.02 82);
}
</style>
