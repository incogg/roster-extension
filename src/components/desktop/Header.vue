<script setup>
import { onMounted, onBeforeUnmount } from "vue";
import SettingsMenu from "./SettingsMenu.vue";
import { starImgSrc } from "../../ui/theme.js";
import { useLayout } from "../../composables/useLayout.js";
import { useUpdate } from "../../composables/useUpdate.js";
import { useIdentity } from "../../composables/useIdentity.js";

const { tab, menuOpen } = useLayout();
const { update } = useUpdate();
const identity = useIdentity();

const TABS = ["Roster", "Noticeboard", "Messages", "Leave"];

function selectTab(name) {
  const t = name.toLowerCase();
  if (tab.value === t) return;
  tab.value = t;
  menuOpen.value = false;
  try { location.hash = "/" + t; } catch (e) { /* noop */ }
}

function exitToOld() { document.dispatchEvent(new CustomEvent("newroster:exit")); }

// Close the settings menu on an outside click.
const onDocDown = (e) => {
  if (!menuOpen.value) return;
  if (e.target.closest && e.target.closest("[data-newroster-menu]")) return;
  menuOpen.value = false;
};
onMounted(() => document.addEventListener("mousedown", onDocDown, true));
onBeforeUnmount(() => document.removeEventListener("mousedown", onDocDown, true));
</script>

<template>
  <header class="hdr">
    <div class="hdr__left">
      <div class="brand">
        <img :src="starImgSrc()" alt="The Star" width="26" height="26" class="brand__logo" />
        <div class="brand__name">THE STAR</div>
      </div>
      <nav class="tabs">
        <div v-for="name in TABS" :key="name" @click="selectTab(name)"
          class="tab" :class="{ 'tab--active': tab === name.toLowerCase() }">{{ name }}</div>
      </nav>
    </div>

    <div class="hdr__right">
      <a v-if="update && update.updateAvailable" :href="update.url || '#'" target="_blank" rel="noopener"
        :title="update.latestVersion ? 'Version ' + update.latestVersion + ' is available' : 'An update is available'"
        class="pill pill--update">
        <span class="dot dot--positive"></span>
        <span>Update available</span>
        <span class="pill__arrow">↗</span>
      </a>

      <a href="#" @click.prevent="exitToOld" class="pill pill--ghost">Old roster ↗</a>

      <div class="who">
        <div class="who__name">{{ identity.name }}</div>
        <div v-if="identity.id" class="who__id">{{ identity.id }}</div>
      </div>

      <div data-newroster-menu="1" class="menu-anchor">
        <div @click="menuOpen = !menuOpen" class="avatar">{{ identity.initials }}</div>
        <SettingsMenu v-if="menuOpen" @close="menuOpen = false" />
      </div>
    </div>
  </header>
</template>

<style scoped>
.hdr {
  position: sticky;
  top: 0;
  z-index: 30;
  pointer-events: auto;
  background: var(--gold);
  color: var(--white);
  padding: 0 28px;
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 24px;
  box-shadow: inset 0 -1px 0 var(--gold-border);
}
.hdr__left {
  display: flex;
  align-items: stretch;
  gap: 40px;
}
.hdr__right {
  display: flex;
  align-items: center;
  gap: 18px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 14px 0;
}
.brand__logo {
  width: 26px;
  height: 26px;
  display: block;
}
.brand__name {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.22em;
}

.tabs {
  display: flex;
  align-items: stretch;
  gap: 4px;
}
.tab {
  display: flex;
  align-items: center;
  padding: 0 16px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.82);
  cursor: pointer;
}
.tab--active {
  font-weight: 600;
  color: var(--white);
  box-shadow: inset 0 -3px 0 var(--white);
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 8px;
  padding: 6px 11px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  text-decoration: none;
  cursor: pointer;
}
.pill--ghost {
  border: 1px solid rgba(255, 255, 255, 0.35);
  background: none;
  color: rgba(255, 255, 255, 0.9);
}
.pill--update {
  gap: 7px;
  border: 1px solid var(--white);
  background: var(--white);
  font-weight: 600;
  color: var(--gold-text);
  animation: newRosterCtaPulse 2.4s ease-out infinite;
}
.pill__icon {
  font-size: 13px;
  line-height: 1;
}
.pill__arrow {
  font-size: 11px;
}
.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex: none;
}
.dot--positive {
  background: var(--positive);
}

.who {
  text-align: right;
  line-height: 1.35;
}
.who__name {
  font-size: 13px;
  font-weight: 500;
}
.who__id {
  font-family: var(--font-mono);
  font-size: 11px;
  color: rgba(255, 255, 255, 0.78);
}

.menu-anchor {
  position: relative;
}
.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
</style>
