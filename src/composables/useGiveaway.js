// Give-away state + message reconciliation. InitShiftGive doesn't return the id
// of the message it creates, and the roster's CanGive flag doesn't flip until an
// offer is *accepted* — so we track offer status locally, keyed by the shift's
// raw start ("YYYYMMDD HHMM", == the message sourcedatetime), and reconcile it
// against GetMessages. Modelled after useOpenShifts.
import { reactive, ref } from "vue";
import { giveAwayAnyone, giveAwayTo, cancelOffer, getMessages, getMessageDetails } from "../api/giveaway.js";
import { useRoster } from "./useRoster.js";

// Give-away message types (see ess-api-client memory): 10 = pending (offered,
// not yet taken), 11 = accepted, 12 = expired. We only reconcile pending ones —
// accepted/expired are already reflected by the roster itself (the shift is gone
// or reverted), and resolving them means a GetMessageDetails round-trip *per
// message*, which over a long message history took 20s+.
const PENDING = 10;

// startRaw -> { status: 'pending'|'accepted'|'expired', msgId, busy, error }
const offers = reactive({});
// False until the first reconcile finishes, so cells can show a loading state
// instead of flashing "givable" and then flipping to "Offered".
const ready = ref(false);
// Cache message-detail lookups (sourcedatetime) by msgId — they don't change.
const detailCache = {};

function entry(key) {
  if (!offers[key]) offers[key] = { status: null, msgId: null, busy: false, error: null };
  return offers[key];
}

async function sourceOf(msg) {
  if (!(msg.id in detailCache)) {
    const d = await getMessageDetails(msg.id, msg.type);
    detailCache[msg.id] = d.sourcedatetime || null;
  }
  return detailCache[msg.id];
}

// Pull the message list and mark shifts with an outstanding (pending) offer,
// keyed by sourcedatetime. Detail lookups run in parallel; the highest-sortval
// message for a shift wins (a re-offer supersedes an earlier one).
async function reconcile() {
  try {
    const msgs = (await getMessages()).filter((m) => m.type === PENDING);
    const resolved = await Promise.all(msgs.map(async (m) => ({ m, src: await sourceOf(m) })));
    const winner = {}; // sourcedatetime -> message
    for (const { m, src } of resolved) {
      if (!src) continue;
      if (!winner[src] || m.sortval > winner[src].sortval) winner[src] = m;
    }
    // Clear any locally-pending offer that no longer has an outstanding message
    // (accepted/cancelled elsewhere), then apply the fresh pending set.
    for (const key of Object.keys(offers)) {
      if (offers[key].status === "pending" && !winner[key]) delete offers[key];
    }
    for (const [src, m] of Object.entries(winner)) {
      const e = entry(src);
      e.status = "pending";
      e.msgId = m.id;
      e.error = null;
    }
  } finally {
    ready.value = true; // reveal give-away UI even if the check failed
  }
}

// Offer a shift for give-away. Pass an empId to target a specific employee;
// omit it (or pass falsy) to offer to anyone.
async function give(day, empId) {
  const key = day.startRaw;
  const e = entry(key);
  e.busy = true; e.error = null;
  try {
    if (empId != null && String(empId).trim()) {
      await giveAwayTo({ empId, startRaw: key });
    } else {
      await giveAwayAnyone({ posId: day.posId, startRaw: key });
    }
    e.status = "pending";
    await reconcile();             // attach the new type-10 msgId
    // reconcile() prunes pending offers with no listed message; if the server
    // hasn't surfaced ours yet (eventual consistency) re-assert it so the cell
    // stays marked. entry() re-creates it if the prune removed it.
    entry(key).status = "pending";
    await useRoster().reload();     // keep the roster honest (harmless until accepted)
  } catch (err) {
    e.error = err.message || "Could not give away this shift.";
    throw err;
  } finally {
    e.busy = false;
  }
}

async function cancel(day) {
  const key = day.startRaw;
  const e = entry(key);
  if (!e.msgId) { await reconcile(); }
  if (!e.msgId) { e.error = "No pending offer to cancel."; return; }
  e.busy = true; e.error = null;
  try {
    await cancelOffer(e.msgId);
    delete offers[key];
    await useRoster().reload();
  } catch (err) {
    e.error = err.message || "Could not cancel the offer.";
    e.busy = false;
    throw err;
  }
}

export function useGiveaway() {
  return { offers, ready, give, cancel, reconcile };
}
