<script setup>
// Pickup confirmation. Teleported to <body> so a post-pickup roster re-render
// can't tear it down mid-request.
//
// STYLING EXCEPTION: this is the one component kept on inline styles. Because it
// teleports to <body> — outside the app's Shadow DOM — neither scoped <style>
// rules nor the :host var(--…) theme tokens (ui/tokens.css) reach it. Inline
// styles are the only thing that survives the teleport, so the literal colours
// here are deliberate. Everything else in the app uses scoped styles + tokens.
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { fmtHM, DAY_NAMES } from "../../core/dates.js";
import { durOf, shiftPay } from "../../core/pay.js";
import { roleLabel } from "../../core/settings.js";
import { useSettings } from "../../composables/useSettings.js";
import { useOpenShifts } from "../../composables/useOpenShifts.js";

const props = defineProps({ shift: Object, data: Object, day: Object });
const emit = defineEmits(["close"]);
const { rate } = useSettings();
const { pickup } = useOpenShifts();

const pit = computed(() => (props.data.Locations.find((l) => l.ID == props.shift.LocationID) || {}).Name || "?");
const role = computed(() => roleLabel(((props.data.Departments || []).find((r) => r.ID == props.shift.RoleID) || {}).Name));
const start = computed(() => fmtHM(props.shift.StartDateTime));
const end = computed(() => fmtHM(props.shift.EndDateTime));
const time = computed(() => start.value + " – " + end.value);
const dateLabel = computed(() => DAY_NAMES[props.day.dow] + " " + props.day.num + " " + props.day.mon);
const hours = computed(() => durOf(time.value).toFixed(1) + " h");
const payEst = computed(() => shiftPay(props.day.dow, time.value, rate.value));

const busy = ref(false);
const done = ref(false);
const status = ref("");
const statusColor = ref("oklch(0.5 0.03 30)");

async function onConfirm() {
  busy.value = true;
  statusColor.value = "oklch(0.55 0.012 80)"; status.value = "";
  try {
    await pickup(props.shift);
    statusColor.value = "oklch(0.55 0.15 150)";
    status.value = "Shift picked up.";
    done.value = true;
  } catch (e) {
    console.error("[newRoster] TakeWork failed", e);
    statusColor.value = "oklch(0.55 0.18 25)";
    status.value = "Couldn’t pick up: " + e.message;
    busy.value = false;
  }
}

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
          <div style="font-size:17px; font-weight:600; letter-spacing:-0.01em;">Pick up this shift?</div>
          <div style="font-size:12px; color:oklch(0.55 0.012 80);">This adds the shift to your roster.</div>
        </div>
        <div style="display:flex; flex-direction:column; gap:9px; padding:14px; border:1px solid oklch(0.92 0.006 85); border-radius:12px; background:oklch(0.985 0.004 85);">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
            <span style="font-size:12px; color:oklch(0.55 0.012 80);">Date</span>
            <span style="font-family:'IBM Plex Mono',monospace; font-size:13px; font-weight:600; color:oklch(0.3 0.02 80);">{{ dateLabel }}</span>
          </div>
          <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
            <span style="font-size:12px; color:oklch(0.55 0.012 80);">Time</span>
            <span style="font-family:'IBM Plex Mono',monospace; font-size:13px; font-weight:600; color:oklch(0.3 0.02 80);">{{ time }}</span>
          </div>
          <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
            <span style="font-size:12px; color:oklch(0.55 0.012 80);">Hours</span>
            <span style="font-family:'IBM Plex Mono',monospace; font-size:13px; font-weight:600; color:oklch(0.3 0.02 80);">{{ hours }}</span>
          </div>
          <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
            <span style="font-size:12px; color:oklch(0.55 0.012 80);">Pit</span>
            <span style="font-family:'IBM Plex Mono',monospace; font-size:11px; font-weight:600; color:oklch(0.38 0.09 78); background:oklch(0.93 0.055 82); border:1px solid oklch(0.8 0.09 80); border-radius:5px; padding:2px 7px; white-space:nowrap;">{{ pit }}</span>
          </div>
          <div v-if="role" style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
            <span style="font-size:12px; color:oklch(0.55 0.012 80);">Role</span>
            <span style="font-family:'IBM Plex Mono',monospace; font-size:11px; font-weight:600; color:oklch(0.42 0.035 250); background:oklch(0.955 0.012 250); border:1px solid oklch(0.87 0.025 250); border-radius:5px; padding:2px 7px; white-space:nowrap;">{{ role }}</span>
          </div>
          <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
            <span style="font-size:12px; color:oklch(0.55 0.012 80);">Est. pay</span>
            <span style="font-family:'IBM Plex Mono',monospace; font-size:13px; font-weight:600; color:oklch(0.3 0.02 80);">{{ payEst }}</span>
          </div>
        </div>
        <div :style="`font-size:12px; min-height:16px; color:${statusColor};`">{{ status }}</div>
        <div style="display:flex; gap:10px; margin-top:2px;">
          <button v-if="!done" :disabled="busy" @click="emit('close')"
            style="flex:1; border:1px solid oklch(0.9 0.006 85); background:#fff; color:oklch(0.4 0.012 80); border-radius:8px; padding:9px 12px; font-size:13px; font-weight:600; cursor:pointer;">No</button>
          <button v-else @click="emit('close')"
            style="flex:1; border:1px solid oklch(0.9 0.006 85); background:#fff; color:oklch(0.4 0.012 80); border-radius:8px; padding:9px 12px; font-size:13px; font-weight:600; cursor:pointer;">Close</button>
          <button v-if="!done" :disabled="busy" @click="onConfirm"
            :style="`flex:1; border:1px solid oklch(0.55 0.08 80); background:oklch(0.64 0.087 82); color:#fff; border-radius:8px; padding:9px 12px; font-size:13px; font-weight:600; cursor:${busy ? 'default' : 'pointer'}; opacity:${busy ? 0.6 : 1};`">{{ busy ? "Picking up…" : (status ? "Try again" : "Yes, pick up") }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
