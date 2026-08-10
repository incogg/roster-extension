// Available ("open") shifts for a day, via FindWork.
import { essPost } from "./client.js";

export function fetchOpenShifts(date) {
  return essPost("FindWork", { dateString: date, excludedWorkChecksums: null });
}
