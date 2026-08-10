<script setup>
import { computed, onMounted, onBeforeUnmount } from "vue";
import MobileMenu from "./MobileMenu.vue";
import { starImgSrc } from "../../ui/theme.js";
import { useLayout } from "../../composables/useLayout.js";
import { useIdentity } from "../../composables/useIdentity.js";

const TABS = ["Roster", "Noticeboard", "Messages", "Leave"];
const { tab, menuOpen } = useLayout();
const identity = useIdentity();
const activeLabel = computed(() => TABS.find((t) => t.toLowerCase() === tab.value) || "Roster");

const onDocDown = (e) => {
  if (!menuOpen.value) return;
  if (e.target.closest && e.target.closest("[data-newroster-menu]")) return;
  menuOpen.value = false;
};
onMounted(() => document.addEventListener("mousedown", onDocDown, true));
onBeforeUnmount(() => document.removeEventListener("mousedown", onDocDown, true));
</script>

<template>
  <header class="mh">
    <div data-newroster-menu="1" class="mh__left">
      <img :src="starImgSrc()" alt="The Star" width="24" height="24" class="mh__logo" />
      <button @click="menuOpen = !menuOpen" class="mh__toggle">
        <span class="mh__title">{{ activeLabel }}</span>
        <span class="mh__caret">▾</span>
      </button>
      <MobileMenu v-if="menuOpen" />
    </div>
    <div class="mh__right">
      <span v-if="identity.id" class="mh__id">{{ identity.id }}</span>
      <div class="mh__avatar">{{ identity.initials }}</div>
    </div>
  </header>
</template>

<style scoped>
.mh {
  position: relative;
  z-index: 30;
  flex-shrink: 0;
  pointer-events: auto;
  background: var(--gold);
  color: var(--white);
  padding: 12px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  box-shadow: inset 0 -1px 0 var(--gold-border);
}
.mh__left {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.mh__logo {
  width: 24px;
  height: 24px;
  display: block;
  flex-shrink: 0;
}
.mh__toggle {
  border: none;
  background: none;
  padding: 0;
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--white);
  cursor: pointer;
  min-width: 0;
}
.mh__title {
  font-size: 19px;
  font-weight: 600;
  letter-spacing: -0.02em;
}
.mh__caret {
  font-size: 14px;
  line-height: 1;
}
.mh__right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.mh__id {
  font-family: var(--font-mono);
  font-size: 11px;
  color: rgba(255, 255, 255, 0.8);
}
.mh__avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
}
</style>
