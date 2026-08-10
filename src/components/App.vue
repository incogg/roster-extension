<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from "vue";
import Header from "./desktop/Header.vue";
import Toolbar from "./desktop/Toolbar.vue";
import WeekGrid from "./desktop/WeekGrid.vue";
import MobileHeader from "./mobile/MobileHeader.vue";
import MobileView from "./mobile/MobileView.vue";
import { d3 } from "../core/dates.js";
import { useRoster } from "../composables/useRoster.js";
import { useLayout } from "../composables/useLayout.js";
import { useUpdate } from "../composables/useUpdate.js";
import { useGiveaway } from "../composables/useGiveaway.js";

const { model, loading, error, load, loadNextCycle } = useRoster();
const { reconcile } = useGiveaway();
const { tab, mobile, setEmbed, startResize, stopResize } = useLayout();
const { checkForUpdate } = useUpdate();

const rootRef = ref(null);

const onRoster = computed(() => tab.value === "roster");
// Only the state-dependent bits stay inline; the static shell is in <style>.
// Desktop roster scrolls the root (infinite scroll); the mobile view scrolls its
// own detail pane, so the root stays fixed.
const rootStyle = computed(() => ({
  background: onRoster.value ? "var(--page-bg)" : "transparent",
  pointerEvents: onRoster.value ? "" : "none",
  overflowY: onRoster.value && !mobile.value ? "auto" : "hidden",
  minWidth: mobile.value ? "" : "1420px",
}));

function onScroll() {
  const r = rootRef.value;
  if (!r || !onRoster.value) return;
  if (r.scrollTop + r.clientHeight >= r.scrollHeight - 800) loadNextCycle();
}

function jumpToday() {
  const r = rootRef.value;
  if (!r || !model.value) return;
  const el = r.querySelector('[data-day="' + d3(model.value.today) + '"]');
  if (el && el.scrollIntoView) el.scrollIntoView({ block: "center", behavior: "smooth" });
}

function scrollToCurrentCycle(smooth) {
  const r = rootRef.value;
  if (!r) return;
  const el = r.querySelector('[data-current-cycle="1"]');
  if (!el) return;
  r.scrollTo({ top: Math.max(0, el.offsetTop - 150), behavior: smooth ? "smooth" : "auto" });
}

// Embed mode: non-roster tabs let the site's own SPA content show beneath our
// header (no-op in dev — there is no site content).
watch(onRoster, (isRoster) => {
  setEmbed(!isRoster);
  if (isRoster) nextTick(() => scrollToCurrentCycle(false));
}, { immediate: false });

onMounted(async () => {
  startResize();
  setEmbed(false);
  checkForUpdate();
  await load();
  reconcile().catch((e) => console.error("[newRoster] give-away reconcile failed", e));
  await nextTick();
  setTimeout(() => scrollToCurrentCycle(false), 100);
});
onBeforeUnmount(() => { stopResize(); setEmbed(false); });
</script>

<template>
  <div ref="rootRef" class="roster-root" :style="rootStyle" @scroll="onScroll">
    <!-- Mobile layout -->
    <template v-if="mobile">
      <MobileHeader />
      <template v-if="onRoster">
        <div v-if="loading && !model" class="state state--mobile state--loading">Loading roster…</div>
        <div v-else-if="error" class="state state--mobile state--error">Failed to load roster: {{ error }}</div>
        <MobileView v-else-if="model" />
      </template>
    </template>

    <!-- Desktop layout -->
    <template v-else>
      <Header />
      <template v-if="onRoster">
        <div v-if="loading && !model" class="state state--loading">Loading roster…</div>
        <div v-else-if="error" class="state state--error">Failed to load roster: {{ error }}</div>
        <template v-else-if="model">
          <Toolbar :model="model" @today="jumpToday" />
          <WeekGrid :model="model" />
        </template>
      </template>
    </template>
  </div>
</template>

<style scoped>
.roster-root {
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  overscroll-behavior: contain;
  font-family: var(--font-sans);
  color: var(--ink-900);
  display: flex;
  flex-direction: column;
}

.state {
  padding: 40px 28px;
  font-size: 14px;
}
.state--mobile {
  padding: 40px 24px;
}
.state--loading {
  color: oklch(0.55 0.01 80);
}
.state--error {
  color: var(--danger);
}
</style>

<!-- Global (unscoped) so the shadow-DOM bundle carries the keyframes the inline
     animations reference (the page-level roster.css can't reach the shadow). -->
<style>
@keyframes rosterDot {
  0%, 80%, 100% { opacity: 0.25; transform: translateY(0); }
  40% { opacity: 1; transform: translateY(-3px); }
}
@keyframes newRosterCtaPulse {
  0%   { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.55); }
  70%  { box-shadow: 0 0 0 8px rgba(255, 255, 255, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
}
</style>
