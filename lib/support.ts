import { FEEDER_PEAK_MVA } from "@/lib/impact";

/** 25 Pa. Code § 110.201(3). A direct withdrawal above this average must be registered. */
export const DIRECT_WITHDRAWAL_GPD = 10_000;

/** 25 Pa. Code § 110.201(4). Water bought from another system, outside a critical area. */
export const PURCHASED_WATER_GPD = 100_000;

/**
 * Richter, Davis, Apse, and Konrad, River Research and Applications, 2012.
 * Daily flow alteration no greater than 10% is their high-protection band.
 */
export const HIGH_PROTECTION_SHARE = 0.1;

/**
 * The same paper's single line for water-supply planning: keep 80% of daily flow,
 * so an alteration above 20% is past that line.
 */
export const PLANNING_SHARE = 0.2;

export type FeederSupport = {
  verdict: "no" | "unestablished";
  headline: string;
  detail: string;
};

export function feederSupport(megawatts: number): FeederSupport {
  const multiple = (megawatts / FEEDER_PEAK_MVA).toFixed(1);
  const shared = `${megawatts} MW is ${multiple} times the 6 MVA peak EPRI reports for most 15 kV feeders. That figure is the load those circuits already serve. EPRI says their maximum capacity is higher and depends on conductor size and length, and no hosting-capacity figure is published for the circuit at this pin. A mapped transmission line does not show unused capacity.`;
  if (megawatts > FEEDER_PEAK_MVA) {
    return {
      verdict: "no",
      headline: "No. The neighborhood feeder cannot carry this load.",
      detail: shared,
    };
  }
  return {
    verdict: "unestablished",
    headline: "Not established. Spare capacity on the neighborhood feeder is unpublished.",
    detail: shared,
  };
}

export type StreamSupport = {
  verdict: "no" | "within" | "unchecked";
  headline: string;
  detail: string;
};

export function formatFlowPercent(fraction: number): string {
  const percent = fraction * 100;
  if (percent < 0.01) return "under 0.01%";
  if (percent < 1) return `${percent.toFixed(2)}%`;
  return `${percent.toFixed(1)}%`;
}

export function streamSupport(share: number | null): StreamSupport {
  if (share === null || !Number.isFinite(share)) {
    return {
      verdict: "unchecked",
      headline: "Not evaluated. The gage has no discharge record.",
      detail:
        "Without a discharge, this map cannot say whether the stream can spare the cooling water. Richter et al. 2012 compare a withdrawal with daily flow: alterations no greater than 10% are their high-protection band, and keeping 80% of daily flow is the single line they suggest for water-supply planning.",
    };
  }
  const percent = formatFlowPercent(share);
  if (share > PLANNING_SHARE) {
    return {
      verdict: "no",
      headline: "No. This estimate is past the stream's planning screen.",
      detail: `The cooling estimate is ${percent} of the recorded flow. Richter et al. 2012 treat a daily alteration above 20% as past the single line they suggest for water-supply planning, the line that keeps 80% of daily flow in the river. The recorded flow at this gage cannot be treated as able to spare this much. The comparison uses one recorded flow, where their standard uses a daily natural hydrograph.`,
    };
  }
  const band =
    share <= HIGH_PROTECTION_SHARE
      ? "It is also inside their 10% high-protection band."
      : "It is outside their 10% high-protection band and inside the 20% planning line.";
  return {
    verdict: "within",
    headline: "The recorded flow covers this estimate inside the 20% planning screen.",
    detail: `The cooling estimate is ${percent} of the recorded flow. ${band} Richter et al. 2012 offer that 20% line for water-supply planning and describe alterations no greater than 10% as high ecological protection. The comparison uses one recorded flow, where their standard uses a daily natural hydrograph. A gage reading is not a commitment from a water utility.`,
  };
}

export function registrationNote(gallonsPerDay: number): string {
  const gallons = Math.round(gallonsPerDay).toLocaleString("en-US");
  const amount = `The cooling estimate is about ${gallons} gallons a day.`;
  if (gallonsPerDay >= PURCHASED_WATER_GPD) {
    return `${amount} That rate crosses both registration lines in 25 Pa. Code § 110.201: 10,000 gallons a day for a direct withdrawal, and 100,000 gallons a day for water bought from another system. The Department says a registration is not a water right and not an approval to withdraw.`;
  }
  if (gallonsPerDay >= DIRECT_WITHDRAWAL_GPD) {
    return `${amount} A direct withdrawal at this rate crosses the 10,000 gallon-a-day registration line in 25 Pa. Code § 110.201. A purchase from another system crosses that chapter at 100,000 gallons a day, and this estimate is under that line. The Department says a registration is not a water right and not an approval to withdraw.`;
  }
  return `${amount} That rate is under the 10,000 gallon-a-day registration line for a direct withdrawal in 25 Pa. Code § 110.201. Being under the line is not a finding that a water system can supply the site.`;
}

export const UTILITY_CAPACITY_NOTE =
  "No public record of remaining treatment or pipe capacity was found for the water system at this pin, so the municipal system is left unscored.";
