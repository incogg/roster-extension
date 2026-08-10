<script setup>
import { computed } from "vue";
import SummaryPanel from "./SummaryPanel.vue";
import DayCell from "./DayCell.vue";
import { fmtD, addDays, CYCLE_DAYS } from "../../core/dates.js";
import { sectionSummary } from "../../core/pay.js";
import { useSettings } from "../../composables/useSettings.js";

const props = defineProps({ section: Object });
const { rate, contract } = useSettings();

const sum = computed(() => sectionSummary(props.section, rate.value, contract.value));
const cycleEndDay = computed(() => addDays(props.section.cycleStart, CYCLE_DAYS - 1));
const cycleLabel = computed(() =>
  "Cycle · " + fmtD(props.section.cycleStart) + " – " + fmtD(cycleEndDay.value) + " " + cycleEndDay.value.getFullYear() +
  (sum.value.published ? "" : " · not published"));
</script>

<template>
  <div :data-current-cycle="section.currentCycle ? '1' : null">
    <div v-if="section.newCycle" class="cycle">
      <span class="cycle__label">{{ cycleLabel }}</span>
      <span class="cycle__rule"></span>
    </div>
    <div data-section-body="1" class="section">
      <SummaryPanel :section="section" :sum="sum" />
      <div class="weeks">
        <div v-for="(w, wi) in section.weeks" :key="wi" class="week">
          <DayCell v-for="day in w.days" :key="day.key" :day="day" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cycle {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 0 4px;
}
.cycle__label {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: oklch(0.55 0.04 82);
  white-space: nowrap;
}
.cycle__rule {
  flex: 1;
  height: 1px;
  background: var(--hairline);
}
.section {
  display: grid;
  grid-template-columns: 148px minmax(0, 1fr);
  gap: 8px;
  align-items: stretch;
  min-width: 1364px;
}
.weeks {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}
.week {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 8px;
  align-items: stretch;
}
</style>
