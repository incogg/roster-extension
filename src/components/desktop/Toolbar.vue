<script setup>
import { computed } from "vue";
import { fmtD } from "../../core/dates.js";
import { useOpenShifts } from "../../composables/useOpenShifts.js";

const props = defineProps({ model: Object });
const emit = defineEmits(["today"]);
const { clearCache } = useOpenShifts();

const rangeLabel = computed(() => {
  const weeks = props.model.weeks;
  const a = weeks[0].start, b = weeks[weeks.length - 1].days[6].date;
  return fmtD(a) + " – " + fmtD(b) + " " + b.getFullYear();
});
</script>

<template>
  <div class="toolbar">
    <div class="toolbar__group">
      <button @click="emit('today')" class="btn">Today</button>
      <div class="range">{{ rangeLabel }}</div>
    </div>
    <div class="toolbar__group">
      <button @click="clearCache()" class="btn">Check shifts</button>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  position: sticky;
  top: 54px;
  z-index: 20;
  background: var(--white);
  border-bottom: 1px solid var(--hairline);
  padding: 14px 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
}
.toolbar__group {
  display: flex;
  align-items: center;
  gap: 16px;
}
.btn {
  border: 1px solid var(--hairline);
  background: var(--white);
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
.range {
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.01em;
}
</style>
