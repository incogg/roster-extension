// Pick up an open shift (TakeWork). The payload is sourced entirely from the
// FindWork shift object (see the ess-api-client reference). Field names are
// best-effort from the page's own comms.TakeWork — verify against a live
// network capture if real pickups ever fail.
import { essPost } from "./client.js";

export async function takeWork(shift) {
  const json = await essPost("TakeWork", {
    startDateTimeString: shift.StartDateTime,
    endDateTimeString: shift.EndDateTime,
    siteID: shift.SiteID,
    roleID: shift.RoleID,
    areaID: shift.AreaID,
    locationID: shift.LocationID,
    stationName: shift.StationName,
    workloadID: shift.WorkloadID,
    offerID: shift.OfferID,
    checksum: shift.Checksum,
    checksumShiftFields: shift.ChecksumShiftFields,
  });
  // Some ESS methods report failure in the body despite a 200.
  const rd = json && json.d;
  if (rd && (rd.Result === false || rd.Success === false || rd.Error || rd.ErrorMessage)) {
    throw new Error(rd.ErrorMessage || rd.Error || "The shift could not be picked up.");
  }
  return json;
}
