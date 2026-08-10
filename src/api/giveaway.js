// Shift give-away (and pending-offer management) over SOAP. See the giveaway-plan
// reference + the ess-api-client memory for the request/response shapes, all
// verified against reference/give-away.har.
import { essSoap } from "./client.js";

// InitShiftGive/CancelShiftOffer reply with a <response success="True"
// result="Success"/> element. GetMessages replies with a list of <item …/>.
function parseXml(xml) {
  return new DOMParser().parseFromString(xml, "text/xml");
}

// Failure `result` strings the page's giveShiftPostBack recognises (lowercased),
// mapped to something a human can read.
const FAILURE_MESSAGES = {
  failure: "The request could not be completed.",
  singlesession: "You already have this shift offered.",
  sessionexpired: "Your session expired — reload and try again.",
  timedout: "The request timed out — try again.",
  invalidrequest: "This shift can’t be given away.",
  violations: "Giving this shift away would breach a roster rule.",
};

// Read <response success result> from a SOAP reply; throw a friendly error on a
// body-level failure (the HTTP status is 200 even when the action is rejected).
function assertOk(xml) {
  const resp = parseXml(xml).querySelector("response");
  const success = (resp && resp.getAttribute("success") || "").toLowerCase() === "true";
  const result = (resp && resp.getAttribute("result") || "").toLowerCase();
  if (!success || result !== "success") {
    throw new Error(FAILURE_MESSAGES[result] || "The request could not be completed.");
  }
}

const xmlEscape = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Offer a rostered shift to anyone (anon flow). posId = shift.Actual.PositionID,
// startRaw = raw "YYYYMMDD HHMM" — both carried on the model day object.
export async function giveAwayAnyone({ posId, startRaw }) {
  if (!posId) throw new Error("This shift can’t be given away.");
  const inner =
    '<InitShiftGive><singleshiftgiveaway type="anon" empposid="' + posId +
    '" sourcedatetime="' + startRaw + '"/></InitShiftGive>';
  assertOk(await essSoap("InitShiftGive", inner));
}

// Offer a rostered shift to a specific employee (targeted flow). Same method and
// response handling as anon; the payload carries empid instead of empposid (see
// M.prototype.sendGiveShiftRequest in reference/roster-release.js).
export async function giveAwayTo({ empId, startRaw }) {
  const id = String(empId || "").trim();
  if (!id) throw new Error("Enter an employee ID.");
  const inner =
    '<InitShiftGive><singleshiftgiveaway type="targeted" empid="' + xmlEscape(id) +
    '" sourcedatetime="' + startRaw + '"/></InitShiftGive>';
  assertOk(await essSoap("InitShiftGive", inner));
}

// Cancel a pending offer by its message id (the type-10 message it created).
export async function cancelOffer(msgId) {
  const inner = '<CancelShiftOffer><cancelrequest id="' + msgId + '"/></CancelShiftOffer>';
  assertOk(await essSoap("CancelShiftOffer", inner));
}

// Message list. Give-away types: 10 = pending (you offered it, not yet taken),
// 11 = accepted (someone took it), 12 = timeout/expired (reverts to you).
export async function getMessages() {
  const xml = await essSoap("GetMessages", "<GetMessages/>");
  return [...parseXml(xml).querySelectorAll("item")].map((it) => ({
    id: it.getAttribute("id"),
    type: Number(it.getAttribute("type")),
    read: (it.getAttribute("read") || "").toLowerCase() === "true",
    datetime: it.getAttribute("datetime"),
    sortval: Number(it.getAttribute("sortval")) || 0,
  }));
}

// Offer detail — sourcedatetime lets us correlate a message back to a shift.
export async function getMessageDetails(id, type) {
  const inner = '<GetMessageDetails><messagedetails id="' + id + '" type="' + type + '"/></GetMessageDetails>';
  const details = parseXml(await essSoap("GetMessageDetails", inner)).querySelector("details");
  return {
    sourcedatetime: details && details.getAttribute("sourcedatetime"),
    issourceemp: (details && details.getAttribute("issourceemp") || "").toLowerCase() === "true",
  };
}
