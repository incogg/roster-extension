<script setup>
defineProps({ day: Object, dark: Boolean });
</script>

<template>
  <div class="dh">
    <div class="dh__date">
      <span v-if="day.isToday" class="dh__num--today">{{ day.num }}</span>
      <span v-else class="dh__num" :class="dark ? 'dh__num--dark' : 'dh__num--light'">{{ day.num }}</span>
      <span class="dh__mon">{{ day.mon }}</span>
    </div>
    <span v-if="day.isToday" class="dh__badge">TODAY</span>
  </div>
</template>

<style scoped>
.dh {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 6px;
}
.dh__date {
  display: flex;
  align-items: baseline;
  gap: 5px;
}
.dh__num {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
}
.dh__num--dark {
  color: oklch(0.3 0.015 80);
}
.dh__num--light {
  color: var(--ink-800);
}
.dh__num--today {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 26px;
  height: 26px;
  padding: 0 6px;
  border-radius: 7px;
  background: var(--today-ring);
  color: var(--white);
  font-size: 15px;
  font-weight: 700;
}
.dh__mon {
  font-size: 11px;
  color: oklch(0.52 0.012 80);
}
.dh__badge {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--white);
  background: var(--today-ring);
  border-radius: 4px;
  padding: 3px 7px;
}
</style>
