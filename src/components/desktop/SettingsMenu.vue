<script setup>
import PitPreference from "./PitPreference.vue";
import { useSettings } from "../../composables/useSettings.js";

const emit = defineEmits(["close"]);
const { rate, contract, updateRate, updateContract } = useSettings();
</script>

<template>
  <div class="menu">
    <span class="menu__heading">Pay settings</span>

    <label class="field">Base rate ($/h)
      <input type="number" step="0.5" :value="rate" @change="updateRate($event.target.value)" class="field__input" />
    </label>
    <label class="field">Contract hours (per week)
      <input type="number" step="1" :value="contract" @change="updateContract($event.target.value)" class="field__input" />
    </label>

    <div class="menu__divider"></div>
    <PitPreference />
    <button @click="emit('close')" class="done">Done</button>
  </div>
</template>

<style scoped>
.menu {
  position: absolute;
  top: 40px;
  right: 0;
  z-index: 40;
  width: 248px;
  background: var(--white);
  border: 1px solid oklch(0.89 0.006 85);
  border-radius: 10px;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.16);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  color: var(--ink-900);
}
.menu__heading {
  font-size: 11px;
  font-weight: 600;
  color: var(--ink-heading);
}
.menu__divider {
  height: 1px;
  background: var(--border-soft);
  margin: 1px 0;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 11px;
  color: var(--ink-500);
}
.field__input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--border-card);
  border-radius: 6px;
  padding: 6px 8px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--ink-900);
  outline: none;
}
.done {
  border: 1px solid var(--gold-border);
  background: var(--gold);
  color: var(--white);
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}
</style>
