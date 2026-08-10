<script setup>
import { computed } from "vue";
import { fmtD } from "../../core/dates.js";

const props = defineProps({ fn: Object, canPrev: Boolean });
const emit = defineEmits(["move"]);

const first = computed(() => props.fn.weeks[0].start);
const last = computed(() => props.fn.weeks[props.fn.weeks.length - 1].days[6].date);
</script>

<template>
  <div class="fnnav">
    <button @click="canPrev && emit('move', -1)" class="fnnav__arrow" :class="{ 'fnnav__arrow--off': !canPrev }">‹</button>
    <div class="fnnav__label">
      <div class="fnnav__range">{{ fmtD(first) }} – {{ fmtD(last) }}</div>
    </div>
    <button @click="emit('move', 1)" class="fnnav__arrow">›</button>
  </div>
</template>

<style scoped>
.fnnav {
  flex-shrink: 0;
  background: var(--gold);
  color: var(--white);
  padding: 6px 8px 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}
.fnnav__arrow {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border: none;
  background: none;
  color: var(--white);
  font-size: 22px;
  line-height: 1;
  border-radius: 12px;
  cursor: pointer;
}
.fnnav__arrow--off {
  cursor: default;
  opacity: 0.35;
}
.fnnav__label {
  text-align: center;
  line-height: 1.3;
  min-width: 0;
}
.fnnav__range {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
}
</style>
