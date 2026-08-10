<script setup>
// The async "Available" open-shift list inside a non-work day cell. Fetches via
// useOpenShifts (which caches), paginates 3 at a time, and opens the pickup
// dialog on click.
import { ref, computed, watchEffect } from "vue";
import { fmtHM } from "../../core/dates.js";
import { roleLabel, sortByPitPref } from "../../core/settings.js";
import { useOpenShifts } from "../../composables/useOpenShifts.js";
import { useSettings } from "../../composables/useSettings.js";
import PickupDialog from "../shared/PickupDialog.vue";

const props = defineProps({ day: Object });
const { cache, ensure, showOpen } = useOpenShifts();
const { pitVersion } = useSettings();

const PER = 3;
const page = ref(0);
const selected = ref(null);

// (Re)fetch when shown and not yet cached — also re-runs after "Check shifts"
// clears the cache entry.
watchEffect(() => {
  if (showOpen.value && props.day.canFindWork && !cache[props.day.dateStr]) ensure(props.day.dateStr);
});

const entry = computed(() => cache[props.day.dateStr]);
const data = computed(() => entry.value && entry.value.data);
const shifts = computed(() => {
  pitVersion.value; // re-sort when pit preference changes
  const d = data.value;
  if (!d || !d.Shifts || !d.Shifts.length) return [];
  return sortByPitPref(d.Shifts, d);
});
const pages = computed(() => Math.ceil(shifts.value.length / PER) || 1);
const shown = computed(() => shifts.value.slice(page.value * PER, page.value * PER + PER));

function move(dir) { page.value = (page.value + dir + pages.value) % pages.value; }
function pit(s) { return (data.value.Locations.find((l) => l.ID == s.LocationID) || {}).Name || "?"; }
function role(s) { return roleLabel(((data.value.Departments || []).find((r) => r.ID == s.RoleID) || {}).Name); }
function label(s) { return fmtHM(s.StartDateTime) + "–" + fmtHM(s.EndDateTime); }
</script>

<template>
  <!-- loading -->
  <div v-if="!entry || entry.loading" class="osl-msg osl-msg--loading">
    <span class="dots">
      <span v-for="d in [0, 0.15, 0.3]" :key="d" class="dots__dot" :style="{ animationDelay: d + 's' }"></span>
    </span>
    <span class="osl-msg__text">Loading shifts</span>
  </div>

  <!-- error -->
  <div v-else-if="entry.error" class="osl-msg">Couldn’t load</div>

  <!-- none -->
  <div v-else-if="!shifts.length" class="osl-msg">No shifts</div>

  <!-- rows -->
  <div v-else class="osl">
    <div class="osl__head">
      <span class="osl__title">Available</span>
      <span v-if="pages > 1" class="pager">
        <span @click.stop="move(-1)" class="pager__btn">‹</span>
        <span class="pager__count">{{ page + 1 }}/{{ pages }}</span>
        <span @click.stop="move(1)" class="pager__btn">›</span>
      </span>
      <span v-else class="osl__count">{{ shifts.length }}</span>
    </div>
    <div class="osl__rows">
      <div v-for="(s, i) in shown" :key="i" title="Pick up this shift" @click.stop="selected = s" class="row">
        <span class="row__time">{{ label(s) }}</span>
        <span class="row__chips">
          <span v-if="role(s)" class="chip chip--role">{{ role(s) }}</span>
          <span class="chip chip--pit">{{ pit(s) }}</span>
        </span>
      </div>
    </div>
  </div>

  <PickupDialog v-if="selected" :shift="selected" :data="data" :day="day" @close="selected = null" />
</template>

<style scoped>
.osl-msg {
  margin-top: auto;
  font-size: 11px;
  color: var(--ink-faint);
}
.osl-msg--loading {
  display: flex;
  align-items: center;
  gap: 8px;
}
.osl-msg__text {
  font-size: 11px;
  color: var(--ink-faint);
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

.osl {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 4px;
}
.osl__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}
.osl__title {
  font-size: 10px;
  font-weight: 500;
  color: oklch(0.55 0.03 82);
  letter-spacing: 0.02em;
}
.osl__count {
  font-family: var(--font-mono);
  font-size: 10px;
  color: oklch(0.6 0.02 82);
}
.pager {
  display: flex;
  align-items: center;
  gap: 2px;
}
.pager__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 15px;
  height: 15px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  line-height: 1;
  color: oklch(0.48 0.04 82);
  background: oklch(0.95 0.014 85);
  user-select: none;
}
.pager__count {
  font-family: var(--font-mono);
  font-size: 10px;
  color: oklch(0.6 0.02 82);
  min-width: 22px;
  text-align: center;
}

.osl__rows {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 5px 7px;
  border-radius: 6px;
  background: var(--open-bg);
  border-left: 3px solid var(--open-accent);
  cursor: pointer;
}
.row:hover {
  background: oklch(0.95 0.03 82) !important;
}
.row__time {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  color: oklch(0.4 0.055 82);
  letter-spacing: -0.03em;
  white-space: nowrap;
}
.row__chips {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 4px;
}
.chip {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  border-radius: 4px;
  padding: 1px 5px;
  white-space: nowrap;
}
.chip--role {
  color: var(--role-ink);
  background: var(--role-bg);
  border: 1px solid var(--role-border);
}
.chip--pit {
  color: var(--pit-ink);
  background: var(--pit-bg);
  border: 1px solid var(--pit-border);
}
</style>
