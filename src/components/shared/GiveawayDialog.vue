<script setup>
// Give-away confirmation. Choose Anyone (anon) or a specific employee ID, then
// confirm. Teleported to <body> so a post-give roster re-render can't tear it
// down mid-request.
//
// STYLING EXCEPTION: like PickupDialog, this teleports outside the app's Shadow
// DOM, so neither scoped styles nor the var(--…) theme tokens reach it — the
// literal inline colours here are deliberate.
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { DAY_NAMES } from "../../core/dates.js";
import { durOf, shiftPay } from "../../core/pay.js";
import { useSettings } from "../../composables/useSettings.js";
import { useGiveaway } from "../../composables/useGiveaway.js";

const props = defineProps({ day: Object });
const emit = defineEmits(["close"]);
const { rate } = useSettings();
const { give } = useGiveaway();

const dateLabel = computed(() => DAY_NAMES[props.day.dow] + " " + props.day.num + " " + props.day.mon);
const hours = computed(() => durOf(props.day.time).toFixed(1) + " h");
const payEst = computed(() => shiftPay(props.day.dow, props.day.time, rate.value));

const mode = ref("anon"); // 'anon' | 'emp'
const empId = ref("");
const busy = ref(false);
const done = ref(false);
const status = ref("");
const statusColor = ref("oklch(0.55 0.012 80)");

const canConfirm = computed(() => !busy.value && (mode.value === "anon" || empId.value.trim().length > 0));

async function onConfirm() {
  if (!canConfirm.value) return;
  busy.value = true;
  statusColor.value = "oklch(0.55 0.012 80)"; status.value = "";
  try {
    await give(props.day, mode.value === "emp" ? empId.value.trim() : null);
    statusColor.value = "oklch(0.55 0.15 150)";
    status.value = mode.value === "emp" ? "Offered to " + empId.value.trim() + "." : "Offered to anyone.";
    done.value = true;
  } catch (e) {
    console.error("[newRoster] give away failed", e);
    statusColor.value = "oklch(0.55 0.18 25)";
    status.value = "Couldn’t offer: " + e.message;
    busy.value = false;
  }
}

const tab = (active) =>
  "flex:1; border:1px solid " + (active ? "oklch(0.55 0.12 27)" : "oklch(0.9 0.006 85)") +
  "; background:" + (active ? "oklch(0.95 0.045 27)" : "#fff") +
  "; color:" + (active ? "oklch(0.45 0.14 27)" : "oklch(0.45 0.012 80)") +
  "; border-radius:8px; padding:9px 12px; font-size:13px; font-weight:600; cursor:pointer;";

const onKey = (e) => { if (e.key === "Escape") emit("close"); };
onMounted(() => document.addEventListener("keydown", onKey, true));
onBeforeUnmount(() => document.removeEventListener("keydown", onKey, true));
</script>

<template>
  <Teleport to="body">
    <div style="position:fixed; inset:0; z-index:2147483600; display:flex; align-items:center; justify-content:center; background:rgba(30,24,10,0.45); padding:20px; font-family:'IBM Plex Sans',system-ui,sans-serif;"
      @click.self="emit('close')">
      <div style="width:340px; max-width:100%; background:#fff; border-radius:16px; box-shadow:0 24px 60px rgba(20,15,5,0.35); padding:22px; display:flex; flex-direction:column; gap:16px; color:oklch(0.26 0.012 80);">
        <div style="display:flex; flex-direction:column; gap:4px;">
          <div style="font-size:17px; font-weight:600; letter-spacing:-0.01em;">Give away shift?</div>
          <div style="font-size:12px; color:oklch(0.55 0.012 80);">Offer it to anyone or a specific person.</div>
        </div>

        <div style="display:flex; flex-direction:column; gap:9px; padding:14px; border:1px solid oklch(0.92 0.006 85); border-radius:12px; background:oklch(0.985 0.004 85);">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
            <span style="font-size:12px; color:oklch(0.55 0.012 80);">Date</span>
            <span style="font-family:'IBM Plex Mono',monospace; font-size:13px; font-weight:600; color:oklch(0.3 0.02 80);">{{ dateLabel }}</span>
          </div>
          <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
            <span style="font-size:12px; color:oklch(0.55 0.012 80);">Time</span>
            <span style="font-family:'IBM Plex Mono',monospace; font-size:13px; font-weight:600; color:oklch(0.3 0.02 80);">{{ day.time }}</span>
          </div>
          <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
            <span style="font-size:12px; color:oklch(0.55 0.012 80);">Hours</span>
            <span style="font-family:'IBM Plex Mono',monospace; font-size:13px; font-weight:600; color:oklch(0.3 0.02 80);">{{ hours }}</span>
          </div>
          <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
            <span style="font-size:12px; color:oklch(0.55 0.012 80);">Est. pay</span>
            <span style="font-family:'IBM Plex Mono',monospace; font-size:13px; font-weight:600; color:oklch(0.3 0.02 80);">{{ payEst }}</span>
          </div>
        </div>

        <template v-if="!done">
          <div style="display:flex; gap:8px;">
            <button :style="tab(mode === 'anon')" @click="mode = 'anon'">Anyone</button>
            <button :style="tab(mode === 'emp')" @click="mode = 'emp'">Specific ID</button>
          </div>
          <input v-if="mode === 'emp'" v-model="empId" placeholder="Employee ID" inputmode="numeric"
            @keydown.enter="onConfirm"
            style="width:100%; box-sizing:border-box; border:1px solid oklch(0.9 0.006 85); border-radius:8px; padding:10px 12px; font-family:'IBM Plex Mono',monospace; font-size:14px; color:oklch(0.3 0.012 80); outline:none;" />
        </template>

        <div :style="`font-size:12px; min-height:16px; color:${statusColor};`">{{ status }}</div>

        <div style="display:flex; gap:10px; margin-top:2px;">
          <button @click="emit('close')"
            style="flex:1; border:1px solid oklch(0.9 0.006 85); background:#fff; color:oklch(0.4 0.012 80); border-radius:8px; padding:9px 12px; font-size:13px; font-weight:600; cursor:pointer;">{{ done ? "Close" : "Cancel" }}</button>
          <button v-if="!done" :disabled="!canConfirm" @click="onConfirm"
            :style="`flex:1; border:1px solid oklch(0.5 0.13 27); background:oklch(0.57 0.16 27); color:#fff; border-radius:8px; padding:9px 12px; font-size:13px; font-weight:600; cursor:${canConfirm ? 'pointer' : 'default'}; opacity:${canConfirm ? 1 : 0.55};`">{{ busy ? "Offering…" : (status ? "Try again" : "Give away") }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
