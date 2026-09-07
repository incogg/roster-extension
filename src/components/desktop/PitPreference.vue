<script setup>
// Favourite pits: tap a row to star it. Favourites are highlighted, sorted to
// the top of this list, and float to the top of the open-shift pick-up list.
import { computed } from "vue";
import { useSettings } from "../../composables/useSettings.js";

const { listPits, isFav, toggleFav, pitVersion } = useSettings();
const pits = computed(() => { pitVersion.value; return listPits(); });
</script>

<template>
  <div class="pit">
    <span class="pit__heading">Favourite pits</span>
    <div v-if="!pits.length" class="pit__empty">Check for shifts to list pits.</div>
    <template v-else>
      <span class="pit__hint">Tap a pit to favourite it — favourites show first when picking up shifts.</span>
      <div class="pit__list">
        <button v-for="name in pits" :key="name" type="button"
          @click="toggleFav(name)" class="pit-row" :class="{ 'pit-row--fav': isFav(name) }">
          <span class="pit-row__star">{{ isFav(name) ? "★" : "☆" }}</span>
          <span class="pit-row__name">{{ name }}</span>
        </button>
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
  width: 100%;
  min-height: 34px;
  text-align: left;
  padding: 6px 8px;
  border: 1px solid var(--border-card);
  border-radius: 6px;
  background: var(--white);
  font-size: 12px;
  color: var(--ink-800);
  cursor: pointer;
}
.pit-row--fav {
  background: var(--pit-fav-bg);
  border-color: var(--pit-fav-border);
  color: var(--pit-fav-ink);
}
.pit-row__star {
  font-size: 13px;
  line-height: 1;
  color: oklch(0.72 0.01 80);
}
.pit-row--fav .pit-row__star {
  color: var(--pit-fav-ink);
}
.pit-row__name {
  font-family: var(--font-mono);
  letter-spacing: -0.02em;
}
</style>
