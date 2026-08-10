<script setup>
// Detail pane when nothing is selected: the fortnight's hours / pay / breakdown.
import { computed } from "vue";
import { fmtD } from "../../core/dates.js";

const props = defineProps({ fn: Object, sum: Object });
const first = computed(() => props.fn.weeks[0].start);
const last = computed(() => props.fn.weeks[props.fn.weeks.length - 1].days[6].date);
</script>

<template>
  <div class="summary">
    <div class="summary__head">
      <span class="summary__range">{{ fmtD(first) }} – {{ fmtD(last) }}</span>
      <span class="summary__year">{{ last.getFullYear() }}</span>
    </div>

    <div class="card">
      <div class="card__top">
        <div class="card__hrs">
          <span class="card__hrs-num">{{ sum.published ? sum.hrs.toFixed(1) : "—" }}</span>
          <span class="card__hrs-unit">h rostered</span>
        </div>
        <span class="card__target">of {{ sum.target.toFixed(1) }} h contract</span>
      </div>
      <div class="track">
        <div v-for="(b, i) in sum.breakdown" :key="i" :title="b.rate" class="track__seg" :style="{ background: b.color, width: b.w }"></div>
        <span class="track__marker" :style="{ left: sum.markerPct }"></span>
      </div>
      <span class="card__note">{{ sum.note }}</span>

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
    </div>

    <div v-if="sum.published" class="est">
      <div class="est__lines">
        <span class="est__label">Estimated pay</span>
        <span class="est__sub">Est. before tax</span>
      </div>
      <span class="est__val">{{ sum.payEst }}</span>
    </div>

    <span class="summary__hint">Tap a day above for its detail.</span>
  </div>
</template>

<style scoped>
.summary {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.summary__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
.summary__range {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
}
.summary__year {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--ink-400);
}
.summary__hint {
  font-size: 11px;
  color: oklch(0.65 0.012 80);
  padding: 0 2px;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border-radius: 12px;
  background: var(--white);
  border: 1px solid var(--border-panel);
}
.card__top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
.card__hrs {
  display: flex;
  align-items: baseline;
  gap: 5px;
}
.card__hrs-num {
  font-family: var(--font-mono);
  font-size: 26px;
  font-weight: 500;
  letter-spacing: -0.03em;
}
.card__hrs-unit {
  font-size: 13px;
  color: oklch(0.58 0.01 80);
}
.card__target {
  font-size: 11px;
  color: var(--ink-400);
}
.card__note {
  font-size: 11px;
  color: oklch(0.58 0.02 82);
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

.legend {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 10px;
  border-top: 1px solid var(--border-faint);
}
.legend__row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.legend__swatch {
  flex-shrink: 0;
  width: 9px;
  height: 9px;
  border-radius: 2px;
}
.legend__rate {
  font-family: var(--font-mono);
  font-size: 12px;
  color: oklch(0.5 0.02 80);
}
.legend__hrs {
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: 12px;
  color: oklch(0.6 0.01 80);
}
.legend__total {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding-top: 4px;
}
.legend__eff-label {
  font-size: 12px;
  font-weight: 600;
  color: oklch(0.42 0.02 80);
}
.legend__eff-val {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 600;
  color: oklch(0.35 0.04 82);
}

.est {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 54px;
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--pay-bg);
  border: 1px solid var(--pay-border);
}
.est__lines {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.est__label {
  font-size: 13px;
  font-weight: 600;
  color: var(--gold-text);
}
.est__sub {
  font-size: 11px;
  color: oklch(0.62 0.02 82);
}
.est__val {
  font-family: var(--font-mono);
  font-size: 20px;
  font-weight: 500;
  letter-spacing: -0.03em;
  color: var(--pay-strong);
}
</style>
