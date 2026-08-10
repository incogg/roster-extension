<script setup>
// The sliding part of the calendar: one row of day tiles per week + weekly hours
// on the right. Rendered three times by MobileView (current + parked neighbours).
import MobileDayTile from "./MobileDayTile.vue";

defineProps({ fn: Object });
</script>

<template>
  <div class="rows">
    <div v-for="(w, wi) in fn.weeks" :key="wi" class="row">
      <div class="row__tiles">
        <MobileDayTile v-for="day in w.days" :key="day.key" :day="day" />
      </div>
      <div class="row__hrs">
        <span class="row__hrs-num">{{ w.published ? (w.totalMins / 60).toFixed(1) : "—" }}</span>
        <span class="row__hrs-label">HRS</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rows {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 0 4px;
}
.row {
  display: flex;
  align-items: stretch;
  gap: 6px;
}
.row__tiles {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 4px;
  flex: 1;
  min-width: 0;
}
.row__hrs {
  flex-shrink: 0;
  width: 38px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  gap: 1px;
  border-left: 1px solid var(--border-faint);
}
.row__hrs-num {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: -0.03em;
  color: oklch(0.35 0.02 80);
}
.row__hrs-label {
  font-size: 8px;
  letter-spacing: 0.06em;
  color: oklch(0.65 0.012 80);
}
</style>
