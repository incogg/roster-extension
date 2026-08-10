<script setup>
import FortnightSection from "./FortnightSection.vue";
import { DAY_NAMES } from "../../core/dates.js";

defineProps({ model: Object });
</script>

<template>
  <div class="grid">
    <div data-grid-head="1" class="grid__head">
      <div data-grid-head-spacer="1"></div>
      <div v-for="dn in DAY_NAMES" :key="dn" class="grid__day">{{ dn }}</div>
    </div>
    <template v-for="(fn, i) in model.fortnights" :key="fn.key">
      <FortnightSection :section="fn" />
      <div class="grid__sep"></div>
    </template>
  </div>
</template>

<style scoped>
.grid {
  padding: 20px 28px 40px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.grid__head {
  position: sticky;
  top: 120px;
  z-index: 10;
  display: grid;
  grid-template-columns: 148px repeat(7, minmax(0, 1fr));
  gap: 8px;
  background: var(--page-bg);
  padding: 6px 0;
  min-width: 1364px;
}
.grid__day {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.12em;
  color: oklch(0.55 0.01 80);
  text-transform: uppercase;
  padding-left: 2px;
}
.grid__sep {
  height: 1px;
  background: oklch(0.9 0.012 85);
  margin: 8px 0;
}
</style>
