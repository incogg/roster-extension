<script setup>
import { computed } from "vue";
import { tinyT } from "../../core/pay.js";
import { useMobile } from "../../composables/useMobile.js";
import { useOpenShifts } from "../../composables/useOpenShifts.js";
import { useGiveaway } from "../../composables/useGiveaway.js";

const props = defineProps({ day: Object });
const { mobileSelKey } = useMobile();
const { cache, showOpen } = useOpenShifts();
const { offers } = useGiveaway();

// A rostered shift that's been offered for give-away shows red — overriding both
// the work fill and selection so the "given away" state is unmissable.
const offered = computed(() => {
  const o = props.day.startRaw ? offers[props.day.startRaw] : null;
  return !!o && o.status === "pending";
});

const sel = computed(() => {
  let sk = mobileSelKey.value;
  if (sk === undefined) sk = props.day.isToday ? props.day.key : null;
  return sk === props.day.key;
});
const hasShift = computed(() => props.day.kind === "work");
const isDraft = computed(() => props.day.kind === "draft");

// The tile's fill/accent (colours mirror the desktop day cell) is driven by one
// state class; selection wins over a rostered shift.
const stateClass = computed(() => {
  if (offered.value) return "tile--offered";
  if (sel.value) return "tile--sel";
  if (hasShift.value) return props.day.past ? "tile--work-past" : "tile--work-future";
  return "";
});
const numColor = computed(() => {
  const day = props.day;
  if (offered.value) return "oklch(0.42 0.13 27)";
  if (hasShift.value) return day.past ? "oklch(0.55 0.008 80)" : "oklch(0.34 0.06 250)";
  return day.past ? "oklch(0.62 0.012 80)" : "oklch(0.3 0.015 80)";
});
const chipText = computed(() => (offered.value ? "oklch(0.45 0.11 27)" : props.day.past ? "oklch(0.55 0.008 80)" : "oklch(0.34 0.06 250)"));
const draftLetter = computed(() => (props.day.draftLabel || "").trim().charAt(0).toUpperCase() || "•");
const offLabel = computed(() => (props.day.state === "rdo" ? "RDO" : props.day.state === "unav" ? "Unav." : "—"));

const badge = computed(() => {
  const day = props.day;
  if (!showOpen.value || !day.canFindWork) return { kind: "none-hidden" };
  const e = cache[day.dateStr];
  if (!e || e.loading) return { kind: "loading" };
  const n = e.data && e.data.Shifts ? e.data.Shifts.length : 0;
  return n > 0 ? { kind: "count", n } : { kind: "empty" };
});

function onClick() {
  const day = props.day;
  const cur = mobileSelKey.value === undefined ? (day.isToday ? day.key : null) : mobileSelKey.value;
  mobileSelKey.value = cur === day.key ? null : day.key;
}
</script>

<template>
  <div :data-mobile-day="day.dateStr" class="tile" :class="[stateClass, { 'tile--today': day.isToday }]" @click="onClick">
    <span v-if="day.isToday" class="tile__num tile__num--today">{{ day.num }}</span>
    <span v-else class="tile__num" :style="{ color: numColor }">{{ day.num }}</span>

    <template v-if="hasShift">
      <span class="tile__time" :style="{ color: chipText }">{{ tinyT(day.time) }}</span>
      <span v-if="day.warn" class="tile__warn">!</span>
      <span v-else class="tile__loc" :style="{ color: chipText }">{{ day.loc }}</span>
    </template>
    <template v-else-if="isDraft">
      <span v-if="day.draftShift" class="tile__draft">{{ draftLetter }}</span>
      <span v-else class="tile__draft-dash"></span>
    </template>
    <template v-else>
      <span class="tile__off">{{ offLabel }}</span>
    </template>

    <!-- open-shift badge -->
    <span v-if="badge.kind === 'loading'" class="tile__dots">
      <span v-for="d in [0, 0.15, 0.3]" :key="d" class="tile__dot" :style="{ animationDelay: d + 's' }"></span>
    </span>
    <span v-else-if="badge.kind === 'count'" class="tile__count">+{{ badge.n }}</span>
    <span v-else-if="badge.kind === 'empty'" title="No shifts to pick up" class="tile__empty">–</span>
  </div>
</template>

<style scoped>
.tile {
  position: relative;
  min-width: 0;
  height: 74px;
  border-radius: 9px;
  padding: 5px 3px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  cursor: pointer;
  background: oklch(0.985 0.003 85);
  border: 1px solid var(--border-soft);
}
.tile--work-past {
  background: oklch(0.955 0.004 85);
  border: 1px solid transparent;
  border-left: 3px solid oklch(0.82 0.008 80);
}
.tile--work-future {
  background: var(--work-bg);
  border: 1px solid transparent;
  border-left: 3px solid var(--work-accent);
}
.tile--sel {
  background: oklch(0.89 0.062 84);
  border: 1px solid transparent;
  border-left: 3px solid oklch(0.62 0.09 82);
}
.tile--offered {
  background: oklch(0.92 0.055 27);
  border: 1px solid transparent;
  border-left: 3px solid oklch(0.5 0.15 25);
}
.tile--today {
  box-shadow: 0 0 0 2px var(--today-ring);
}

.tile__num {
  height: 22px;
  line-height: 22px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.02em;
}
.tile__num--today {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  border-radius: 7px;
  background: var(--today-ring);
  color: var(--white);
  font-size: 13px;
  font-weight: 600;
}
.tile__time {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: -0.04em;
  white-space: nowrap;
}
.tile__warn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 13px;
  height: 13px;
  border-radius: 4px;
  background: var(--warn);
  color: var(--warn-ink);
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
}
.tile__loc {
  font-size: 10px;
  font-weight: 500;
  white-space: nowrap;
  opacity: 0.85;
}
.tile__draft {
  margin-top: 6px;
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 600;
  color: oklch(0.6 0.02 80);
}
.tile__draft-dash {
  width: 14px;
  height: 1px;
  background: oklch(0.86 0.006 85);
  margin-top: 6px;
}
.tile__off {
  font-size: 9px;
  color: var(--ink-300);
  line-height: 1.2;
  text-align: center;
}

.tile__dots {
  margin-top: auto;
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 9px;
  padding-bottom: 2px;
}
.tile__dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--ink-300);
  animation: rosterDot 1.1s ease-in-out infinite;
}
.tile__count {
  margin-top: auto;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 600;
  color: oklch(0.45 0.06 82);
  background: oklch(0.94 0.032 85);
  border-radius: 4px;
  padding: 1px 4px;
  white-space: nowrap;
}
.tile__empty {
  margin-top: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 12px;
  border: 1px dashed oklch(0.88 0.006 85);
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: 9px;
  line-height: 1;
  color: oklch(0.78 0.008 80);
}
</style>
