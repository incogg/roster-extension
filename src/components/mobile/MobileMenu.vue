<script setup>
// Header dropdown: tab switch + pay settings + pit preference + exits.
// (The update indicator lives in the header itself — see MobileHeader.vue.)
import PitPreference from "../desktop/PitPreference.vue";
import { useLayout } from "../../composables/useLayout.js";
import { useSettings } from "../../composables/useSettings.js";

const TABS = ["Roster", "Noticeboard", "Messages", "Leave"];
// Only Roster has an implemented view yet; the rest render disabled.
const isEnabled = (name) => name.toLowerCase() === "roster";
const { tab, menuOpen } = useLayout();
const { rate, contract, updateRate, updateContract } = useSettings();

function selectTab(name) {
  if (!isEnabled(name)) return;
  const t = name.toLowerCase();
  menuOpen.value = false;
  if (tab.value === t) return;
  tab.value = t;
  try { location.hash = "/" + t; } catch (e) { /* noop */ }
}
function exitToOld() { menuOpen.value = false; document.dispatchEvent(new CustomEvent("newroster:exit")); }
</script>

<template>
  <div class="menu">
    <button v-for="name in TABS" :key="name" @click="selectTab(name)" :disabled="!isEnabled(name)"
      :title="isEnabled(name) ? null : 'Coming soon'"
      class="tab" :class="{ 'tab--active': tab === name.toLowerCase(), 'tab--disabled': !isEnabled(name) }">{{ name }}</button>

    <div class="menu__divider"></div>
    <div class="settings">
      <span class="settings__heading">Pay settings</span>
      <label class="field">Base rate ($/h)
        <input type="number" step="0.5" :value="rate" @change="updateRate($event.target.value)" class="field__input" />
      </label>
      <label class="field">Contract hours (per week)
        <input type="number" step="1" :value="contract" @change="updateContract($event.target.value)" class="field__input" />
      </label>
      <PitPreference />
    </div>

    <div class="menu__divider"></div>
    <button @click="exitToOld" class="action action--exit">Old roster ↗</button>
  </div>
</template>

<style scoped>
.menu {
  position: absolute;
  z-index: 90;
  top: calc(100% + 8px);
  left: 0;
  width: 230px;
  background: var(--white);
  border-radius: 14px;
  padding: 6px;
  box-shadow: 0 12px 30px rgba(30, 24, 10, 0.28);
  display: flex;
  flex-direction: column;
  gap: 2px;
  color: var(--ink-900);
}
.menu__divider {
  height: 1px;
  background: var(--border-soft);
  margin: 4px 2px;
}

.tab {
  min-height: 44px;
  text-align: left;
  border: none;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
  cursor: pointer;
  background: none;
  font-weight: 500;
  color: var(--ink-700);
}
.tab--active {
  background: var(--pay-bg);
  font-weight: 600;
  color: var(--gold-text);
}
.tab--disabled {
  color: var(--ink-300);
  cursor: default;
}

.settings {
  padding: 6px 12px 2px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.settings__heading {
  font-size: 11px;
  font-weight: 600;
  color: var(--ink-heading);
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

.action {
  min-height: 44px;
  text-align: left;
  border: none;
  background: none;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
  font-weight: 500;
  color: var(--ink-700);
  cursor: pointer;
}
.action--exit {
  color: oklch(0.52 0.075 80);
}
</style>
