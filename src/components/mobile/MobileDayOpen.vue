<script setup>
// Open ("available") shifts for the selected day, in the detail pane.
import { ref, computed } from "vue";
import { fmtHM } from "../../core/dates.js";
import { durOf, shiftPay } from "../../core/pay.js";
import { roleLabel, sortByPitPref } from "../../core/settings.js";
import { useOpenShifts } from "../../composables/useOpenShifts.js";
import { useSettings } from "../../composables/useSettings.js";
import PickupDialog from "../shared/PickupDialog.vue";

const props = defineProps({ day: Object });
const { cache, showOpen } = useOpenShifts();
const { rate, pitVersion } = useSettings();
const selected = ref(null);

const entry = computed(() => cache[props.day.dateStr]);
const data = computed(() => entry.value && entry.value.data);
const shifts = computed(() => {
  pitVersion.value;
  const d = data.value;
  if (!d || !d.Shifts || !d.Shifts.length) return [];
  return sortByPitPref(d.Shifts, d);
});

function loc(s) { return (data.value.Locations.find((l) => l.ID == s.LocationID) || {}).Name || "?"; }
function role(s) { return roleLabel(((data.value.Departments || []).find((r) => r.ID == s.RoleID) || {}).Name); }
function time(s) { return fmtHM(s.StartDateTime) + " – " + fmtHM(s.EndDateTime); }
</script>

<template>
  <div v-if="!showOpen || !day.canFindWork"></div>
  <div v-else-if="!entry || entry.loading" class="checking">Checking for open shifts…</div>
  <div v-else-if="!shifts.length"></div>
  <div v-else class="open">
    <span class="open__title">{{ shifts.length }} {{ shifts.length === 1 ? "shift available" : "shifts available" }}</span>
    <div v-for="(s, i) in shifts" :key="i" @click="selected = s" class="open-row">
      <div class="open-row__info">
        <span class="open-row__time">{{ time(s) }}</span>
        <span class="open-row__chips">
          <span class="chip chip--pit">{{ loc(s) }}</span>
          <span v-if="role(s)" class="chip chip--role">{{ role(s) }}</span>
          <span class="open-row__dur">{{ durOf(time(s)).toFixed(0) }} h</span>
        </span>
      </div>
      <span class="open-row__pay">{{ shiftPay(day.dow, time(s), rate) }}</span>
    </div>
  </div>

  <PickupDialog v-if="selected" :shift="selected" :data="data" :day="day" @close="selected = null" />
</template>

<style scoped>
.checking {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 2px;
  font-size: 12px;
  color: var(--ink-faint);
}
.open {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 2px;
}
.open__title {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: oklch(0.6 0.03 82);
}
.open-row {
  min-height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 11px 12px;
  border-radius: 11px;
  background: var(--open-bg);
  border: 1px solid oklch(0.93 0.02 85);
  border-left: 3px solid var(--open-accent);
  cursor: pointer;
}
.open-row__info {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}
.open-row__time {
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: oklch(0.38 0.055 82);
}
.open-row__chips {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
}
.open-row__dur {
  font-size: 11px;
  color: oklch(0.55 0.03 82);
}
.open-row__pay {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 600;
  color: oklch(0.45 0.05 82);
}

.chip {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  border-radius: 4px;
  padding: 1px 6px;
  white-space: nowrap;
}
.chip--pit {
  color: var(--pit-ink);
  background: var(--pit-bg);
  border: 1px solid var(--pit-border);
}
.chip--role {
  color: var(--role-ink);
  background: var(--role-bg);
  border: 1px solid var(--role-border);
}
</style>
