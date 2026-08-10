<script setup>
// Drag-to-order pit list. Pointer-based (works with mouse + touch); order is
// persisted via useSettings and drives open-shift sorting.
import { ref, computed } from "vue";
import { useSettings } from "../../composables/useSettings.js";

const { listPits, savePitOrder, pitVersion } = useSettings();
const pits = computed(() => { pitVersion.value; return listPits(); });

const listRef = ref(null);
let dragEl = null;

const onMove = (e) => {
  if (!dragEl) return;
  e.preventDefault();
  const rows = [...listRef.value.children].filter((r) => r !== dragEl);
  const before = rows.find((r) => {
    const rect = r.getBoundingClientRect();
    return e.clientY < rect.top + rect.height / 2;
  });
  listRef.value.insertBefore(dragEl, before || null);
};
const onUp = () => {
  if (!dragEl) return;
  // Clear the inline overrides so the row reverts to its .pit-row styling.
  dragEl.style.opacity = ""; dragEl.style.background = "";
  dragEl = null;
  document.removeEventListener("pointermove", onMove);
  document.removeEventListener("pointerup", onUp);
  savePitOrder([...listRef.value.children].map((r) => r.getAttribute("data-pit")));
};
function onHandleDown(e, row) {
  e.preventDefault();
  dragEl = row;
  row.style.opacity = "0.5"; row.style.background = "oklch(0.97 0.01 85)";
  document.addEventListener("pointermove", onMove, { passive: false });
  document.addEventListener("pointerup", onUp);
}
</script>

<template>
  <div class="pit">
    <span class="pit__heading">Pit preference</span>
    <div v-if="!pits.length" class="pit__empty">Check for shifts to list pits.</div>
    <template v-else>
      <span class="pit__hint">Drag the handle to order which pits to show first.</span>
      <div ref="listRef" class="pit__list">
        <div v-for="name in pits" :key="name" :data-pit="name" class="pit-row">
          <span @pointerdown="(e) => onHandleDown(e, $event.currentTarget.parentElement)" class="pit-row__handle">⠿</span>
          <span class="pit-row__name">{{ name }}</span>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.pit {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.pit__heading {
  font-size: 11px;
  font-weight: 600;
  color: var(--ink-heading);
}
.pit__empty {
  font-size: 11px;
  font-style: italic;
  color: var(--ink-faint);
}
.pit__hint {
  font-size: 10px;
  color: var(--ink-400);
}
.pit__list {
  display: flex;
  flex-direction: column;
  gap: 3px;
  max-height: 190px;
  overflow-y: auto;
}
.pit-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border: 1px solid var(--border-card);
  border-radius: 6px;
  background: var(--white);
  font-size: 12px;
  color: var(--ink-800);
}
.pit-row__handle {
  color: oklch(0.72 0.01 80);
  font-size: 13px;
  line-height: 1;
  cursor: grab;
  touch-action: none;
  padding: 2px;
  margin: -2px;
}
.pit-row__name {
  font-family: var(--font-mono);
  letter-spacing: -0.02em;
}
</style>
