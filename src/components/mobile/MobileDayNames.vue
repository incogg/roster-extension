<script setup>
import { DAY_NAMES } from "../../core/dates.js";
</script>

<template>
  <div class="names">
    <div v-for="dn in DAY_NAMES" :key="dn" class="names__day">{{ dn.toUpperCase() }}</div>
    <div></div>
  </div>
</template>

<style scoped>
.names {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr)) 38px;
  gap: 4px;
  padding: 0 4px;
}
.names__day {
  text-align: center;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.06em;
  color: oklch(0.62 0.012 80);
}
</style>
